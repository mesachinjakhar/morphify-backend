class CustomError extends Error {
  statusCode;
  status;
  isOperational;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode <= 400 && statusCode < 500 ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default CustomError;
