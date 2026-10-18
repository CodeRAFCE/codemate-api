import express from "express";

import authRouter from "./auth";
import profileRouter from "./profile";
import requestRouter from "./request";
import userRouter from "./user";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/request", requestRouter);
router.use("/user", userRouter);

export default router;
