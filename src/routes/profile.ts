import express from "express";
import bcrypt from "bcrypt";
import validator from "validator";
import { userAuth } from "../middlewares/auth";
import { validateProfileEditData } from "../utils/validation";
import AppError from "../utils/AppError";

const profileRouter = express.Router();

profileRouter.get("/view", userAuth, async (req, res) => {
  const loggedInUser = req.user?.toObject();
  if (!loggedInUser) throw new AppError("Unauthorized Access", 401);
  // .toObject() a mongoose method to convert a mongoose document into a plain JS object
  const { __v, ...safeUserData } = loggedInUser;

  res.json({
    status: "success",
    data: safeUserData,
  });
});

profileRouter.patch("/edit", userAuth, async (req, res) => {
  if (!validateProfileEditData(req))
    throw new AppError("Invalid edit Request", 400);

  const loggedInUser = req.user;
  if (!loggedInUser) throw new AppError("Unauthorized Access", 401);

  // We are assigning the updated value in req.body to our loggedInUser document.
  // Object.keys(req.body).forEach((key) => (loggedInUser[key] = req.body[key]));

  // To copy an object from source to target
  // Object.assign(loggedInUser, req.body);
  // OR
  // * use in-built mongoose method to do the same
  Object.keys(req.body ?? {}).forEach((key) => {
    loggedInUser.set(key, req.body[key]);
  });
  await loggedInUser.save();

  res.json({
    status: "success",
    message: `${loggedInUser.firstName}'s profile has updated successfully`,
  });
});

profileRouter.patch("/password", userAuth, async (req, res) => {
  const body = req.body ?? {};
  const { newPassword } = body;
  if (!newPassword || !validator.isStrongPassword(newPassword))
    throw new AppError("Provide a strong password", 400);

  const loggedInUser = req.user;
  if (!loggedInUser) throw new AppError("Unauthorized Access", 401);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  loggedInUser.password = passwordHash;

  await loggedInUser.save();
  res.json({
    status: "success",
    message: `${loggedInUser.firstName}, your password has been updated successfully`,
  });
});

export default profileRouter;
