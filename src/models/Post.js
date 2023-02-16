import mongoose from 'mongoose'

const PostSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User',required:true },
    username:{type:String,required:true},
    caption: { type: String},
    postedImage: { type: String },
    Date:{type:Date,default:Date.now},
    likes:{type:[{
        user: { type: String }
    }],default:[]},
    comments:{
        type:[{
            id:mongoose.Schema.Types.ObjectId,
            username:String,
            profilePicture:String,
            Date:{type:String,default:Date.now}
        }],default:[]
    }
})

export default mongoose.model('Post', PostSchema)