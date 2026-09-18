import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true  //---index bohot soch samjhe ke rahkha jata hai or index rah e databse me seraching me aajata hai
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String,  //cloudinary url
            required: true
        },
        coverImage: {
            type: String,
        },
        watchHistory: [
            {
                type: Schema.Type.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required: [true,"Password is required"]
        },
        refreshToken: {
            type:String
        }
    },{timestamps: true})

//we used hok like widdleware "pre" matlab ki database me save hne se phale encrypt hjaye wagera something
//pre me kabhi bhi call function arrow me mat likhna
//jab bhi password file ko chage ya save karu tabhi wor kare nahi name chage are toh pass fir se hash ho

userSchema.pre("save", async function (next){
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    //10 matalb 10 time ho encrypt kare ga tum log ke uper 10 lena hai ki 2 lena hai
    next()
})
//custom method
//password check
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password,this.password)// toh ye true ya fasle bhej de ga agar matched hogya toh true ahi fasle
}

//TOKEN ke liye
//doo jwt ten hai
userSchema.methods.generateAccessToken = function (){
    return  jwt.sign({
        //isse payload bool te hai
        //this. kyu use kar rahe kyu ki this. database se data lekar aaraha hai
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
)
}
userSchema.methods.generateRefreshToken = function (){
    return  jwt.sign({
        _id: this._id,
        
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    })
}

export const User = mongoose.model("User",userSchema);