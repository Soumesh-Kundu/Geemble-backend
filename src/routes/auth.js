import express from 'express'
import User from '../models/User.js'
import OTP from '../models/OTP.js'
import dotenv from 'dotenv'
dotenv.config()
import { authenticate } from '../middleware/index.js'
import { mailsender, OTPGenerator, OtpVerifier } from '../helpers/index.js'
import { body, validationResult } from 'express-validator'
import bcrypt from 'bcrypt'
import JWT from 'jsonwebtoken';
import OTPcheck from '../middleware/OTPcheck.js'

export const route = express.Router()
const JWT_SECRET = process.env.JWT_SECRET
const maleDefault = new Array(3).fill("").map((_, index) => `uploads/defaults/male${index + 1}.png`)
const femaleDefault = new Array(4).fill("").map((_, index) => `uploads/defaults/female${index + 1}.png`)
route.get('/', (req, res) => {
    res.send("this is from auth route")
})

route.post('/register', [
    body('name', 'Enter a Valid Name').isLength({ min: 3 }),
    body('username', 'Enter a Valid Name').isLength({ min: 5, max: 13 }),
    body('email', 'Enter a Valid Email').isEmail(),
    body('password', 'Password must be more than 8 Characters').isLength({ min: 5 })
], async (req, res) => {
    const errors = validationResult(req)
    let success = false
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        console.log('hello')
        const { name, username, email, password, gender } = req.body
        let user = await User.find({ $or: [{ email }, { username }] })
        if (user.length) {
            const sameEmail = user.find((data) => data.email == email)
            const sameUserName = user.find((data) => data.username == username)
            if (sameEmail) {
                return res.status(400).json({ success, email: true, error: "Sorry but this user already exists" })
            }
            if (sameUserName) {
                return res.status(400).json({ success, username: true, error: "username is already taken" })
            }
        }
        const salt = await bcrypt.genSalt(15)
        const secPass = await bcrypt.hash(password, salt)
        const random = Math.floor(Math.random() * 4)
        const profilePicture = gender === 'male' ? maleDefault[random] : femaleDefault[random]
        const response = await User.create({
            name, username, email, password: secPass, gender, profilePicture
        })
        const { secret, token } = OTPGenerator()
        const code = await OTP.create({ secret, user: response.id })
        const data = {
            user: {
                id: response.id
            }
        }
        const Otp = {
            token: {
                id: code.id
            }
        }
        success = true
        const authToken = JWT.sign(data, JWT_SECRET)
        const OTPtoken = JWT.sign(Otp, JWT_SECRET)
        await mailsender({
            from: "Verfication Email<noreply.geemble@gmail.com>",
            to: response.email,
            subject: 'Verfication email',
            body: ` <html lang="en">
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
                  <di class="logo" >
                    <img src="${process.env.LOGO_URL}/Geemble_Logo.png"  alt="logo" width="50" height="50">
                      <p> eemble</p>
                  </di>
                  <div class="main-content">
                    <p>Hi, ${name}</p>
                    <p>Thank you for registering yourself in <span style="font-weight: 700;"> Geemble </span>. Use this OTP to verify yourself in the verify page. This OTP is only valid for 60 seconds.</p>
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
       return res.status(201).json({ success, authToken, OTPtoken })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.post('/login', [
    body('username', 'Enter a Valid Name').isLength({ min: 8 }),
    body('password', 'Password must be more than 8 Characters').isLength({ min: 5 })
], async (req, res) => {
    const errors = validationResult(req)
    let success = false
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { username, password } = req.body
        const user = await User.findOne({ username })
        if (!user) {
            return res.status(400).json({ success, error: "Please type correct credentials" })
        }
        const passwordCheck = await bcrypt.compare(password, user.password)
        if (!passwordCheck) {
            return res.status(400).json({ success, error: "Please type correct credentials" })
        }
        const data = {
            user: {
                id: user.id
            }
        }
        success = true
        const authToken = JWT.sign(data, JWT_SECRET)
        res.status(200).json({ success, authToken })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.post('/forgetPassword', [body('email', 'Enter a Valid Email').isEmail()], async (req, res) => {
    let success = false
    try {
        const { email } = req.body
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(401).json({ success, error: "user doesn't exist" })
        }
        const { secret, token } = OTPGenerator()
        const code = await OTP.create({ secret, user: user.id })
        const Otp = {
            token: {
                id: code.id
            }
        }
        success = true
        const OTPtoken = JWT.sign(Otp, JWT_SECRET)
        
        await mailsender({
            from: "Password Reset Verification<noreply.geemble@gmail.com>",
            to: email,
            subject: 'Verify Yourself',
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
              <div class="main-body">
                <div class="logo">
                  <img src="${process.env.LOGO_URL}/Geemble_Logo.png" alt="logo" width="50" height="50" />
                  <p>eemble</p>
                </div>
                <div class="main-content">
                  <p>Hi, ${user.name}</p>
                  <p>
                    A forget password request has come from your
                    <span style="font-weight: 700"> Geemble </span> account. Use this OTP
                    to verify yourself in the verify page. This OTP is only valid for 60
                    seconds.
                  </p>
                  <div class="outer-token">
                    <div class="token" > ${token}</div>
                  </div>
                  <p>
                    if this is not you please contact
                    with the head developer,<strong> Soumesh </strong>
                  </p>
                  <p>
                    Regards,
                    <span style="font-weight: 700; display: block">Geemble</span>
                  </p>
                </div>
              </div>
            </body>
          </html>
          `
        })
        return res.status(200).json({ success, msg: "OTP sended", OTPtoken })
        console.log("sent")
    } catch (error) {
        console.log(error)
        res.status(500).json({ success, Error: "Some Error has occured" })
    }
})

route.post('/verify', OTPcheck, async (req, res) => {
    let success = false
    try {
        const codeId = req.OTP_secret.id
        const { token } = req.body
        const code = await OTP.findById(codeId)
        if (!code) {
            return res.status(401).json({ success, error: "OTP doesn't exist" })
        }
        if (Date.now() - code.created_At > 63500) {
            res.status(408).json({ success, error: "OTP has expired" })
            await OTP.findByIdAndDelete(code.id)
            return
        }
        const verified = OtpVerifier(code.secret, token)
        if (!verified) {
            res.status(400).json({ success, error: "OTP is incorrect" })
            return
        }
        const data = {
            user: {
                id: code.user
            }
        }
        success = true
        const authToken = JWT.sign(data, JWT_SECRET)
        res.status(200).json({ success, authToken })
        await OTP.findByIdAndDelete(code.id)
        return
    } catch (error) {
        console.log(error)
        res.status(500).json({ success, Error: "Some Error has occured" })
    }
})
route.post('/resend', OTPcheck, async (req, res) => {
    let success = false
    try {
        const codeId = req.OTP_secret.id
        const { OTPtoken } = req.cookies
        const { secret, token } = OTPGenerator()
        const code = await OTP.findByIdAndUpdate(codeId, { $set: { secret, created_At: Date.now() } }, { new: true })
        const user = await User.findById(code.user)
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
              <div class="main-body">
                <div class="logo">
                  <img src="${process.env.LOGO_URL}/Geemble_Logo.png" alt="logo" width="50" height="50" />
                  <p>eemble</p>
                </div>
                <div class="main-content">
                  <p>Hi, ${user.name}</p>
                  <p>
                    A forget password request has come from your
                    <span style="font-weight: 700"> Geemble </span> account. Use this OTP
                    to verify yourself in the verify page. This OTP is only valid for 60
                    seconds.
                  </p>
                  <div class="outer-token">
                    <div class="token" > ${token}</div>
                  </div>
                  <p><strong>This is a resended new OTP!</strong> if this is not you please contact
                    with the head developer,<strong> Soumesh </strong>
                  </p>
                  <p>
                    Regards,
                    <span style="font-weight: 700; display: block">Geemble</span>
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

