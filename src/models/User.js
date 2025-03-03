import mongoose from 'mongoose'

const UserSchema= mongoose.Schema({
    name:{type:String,required:true},
    username:{type:String,required:true,unique:true},
    email:{type:String,required:true,unique:true},
    bio:{type:String},
    imageRef:{type:String},
    gender:{type:String,required:true},
    password:{type:String,required:true},
    profilePicture:{type:String,default:""},
    verified:{type:Boolean,default:false},
})

export default mongoose.model('User',UserSchema)