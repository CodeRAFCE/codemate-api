const jwt = require("jsonwebtoken");
const User = require("../models/user");
const AppError = require("../utils/AppError");

const userAuth = async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) throw new AppError("INVALID TOKEN", 401);

  const { _id } = await jwt.verify(token, process.env.JWT_SECRET);
  // Exculde password when fetching the data
  const user = await User.findById(_id).select("-password");
  if (!user) throw new AppError("User not found", 401);

  req.user = user;
  next();
};

module.exports = {
  userAuth,
};
