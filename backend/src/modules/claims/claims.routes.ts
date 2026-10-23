import { Router } from 'express';
import { ClaimsController } from './claims.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { uploadMiddleware } from '../../middleware/upload.js';
import { createClaimSchema, claimDecisionSchema, queryClaimsSchema } from './claims.schema.js';

export const claimsRouter = Router();

claimsRouter.use(requireAuth);

claimsRouter.post('/', validate(createClaimSchema), ClaimsController.create);
claimsRouter.get('/', validate(queryClaimsSchema), ClaimsController.list);
claimsRouter.get('/:id', ClaimsController.getById);
claimsRouter.post('/:id/documents', uploadMiddleware.single('file'), ClaimsController.uploadDocument);
claimsRouter.post('/:id/extract', ClaimsController.extract);
claimsRouter.post('/:id/validate', ClaimsController.validate);
claimsRouter.post('/:id/decision', validate(claimDecisionSchema), ClaimsController.recordDecision);
