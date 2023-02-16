import express from 'express'
import { authenticate,upload } from '../middleware/index.js'
import User from '../models/User.js'
import OTP from '../models/OTP.js'
import {OTPGenerator,mailsender,OtpVerifier}from '../helpers/index.js'
import { unlink } from 'fs/promises'

export const route=express.Router()

route.get('/',(req,res)=>{
    res.send("this is from user route ")
})

route.get('/getDetails',authenticate,async (req,res)=>{
    let success=false
    try {
        const _id=req.user.id
        const user= await User.findById(_id).select('-password')
        success=true
        return res.status(200).json({
            success,
            result:user
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success,Error: "Some Error has occured" })   
    }
})

route.patch('/update',authenticate,async(req,res)=>{
    let success=false
    try{
        await User.findByIdAndUpdate(req.user.id,{$set:{...req.body}})
        success=true
        return res.status(200).json({success,messege:"Your profile is been updated"})
    }
    catch(err){
        console.log(err)
        if(err.keyPattern?.email){
           return  res.status(401).json({ success,Error: "Email already exists" })
        }
        if(err.keyPattern?.username)
        {
            return  res.status(400).json({ success,Error: "username is already taken" })
        }
        return res.status(500).json({ success,Error: "Some Error has occured" })
    }
})

route.get('/verifyUser',authenticate,async(req,res)=>{
    let success=false
    try {
        const id=req.user.id
        const {secret,token}=OTPGenerator()
        const codePromise=OTP.create({secret,token,user:id})
        const userPromise=User.findById(id)
        const code=await codePromise
        const user=await userPromise
        success=true
        res.status(200).json({success,OTP_Id:code.id})
        const {err}=await mailsender({
            from: "Verfication Email<iamsoumo26@gmail.com>",
            to: user.email,
            subject: 'Verfication email',
            html: `<p style="font-size:14px">Your OTP is <strong style="font-size:16px">${token}</strong>. This OTP will expire in 60 seconds. Don't Share this OTP with anyone</p>`
        })
        if(err){
            throw new Error(err)
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success,Error: "Some Error has occured" })   
    }
})

route.patch('/verified',authenticate,async(req,res)=>{
    let success=false
    try {
        const id= req.header('OTP_secret')
        const {token}=req.body
        const code=await OTP.findById(id)
        if(!code){
            return res.status(401).json({success,error:"OTP doesn't exist"})
        }
        if(Date.now()-code.created_At>60000){
            res.status(408).json({success,error:"OTP has expired"})
            await OTP.findByIdAndDelete(code.id)
            return
        }
        const verified=OtpVerifier(code.secret,token)
        if(!verified){
            return res.json(400).json({success,error:"OTP is incorrect"})
        }
        await User.findByIdAndUpdate(req.user.id,{$set:{verified:true}},{new:true})
        success=true
        res.status(200).json({success,messege:"you have verified"})
        await OTP.findByIdAndDelete(code.id)
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success,Error: "Some Error has occured" })   
    }
})

route.get('/searchUser',authenticate,async(req,res)=>{
    let success=false
    try {
        const username=req.query.username
        if(!username.length){
            return res.status(200).json({success,
                totalResults:username.length,
                result:null})
        }
        const users=await User.find({username:{$regex:username}}).select('-password -verified -email -_id').then(datas=>datas.filter(data=>data.id!==req.user.id))
        success=true
        res.status(200).json({
            success,
            totalResults:users.length,
            result:users.length?users:null
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success,Error: "Some Error has occured" })  
    }
})

route.get('/getUser/:username',authenticate,async(req,res)=>{
    let success=false
    try {
        const username=req.params.username
        const user=await User.findOne({username}).select('-password -verified -email -_id')
        success=true
        res.status(200).json({
            success,
            user
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success,Error: "Some Error has occured" })  
    }
})

route.post('/changeDP',authenticate,upload.single('uploadImage'),async(req,res)=>{
    let success=false
    try {
        const filepath=req.file.path.replace(/\\/g,'/')
        const user=await User.findByIdAndUpdate(req.user.id,{$set:{profilePicture:filepath}})
        unlink(user.profilePicture)
        success=true
        res.status(200).json({success,messege:"Dp changed"})
    } catch (error) {
        
    }
})