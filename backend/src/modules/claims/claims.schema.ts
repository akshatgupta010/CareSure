import { z } from 'zod';

export const createClaimSchema = {
  body: z
    .object({
      claimNumber: z.string().min(3, 'Claim number is required'),
      patientId: z.string().min(2, 'Patient ID is required'),
      patientName: z.string().min(2, 'Patient name is required'),
      hospitalName: z.string().min(2, 'Hospital name is required'),
      encounterId: z
        .string()
        .optional()
        .default(() => 'ENC-' + Math.floor(10000 + Math.random() * 90000)),
      admissionDate: z.string().or(z.date()),
      dischargeDate: z.string().or(z.date()),
      diagnosis: z.string().min(2, 'Diagnosis is required'),
      procedure: z.string().min(2, 'Procedure is required'),
      claimAmount: z.coerce.number().int().positive('Claim amount must be a positive integer in paise'),
      policyNumber: z.string().min(2, 'Policy number is required'),
      insurer: z.string().min(2, 'Insurer is required'),
      procedures: z.array(z.any()).optional(),
      billing: z.array(z.any()).optional(),
      diagnostics: z.array(z.any()).optional(),
      documents: z.array(z.any()).optional(),
    })
    .passthrough()
    .refine(
      (data) => {
        const adminDate = new Date(data.admissionDate).getTime();
        const dischDate = new Date(data.dischargeDate).getTime();
        return dischDate >= adminDate;
      },
      {
        message: 'Discharge date must be on or after admission date',
        path: ['dischargeDate'],
      }
    ),
};

export const claimDecisionSchema = {
  body: z.object({
    action: z.enum(
      ['approve', 'request_docs', 'escalate', 'approved', 'rejected', 'flagged'],
      {
        message: 'Action must be one of: approve, request_docs, escalate, approved, rejected, flagged',
      }
    ),
    note: z.string().min(1, 'Reviewer decision note is required'),
  }),
};

export const queryClaimsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().optional(),
    risk: z.enum(['low', 'review', 'high']).optional(),
    validation: z.enum(['passed', 'warnings', 'failed']).optional(),
    sort: z.string().default('createdAt:desc'),
  }),
};
