import express from "express";
import { userAuth } from "../middlewares/auth.ts";
import ConnectionRequest from "../models/connectionRequest.ts";
import User from "../models/user.ts";
import AppError from "../utils/AppError.ts";

const requestRouter = express.Router();

requestRouter.post("/send/:status/:toUserId", userAuth, async (req, res) => {
  const { status, toUserId } = req.params;
  const fromUserId = req.user._id;

  const toUser = await User.findById(toUserId);
  if (!toUser) throw new AppError("User not found", 404);

  const allowedStatus = ["interested", "ignore"];
  if (!allowedStatus.includes(status))
    throw new AppError("Invalid Status", 400);

  if (fromUserId.equals(toUserId))
    throw new AppError("Cannot send request to yourself", 400);

  // Check if there is an existing ConnectionRequest from A -> B or B -> A
  const existingConnectionRequest = await ConnectionRequest.findOne({
    // 1) Check for fromUserId & toUserId for duplicate request
    // 2) Check if fromUserId is toUserId and toUserId is fromUserId
    $or: [
      { fromUserId, toUserId },
      { fromUserId: toUserId, toUserId: fromUserId },
    ],
  });

  if (existingConnectionRequest)
    throw new AppError("Connection request already exists", 409); // Conflict Connection => 409

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
    status: "success",
    message,
    data: connectionRequest,
  });
});

requestRouter.patch("/review/:status/:reqId", userAuth, async (req, res) => {
  //* Connection request sent from User A => User B
  //* loggedInUserId === toUserId
  //* Check if User B is the loggedIn user for accepting the request recived from User A
  //* Make sure the status is in interested state not ignored requests cannont be accepted

  const loggedInUser = req.user;
  const { status, reqId } = req.params;

  const allowedStatus = ["accepted", "rejected"];
  if (!allowedStatus.includes(status))
    throw new AppError("Invalid Status", 400);

  const request = await ConnectionRequest.findOne({
    _id: reqId,
    toUserId: loggedInUser._id,
    status: "interested",
  });

  if (!request) throw new AppError("Connection request does not exist", 404);

  request.status = status;
  await request.save();

  res.json({
    status: "success",
    message: `Connection request ${status}`,
    data: request,
  });
});

export default requestRouter;
