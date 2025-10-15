import { Router } from "express";
import {
    createCommunity,
    getAllCommunities,
    getCommunity,
    updateCommunity,
    deleteCommunity,
    getUserCommunities,
    getCommunityPosts,
    getCommunitySpecificPosts
} from "../controllers/community.controller.js";
import { verifyLogin } from "../middlewares/oauth.middleware.js"

const router = Router();

router.route("/createCommunity").post(verifyLogin, createCommunity);
router.route("/getAllCommunities").get(verifyLogin, getAllCommunities);
router.route("/getCommunity/:identifier").get(verifyLogin, getCommunity);
router.route("/updateCommunity/:communityId").put(verifyLogin, updateCommunity);
router.route("/deleteCommunity/:communityId").delete(verifyLogin, deleteCommunity);
router.route("/getUserCommunities").get(verifyLogin, getUserCommunities);
router.route("/getCommunityPosts/:communityId").get(verifyLogin, getCommunityPosts);
router.route("/getCommunitySpecificPosts/:communityId/:postId").get(verifyLogin, getCommunitySpecificPosts);


export default router;