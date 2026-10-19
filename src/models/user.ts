import type { InferSchemaType, HydratedDocument, Model } from "mongoose";
import mongoose from "mongoose";
import validator from "validator";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export interface IUserMethods {
  getJWT(): Promise<string>;
  validatePassword(passwordByUser: string): Promise<boolean>;
}

const GENDERS = ["male", "female", "others"] as const;
export type GenderType = (typeof GENDERS)[number];

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
      validate(value: string) {
        if (!validator.isEmail(value))
          throw new Error("Invalid email address:" + value);
      },
    },
    password: {
      type: String,
      required: true,
      validate(value: string) {
        if (!validator.isStrongPassword(value))
          throw new Error("Provide a strong password");
      },
    },
    age: { type: Number, min: 18 },
    gender: {
      type: String,
      enum: {
        values: [...GENDERS],
        message: `{VALUE} is incorrect gender`,
      },
    },
    photoUrl: {
      type: String,
      default:
        "https://d38we5ntdyxyje.cloudfront.net/858987/profile/GJQSELLC_avatar_medium_square.jpg",
      validate(value: string) {
        if (!validator.isURL(value))
          throw new Error("Invalid URL format:" + value);
      },
    },
    skills: {
      type: [String],
      validate: {
        validator: (value: string[]) => value.length <= 10,
        message: "Too many items!",
      },
    },
    about: { type: String, minLength: 10, maxLength: 300 },
  },
  { timestamps: true },
);

export type UserType = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserType, IUserMethods>;
export type UserModel = Model<UserType, {}, IUserMethods>;

// Compond index in mongoDB
// Find queries runs fast when using index
//
userSchema.index({ firstName: 1, lastName: 1 });

userSchema.methods.getJWT = async function (): Promise<string> {
  const user = this;
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Secret Key is not configured");

  const token = await jwt.sign({ _id: user._id }, secret, {
    expiresIn: "1d",
  });

  return token;
};

userSchema.methods.validatePassword = async function (
  passwordByUser: string,
): Promise<boolean> {
  const user = this;
  const isPasswordValid = await bcrypt.compare(passwordByUser, user.password);
  return isPasswordValid;
};

const User = mongoose.model<UserType, UserModel>("User", userSchema);

export default User;
