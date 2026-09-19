import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

//access and refresh
const generateAccessAndRefereshTokens = async(userId) => 
{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false })

        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    //basic code to see on postman
    // res.status(200).json({
    //     message: "ok"
    // })
    // step:
    // 1.get user details from frontend
    // 2.validation - ot empty
    // 3.check if user already exist: username,email
    // 4.check for images, check for avatar
    // 5.upload them to cloudinary, avatar
    // 6.create user object - create entry in db
    // 7.remove password and refresh tokken field from response
    // 8.check for user creation
    // 9.return res

    const {fullName, email, username, password} = req.body
    //console.log("email:", email);

    //yese if else kar ke ek he check huwa ye first method hai check karne ka
    // if (fullName === ""){
    //     throw new ApiError(400, "fullname is required")
    // }

    //2nd method validation
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, " All fields are required")
    }

    //yaha pe hame chec kar rahe hai ki email already use toh ahi huwa hai ya username pheler se ya ye usser alraedy toh nahi hai
    //jaha jaha User ko call kare ge huwa mongoose automic call hoga oske baad o mongodb ko call kkare ga aur check karega
    // $ se ham bohot sare oprator use kar sakte hai
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    //jitna ho sake otna console.log karo
    //server ka file ka path
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path; iso niche wale jese likh sakte hai

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    //cloudinary pe upload
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    //user create in database
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //check user are created i database aur ot also chec if created then that was not emty string toh nahi hai
    //.select method se select karo ki tumhe ko sa filed nahi chahiye jese hata na hai pass etc
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    //repose o retur are ge
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )
})

// here we write login code
const loginUser = asyncHandler( async (req, res) => {
    //Todos
    //req body se data lekar aao
    const {email, username, password} = req.body
    // username ya email

    if (!(username || email)) {
        throw new ApiError(400,"username or email is required")
    }
    // find user
    // $ ka sig e mongodb ka opertor hai
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) {
        throw new ApiError(404, "User does ot exist")
    }
    //password check
    //yaha pe User ye wal nahi use kara ku ki ye mogoose ka hai hame mogdb ne jo retu kiya hai o ham use kar sakte hai
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }
    //access and refresh token generated tab user ko sed kar do cooies ke from me ye bohot use hota hai toh ye ham e method ya function bana lete hai os ko call kar lege toh top pe bana raha hu with name access and refresh
    //see top then use here
    const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    //user ko kya kya bhej na hai data
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    // send secure cookies
    const options = {
        httpOnly: true,
        secure: true // isse hame bus server se modifye kar sate hai froontend se kyu hame secure true kiya hai iss liye
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,accessToken,refreshToken
            },
            "User logged In Successfully"
        )
    )

})

//logged out User code
const logoutUser = asyncHandler( async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true // isse hame bus server se modifye kar sate hai froontend se kyu hame secure true kiya hai iss liye
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200,{},"User logged Out"))
})

export { 
    registerUser, 
    loginUser,
    logoutUser
}