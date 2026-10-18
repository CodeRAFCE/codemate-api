const express = require("express");
const bcrypt = require("bcrypt");
const validator = require("validator");
const { userAuth } = require("../middlewares/auth");
const { validateProfileEditData } = require("../utils/validation");
const AppError = require("../utils/AppError");

const profileRouter = express.Router();

profileRouter.get("/view", userAuth, async (req, res) => {
  // .toObject() a mongoose method to convert a mongoose document into a plain JS object
  const { __v, ...safeUserData } = req.user.toObject();

  res.json({
    status: "success",
    data: safeUserData,
  });
});

profileRouter.patch("/edit", userAuth, async (req, res) => {
  if (!validateProfileEditData(req))
    throw new AppError("Invalid edit Request", 400);

  const loggedInUser = req.user;
  // We are assigning the updated value in req.body to our loggedInUser document.
  Object.keys(req.body).forEach((key) => (loggedInUser[key] = req.body[key]));
  await loggedInUser.save();

  res.json({
    status: "success",
    message: `${loggedInUser.firstName}'s profile has updated successfully`,
  });
});

profileRouter.patch("/password", userAuth, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || !validator.isStrongPassword(newPassword))
    throw new AppError("Provide a strong password", 400);

  const loggedInUser = req.user;
  const passwordHash = await bcrypt.hash(newPassword, 10);
  loggedInUser.password = passwordHash;

  await loggedInUser.save();
  res.json({
    status: "success",
    message: `${loggedInUser.firstName}, your password has been updated successfully`,
  });
});

module.exports = profileRouter;
