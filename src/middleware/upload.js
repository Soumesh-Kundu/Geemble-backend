import multer from "multer";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if(req.baseUrl==='/api/user')
        {
            cb(null, 'uploads/users/')
        }
        if(req.baseUrl==='/api/posts'){
            cb(null, 'uploads/posts/')
        }
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname)
    }
})
const upload = multer({ storage: storage })

export default upload