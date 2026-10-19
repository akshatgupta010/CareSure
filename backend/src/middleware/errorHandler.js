export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  console.error("Request failed:", error);
  return res.status(error.status || 500).json({
    detail: error.status && error.status < 500 ? error.message : "Internal server error.",
  });
}
