import express from "express";
import { userAuth } from "../middlewares/auth.ts";
import ConnectionRequest from "../models/connectionRequest.ts";
import User from "../models/user.ts";

const userRouter = express.Router();

const USER_SAFE_DATA = "firstName lastName age gender about skills";

userRouter.get("/requests/received", userAuth, async (req, res) => {
  const loggedInUser = req.user;
  // * Match all the requests with toUserId loggedInUser._id === toUserId
  // * Get all request that macthes toUserId with loggedInUser._id
  // * make sure the request status is "interested"
  const connectionRequest = await ConnectionRequest.find({
    toUserId: loggedInUser._id,
    status: "interested",
  }).populate("fromUserId", USER_SAFE_DATA); // * Under fetch data only necessary data

  res.json({
    status: "success",
    message: "Data fetched successfully",
    data: connectionRequest,
  });
});

userRouter.get("/connections", userAuth, async (req, res) => {
  // * Information about who is connected to me that is accepted list
  // * User A => User B request sent & User B receives requtes here
  // * User B will also send Requests so they
  const loggedInUserId = req.user._id.toString();

  const connectionRequest = await ConnectionRequest.find({
    $or: [
      { toUserId: loggedInUserId, status: "accepted" }, // RECEIVED REQUESTS
      { fromUserId: loggedInUserId, status: "accepted" }, // SENT REQUESTS
    ],
  })
    .populate("fromUserId", USER_SAFE_DATA)
    .populate("toUserId", USER_SAFE_DATA);

  const data = connectionRequest.map((row) => {
    // To compare both ObjectID use toString()
    if (row.fromUserId._id.toString() === loggedInUserId) {
      return row.toUserId;
    }

    return row.fromUserId;
  });

  res.json({ status: "success", message: "Data fetched successfully", data });
});

userRouter.get("/feed", userAuth, async (req, res) => {
  // * Get All users who didn't or hasn't sent connection request
  const loggedInUser = req.user;
  // OPTIONAL CHECK
  // if (
  //   typeof parseInt(req.query.page) !== "number" &&
  //   typeof parseInt(req.query.limit) !== "number"
  // ) {
  //   return res.status(400).json({ message: "Invalid page and limit values" });
  // }

  // const page = parseInt(req.query.page) || 1;
  // const limit = parseInt(req.query.limit) || 10;
  // This doesn't block the user from fetching the users but also always restricts to 30 users no matter what
  // limit = limit > 30 ? 30 : limit;

  // This is bulletproof logic using Math fn
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(30, Math.max(1, parseInt(req.query.limit) || 10));

  // Bad way because the user is blocked from seeing the users completely
  // Instead always restrict the limit to 30 instead of showing error
  // Bad UX for the application when using if statemate for avoiding users to fetch 100000
  // if (limit > 30) {
  //   return res.status(400).json({ message: "Pagination limit exceeded" });
  // }

  const skipRecords = (page - 1) * limit;

  const connectionRequest = await ConnectionRequest.find({
    $or: [{ fromUserId: loggedInUser._id }, { toUserId: loggedInUser._id }],
  }).select("fromUserId, toUserId");

  const hideConnectionRequests = new Set();
  connectionRequest.forEach((req) => {
    hideConnectionRequests.add(req.fromUserId.toString());
    hideConnectionRequests.add(req.toUserId.toString());
  });

  // * you can also add self like this or use the mongoDB comparision query "$ne"
  // * hideConnectionRequests.add(loggedInUser._id);

  // * skip() & limit() for pagination to restrict data sent to the client
  // * Sanitize the data to make sure  we don't set the limit to 100000
  const users = await User.find({
    $and: [
      { _id: { $nin: Array.from(hideConnectionRequests) } },
      { _id: { $ne: loggedInUser._id } },
    ],
  })
    .select(USER_SAFE_DATA)
    .sort({ _id: 1 }) // Stable ordering for pagination
    .skip(skipRecords)
    .limit(limit);

  res.json({ status: "success", message: "Data fetched", users });
});

export default userRouter;

/**
 * When you are logged in => User A, User can be both sender and receiver
 * User A sent a request to User B and User B accpeted the request
 * User A connections received User B in the list as accepted request
 * User C has sent a connection Request to User A (LoggedInUser)
 * User A accpects User C request
 * During listing all the connections that are accepted
 */
