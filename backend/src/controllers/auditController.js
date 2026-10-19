import { auditRecords } from "../services/auditService.js";
import { validateAndNormalizeRecords } from "../validators/auditValidator.js";

export function auditBatch(req, res) {
  const { data: records, error } = validateAndNormalizeRecords(req.body);

  if (error) {
    return res.status(422).json({ detail: error });
  }

  return res.status(200).json(auditRecords(records));
}
