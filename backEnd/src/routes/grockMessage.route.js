import { Router } from "express";
import {
    createGrockMessage,
    getUserGrockMessages,
    deleteGrockMessage
} from "../controllers/grockMessage.controller.js"
import { verifyLogin } from "../middlewares/oauth.middleware.js"

const router = Router();

router.route("/createGrockMessage").post(verifyLogin, createGrockMessage);
router.route("/getUserGrockMessages").get(verifyLogin, getUserGrockMessages);
router.route("/deleteGrockMessage/:messageId").delete(verifyLogin, deleteGrockMessage);

export default router;