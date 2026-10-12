const mongoose = require("mongoose");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      index: true,
      minLength: 4,
      maxLength: 50,
    },
    lastName: { type: String, minLength: 1, maxLength: 50 },
    emailId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate(value) {
        if (!validator.isEmail(value))
          throw new Error("Invalid email address:" + value);
      },
    },
    password: {
      type: String,
      required: true,
      validate(value) {
        if (!validator.isStrongPassword)
          throw new Error("Provide a strong password");
      },
    },
    age: { type: Number, min: 18 },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "others"],
        message: `{VALUE} is incorrect gender`,
      },
    },
    photoUrl: {
      type: String,
      default:
        "https://d38we5ntdyxyje.cloudfront.net/858987/profile/GJQSELLC_avatar_medium_square.jpg",
      validate(value) {
        if (!validator.isURL(value))
          throw new Error("Invalid URL format:" + value);
      },
    },
    skills: {
      type: [String],
      validate: {
        validator: (value) => value.length <= 10,
        message: "Too many items!",
      },
    },
    about: { type: String, minLength: 10, maxLength: 300 },
  },
  { timestamps: true },
);

// Compond index in mongoDB
// Find queries runs fast when using index
//
userSchema.index({ firstName: 1, lastName: 1 });

userSchema.methods.getJWT = async function () {
  const user = this;

  const token = await jwt.sign({ _id: user._id }, "DEV@Tinder#1022", {
    expiresIn: "1d",
  });

  return token;
};

userSchema.methods.validatePassword = async function (passwordByUser) {
  const user = this;

  const isPasswordValid = await bcrypt.compare(passwordByUser, user.password);

  return isPasswordValid;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
