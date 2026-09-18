import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
    console.log("email:", email);

    //yese if else kar ke ek he check huwa ye first method hai check karne ka
    // if (fullName === ""){
    //     throw new ApiError(400, "fullname is required")
    // }

    //2nd method validation
    if (
        [fullName, email, username, password].some(() => field?.trim() === "")
    ) {
        throw new ApiError(400, " All fields are required")
    }

    //yaha pe hame chec kar rahe hai ki email already use toh ahi huwa hai ya username pheler se ya ye usser alraedy toh nahi hai
    //jaha jaha User ko call kare ge huwa mongoose automic call hoga oske baad o mongodb ko call kkare ga aur check karega
    // $ se ham bohot sare oprator use kar sakte hai
    const exsitedUser = User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    //jitna ho sake otna console.log karo
    //server ka file ka path
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw ApiError(400, "Avatar file is required")
    }

    //cloudinary pe upload
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw ApiError(400, "Avatar file is required")
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

export { registerUser, }