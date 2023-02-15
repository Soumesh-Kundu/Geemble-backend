import mongoose from 'mongoose'

const PostSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    caption: { type: String, required: true },
    postImage: { type: String },
    Date:{type:Date,default:Date.now},
    likes:{type:[{
        user: { type: String }
    }],default:[]}
})

export default mongoose.model('Post', PostSchema)