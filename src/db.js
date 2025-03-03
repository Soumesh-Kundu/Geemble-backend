import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()
const mongoURL=process.env.DB_URL

export default function connectToDB(){
    mongoose.set('strictQuery',false);
    mongoose.connect(mongoURL,{
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    mongoose.connection.on('connected',()=>{
        console.log('database connected')
    })
    mongoose.connection.on('error',()=>{
        console.log(`database couldn't connected`)
    })
}

