import express from 'express'

export const route=express.Router()

route.get('/',(req,res)=>{
    res.send("this is from user route ")
})

