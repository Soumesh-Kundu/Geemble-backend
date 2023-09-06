import express from 'express'
import dotenv from 'dotenv'
import connectToDB from './db.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import {route as userRoute}  from './routes/user.js'
import {route as postRoute}  from './routes/posts.js'
import {route as authRoute}  from './routes/auth.js'
import InitFirebase from './helpers/firebase.js'
dotenv.config()

const app=express()
const PORT=process.env.PORT ?? 5000
connectToDB()

app.use(cors())
app.use(cookieParser())
app.use(express.json())
InitFirebase()

app.use('/api/uploads',express.static('uploads'))
app.use('/api/auth',authRoute)
app.use('/api/user',userRoute)
app.use('/api/posts',postRoute)
app.get('/',(req,res)=>{
    return res.cookie('hello',"world").json({hello:"world"})
})

app.listen(PORT,()=>{
    console.log(`server is running on http://localhost:${PORT}`)
})