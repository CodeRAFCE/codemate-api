import type { ErrorRequestHandler } from "express";
import AppError from "../utils/AppError";

type StatusType = "fail" | "error";

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let statusCode: number = 500;
  let message: string = "Internal Server Error";
  let status: StatusType = "error";

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    status = err.status;
    message = err.message;
  } else if (err.name === "ValidationError") {
    statusCode = 400; // Mongoose schema Validation
    status = "fail";
    message = err.message;
  } else if (err.code === 11000) {
    statusCode = 409; // duplicate key (Eg: email already used)
    message = "Resource already exists";
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ID`;
  } else if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError"
  ) {
    statusCode = 401;
    message = `Invalid token or Token Expired`;
  } else if (err.type === "entity.parse.failed") {
    statusCode = 400; // Malformed JSON req body
    message = `Invalid JSON body`;
  }

  // Calculate status AFTER determining final statusCode
  status = err.status || (`${statusCode}`.startsWith("4") ? "fail" : "error");

  if (statusCode === 500) {
    console.error("💥 UNEXPECTED SERVER ERROR:", err);
  }

  res.status(statusCode).json({ status, message });
};

export default errorHandler;
