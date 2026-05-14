const required = [
    'PORT',
    'DATABASE_URL',
    'JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'FRONTEND_URL',
]

export function validateEnv() {
    const missing = required.filter((key) => !process.env[key])
    if (missing.length > 0) {
        console.error(`Missing required env vars: ${missing.join(', ')}`)
        process.exit(1)
    }
    console.log('required env vars are set')
}