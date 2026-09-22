import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

//access and refresh
const generateAccessAndRefereshTokens = async(userId) => 
{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken,refreshToken}
    } catch (error) {
        //console.log("ERROR ",error);
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

// here we write fr register
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
            $unset: {
                refreshToken: 1 // this removes the field from document
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

//refresh access token ka end point matlab routes add karna
const refreshAccessToken = asyncHandler( async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401,"Unauthorized request")
    }

    try {
            //verify
    const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decodedToken?._id)

    if (!user) {
        throw new ApiError(401,"Invalid refresh token")
    }

    //matching the refresh token
    if (incomingRefreshToken !== user?.refreshToken) {
        throw new ApiError(401,"Refresh token is expired or used")
    }

    const options = {
        httpOnly: true,
        secure: true
    }

    const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
        new ApiResponse(
            200,
            {accessToken,refreshToken: newRefreshToken},
            "Access token refreshed"
        )
    )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }

})

//password change karne ka code
const changeCurrentPassword = asyncHandler( async(req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400,"Invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"Password changed successfully")
    )
})

//agar user logged in hai to current user dekho
const getCurrentUser = asyncHandler( async(req, res) => {
    return res
    .status(200)
    .json(200, req.user,"Current user fetch successfully")
})

//kya kya user apna personal detailed update kar sakta hai
const updateAccountDetails = asyncHandler( async(req, res) => {
    const {fullName, email} = req.body  //yaha pe haqme user se kya kya le rahe hai change kare ke liye
    //or ha kahi pe file update kar rahe hai toh osse kahe or likh ke yaha use karo

    if(!(fullName || email)) {
        throw new ApiError(400,"All filed are required")
    }

    //agar fullname change karna hai toh user ko find kare ge and (req.user?._id) this is a query which we have to find
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {   //$set ye ek object retrun karta hai
            $set: {
                //ye dono likh ne ka tarika hai tum hara men jo kare wese likho
                fullName,
                email: email
            }
        },
        {new: true} // ye isse update hone ke baad return hoga
    ).select("-password") //jo jo select kare e return me hame pass nahi dega

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,user,"Account details updated successfully"
        )
    )

})

//file update here we will update avatar
const updateUserAvatar = asyncHandler( async(req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is missing")
    }

    //old avatar image ko delete here i have find old user
    const oldUser = await User.findById(req.user?._id)

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(401,"Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    //here i will delete old avatar image
    if (oldUser?.avatar) {
        await deleteFromCloudinary(oldUser.avatar)
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,user,"Avatar update successfully"
        )
    )
})

//here we will update coverImage
const updateUserCoverImage = asyncHandler( async(req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400,"coverImage file is missing")
    }

    //old avatar image ko delete here i have find old user
    const oldUser = await User.findById(req.user?._id)
    
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(401,"Error while uploading on coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    //here i will delete old cver image
    if (oldUser?.coverImage) {
        await deleteFromCloudinary(oldUser.coverImage)
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,user,"coverImage update successfully"
        )
    )
})

//agregation pipeline in mongodb
const getUserChannelProfile = asyncHandler( async(req, res) => {
    //agar kissi chanel a user ame nikal na hai toh kaha se mile ga toh o hame url se mile ga (params)
    const { username } = req.params

    //checking emmty toh nahi hai
    if (!username?.trim()) {
        throw new ApiError(400,"username is missing")
    }

    //toh hame idher ham aggregation pipeline laga ye ge or aggregation or ha aggregatetor ek method jo ki o Array leta hai
    // await User.aggregate([{},{},{} .....]) jo {} ye ek pipeline hai

    const channel = await User.aggregate([
        //this is first pipeline and ? ye ek optional hai ye ek safety measure hai agar kuch nahi mial toh zero aaye ga
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            //isse hame pta chale ge hamre itna subcribers hai
            $lookup: {
                from: "subscriptions", // kaha se
                localField: "_id",
                foreignField: "channel", //ye hame subscriptin model se laye hai
                as: "subscribers" // yaha jo name de na hai de do
            }
        },
        {
            $lookup: {
                from: "subscriptions", // kaha se
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo" // yaha jo name de na hai de do
            }
        },
        {
            //abh yaha dono fields ko add kare ge plus or bhi kuch sath me add are ga or retur katre ga
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    $size : "$subscribedTo"
                },
                //jo $in hai ye array or object me se dekh leta hai
                //user ko dihana hai na ki o subcribe kiya hai i nahi agar  iya hai toh osko true dekh nahi toh false
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id,"$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            //$project kya kar ta hai ye sare value ko project nahi karta j selcted hai bus ose project karta hai
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                coverImage: 1,
                avatar: 1,
                email: 1

            }
        }
    ])

    //yaha pe ek bar channel ko console log kar ke dekh na hai
    //console.log(channel)
    
    //check karna hai ki data aya hai ki nahi
    if (!channel?.length) {
        throw new ApiError(404,"channel does not exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User channel fetched successfully")
    )
})

//watch history ke liye ye code hai yaha per bhi hame aggregation pipeline use kare ge
const getWatchHistory = asyncHandler( async(req, res) => {
    //interviwe clear karwaye gi
    //req.user?._id isse hame kya mile ga toh hame strig milta hai per mongodb me th pura obejct("strig") ye pura id hai toh backend mongoose pura handle ar leta hai
    // toh strig o kese convert karte hai
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos", //kaha se lookup karu matlab dekhu toh ye hame video ke model me mil jaye ga
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200,user[0].watchHistory,"Watch History fetched successfullly")
    )
})

export { 
    registerUser,  
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}