const jwt = require("jsonwebtoken");
const User = require("../models/user");

const adminAuth = (req, res, next) => {
  const token = "abc";
  const isAuthorizedAdmin = token === "abc";

  if (!isAuthorizedAdmin) {
    res.status(401).send("Unauthorized admin Access");
  } else {
    next();
  }
};

const userAuth = async (req, res, next) => {
  try {
    const cookies = req.cookies;
    const { token } = cookies;

    if (!token) {
      throw new Error("INVALID TOKEN");
    }

    const userData = await jwt.verify(token, process.env.JWT_SECRET);
    const { _id } = userData;

    const user = await User.findById(_id);

    if (!user) {
      throw new Error("User not found");
    } 

    req.user = user;
    next();
  } catch (error) {
    res.status(401).send("ERROR: " + error.message);
  }
};

module.exports = {
  adminAuth,
  userAuth,
};
