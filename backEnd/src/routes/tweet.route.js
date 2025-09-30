import { Router } from "express";
import {
    createTweet,
    getTweetById,
    getUserTweets,
    getTimeline,
    updateTweet,
    deleteTweet,
    getTweetReplies,
    toggleTweetPin,
    searchTweets
} from "../controllers/tweet.controller.js";
import { verifyLogin } from "../middlewares/oauth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/createTweet").post(verifyLogin, upload.array("files", 4), createTweet);
router.route("/getTweetById/:tweetId").get(verifyLogin, getTweetById);
router.route("/getUserTweets/:userId").get(verifyLogin, getUserTweets);
router.route("/getTimeline").get(verifyLogin, getTimeline);
router.route("/updateTweet/:tweetId").put(verifyLogin, upload.array("files", 4), updateTweet);
router.route("/deleteTweet/:tweetId").delete(verifyLogin, deleteTweet);
router.route("/getTweetReplies/:tweetId").get(verifyLogin, getTweetReplies);
router.route("/toggleTweetPin/:tweetId").post(verifyLogin, toggleTweetPin);
router.route("/searchTweets").get(verifyLogin, searchTweets);

export default router;