import type { RequestHandler } from "express";

import jwt from "jsonwebtoken";
import User from "../models/user";
import AppError from "../utils/AppError";

export const userAuth: RequestHandler = async (req, _res, next) => {
  const { token } = req.cookies;
  if (!token) throw new AppError("INVALID TOKEN", 401);

  const { _id } = await jwt.verify(token, process.env.JWT_SECRET);
  // Exculde password when fetching the data
  const user = await User.findById(_id).select("-password");
  if (!user) throw new AppError("User not found", 401);

  req.user = user;
  next();
};
