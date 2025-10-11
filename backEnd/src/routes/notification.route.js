import { Router } from "express";
import {
    getUserNotifications
} from "../controllers/notification.controller.js";
import { verifyLogin } from "../middlewares/oauth.middleware.js"

const router = Router();

router.route("/getUserNotifications").get(verifyLogin, getUserNotifications);

export default router;