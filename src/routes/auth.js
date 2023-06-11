import express from 'express'
import User from '../models/User.js'
import OTP from '../models/OTP.js'
import dotenv from 'dotenv'
dotenv.config()
import { authenticate } from '../middleware/index.js'
import { mailsender, OTPGenerator, OtpVerifier } from '../helpers/index.js'
import { body, validationResult } from 'express-validator'
import bcrypt from 'bcrypt'
import JWT from 'jsonwebtoken';
import OTPcheck from '../middleware/OTPcheck.js'

export const route = express.Router()
const JWT_SECRET = process.env.JWT_SECRET
const maleDefault = new Array(4).fill("").map((_, index) => `uploads/defaults/male${index + 1}.png`)
const femaleDefault = new Array(4).fill("").map((_, index) => `uploads/defaults/female${index + 1}.png`)
route.get('/', (req, res) => {
    res.send("this is from auth route")
})

route.post('/register', [
    body('name', 'Enter a Valid Name').isLength({ min: 3 }),
    body('username', 'Enter a Valid Name').isLength({ min: 5, max: 13 }),
    body('email', 'Enter a Valid Email').isEmail(),
    body('password', 'Password must be more than 8 Characters').isLength({ min: 5 })
], async (req, res) => {
    const errors = validationResult(req)
    let success = false
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { name, username, email, password, gender } = req.body
        let user = await User.find({ $or: [{ email }, { username }] })
        if (user.length) {
            const sameEmail = user.find((data) => data.email == email)
            const sameUserName = user.find((data) => data.username == username)
            if (sameEmail) {
                return res.status(400).json({ success, email: true, error: "Sorry but this user already exists" })
            }
            if (sameUserName) {
                return res.status(400).json({ success, username: true, error: "username is already taken" })
            }
        }
        const salt = await bcrypt.genSalt(15)
        const secPass = await bcrypt.hash(password, salt)
        const random = Math.floor(Math.random() * 4)
        const profilePicture = gender === 'male' ? maleDefault[random] : femaleDefault[random]
        const response = await User.create({
            name, username, email, password: secPass, gender, profilePicture
        })
        const { secret, token } = OTPGenerator()
        const code = await OTP.create({ secret, user: response.id })
        const data = {
            user: {
                id: response.id
            }
        }
        const Otp = {
            token: {
                id: code.id
            }
        }
        success = true
        const authToken = JWT.sign(data, JWT_SECRET)
        const OTPtoken = JWT.sign(Otp, JWT_SECRET)
        res.status(201).json({ success, authToken, OTPtoken })
        await mailsender({
            from: "Verfication Email<noreply.geemble@gmail.com>",
            to: response.email,
            subject: 'Verfication email',
            body: `<p style="font-size:14px">Your OTP is <strong style="font-size:16px">${token}</strong>. This OTP will expire in 60 seconds. Don't Share this OTP with anyone</p>`
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.post('/login', [
    body('username', 'Enter a Valid Name').isLength({ min: 8 }),
    body('password', 'Password must be more than 8 Characters').isLength({ min: 5 })
], async (req, res) => {
    const errors = validationResult(req)
    let success = false
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { username, password } = req.body
        const user = await User.findOne({ username })
        if (!user) {
            return res.status(400).json({ success, error: "Please type correct credentials" })
        }
        const passwordCheck = await bcrypt.compare(password, user.password)
        if (!passwordCheck) {
            return res.status(400).json({ success, error: "Please type correct credentials" })
        }
        const data = {
            user: {
                id: user.id
            }
        }
        success = true
        const authToken = JWT.sign(data, JWT_SECRET)
        res.status(200).json({ success, authToken })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.post('/forgetPassword', [body('email', 'Enter a Valid Email').isEmail()], async (req, res) => {
    let success = false
    try {
        const { email } = req.body
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(401).json({ success, error: "user doesn't exist" })
        }
        const { secret, token } = OTPGenerator()
        const code = await OTP.create({ secret, user: user.id })
        const Otp = {
            token: {
                id: code.id
            }
        }
        success = true
        const OTPtoken = JWT.sign(Otp, JWT_SECRET)
        res.status(200).json({ success, msg: "OTP sended", OTPtoken })
        await mailsender({
            from: "Password Reset Verification<noreply.geemble@gmail.com>",
            to: email,
            subject: 'Verify Yourself',
            body: `<p style="font-size:14px">Your OTP is <strong style="font-size:16px">${token}</strong>. This OTP will expire in 60 seconds. Don't Share this OTP with anyone</p>`
        })

        console.log("sent")
    } catch (error) {
        console.log(error)
        res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.post('/verify', OTPcheck, async (req, res) => {
    let success = false
    try {
        const codeId = req.OTP_secret.id
        const { token } = req.body
        const code = await OTP.findById(codeId)
        if (!code) {
            return res.status(401).json({ success, error: "OTP doesn't exist" })
        }
        if (Date.now() - code.created_At > 63500) {
            res.status(408).json({ success, error: "OTP has expired" })
            await OTP.findByIdAndDelete(code.id)
            return
        }
        const verified = OtpVerifier(code.secret, token)
        if (!verified) {
            res.status(400).json({ success, error: "OTP is incorrect" })
            return
        }
        const data = {
            user: {
                id: code.user
            }
        }
        success = true
        const authToken = JWT.sign(data, JWT_SECRET)
        res.status(200).json({ success, authToken })
        await OTP.findByIdAndDelete(code.id)
        return
    } catch (error) {
        console.log(error)
        res.status(500).json({ success, Error: "Some Error has occured" })
    }
})
route.post('/resend', OTPcheck, async (req, res) => {
    let success = false
    try {
        const codeId = req.OTP_secret.id
        const { OTPtoken } = req.cookies
        const { secret, token } = OTPGenerator()
        const code = await OTP.findByIdAndUpdate(codeId, { $set: { secret, created_At: Date.now() } }, { new: true })
        const user = await User.findById(code.user)
        success = true
        res.status(200).json({ success, msg: 'OTP resended', OTPtoken })
        await mailsender({
            from: "Resend Verfication Email<noreply.geemble@gmail.com>",
            to: user.email,
            subject: 'Verfication email',
            body: `<p style="font-size:14px">Your resended OTP is <strong style="font-size:16px">${token}</strong>. This OTP will expire in 60 seconds. Don't Share this OTP with anyone</p>`
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ msg: "something happend" })
    }
})

