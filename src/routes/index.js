const express = require("express");

const authRouter = require("./auth");
const profileRouter = require("./profile");
const requestRouter = require("./request");

const router = express.Router();

router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/request", requestRouter);

module.exports = router;
