import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, updateAccountDetails, changeCurrentPassword, getCurrentUser, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    //upload.fields is a middelwares where we upload file o cloudinary abh ham image bhej paye ge
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

//secure routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)//yaha pe post kyu nahi liya kyu post lete toh sab update hojata
router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)

//jab bhi params se data loge toh
router.route("/c/:username").get(verifyJWT,getUserChannelProfile)// data hame url se utha rahe toh GET use hoga ahi post
router.route("/history").get(verifyJWT, getWatchHistory)

export default router