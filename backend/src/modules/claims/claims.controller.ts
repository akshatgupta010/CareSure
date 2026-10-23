import { Request, Response, NextFunction } from 'express';
import { ClaimsService } from './claims.service.js';
import { AppError } from '../../utils/errors.js';

export class ClaimsController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const claim = await ClaimsService.createClaim(req.body, req.user?.id, req.user?.email);
      res.status(201).json({
        success: true,
        data: claim,
      });
    } catch (err) {
      next(err);
    }
  }

  static async uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const file = req.file;
      const kind = req.body.kind || 'document';

      if (!file) {
        throw new AppError('UNSUPPORTED_FILE', 400, "Please upload a file in field 'file'");
      }

      const result = await ClaimsService.uploadDocument(id, file, kind, req.user?.id, req.user?.email);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async extract(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const result = await ClaimsService.extractInformation(id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async validate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const result = await ClaimsService.validateClaim(id, req.user?.id, req.user?.email);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ClaimsService.listClaims(req.query as any);
      res.status(200).json({
        success: true,
        data: result.claims,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const claim = await ClaimsService.getClaimById(id);
      res.status(200).json({
        success: true,
        data: claim,
      });
    } catch (err) {
      next(err);
    }
  }

  static async recordDecision(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const { action, note } = req.body;
      const reviewerId = req.user!.id;

      const result = await ClaimsService.recordDecision(id, reviewerId, action, note);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
