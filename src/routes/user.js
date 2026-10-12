const express = require("express");
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");

const userRouter = express.Router();

const USER_SAFE_DATA = "firstName lastName age gender about skills";

userRouter.get("/requests/received", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    // * Match all the requests with toUserId loggedInUser._id === toUserId
    // * Get all request that macthes toUserId with loggedInUser._id
    // * make sure the request status is "interested"
    const connectionRequest = await ConnectionRequest.find({
      toUserId: loggedInUser._id,
      status: "interested",
    }).populate("fromUserId", USER_SAFE_DATA); // * Under fetch data only necessary data

    if (connectionRequest.length === 0) {
      return res.status(404).json({ message: "Request data not found" });
    }

    res.json({ message: "Data fetched successfully", data: connectionRequest });
  } catch (error) {
    throw new Error("ERROR:" + error.message);
  }
});

userRouter.get("/connections", userAuth, async (req, res) => {
  try {
    // * Information about who is connected to me that is accepted list
    // * User A => User B request sent & User B receives requtes here
    // * User B will also send Requests so they
    const loggedInUser = req.user;

    const connectionRequest = await ConnectionRequest.find({
      $or: [
        { toUserId: loggedInUser._id, status: "accepted" }, // RECEIVED REQUESTS
        { fromUserId: loggedInUser._id, status: "accepted" }, // SENT REQUESTS
      ],
    })
      .populate("fromUserId", USER_SAFE_DATA)
      .populate("toUserId", USER_SAFE_DATA);

    if (connectionRequest.length === 0) {
      return res.status(404).json({ message: "Request data not found" });
    }

    const data = connectionRequest.map((row) => {
      // To compare both ObjectID use toString()
      if (row.fromUserId._id.toString() === loggedInUser._id.toString()) {
        return row.toUserId;
      }

      return row.fromUserId;
    });

    res.json({ message: "Data fetched successfully", data });
  } catch (error) {
    throw new Error("ERROR:" + error.message);
  }
});

userRouter.get("/feed", userAuth, async (req, res) => {
  try {
    // * Get All users who didn't or hasn't sent connection request
    const loggedInUser = req.user;
  } catch (error) {
    throw new Error("ERROR:" + error.message);
  }
});

module.exports = userRouter;

/**
 * When you are logged in => User A, User can be both sender and receiver
 * User A sent a request to User B and User B accpeted the request
 * User A connections received User B in the list as accepted request
 * User C has sent a connection Request to User A (LoggedInUser)
 * User A accpects User C request
 * During listing all the connections that are accepted
 */
