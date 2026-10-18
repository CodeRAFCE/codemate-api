import type { Request, Response, NextFunction } from "express";

import jwt from "jsonwebtoken";
import User from "../models/user.ts";
import AppError from "../utils/AppError.ts";

export const userAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const { token } = req.cookies;
  if (!token) throw new AppError("INVALID TOKEN", 401);

  const { _id } = await jwt.verify(token, process.env.JWT_SECRET);
  // Exculde password when fetching the data
  const user = await User.findById(_id).select("-password");
  if (!user) throw new AppError("User not found", 401);

  req.user = user;
  next();
};
