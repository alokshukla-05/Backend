import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler( async (req, res) => {
    res.status(200).json({
        message: "ok"
    })
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

    // const {fullName, email, username, password} = req.body
    // console.log("email:", email);
})

export { registerUser }