class AppError extends Error {
  constructor(message, statusCode = 500) {
    // Calling super(message) in the constructor passes the message to the parent
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
