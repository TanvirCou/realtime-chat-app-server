const express = require("express");
const bcrypt = require('bcrypt');
const dotenv = require("dotenv");
var cloudinary = require("cloudinary").v2;
const jwt = require('jsonwebtoken');
const User = require("../Schemas/UserSchema");
const checkLogin = require("../middlewares/checkLogin");

const router = express.Router();
dotenv.config();

const cloud_name = process.env.CLOUD_NAME;
const api_key = process.env.API_KEY;
const api_secret = process.env.API_SECRET;

cloudinary.config({
    cloud_name: cloud_name,
    api_key: api_key,
    api_secret: api_secret,
});


router.post("/signUp", async (req, res) => {

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        if(req.body.pic === null) {
            const newUser = await new User({
                name: req.body.name,
                email: req.body.email,
                password: hashedPassword,
            });
    
            const user = await newUser.save();
            res.status(200).json(user);
        } else {
            const newUser = await new User({
                name: req.body.name,
                email: req.body.email,
                password: hashedPassword,
                pic: req.body.pic
            });
    
            const user = await newUser.save();
            res.status(200).json(user);
        }

    } catch (err) {
        res.status(401).json(err.message);
    }
});

router.post("/login", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (user) {
            const validPassword = await bcrypt.compare(req.body.password, user.password);
            if (validPassword) {
                const token = jwt.sign({
                    name: user.name,
                    userId: user._id,
                }, process.env.JWT_SECRET);

                res.status(200).json({
                    user: user,
                    access_token: token,
                    // message: "Login successfully"
                })
            } else {
                res.status(401).json("Authentication failed");
            }
        } else {
            res.status(401).json("Authentication failed");
        }

    } catch (err) {
        res.status(401).json(err);
    }
});

router.get("/", checkLogin, async (req, res) => {
    const keyWord = req.query.search ?
        { $or: [{ name: { $regex: req.query.search, $options: "i" } }, { email: { $regex: req.query.search, $options: "i" } }], }
        : {};

    try {
        const users = await User.find(keyWord).find({ _id: { $ne: req.userId } });
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;