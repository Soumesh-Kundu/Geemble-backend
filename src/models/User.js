import mongoose from 'mongoose'

const UserSchema= mongoose.Schema({
    name:{type:String,required:true},
    username:{type:String,required:true,unique:true},
    email:{type:String,required:true,unique:true},
    password:{type:String,required:true},
    profilePicture:{type:String,default:""},
    verified:{type:Boolean},
})

export default mongoose.model('User',UserSchema)