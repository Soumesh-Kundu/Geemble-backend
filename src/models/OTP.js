import mongoose from 'mongoose'

const OTPSchema = mongoose.Schema({
    secret:{type:String,require:true},
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_At:{type:Date,default:Date.now},
})

export default mongoose.model('OTP', OTPSchema)