import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    toggleSubcription,
    getUserChannelSubscribers,
    getSubscribedChannels
} from "../controllers/subscription.controller.js";

const router = Router();
router.use(verifyJWT); // apply verifyJWT middelware to all in this file

router
    .route("/c/:channelId")
    .get(getSubscribedChannels)
    .post(toggleSubcription);

router.route("/u/:subscriberId").get(getUserChannelSubscribers)

export default router



// import { Router } from "express";
// import { verifyJWT } from "../middlewares/auth.middleware.js";
// import {} from "../controllers/subscription.controller.js";

// const router = Router();
// router.use(verifyJWT); // apply verifyJWT middelware to all in this file

// export default router