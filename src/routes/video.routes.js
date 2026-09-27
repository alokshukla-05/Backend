import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {publishAVideo,getAllVideos} from "../controllers/video.controller.js";

const router = Router()
router.use(verifyJWT);

router
    .route("/")
    .get(getAllVideo)
    .post(
        upload.fields([
            {
                name: "videoFile",
                maxCount: 1
            },
            {
                name: "thumnail",
                maxCount: 1,
            }
        ]),
        publishAVideo
    );

router
    .route("/:videoId")
    .get(getVideoById)
    .delete(deleteVideo)
    .patch(upload.single("thumnail"), updateVideo);

router.route("/toggle/publish/:videoId").patch(togglePublishStatus);


export default router