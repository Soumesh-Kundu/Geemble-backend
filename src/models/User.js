import mongoose from 'mongoose'

const UserSchema= mongoose.Schema({
    name:{type:String,require:true},
    username:{type:String,require:true},
    email:{type:String,require:true},
    password:{type:String,require:true},
    profilePicture:{type:String},
    verifed:{type:Boolean,default:false},
})

export default mongoose.model('User',UserSchema)