import { Request, Response } from 'express'
import {
    getGitHubAuthUrl,
    getGoogleAuthUrl,
    handleGitHubCallback,
    handleGoogleCallback,
    getUserById,
    refreshAccessToken,
    revokeRefreshToken,
} from '../services/auth.service'
import { logger } from '../lib/logger'

export async function githubLogin(_req: Request, res: Response): Promise<void> {
    res.redirect(getGitHubAuthUrl())
}

export async function githubCallback(req: Request, res: Response): Promise<void> {
    const code = req.query.code as string
    if (!code) {
        res.status(400).json({ error: 'Missing code' })
        return
    }
    try {
        const { accessToken, refreshToken } = await handleGitHubCallback(code)
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        })
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000, // 15 min 
        })
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback`)
    } catch (err) {
        if (err instanceof Error) {
            logger.error('GitHub callback failed', err)
        }
        res.status(500).json({ error: 'GitHub auth failed' })
    }
}

export async function googleLogin(_req: Request, res: Response): Promise<void> {
    res.redirect(getGoogleAuthUrl())
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
    const code = req.query.code as string
    if (!code) {
        res.status(400).json({ error: 'Missing code' })
        return
    }
    try {
        const { accessToken, refreshToken } = await handleGoogleCallback(code)
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        })
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000,
        })
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback`)
    } catch (err) {
        if (err instanceof Error) {
            logger.error('Google callback failed', err)
        }
        res.status(500).json({ error: 'Google auth failed' })
    }
}

export async function me(req: Request, res: Response): Promise<void> {
    try {
        const user = await getUserById(req.userId!)
        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            githubHandle: user.githubHandle,
            network: user.apiKeys?.[0]?.network ?? 'testnet',
            apiKeyCount: user.apiKeys?.length ?? 0,
            createdAt: user.createdAt,
        })
    } catch (err) {
        if (err instanceof Error) {
            logger.error('Failed to fetch user', err)
        }
        res.status(500).json({ error: 'Failed to fetch user' })
    }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.refresh_token ?? req.body?.refresh_token
    if (!token) {
        res.status(400).json({ error: 'Missing refresh token' })
        return
    }
    try {
        const result = await refreshAccessToken(token)

        res.cookie('refresh_token', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        })

        res.json({ accessToken: result.accessToken })
    } catch (err) {
        if (err instanceof Error) {
            res.status(401).json({ error: err.message })
        }
    }
}

export async function logout(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.refresh_token ?? req.body?.refresh_token
    if (token) {
        await revokeRefreshToken(token)
    }
    res.clearCookie('refresh_token')
    res.json({ success: true })
}