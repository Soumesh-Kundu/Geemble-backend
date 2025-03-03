import dotenv from 'dotenv'
dotenv.config()
import jwt from 'jsonwebtoken'
const JWT_SECRET = process.env.JWT_SECRET

export default function OTPcheck(req,res,next){
    const OTPtoken= req.header('session-token')
    if(!OTPtoken) {
        return res.status(401).json({ error: "Unauthorized" })
    }
    try {
        const data = jwt.verify(OTPtoken, JWT_SECRET)
        req.OTP_secret = data.token
        next()
    } catch (error) {
        return res.status(401).json({ error: "please authenticate using valid token" })
    }
}

