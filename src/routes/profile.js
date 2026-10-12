const express = require("express");
const bcrypt = require("bcrypt");
const validator = require("validator");
const { userAuth } = require("../middlewares/auth");
const { validateProfileEditData } = require("../utils/validation");

const profileRouter = express.Router();

profileRouter.get("/view", userAuth, async (req, res) => {
  try {
    const {
      _id,
      firstName,
      lastName,
      age,
      emailId,
      skills,
      photoUrl,
      gender,
      createdAt,
      updatedAt,
    } = req.user;

    res.json({
      _id,
      firstName,
      lastName,
      age,
      emailId,
      gender,
      skills,
      photoUrl,
      createdAt,
      updatedAt,
    });
  } catch (error) {
    throw new Error("ERROR:" + error);
  }
});

profileRouter.patch("/edit", userAuth, async (req, res) => {
  try {
    console.log(req.body);
    if (!validateProfileEditData(req)) {
      return res.status(400).send("INVALID EDIT REQUEST");
    }
    const loggedInUser = req.user;

    Object.keys(req.body).forEach((key) => (loggedInUser[key] = req.body[key]));
    await loggedInUser.save(); // SAVE to DB
    
    res.send("User updated successfully");
  } catch (error) {
    throw new Error("ERROR: " + error);
  }
});

profileRouter.patch("/password", userAuth, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!validator.isStrongPassword) {
      throw new Error("Provide a strong password");
    }

    const loggedInUser = req.user;
    const passwordHash = await bcrypt.hash(newPassword, 10);
    loggedInUser.password = passwordHash;

    await loggedInUser.save();
    res.send(
      `${loggedInUser.firstName}, your password has been updated successfully`,
    );
  } catch (error) {
    throw new Error("ERROR: " + error.message);
  }
});

module.exports = profileRouter;
