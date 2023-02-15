import express from 'express'
import User from '../models/User.js'
import OTP from '../models/OTP.js'
import dotenv from 'dotenv'
dotenv.config()
import {authenticate} from '../middleware/index.js'
import {mailsender,OTPGenerator,OtpVerifier}from '../helpers/index.js'
import {body,validationResult} from 'express-validator'
import bcrypt from 'bcrypt'
import JWT from 'jsonwebtoken';

export const route=express.Router()
const JWT_SECRET=process.env.JWT_SECRET

route.get('/',(req,res)=>{
    res.send("this is from auth route")
})

route.post('/register',[
    body('name', 'Enter a Valid Name').isLength({ min: 3 }),
    body('username', 'Enter a Valid Name').isLength({ min: 8 }),
    body('email', 'Enter a Valid Email').isEmail(),
    body('password', 'Password must be more than 8 Characters').isLength({ min: 5 })
],async (req,res)=>{
    const errors=validationResult(req)
    let success=false
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const {name,username,email,password}=req.body
        let user=await User.findOne({email})
        if(user){
            return res.status(400).json({ success, error: "Sorry but this user already Exists" })
        }
        user=await User.findOne({username})
        if(user && username===user.username){
            return res.status(400).json({ success, error: "username is already taken" })
        }
        const salt = await bcrypt.genSalt(15)
        const secPass = await bcrypt.hash(password, salt)
        const response = await User.create({
            name,username, email, password: secPass,verified:false
        })
        const data = {
            user: {
                id: response.id
            }
        }
        success = true
        const authToken = JWT.sign(data, JWT_SECRET)
        res.status(201).json({ success, authToken })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success,Error: "Some Error has occured" })
    }
})

route.post('/login',[
    body('username', 'Enter a Valid Name').isLength({ min: 8 }),
    body('password', 'Password must be more than 8 Characters').isLength({ min: 5 })
],async (req,res)=>{
    const errors=validationResult(req)
    let success=false
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const {username,password}=req.body
        const user=await User.findOne({username})
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
        res.status(201).json({ success, authToken })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success,Error: "Some Error has occured" })
    }
})

route.post('/forgetPassword',[body('email', 'Enter a Valid Email').isEmail()],async(req,res)=>{
    let success=false
    try {
        const {email}=req.body
        const user= await User.findOne({email})
        if(!user){
            return res.status(401).json({success,error:"user doesn't exist"})
        }
        const {secret,token}=OTPGenerator()
        const code=await OTP.create({secret,token,user:user.id})
        success=true
        res.status(200).json({success,OTP_Id:code.id})
        const {err}=await mailsender({
            from: "Password Reset Verification<iamsoumo26@gmail.com>",
            to: email,
            subject: 'Verify Yourself',
            html: `<p style="font-size:14px">Your OTP is <strong style="font-size:16px">${token}</strong>. This OTP will expire in 60 seconds. Don't Share this OTP with anyone</p>`
        })
        if(err){
            throw new Error(err)
        }
        console.log("sent")
    } catch (error) {
        console.log(error)
        res.status(500).json({ success,Error: "Some Error has occured" })
    }
})

route.post('/verify',async (req,res)=>{
    let success=false
    try {
        const id= req.header('OTP_secret')
        if(!id){
            return res.status(200).json({success,error:"Unauthorized access"})
        }
        const {token}=req.body
        const code=await OTP.findById(id)
        if(!code){
            return res.status(401).json({success,error:"OTP doesn't exist"})
        }
        if(Date.now()-code.created_At>60000){
            return res.status(408).json({success,error:"OTP has expired"})
        }
        const verified=OtpVerifier(code.secret,token)
        if(!verified){
            return res.json(400).json({success,error:"OTP is incorrect"})
        }
        const data = {
            user: {
                id: code.user
            }
        }
        success = true
        const authToken = JWT.sign(data, JWT_SECRET)
        res.status(201).json({ success, authToken })
        await OTP.findByIdAndDelete(code.id)
    } catch (error) {
        console.log(error)
        res.status(500).json({ success,Error: "Some Error has occured" })
    }
})

route.post('/newpassword',authenticate,[body('password', 'Password must be more than 8 Characters').isLength({ min: 5 })],async(req,res)=>{
    let success=false
    try {
        const {newpassword}=req.body
        const salt = await bcrypt.genSalt(15)
        const password = await bcrypt.hash(newpassword, salt)
        await User.findByIdAndUpdate(req.user.id,{$set:{password}})
        success=true
        return res.status(200).json({success,messege:"Password has been changed"})
    } catch (error) {
        console.log(error)
        res.status(500).json({ success,Error: "Some Error has occured" })
    }
})