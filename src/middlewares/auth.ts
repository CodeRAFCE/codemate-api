import type { RequestHandler } from "express";

import jwt from "jsonwebtoken";
import User from "../models/user";
import AppError from "../utils/AppError";
import { cookieOptions } from "../config/cookie";

interface JwtPayloadWithId {
  _id: string;
}

export const userAuth: RequestHandler = async (req, _res, next) => {
  const { token } = req.cookies;
  if (!token) throw new AppError("INVALID TOKEN", 401);

  const { _id } = (await jwt.verify(
    token,
    process.env.JWT_SECRET,
  )) as JwtPayloadWithId;
  // Exculde password when fetching the data
  const user = await User.findById(_id).select("-password");
  if (!user) throw new AppError("User not found", 401);

  req.user = user;
  next();
};

export const guestOnly: RequestHandler = async (req, _res, next) => {
  const { token } = req.cookies;
  if (!token) return next();

  try {
    // 2. If the token is valid & not expired, block them
    jwt.verify(token, process.env.JWT_SECRET);
    throw new AppError("SESSION EXISTS", 403); // Forbidden Request
  } catch (err) {
    // Rethrow our 403 AppError
    if (err instanceof AppError) throw err;
    // 3. If jwt.verify threw TokenExpiredError / JsonWebTokenError,
    // the token is invalid/expired -> treat them as a guest and proceed
    return next();
  }
};
