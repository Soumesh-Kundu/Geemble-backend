import express from 'express'
import {authenticate,upload}from '../middleware/index.js'
import Post from '../models/Post.js'
import User from '../models/User.js'
import { unlink } from 'fs/promises'

export const route=express.Router()

route.get('/',(req,res)=>{
    res.send("this is from post route")
})

route.post("/create",authenticate,upload.single('uploadImage'),async(req,res)=>{
    let success=false
    try {
        const user=req.user.id
        const userPromise=User.findById(user)
        const PostObject={}
        if(req.file?.path){
            PostObject.postedImage=req.file.path.replace(/\\/g,'/')
        }
        if(req.body.caption){
            PostObject.caption=req.body.caption
        }
        const {username}=await userPromise
        await Post.create({
            user,username,...PostObject
        })
        success=true
        res.status(200).json({success,messege:"Your post has uploaded"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success,Error: "Some Error has occured" })  
    }
})

route.patch('/update/:id',authenticate,async(req,res)=>{
    let success=false
    try {
        const id=req.params.id
        const caption=req.body.caption
        const post= await Post.findById(id)
        if(post.user.toString()!==req.user.id){ 
            return res.status(401).json({success,error:"Not Allowed!"})
        }
        await Post.findByIdAndUpdate(id,{$set:{caption}})
        success=true
        res.status(200).json({success,messege:"Your post has updated"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success,Error: "Some Error has occured" })  
    }
})

route.delete('/delete/:id',authenticate,async(req,res)=>{
    let success=false
    try {
        const id=req.params.id
        const post=await Post.findById(id)
        if(post.user.toString()!==req.user.id){ 
            return res.status(401).json({success,error:"Not Allowed!"})
        }
        unlink(post.postedImage)
        await Post.findByIdAndDelete(id)
        success=true
        res.status(200).json({success,messege:"Post Deleted"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success,Error: "Some Error has occured" })  
    }
})

route.get('/getPosts',authenticate,async(req,res)=>{
    let success=false
    try {
        const {page, limit}=req.query
        const postsPromise=Post.find().sort('-Date').skip((page-1)*limit).limit(limit)
        const totalPostsPromise=Post.find().countDocuments()
        const [posts,totalsPosts]=await Promise.all([postsPromise,totalPostsPromise])
        success=true
        res.status(200).json({
            success,
            totalsPosts,
            hasNext:page*limit<totalsPosts?true:false,
            hasPrevios:page>1?true:false,
            posts
        })
        
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success,Error: "Some Error has occured" }) 
    }
})

route.get('/getPosts/:username',authenticate,async(req,res)=>{
    let success=false
    try {
        const username=req.params.username
        const {page, limit}=req.query
        const postsPromise=Post.find({username}).sort('-Date').skip((page-1)*limit).limit(limit)
        const totalPostsPromise=Post.find({username}).countDocuments()
        const [posts,totalsPosts]=await Promise.all([postsPromise,totalPostsPromise])
        success=true
        res.status(200).json({
            success,
            totalsPosts,
            hasNext:page*limit<totalsPosts?true:false,
            hasPrevios:page>1?true:false,
            posts
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success,Error: "Some Error has occured" }) 
    }
})

route.post('/liked/:id',authenticate,async(req,res)=>{
    let success=false
    try {
        const id=req.params.id
        const {username}=req.body
        const post=await Post.findById(id)
        let liked= post.likes.find(data=>data.user===username)?true:false
        if(liked){
            await Post.findByIdAndUpdate(id,{$pull:{likes:{user:username}}})
        }
        else{
            await Post.findByIdAndUpdate(id,{$push:{likes:{user:username}}})
        }
        success=true
        res.status(200).json({success,messege:`You liked a post from ${post.username}`})
    } 
    catch (error) {
        console.log(error)
        return res.status(500).json({ success,Error: "Some Error has occured" }) 
    }
})


route.post('/comment/:id',authenticate,async(req,res)=>{
    let success=false
    try {
        const id=req.params.id
        const {username,profilePicture}=await User.findById(req.user.id)
        const commentObject={
            username,
            profilePicture,
            comment:req.body.comment
        }
        const UpdatePost=await Post.findByIdAndUpdate(id,{$push:{comments:commentObject}})
        success=true
        res.status(200).json({success,messege:`You commented on a post from ${UpdatePost.username}`})
    } 
    catch (error) {
        console.log(error)
        return res.status(500).json({ success,Error: "Some Error has occured" }) 
    }
})

route.delete('/comment/:id',authenticate,async(req,res)=>{
    let success=false
    try {
        const id=req.params.id
        const comment_id=req.query.commentId
        let post= await Post.findById(id)
        let unauthorized=post.comments.find(data=>data.username===req.body.username&&data._id.toString()===comment_id)?false:true
        if(unauthorized){ 
            return res.status(401).json({success,error:"Not Allowed!"})
        }
        await Post.findByIdAndUpdate(id,{$pull:{comments:{_id:comment_id}}},{new:true})
        success=true
        res.status(200).json({success,messege:`You deleted your comment from this post of ${post.username}`})
    } 
    catch (error) {
        console.log(error)
        return res.status(500).json({ success,Error: "Some Error has occured" }) 
    }
})