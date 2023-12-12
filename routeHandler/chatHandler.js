const express = require("express");
const checkLogin = require("../middlewares/checkLogin");
const User = require("../Schemas/UserSchema");
const Chat = require("../Schemas/ChatSchema");

const router = express.Router();

router.post("/createChat", checkLogin, async (req, res) => {
    const friendId = req.body.userId;

    if (!friendId) {
        return res.status(400).json("user id not sent with request");
    }

    var isChat = await Chat.find({
        isGroupChat: false,
        $and: [{ users: { $elemMatch: { $eq: req.userId } } }, { users: { $elemMatch: { $eq: friendId } } }],
    }).populate("users", "-password").populate("latestMessage");

    isChat = await User.populate(isChat, {
        path: "latestMessage.sender",
        select: "name, email, pic"
    });

    if (isChat.length > 0) {
        res.status(200).json(isChat[0]);
    } else {
        var chatData = {
            chatName: "sender",
            isGroupChat: false,
            users: [req.userId, friendId]
        };
        try {
            const createChat = await Chat.create(chatData);
            const fullChat = await Chat.findOne({ _id: createChat._id, }).populate("users", "-password");
            res.status(200).json(fullChat);
        } catch (err) {
            res.status(500).json(err);
        }
    }

});

router.get("/allChat", checkLogin, async (req, res) => {
    try {
        let chats = await Chat.find({ users: { $elemMatch: { $eq: req.userId } } })
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage")
            .sort({ updatedAt: -1 });

        chats = await User.populate(chats, {
            path: "latestMessage.sender",
            select: "name, email, pic"
        });
        res.status(200).json(chats);
    } catch (err) {
        res.status(500).json(err);
    }
});

router.post("/createGroupChat", checkLogin, async (req, res) => {
    if (req.body.usersId && req.body.name) {
        let users = JSON.parse(req.body.usersId);

        if (users.length > 1) {
            users.push(req.userId);

            try {
                const groupChat = await Chat.create({
                    chatName: req.body.name,
                    isGroupChat: true,
                    users: users,
                    groupAdmin: req.userId
                });

                const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
                    .populate("users", "-password")
                    .populate("groupAdmin", "-password");
                res.status(200).json(fullGroupChat);
            } catch (err) {
                res.status(500).json(err);
            }
        } else {
            return res.status(400).json("Atleast needs three member");
        }
    } else {
        return res.status(400).json("Please fill all the fields");
    }
});

router.put("/renameGroup", checkLogin, async (req, res) => {
    const { chatId, chatName } = req.body;
    try {
        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            { chatName: chatName },
            { new: true }
        ).populate("users", "-password")
            .populate("groupAdmin", "-password");;

        res.status(200).json(updatedChat);
    } catch (err) {
        res.status(500).json(err);
    }
});

router.put("/addToGroup", checkLogin, async (req, res) => {
    const { chatId, userId } = req.body;
    try {
        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            { $push: { users: userId } },
            { new: true }
        ).populate("users", "-password")
            .populate("groupAdmin", "-password");;

        res.status(200).json(updatedChat);
    } catch (err) {
        res.status(500).json(err);
    }
});

router.put("/removeFromGroup", checkLogin, async (req, res) => {
    const { chatId, userId } = req.body;
    try {
        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            { $pull: { users: userId } },
            { new: true }
        ).populate("users", "-password")
            .populate("groupAdmin", "-password");;

        res.status(200).json(updatedChat);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;