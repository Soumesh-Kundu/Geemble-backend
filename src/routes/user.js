import express from 'express'
import { authenticate, upload } from '../middleware/index.js'
import User from '../models/User.js'
import Posts from '../models/Post.js'
import OTP from '../models/OTP.js'
import { OTPGenerator, mailsender, OtpVerifier } from '../helpers/index.js'
import { unlink } from 'fs/promises'
import OTPcheck from '../middleware/OTPcheck.js'
import bcrypt from 'bcrypt'
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'
import sharp from 'sharp'

export const route = express.Router()

route.get('/', (req, res) => {
    res.send("this is from user route ")
})

route.get('/getDetails', authenticate, async (req, res) => {
    let success = false
    try {
        const _id = req.user.id
        const user = await User.findById(_id).select('-password -imageRef')
        success = true
        return res.status(200).json({
            success,
            result: user
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.patch('/update', authenticate, async (req, res) => {
    let success = false
    try {
        if (req.body.username !== undefined) {
            const user = await User.findOne({ username: req.body.username })
            console.log(user)
            if (user !== null) {
                return res.status(403).json({ success, error: "username is already taken" })
            }
        }
        await User.findByIdAndUpdate(req.user.id, { $set: { ...req.body } })
        success = true
        return res.status(200).json({ success, messege: "Your profile is been updated" })
    }
    catch (err) {
        console.log(err)
        if (err.keyPattern?.email) {
            return res.status(401).json({ success, Error: "Email already exists" })
        }
        if (err.keyPattern?.username) {
            return res.status(400).json({ success, Error: "username is already taken" })
        }
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})


route.post('/verify', authenticate, OTPcheck, async (req, res) => {
    let success = false
    try {
        const codeId = req.OTP_secret.id
        const id = req.user.id
        const { token } = req.body
        const code = await OTP.findById(codeId)
        if (!code) {
            return res.status(401).json({ success, error: "OTP doesn't exist" })
        }
        if (code.user.toString() !== id) {
            return res.status(401).json({ success, error: "Unauthorized access" })
        }
        if (Date.now() - code.created_At > 60000) {
            res.status(408).json({ success, error: "OTP has expired" })
            await OTP.findByIdAndDelete(code.id)
            return
        }
        const verified = OtpVerifier(code.secret, token)
        if (!verified) {
            return res.status(400).json({ success, error: "OTP is incorrect" })
        }
        await User.findByIdAndUpdate(req.user.id, { $set: { verified: true } }, { new: true })
        success = true
        res.status(200).clearCookie('OTPtoken').json({ success, messege: "you have verified" })
        await OTP.findByIdAndDelete(code.id)
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})
route.post('/resend', authenticate, OTPcheck, async (req, res) => {
    let success = false
    try {
        const codeId = req.OTP_secret.id
        const userid = req.user.id
        const { secret, token } = OTPGenerator()
        const OTPdoc = await OTP.findByIdAndUpdate(codeId, { $set: { secret, created_At: Date.now() } })
        const user = await User.findById(userid)
        if (OTPdoc.user.toString() !== userid) {
            return res.status(200).json({ success, error: "Unauthorized" })
        }
        success = true
        await mailsender({
            from: "Resend Verfication Email<noreply.geemble@gmail.com>",
            to: user.email,
            subject: 'Verfication email',
            body: `<html lang="en">
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <style>
                .main-body {
                  margin: 0 auto;
                  max-width: 1070px;
                  font-weight: 500;
                  font-size: 16px;
                }
                .logo p {
                  font-weight: 600;
                  display: table-cell;
                  vertical-align: middle;
                  font-size: 25px;
                  margin: 0;
                  padding-left: 5px;
                }
                .main-body .main-content {
                  margin-top: 10px;
                  border: 1px solid gray;
                  border-radius: 4px;
                  padding: 25px 50px;
                }
                .main-body .token {
                  padding: 12px 15px;
                  width: auto;
                  font-size: 20px;
                  margin: 20px auto;
                  font-weight: 600;
                  background-color: rgb(12, 97, 255);
                  color: white;
                  border-radius: 12px;
                  display: inline-block;
          
                }
                .outer-token{
                  width:100%;
                  text-align: center;
                }
                .logo {
                  height: 50px;
                  display: table;
                }
                @media only screen and (max-width: 678px) {
                  .main-body {
                    font-size: 10px;
                  }
                  .main-body .main-content {
                    padding: 20px;
                  }
                  .logo p{
                    font-size: 18px;
                  }
                  .main-body .token{
                    font-size: 12px;
                  }
                }
              </style>
            </head>
            <body>
              <div class="main-body" >
                <div class="logo" >
                  <img src="${process.env.LOGO_URL}/Geemble_Logo.png"  alt="logo" width="50" height="50">
                    <p> eemble</p>
                </div>
                <div class="main-content">
                  <p>Hi, ${user.name}</p>
                  <p>Thank you for registering yourself in <span style="font-weight: 700;"> Geemble </span>. A new OTP is resended to you use this to verify yourself in the verify page. This OTP is only valid for 60 seconds.</p>
                  <div class="outer-token">
                    <div class='token' >
                      ${token}
                    </div> 
                  </div>
                  <p>Regards,
                    <span style="font-weight: 700;display: block;">Geemble</span>
                  </p>
                </div>
              </div>
            </body>
          </html>
          `
        })
        return res.status(200).json({ success, msg: 'OTP resended' })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ msg: "something happend" })
    }
})

route.get('/searchUser', authenticate, async (req, res) => {
    let success = false
    try {
        const username = req.query.username
        if (!username.length) {
            success = true
            return res.status(200).json({
                success,
                totalResults: username.length,
                result: []
            })
        }
        const regex = new RegExp('^' + username)
        const users = await User.find({ username: { $regex: regex } }).select('-password -verified -email -imageRef').then(datas => datas.filter(data => data.id !== req.user.id))
        success = true
        res.status(200).json({
            success,
            totalResults: users.length,
            result: users.length ? users : null
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.get('/getUser/:username', authenticate, async (req, res) => {
    let success = false
    try {
        const username = req.params.username
        const user = await User.findOne({ username }).select('-password -verified -email  -imageRef')
        success = true
        res.status(200).json({
            success,
            user
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.post('/changeDP', authenticate, upload.single('uploadImage'), async (req, res) => {
    let success = false
    try {
        const filename=`${new Date().toISOString()}-${req.file.originalname}`
        const user = await User.findById(req.user.id)
        const previosRef=user.imageRef
        const storage=getStorage()
        const imageFileRef=`users/${filename}`
        const imageRef=ref(storage,imageFileRef)
        let imageData=await sharp(req.file.buffer).webp({quality:20}).toBuffer()
        imageData=new Uint8Array(Buffer.from(imageData))
        await uploadBytes(imageRef,imageData,{contentType:'image/webp'})
        const url=await getDownloadURL(imageRef)
        const userPromise=User.findByIdAndUpdate(user.id,{$set:{ profilePicture: url,imageRef:imageFileRef }})
        const postPromise=Posts.updateMany({user:user.id},{$set:{profilePicture:url}})
        await Promise.all([userPromise,postPromise])
        if (previosRef!== undefined) {
            const previosImgRef=ref(storage,previosRef)
            await deleteObject(previosImgRef)
        }
        success = true
        res.status(200).json({ success, messege: "Dp changed" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.post('/newpassword', authenticate, async (req, res) => {
    let success = false
    try {
        const { newpassword } = req.body
        const salt = await bcrypt.genSalt(15)
        const password = await bcrypt.hash(newpassword, salt)
        await User.findByIdAndUpdate(req.user.id, { $set: { password } })
        success = true
        return res.status(200).json({ success, messege: "Password has been changed" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success, Error: "Some Error has occured" })
    }
})
