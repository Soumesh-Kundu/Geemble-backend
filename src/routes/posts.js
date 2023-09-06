import express from 'express'
import { authenticate, upload } from '../middleware/index.js'
import Post from '../models/Post.js'
import User from '../models/User.js'
import { unlink } from 'fs/promises'
import sharp from 'sharp'
import { ref, getStorage, uploadBytes,getDownloadURL,deleteObject } from 'firebase/storage'

export const route = express.Router()

route.get('/', (req, res) => {
    res.send("this is from post route")
})

route.post("/create", authenticate, upload.single('uploadImage'), async (req, res) => {
    let success = false
    try {
        const user = req.user.id
        const userPromise = User.findById(user)
        const PostObject = {}
        if (req.file!==undefined) {
            const storage = getStorage()
            const filename = `${new Date().toISOString()}-${req.file.originalname.split('.')[0]}.webp`
            const fileRefName=`posts/${filename}`
            const fileRef = ref(storage, fileRefName)
            const imageData = await sharp(req.file.buffer).webp({ quality: 10 }).toBuffer()
            const imageUin8=new Uint8Array(Buffer.from(imageData))
            
            await uploadBytes(fileRef,imageUin8,{contentType:'image/webp'})
            const url=await getDownloadURL(fileRef)
            PostObject.imageRef=fileRefName
            PostObject.postedImage = url
        }
        if (req.body.caption) {
            PostObject.caption = req.body.caption
        }
        const { username, profilePicture } = await userPromise
        await Post.create({
            user, username, profilePicture, ...PostObject
        })
        success = true
        res.status(200).json({ success, messege: "Your post has uploaded" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.patch('/update/:id', authenticate, async (req, res) => {
    let success = false
    try {
        const id = req.params.id
        const caption = req.body.caption
        const post = await Post.findById(id)
        if (post.user.toString() !== req.user.id) {
            return res.status(401).json({ success, error: "Not Allowed!" })
        }
        await Post.findByIdAndUpdate(id, { $set: { caption } })
        success = true
        res.status(200).json({ success, messege: "Your post has updated" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.delete('/delete/:id', authenticate, async (req, res) => {
    let success = false
    try {
        const id = req.params.id
        const post = await Post.findById(id)
        if (post.user.toString() !== req.user.id) {
            return res.status(401).json({ success, error: "Not Allowed!" })
        }
        if (post.imageRef) {
            const fileNameRef=post.imageRef
            const storage=getStorage()
            const fileRef=ref(storage,fileNameRef)
            await deleteObject(fileRef)
        }
        await Post.findByIdAndDelete(id)
        success = true
        res.status(200).json({ success, messege: "Post Deleted" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.get('/getPosts', authenticate, async (req, res) => {
    let success = false
    try {
        const { page, limit } = req.query
        const postsPromise = Post.find().sort('-Date').skip((page - 1) * limit).limit(limit)
        const totalPostsPromise = Post.find().countDocuments()
        const [posts, totalsPosts] = await Promise.all([postsPromise, totalPostsPromise])
        success = true
        res.status(200).json({
            success,
            totalsPosts,
            nextPage: page * limit < totalsPosts ? parseInt(page) + 1 : undefined,
            previosPage: page > 1 ? parseInt(page) - 1 : undefined,
            posts
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.get('/getPosts/:username', authenticate, async (req, res) => {
    let success = false
    try {
        const username = req.params.username
        const { page, limit } = req.query
        const postsPromise = Post.find({ username }).sort('-Date').skip((page - 1) * limit).limit(limit)
        const totalPostsPromise = Post.find({ username }).countDocuments()
        const [posts, totalsPosts] = await Promise.all([postsPromise, totalPostsPromise])
        success = true
        res.status(200).json({
            success,
            totalsPosts,
            nextPage: page * limit < totalsPosts ? parseInt(page + 1) : undefined,
            previosPage: page > 1 ? parseInt(page) - 1 : undefined,
            posts
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.post('/liked/:id', authenticate, async (req, res) => {
    let success = false
    try {
        const id = req.params.id
        const { username, profilePicture } = req.body
        const post = await Post.findById(id)
        let liked = post.likes.find(data => data.user === username) ? true : false
        if (liked) {
            await Post.findByIdAndUpdate(id, { $pull: { likes: { user: username } } })
        }
        else {
            await Post.findByIdAndUpdate(id, { $push: { likes: { user: username, profilePicture } } })
        }
        success = true
        res.status(200).json({ success, messege: `You liked a post from ${post.username}` })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})


route.post('/comment/:id', authenticate, async (req, res) => {
    let success = false
    try {
        const id = req.params.id
        const { username, profilePicture, comment } = req.body
        const commentObject = {
            username,
            profilePicture,
            comment
        }
        const UpdatePost = await Post.findByIdAndUpdate(id, { $push: { comments: commentObject } }, { new: true })
        success = true
        res.status(200).json({ success, comments: UpdatePost.comments })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.delete('/comment/:id', authenticate, async (req, res) => {
    let success = false
    try {
        const id = req.params.id
        const comment_id = req.query.commentId
        let postPromise = Post.findById(id)
        let userPromise = User.findById(req.user.id)
        const [post, user] = await Promise.all([postPromise, userPromise])

        let unauthorized = post.comments.find(data => data.username === user.username && data._id.toString() === comment_id) ? false : true
        if (unauthorized) {
            return res.status(401).json({ success, error: "Not Allowed!" })
        }
        const newPost = await Post.findByIdAndUpdate(id, { $pull: { comments: { _id: comment_id } } }, { new: true })
        success = true
        res.status(200).json({ success, comments: newPost.comments })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})