export const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = Number(statusCode);
  error.isOperational = true;
  return error;
};
