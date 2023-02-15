import speakeasy from 'speakeasy'
export default function VerifyOTP(secret, token) {
    let verifed = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        algorithm: 'sha512',
        token,
        window: 2
    })
    return verifed
}