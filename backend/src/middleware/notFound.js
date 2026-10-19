export function notFound(req, res) {
  return res.status(404).json({ detail: `Route not found: ${req.method} ${req.path}` });
}
