import {Server} from "socket.io";
import http from "http";
import { app } from "../app.js";

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin : process.env.CORS_ORIGIN || "http://127.0.0.1:5502",
        methods: ["GET", "POST"],
        credentials: true
    }
})

io.on("connection", (socket) => {
    socket.on("join", (userId) => {
        socket.join(userId);
    })

    socket.on("connect_error", (err) => {
        console.log(`connect_error due to ${err.message}`);
    })

    socket.on("disconnect", () => {
        console.log("User disconnected");
    })
})

export { server, io }