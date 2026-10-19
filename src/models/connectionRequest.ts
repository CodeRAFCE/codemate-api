import type { HydratedDocument, InferSchemaType } from "mongoose";
import mongoose from "mongoose";
import AppError from "../utils/AppError";

const CONNECTION_STATUSES = [
  "ignore",
  "interested",
  "accepted",
  "rejected",
  "blocked",
] as const;

export type ConnectionStatusType = (typeof CONNECTION_STATUSES)[number];

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
        values: [...CONNECTION_STATUSES],
        message: `{VALUE} is incorrect status type`,
      },
    },
  },
  { timestamps: true },
);

export type ConnectionRequestType = InferSchemaType<typeof requestSchema>;
export type ConnectionRequestDocument = HydratedDocument<ConnectionRequestType>;

// Add this right before creating the model
requestSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });

requestSchema.pre("save", function () {
  const connectionRequest = this;
  if (connectionRequest.fromUserId.equals(connectionRequest.toUserId)) {
    throw new AppError("Cannot send connection request to yourself!", 400);
  }
});

const ConnectionRequest = mongoose.model<ConnectionRequestType>(
  "ConnectionRequest",
  requestSchema,
);

export default ConnectionRequest;
