const errorHandler = (err, req, res, next) => {
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

  if (statusCode === 500) {
    console.error(err);
    message = `Internal Server Error`;
  }

  res.status(statusCode).json({ message });
};

module.exports = errorHandler;
