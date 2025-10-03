import { Router } from "express";
import {
    createRetweet,
    removeRetweet,
    getTweetRetweets,
    getUserRetweets,
    getMyRetweets,
    checkRetweetStatus
} from "../controllers/reTweet.controller.js";
import { verifyLogin } from "../middlewares/oauth.middleware.js"

const router = Router();

router.route("/createRetweet/:tweetId").post(verifyLogin, createRetweet);
router.route("/removeRetweet/:tweetId").delete(verifyLogin, removeRetweet);
router.route("/getTweetRetweets/:tweetId").get(verifyLogin, getTweetRetweets);
router.route("/getUserRetweets/:userId").get(verifyLogin, getUserRetweets);
router.route("/getMyRetweets").get(verifyLogin, getMyRetweets);
router.route("/checkRetweetStatus/:tweetId").get(verifyLogin, checkRetweetStatus);

export default router;