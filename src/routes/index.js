const express = require("express");

const authRouter = require("./auth");
const profileRouter = require("./profile");
const requestRouter = require("./request");
const userRouter = require("./user");

const router = express.Router();

router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/request", requestRouter);
router.use("/user", userRouter);

module.exports = router;
