import { Router } from "express";
import {
    toggleBookmark,
    getUserBookmarks
} from "../controllers/bookmark.controller.js";
import { verifyLogin } from "../middlewares/oauth.middleware.js"

const router = Router();

router.route("/toggleBookmark/:tweetId").get(verifyLogin, toggleBookmark);
router.route("/getUserBookmarks").get(verifyLogin, getUserBookmarks);

export default router;