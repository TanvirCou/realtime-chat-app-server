const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require('cors');
const fileUpload = require('express-fileupload');
const userHandler = require("./routeHandler/userHandler");
const chatHandler = require("./routeHandler/chatHandler");
const messageHandler = require("./routeHandler/messageHandler");

const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();
app.use(fileUpload({
    useTempFiles: true
}));

mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.log(err.message));

app.use("/api/user", userHandler);
app.use("/api/chat", chatHandler);
app.use("/api/message", messageHandler);

const server = app.listen(3000, () => {
    console.log("Server started");
});

const io = require("socket.io")(server, {
    pingTimeout: 60000,
    cors: {
        origin: "http://127.0.0.1:5173"
    },
});

io.on("connection", (socket) => {
    console.log("Connected to socket");

    socket.on("setup", (userData) => {
        socket.join(userData._id);
        socket.emit("connected");
    });

    socket.on("join chat", (room) => {
        socket.join(room);
        console.log(room);
    });

    socket.on("typing", (room) => {
        socket.in(room).emit("typing");
    });

    socket.on("stop typing", (room) => {
        socket.in(room).emit("stop typing");
    });

    socket.on("new message", (newMessageReceived) => {
        var chat = newMessageReceived.chat;

        if(!chat.users) {
            console.log("chat users not defined");
        } else {
            chat.users.forEach(user => {
                if(user._id === newMessageReceived.sender._id) {
                    return;
                } else {
                    socket.in(user._id).emit("message received", newMessageReceived);
                }
            });
        }
    });
});