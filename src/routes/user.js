import express from 'express'
import { authenticate, upload } from '../middleware/index.js'
import User from '../models/User.js'
import Posts from '../models/Post.js'
import OTP from '../models/OTP.js'
import { OTPGenerator, mailsender, OtpVerifier } from '../helpers/index.js'
import { unlink } from 'fs/promises'
import OTPcheck from '../middleware/OTPcheck.js'
import bcrypt from 'bcrypt'

export const route = express.Router()

route.get('/', (req, res) => {
    res.send("this is from user route ")
})

route.get('/getDetails', authenticate, async (req, res) => {
    let success = false
    try {
        const _id = req.user.id
        const user = await User.findById(_id).select('-password')
        success = true
        return res.status(200).json({
            success,
            result: user
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.patch('/update', authenticate, async (req, res) => {
    let success = false
    try {
        if (req.body.username !== undefined) {
            const user = await User.findOne({username:req.body.username})
            console.log(user)
            if (user !== null) {
                return res.status(403).json({ success, error: "username is already taken" })
            }
        }
        await User.findByIdAndUpdate(req.user.id, { $set: { ...req.body } })
        success = true
        return res.status(200).json({ success, messege: "Your profile is been updated" })
    }
    catch (err) {
        console.log(err)
        if (err.keyPattern?.email) {
            return res.status(401).json({ success, Error: "Email already exists" })
        }
        if (err.keyPattern?.username) {
            return res.status(400).json({ success, Error: "username is already taken" })
        }
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})


route.post('/verify', authenticate, OTPcheck, async (req, res) => {
    let success = false
    try {
        const codeId = req.OTP_secret.id
        const id = req.user.id
        const { token } = req.body
        const code = await OTP.findById(codeId)
        if (!code) {
            return res.status(401).json({ success, error: "OTP doesn't exist" })
        }
        if (code.user.toString() !== id) {
            return res.status(401).json({ success, error: "Unauthorized access" })
        }
        if (Date.now() - code.created_At > 60000) {
            res.status(408).json({ success, error: "OTP has expired" })
            await OTP.findByIdAndDelete(code.id)
            return
        }
        const verified = OtpVerifier(code.secret, token)
        if (!verified) {
            return res.status(400).json({ success, error: "OTP is incorrect" })
        }
        await User.findByIdAndUpdate(req.user.id, { $set: { verified: true } }, { new: true })
        success = true
        res.status(200).clearCookie('OTPtoken').json({ success, messege: "you have verified" })
        await OTP.findByIdAndDelete(code.id)
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})
route.post('/resend', authenticate, OTPcheck, async (req, res) => {
    let success = false
    try {
        const codeId = req.OTP_secret.id
        const userid = req.user.id
        const { secret, token } = OTPGenerator()
        const OTPdoc =await OTP.findByIdAndUpdate(codeId, { $set: { secret, created_At: Date.now() } })
        const user=await User.findById(userid)
        if(OTPdoc.user.toString() !== userid){
            return res.status(200).json({success,error:"Unauthorized"})
        }
        success = true
        res.status(200).json({ success, msg: 'OTP resended',OTPtoken})
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

route.get('/searchUser', authenticate, async (req, res) => {
    let success = false
    try {
        const username = req.query.username
        if (!username.length) {
            success = true
            return res.status(200).json({
                success,
                totalResults: username.length,
                result: []
            })
        }
        const regex=new RegExp('^' + username)
        const users = await User.find({ username: { $regex: regex  } }).select('-password -verified -email -_id').then(datas => datas.filter(data => data.id !== req.user.id))
        success = true
        res.status(200).json({
            success,
            totalResults: users.length,
            result: users.length ? users : null
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.get('/getUser/:username', authenticate, async (req, res) => {
    let success = false
    try {
        const username = req.params.username
        const user = await User.findOne({ username }).select('-password -verified -email -_id')
        success = true
        res.status(200).json({
            success,
            user
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.post('/changeDP', authenticate, upload.single('uploadImage'), async (req, res) => {
    let success = false
    try {
        const filepath = req.file.path.replace(/\\/g, '/')
        const user = await User.findByIdAndUpdate(req.user.id, { $set: { profilePicture: filepath } })
        unlink(user.profilePicture)
        success = true
        await Posts.updateMany({user:user.id},{profilePicture:filepath})
        res.status(200).json({ success, messege: "Dp changed" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.post('/newpassword', authenticate, async (req, res) => {
    let success = false
    try {
        const { newpassword } = req.body
        const salt = await bcrypt.genSalt(15)
        const password = await bcrypt.hash(newpassword, salt)
        await User.findByIdAndUpdate(req.user.id, { $set: { password } })
        success = true
        return res.status(200).json({ success, messege: "Password has been changed" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success, Error: "Some Error has occured" })
    }
})