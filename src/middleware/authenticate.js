import dotenv from 'dotenv'
dotenv.config()
import jwt from 'jsonwebtoken'
const JWT_SECRET = process.env.JWT_SECRET

export default function authenticate(req,res,next){
    const token = req.header("auth-token")
    if(!token) {
        return res.status(401).json({ error: "please authenticate using valid token" })
    }
    try {
        const data = jwt.verify(token, JWT_SECRET)
        req.user = data.user
        next()
    } catch (error) {
        return res.status(401).json({ error: "please authenticate using valid token" })
    }
}

