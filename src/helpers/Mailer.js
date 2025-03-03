import { Resend } from 'resend';
import { config } from 'dotenv';
config();
const sendMail = async (mailObject)=>{
    const resend = new Resend(process.env.RESEND_API_KEY);
    resend.emails.send(mailObject).then(item=>{
        console.log(item);
    }).catch((error)=>{
        console.log(error);
    });
};
export default sendMail;