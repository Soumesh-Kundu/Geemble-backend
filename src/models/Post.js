import mongoose from 'mongoose'

const PostSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    profilePicture:{type:String,required:true},
    caption: { type: String },
    postedImage: { type: String },
    imageRef:{type:String},
    Date: { type: Date, default: Date.now },
    likes: {
        type: [{
            profilePicture: { type: String, required: true },
            user: { type: String, unique: true, required: true }
        }], default: []
    },
    comments: {
        type: [{
            username: String,
            profilePicture: String,
            comment: String,
            Date: { type: Date, default: Date.now }
        }], default: []
    }
})

export default mongoose.model('Post', PostSchema)