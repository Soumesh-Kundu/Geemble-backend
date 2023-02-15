import speakeasy from 'speakeasy'
export default function OTPGenerator() {
    let secret = speakeasy.generateSecret().base32
    let token = speakeasy.totp({
        secret,
        encoding: 'base32',
        algorithm: 'sha512',
        window: 2
    })
    return { secret, token }
}