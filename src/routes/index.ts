import express from "express";

import authRouter from "./auth.ts";
import profileRouter from "./profile.ts";
import requestRouter from "./request.ts";
import userRouter from "./user.ts";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/request", requestRouter);
router.use("/user", userRouter);

export default router;
