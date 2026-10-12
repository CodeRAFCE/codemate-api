const express = require("express");
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user");

const requestRouter = express.Router();

requestRouter.post("/send/:status/:toUserId", userAuth, async (req, res) => {
  try {
    const { status, toUserId } = req.params;
    const fromUserId = req.user._id;

    const toUser = await User.findById(toUserId);
    if (!toUser) {
      return res.status(404).json({ message: "User does not exist" });
    }

    const allowedStatus = ["interested", "ignore"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "INVALID STATUS" });
    }

    // Check if there is an existing ConnectionRequest from A -> B or B -> A
    const existingConnectionRequest = await ConnectionRequest.findOne({
      // 1) Check for fromUserId & toUserId for duplicate request
      // 2) Check if fromUserId is toUserId and toUserId is fromUserId
      $or: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId },
      ],
    });

    console.log(existingConnectionRequest);

    if (existingConnectionRequest) {
      return res.status(400).json({ message: "Connection Request exists" });
    }

    const connectionRequest = new ConnectionRequest({
      fromUserId,
      toUserId,
      status,
    });

    await connectionRequest.save();

    const message =
      status === "interested"
        ? `${req.user.firstName} is interested in ${toUser.firstName}`
        : `${req.user.firstName} ignored ${toUser.firstName}`;

    res.json({
      message,
      data: connectionRequest,
    });
  } catch (error) {
    throw new Error("ERROR: " + error.message);
  }
});

requestRouter.patch("/review/:status/:reqId", userAuth, async (req, res) => {
  try {
    //* Connection request sent from User A => User B
    //* loggedInUserId === toUserId
    //* Check if User B is the loggedIn user for accepting the request recived from User A
    //* Make sure the status is in interested state not ignored requests cannont be accepted

    const loggedInUser = req.user;
    const { status, reqId } = req.params;

    const allowedStatus = ["accepted", "rejected"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "INVALID STATUS" });
    }

    const request = await ConnectionRequest.findOne({
      _id: reqId,
      toUserId: loggedInUser._id,
      status: "interested",
    });

    if (!request) {
      return res
        .status(404)
        .json({ message: "Connection Request does not exist" });
    }

    request.status = status;
    await request.save();

    res.json({ message: "Connection request accepted" });
  } catch (error) {
    throw new Error("ERROR: " + error.message);
  }
});

module.exports = requestRouter;
