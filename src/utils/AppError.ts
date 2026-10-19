class AppError extends Error {
  public statusCode: number;
  public status: "fail" | "error";

  constructor(message: string, statusCode: number = 500) {
    // Calling super(message) in the constructor passes the message to the parent
    super(message);
    this.statusCode = statusCode;
    // 4xx -> 'fail', 5xx -> 'error'
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
