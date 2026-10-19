import cors from "cors";
import express from "express";
import { config } from "./config/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import auditRoutes from "./routes/auditRoutes.js";

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "10mb" }));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "caresure-backend" });
});
app.use("/api/audit", auditRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
