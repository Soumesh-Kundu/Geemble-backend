import google from '@googleapis/gmail'
import Credentials from '../../Credentials.json' assert {type:'json'}
import {config} from 'dotenv'

config()
const {client_id,client_secret,redirect_uris}=Credentials.web
const Oauth2Client=new google.auth.OAuth2(client_id,client_secret,redirect_uris[0])

Oauth2Client.setCredentials({refresh_token:process.env.GMAIL_REFRESH_TOKEN})
const gmail=google.gmail({
    version:'v1',
    auth:Oauth2Client
})

function makebody({to,from,subject,body}){
    const str = [
        "Content-Type: text/html; charset=\"UTF-8\"\n",
        "MIME-Version: 1.0\n",
        "Content-Transfer-Encoding: 7bit\n",
        "to: ", to, "\n",
        "from: ", from, "\n",
        "subject: ", subject, "\n\n",
        body
    ].join("")
    return new Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
}



export default async function mailSender(mailBody){
    const raw=makebody(mailBody)
    
    const {data:{id}}=await gmail.users.messages.send({
        userId:"me",
        resource:{
            raw
        }
    })
    console.log(id)
}
