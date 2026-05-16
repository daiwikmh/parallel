import crypto from 'crypto'
import { GoogleProvider } from './providers/google.provider'
import { IUser } from '../types/provider'
import { db } from '../../db/client'
import { signAccessToken, signJwt } from '../lib/jwt'
import { signRefreshToken } from '../lib/jwt'


const google = new GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_CALLBACK_URL!,
})

function generateState(): string {
    return crypto.randomBytes(16).toString('hex')
}

async function createRefreshToken(userId: string): Promise<string> {
    const token = signRefreshToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await db.refreshToken.deleteMany({
        where: {
            userId, expiresAt: { lt: new Date() },
        }
    })
    
    await db.refreshToken.create({
        data: { userId, token, expiresAt }
    })

    return token
}

async function upsertUser(
    profile: IUser,
    provider: 'github' | 'google'
) {
    const where =
        provider === 'github'
             { googleId: profile.providerId }

    const existing = await db.user.findFirst({ where })

    if (existing) {
        return db.user.update({
            where: { id: existing.id },
            data: {
                name: profile.name,
                avatarUrl: profile.avatarUrl,
                email: profile.email || existing.email,
            },
        })
    }

    return db.user.create({
        data: {
            email: profile.email || null,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
            googleId: provider === 'google' ? profile.providerId : undefined,
        },
    })
}

// google
export function getGoogleAuthUrl(): string {
    return google.getAuthUrl(generateState())
}

export async function handleGoogleCallback(code: string) {
    const tokens = await google.exchangeCodeForToken(code)
    const profile = await google.getUserProfile(tokens.accessToken)
    const user = await upsertUser(profile, 'google')
    const accessToken = signAccessToken({
        id: user.id,
        provider: 'google',
        email: user.email ?? '',
    })
    const refreshToken = await createRefreshToken(user.id)

    return { user, accessToken, refreshToken }
}

export async function getUserById(userId: string) {
    return db.user.findUnique({
        where: { id: userId },
        include: { apiKeys: true },
    })
}

export async function refreshAccessToken(refreshToken: string) {
    const record = await db.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
    })

    if (!record) throw new Error('Invalid refresh token')
    if (record.expiresAt < new Date()) {
        await db.refreshToken.delete({ where: { token: refreshToken } })
        throw new Error('Refresh token expired')
    }

    const newTokenValue = signRefreshToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await db.$transaction([
        db.refreshToken.delete({ where: { token: refreshToken } }),
        db.refreshToken.create({
            data: { userId: record.user.id, token: newTokenValue, expiresAt },
        }),
    ])

    const accessToken = signAccessToken({
        id: record.user.id,
        provider: record.user.githubId ? 'github' : 'google',
        email: record.user.email ?? '',
    })

    return { accessToken, refreshToken: newTokenValue }
}


export async function revokeRefreshToken(token: string) {
    await db.refreshToken.deleteMany({ where: { token } })
}