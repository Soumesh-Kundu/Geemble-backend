import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
dotenv.config()
const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: '465',
    secure: true,
    auth: {
        user: process.env.COMPANY_EMAIL,
        pass: process.env.COMPANY_PASS
    }
})
export function mailsender(mailoptions){
    return new Promise((resolve,reject)=>{
        transport.sendMail(mailoptions,(err,info)=>{
            resolve({err})
        })
    })
}
export default mailsender