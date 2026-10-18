import mongoose, { Connection } from "mongoose";
import AppError from "../utils/AppError";

const requestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User", // Reference to User Collection
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ["ignore", "interested", "accepted", "rejected", "blocked"],
        message: `{VALUE} is incorrect status type`,
      },
    },
  },
  { timestamps: true },
);

// Add this right before creating the model
requestSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });

requestSchema.pre("save", function () {
  const connectionRequest = this;

  if (connectionRequest.fromUserId.equals(connectionRequest.toUserId)) {
    throw new AppError("Cannot send connection request to yourself!", 400);
  }
});

const ConnectionRequest = mongoose.model("ConnectionRequest", requestSchema);

export default ConnectionRequest;
