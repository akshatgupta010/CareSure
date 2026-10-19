import { Router } from "express";
import { auditBatch } from "../controllers/auditController.js";

const router = Router();

router.post("/batch", auditBatch);

export default router;
