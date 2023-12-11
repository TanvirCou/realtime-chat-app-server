const express = require("express");
const checkLogin = require("../middlewares/checkLogin");
const User = require("../Schemas/UserSchema");
const Chat = require("../Schemas/ChatSchema");
const Message = require("../Schemas/MessageSchema");

const router = express.Router();

router.post("/send", checkLogin, async(req, res) => {
    const { content, chatId} = req.body;

    if(content || chatId) {

        const newMessage = {
            sender: req.userId,
            content: content,
            chat: chatId
        };

        try {
            let message = await Message.create(newMessage);

            message = await message.populate("sender", "name pic");
            message = await message.populate("chat");
            message = await User.populate(message, {
                path: "chat.users",
                select: "name pic email"
            });

            await Chat.findByIdAndUpdate(req.body.chatId, {latestMessage: message});

            res.status(200).json(message);
        } catch(err) {
            res.status(500).json(err);
        }
    } else {
        res.status(400).json("Invalid data");
    }
});

router.get("/:chatId", checkLogin, async(req, res) => {
    try {
        const messages = await Message.find({chat: req.params.chatId})
        .populate("sender", "name pic email")
        .populate("chat");
        res.status(200).json(messages);
    } catch(err) {
        res.status(500).json(err);
    }
});

module.exports = router;