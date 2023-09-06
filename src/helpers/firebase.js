import { initializeApp } from "firebase/app";
import { config } from "dotenv";

config()
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: "file-upload-8d8f2.firebaseapp.com",
    projectId: "file-upload-8d8f2",
    storageBucket: "file-upload-8d8f2.appspot.com",
    messagingSenderId: "788432018755",
    appId: "1:788432018755:web:84cf5747d47b48f7bc63f6",
    measurementId: "G-XHMN37SD7L"
};

export default function InitFirebase(){
    initializeApp(firebaseConfig)
    console.log('app initalized')
}