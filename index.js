const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require('cors');
const userHandler = require("./routeHandler/userHandler");
const chatHandler = require("./routeHandler/chatHandler");
const messageHandler = require("./routeHandler/messageHandler");

const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();

const port = 5000;

mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h1m0xzj.mongodb.net/chatApp?retryWrites=true&w=majority`)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.log(err.message));

app.get("/", (req, res) => {
    res.send("Server working");
});

app.use("/api/user", userHandler);
app.use("/api/chat", chatHandler);
app.use("/api/message", messageHandler);

const server = app.listen(process.env.PORT || port);

const io = require("socket.io")(server, {
    pingTimeout: 60000,
    cors: {
        origin: "https://panda-chat-webapp.netlify.app/"
    },
});

io.on("connection", (socket) => {
    console.log("Connected to socket");

    socket.on("setup", (userData) => {
        socket.join(userData?._id);
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

        if (!chat.users) {
            console.log("chat users not defined");
        } else {
            chat.users.forEach(user => {
                if (user._id === newMessageReceived.sender._id) {
                    return;
                } else {
                    socket.in(user._id).emit("message received", newMessageReceived);
                }
            });
        }
    });
});