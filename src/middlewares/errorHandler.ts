import type { Request, Response, NextFunction } from "express";

const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message;

  if (err.name === "ValidationError") {
    statusCode = 400; // Mongoose schema Validation
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
  let status =
    err.status || (`${statusCode}`.startsWith("4") ? "fail" : "error");

  if (statusCode === 500) {
    console.error(err);
    message = `Internal Server Error`;
    status = "error";
  }

  res.status(statusCode).json({ status, message });
};

export default errorHandler;
