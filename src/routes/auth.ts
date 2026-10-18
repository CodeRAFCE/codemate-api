import express, { type CookieOptions } from "express";
import bcrypt from "bcrypt";
import User from "../models/user.ts";
import { validateSignUpData } from "../utils/validation.ts";
import { userAuth } from "../middlewares/auth.ts";
import AppError from "../utils/AppError.ts";

const authRouter = express.Router();

const cookieOptions: CookieOptions = {
  httpOnly: true, //"Browser JavaScript cannot touch or steal this cookie.(Protects from XSS)"
  sameSite: "lax", //"Only send this cookie if the user is actually on my website."
  secure: process.env.NODE_ENV === "production", //"Only send this cookie over encrypted HTTPS connections."
};

authRouter.post("/sign-up", async (req, res) => {
  validateSignUpData(req);
  const { firstName, lastName, emailId, password } = req.body;
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
  const { emailId, password } = req.body;

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

authRouter.post("/logout", userAuth, (req, res) => {
  res
    .clearCookie("token", cookieOptions)
    .json({ status: "success", message: "Logout Successfull" });
});

export default authRouter;
