import type { CookieOptions } from "express";
import type { UserType } from "../models/user";

type SignUpBodyType = Pick<
  UserType,
  "firstName" | "lastName" | "emailId" | "password"
>;

type LoginBodyType = Pick<UserType, "emailId" | "password">;

import express from "express";
import bcrypt from "bcrypt";
import User from "../models/user";
import { validateSignUpData } from "../utils/validation";
import { userAuth } from "../middlewares/auth";
import AppError from "../utils/AppError";

const authRouter = express.Router();

const cookieOptions: CookieOptions = {
  httpOnly: true, //"Browser JavaScript cannot touch or steal this cookie.(Protects from XSS)"
  sameSite: "lax", //"Only send this cookie if the user is actually on my website."
  secure: process.env.NODE_ENV === "production", //"Only send this cookie over encrypted HTTPS connections."
};

authRouter.post("/sign-up", async (req, res) => {
  validateSignUpData(req);
  const { firstName, lastName, emailId, password }: SignUpBodyType = req.body;
  const passwardHash = await bcrypt.hash(password, 10);

  // Only allowed fields are passed to the model
  const user = new User({
    firstName,
    lastName,
    emailId,
    password: passwardHash,
  });

  await user.save();
  res
    .status(201)
    .json({ status: "success", message: "User added successfully" });
});

authRouter.post("/login", async (req, res) => {
  const { emailId, password }: LoginBodyType = req.body;

  if (!emailId || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const user = await User.findOne({ emailId });
  if (!user || !(await user.validatePassword(password))) {
    throw new AppError("INVALID CREDENTIALS", 401);
  }
  // Offloaded the jwt login to user schema
  const token = await user.getJWT();

  res.cookie("token", token, {
    ...cookieOptions,
    expires: new Date(Date.now() + 24 * 3600000), // expires in 1h, change 1 to 24 will expire in 1d
  });

  res.status(200).json({ status: "success", message: "Logged in" });
});

authRouter.post("/logout", userAuth, (_req, res) => {
  res
    .clearCookie("token", cookieOptions)
    .json({ status: "success", message: "Logout Successfull" });
});

export default authRouter;
