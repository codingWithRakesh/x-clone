import { Router } from "express";
import { likeTweet } from "../controllers/like.controller.js";
import { verifyLogin } from "../middlewares/oauth.middleware.js"

const router = Router();

router.route("/likeTweet/:tweetId").get(verifyLogin, likeTweet);

export default router;