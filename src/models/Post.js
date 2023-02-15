import mongoose from 'mongoose'

const PostSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    caption: { type: String, require: true },
    postImage: { type: String },
    likes:{type:[{
        user: { type: String }
    }],default:[]}
})

export default mongoose.model('Post', PostSchema)