import { Router } from "express";
import {
    followUnfollowUser,
    getFollowers,
    getFollowing
} from "../controllers/follow.controller.js";
import { verifyLogin } from "../middlewares/oauth.middleware.js"

const router = Router();

router.route("/followUnfollowUser/:userId").get(verifyLogin, followUnfollowUser);
router.route("/getFollowers/:userId").get(verifyLogin, getFollowers);
router.route("/getFollowing/:userId").get(verifyLogin, getFollowing);

export default router;