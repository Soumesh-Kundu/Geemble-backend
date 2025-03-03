import { initializeApp } from "firebase/app";
import { config } from "dotenv";

config()

const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
firebaseConfig["apiKey"] = process.env.FIREBASE_API_KEY;
export default function InitFirebase(){
    initializeApp(firebaseConfig)
    console.log('app initalized')
}