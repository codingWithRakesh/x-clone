import { Router } from "express";
import {
    createGrockConversation,
    getConversationsByMessageId,
    getConversationById,
    updateConversation,
    deleteConversation,
    deleteAllConversationsByMessageId,
    continueConversation,
    getConversationStats
} from "../controllers/grockConversation.controller.js"
import { verifyLogin } from "../middlewares/oauth.middleware.js"

const router = Router();

router.route("/createGrockConversation/:messageId").post(verifyLogin, createGrockConversation);
router.route("/getConversationsByMessageId/:messageId").get(verifyLogin, getConversationsByMessageId);
router.route("/getConversationById/:conversationId").get(verifyLogin, getConversationById);
router.route("/updateConversation/:conversationId").put(verifyLogin, updateConversation);
router.route("/deleteConversation/:conversationId").delete(verifyLogin, deleteConversation);
router.route("/deleteAllConversationsByMessageId/:messageId").delete(verifyLogin, deleteAllConversationsByMessageId);
router.route("/continueConversation/:conversationId").post(verifyLogin, continueConversation);
router.route("/getConversationStats/:conversationId").get(verifyLogin, getConversationStats);

export default router;