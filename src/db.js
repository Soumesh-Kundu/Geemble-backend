import mongoose from 'mongoose'
const mongoURL=process.env.DB_URL

export default function connectToDB(){
    mongoose.set('strictQuery',false);
    mongoose.connect(mongoURL,{
        useNewUrlParser: true,
        useUnifiedTopology: true
    },()=>{
        console.log("connected to database");
    })
}

