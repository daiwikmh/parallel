import axios from 'axios'
import DOMPurify from 'isomorphic-dompurify'
import { IOAuthProvider, ProviderConfig, IUser, IOAuthTokens } from '../../types/provider'

export class GoogleProvider implements IOAuthProvider {
    providerName = 'google'

    private readonly authUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
    private readonly tokenUrl = 'https://oauth2.googleapis.com/token'
    private readonly profileUrl = 'https://openidconnect.googleapis.com/v1/userinfo'

    constructor(private readonly config: ProviderConfig) {
        if (!config.clientId || !config.clientSecret || !config.redirectUri) {
            throw new Error('GoogleProvider: clientId, clientSecret, redirectUri required')
        }
    }

    getAuthUrl(state: string): string {
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            response_type: 'code',
            scope: this.config.scope ?? 'openid profile email',
            access_type: 'offline',
            prompt: 'consent',
            state,
        })
        return `${this.authUrl}?${params.toString()}`
    }

    async exchangeCodeForToken(code: string): Promise<IOAuthTokens> {
        if (!code || code.length > 512) throw new Error('Invalid code')

        const res = await axios.post(
            this.tokenUrl,
            new URLSearchParams({
                code,
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                redirect_uri: this.config.redirectUri,
                grant_type: 'authorization_code',
            }),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: this.config.timeoutMs ?? 10000,
            }
        )

        const data = res.data
        if (!data.access_token) throw new Error('No access token from Google')

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            scope: data.scope,
            expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
        }
    }

    async getUserProfile(accessToken: string): Promise<IUser> {
        if (!accessToken || accessToken.length > 1000) throw new Error('Invalid access token')

        const res = await axios.get(this.profileUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: this.config.timeoutMs ?? 10000,
        })

        const profile = res.data
        if (!profile.sub) throw new Error('Missing Google ID')

        return {
            id: DOMPurify.sanitize(profile.sub),
            providerId: DOMPurify.sanitize(profile.sub),
            email: DOMPurify.sanitize(profile.email ?? ''),
            name: DOMPurify.sanitize(profile.name ?? ''),
            avatarUrl: profile.picture ?? '',
            rawProfile: profile,
        }
    }
}