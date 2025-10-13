import { Router } from "express";
import {
    sendMessage,
    getConversation,
    getConversations,
    markAsRead,
    deleteMessage,
    getUnreadCount,
    searchMessages
} from "../controllers/message.controller.js"
import { verifyLogin } from "../middlewares/oauth.middleware.js";

const router = Router();

router.route("/sendMessage").post(verifyLogin, sendMessage);
router.route("/getConversation/:userId").get(verifyLogin, getConversation);
router.route("/getConversations").get(verifyLogin, getConversations);
router.route("/markAsRead/:id").patch(verifyLogin, markAsRead);
router.route("/deleteMessage/:id").delete(verifyLogin, deleteMessage);
router.route("/getUnreadCount").get(verifyLogin, getUnreadCount);
router.route("/searchMessages").get(verifyLogin, searchMessages);

export default router;