import express from 'express'
import User from '../models/User.js'
import {body,validationResult} from 'express-validator'

export const route=express.Router()

route.get('/',(req,res)=>{
    res.send("this is from auth route")
})

route.get('/register',async (req,res)=>{
    const {name,username,email,password}=req.body
    let success=false
    try {
        
    } catch (error) {
        
    }
})
