import { Router } from "express";
import {
    joinCommunity,
    leaveCommunity,
    getCommunityMembers,
    updateMemberRole,
    removeMember,
    checkMembership,
    getUserMemberships
} from "../controllers/communityMember.controller.js";
import { verifyLogin } from "../middlewares/oauth.middleware.js"

const router = Router();

router.route("/joinCommunity/:communityId").post(verifyLogin, joinCommunity);
router.route("/leaveCommunity/:communityId").post(verifyLogin, leaveCommunity);
router.route("/getCommunityMembers/:communityId").get(verifyLogin, getCommunityMembers);
router.route("/updateMemberRole/:communityId/:memberId").put(verifyLogin, updateMemberRole);
router.route("/removeMember/:communityId/:memberId").delete(verifyLogin, removeMember);
router.route("/checkMembership/:communityId").get(verifyLogin, checkMembership);
router.route("/getUserMemberships").get(verifyLogin, getUserMemberships);

export default router;