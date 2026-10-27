import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IBillingItem {
  _id?: Types.ObjectId;
  service: string;
  code?: string | null;
  amount: number; // paise
  serviceDate: Date;
  encounterId: string;
}

export interface IProcedureRecord {
  _id?: Types.ObjectId;
  name: string;
  code?: string | null;
  date: Date;
  encounterId: string;
}

export interface IDiagnosticRecord {
  _id?: Types.ObjectId;
  testName: string;
  reportPresent: boolean;
  date: Date;
  encounterId: string;
}

export interface IDocumentRecord {
  _id?: Types.ObjectId;
  kind: string;
  fileName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
  ocrConfidence?: number | null;
  extracted?: string | null;
  createdAt?: Date;
}

export interface IValidationFinding {
  _id?: Types.ObjectId;
  ruleId: string;
  category: 'Missing Docs' | 'Data Mismatch' | 'Policy Issue' | 'Unusual Amount' | 'Duplicate-like' | 'OCR Uncertainty';
  severity: 'low' | 'medium' | 'high';
  points: number;
  reason: string;
  evidence: Array<{ source: string; label: string; value: string; recordId?: string }>;
}

export interface IRiskAssessment {
  rulesPoints: number;
  mlPoints: number;
  anomalyPoints: number;
  total: number;
  band: 'low' | 'review' | 'high';
  validation: 'passed' | 'warnings' | 'failed';
  aiSignalsAvailable: boolean;
  aiNote?: string | null;
  processingMs: number;
  thresholdsSnapshot?: any;
  createdAt?: Date;
}

export interface IReviewDecision {
  _id?: Types.ObjectId;
  reviewerId: Types.ObjectId;
  reviewerName?: string;
  reviewerEmail?: string;
  action: 'approve' | 'request_docs' | 'escalate';
  note: string;
  createdAt?: Date;
}

export interface IClaim extends Document {
  claimNumber: string;
  patientId: string;
  patientName: string;
  hospitalName: string;
  insurer: string;
  policyNumber: string;
  encounterId: string;
  admissionDate: Date;
  dischargeDate: Date;
  diagnosis: string;
  procedure: string;
  claimAmount: number; // paise
  status: 'Draft' | 'Submitted' | 'Extracted' | 'Validated' | 'Cleared' | 'Pending Review' | 'Documents Requested' | 'Approved' | 'Escalated';
  submittedAt?: Date | null;
  validatedAt?: Date | null;
  isSynthetic: boolean;
  billing: IBillingItem[];
  procedures: IProcedureRecord[];
  diagnostics: IDiagnosticRecord[];
  documents: IDocumentRecord[];
  findings: IValidationFinding[];
  assessment?: IRiskAssessment | null;
  decisions: IReviewDecision[];
  createdAt: Date;
  updatedAt: Date;
}

const BillingItemSchema = new Schema<IBillingItem>(
  {
    service: { type: String, required: true },
    code: { type: String, default: null },
    amount: { type: Number, required: true },
    serviceDate: { type: Date, required: true },
    encounterId: { type: String, required: false },
  },
  { _id: true }
);

const ProcedureRecordSchema = new Schema<IProcedureRecord>(
  {
    name: { type: String, required: true },
    code: { type: String, default: null },
    date: { type: Date, required: true },
    encounterId: { type: String, required: false },
  },
  { _id: true }
);

const DiagnosticRecordSchema = new Schema<IDiagnosticRecord>(
  {
    testName: { type: String, required: true },
    reportPresent: { type: Boolean, default: true },
    date: { type: Date, required: true },
    encounterId: { type: String, required: false },
  },
  { _id: true }
);

const DocumentSchema = new Schema<IDocumentRecord>(
  {
    kind: { type: String, required: true },
    fileName: { type: String, required: true },
    storedPath: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    ocrConfidence: { type: Number, default: null },
    extracted: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const ValidationFindingSchema = new Schema<IValidationFinding>(
  {
    ruleId: { type: String, required: true },
    category: {
      type: String,
      enum: ['Missing Docs', 'Data Mismatch', 'Policy Issue', 'Unusual Amount', 'Duplicate-like', 'OCR Uncertainty'],
      required: true,
    },
    severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
    points: { type: Number, required: true },
    reason: { type: String, required: true },
    evidence: { type: Schema.Types.Mixed, default: [] },
  },
  { _id: true }
);

const RiskAssessmentSchema = new Schema<IRiskAssessment>(
  {
    rulesPoints: { type: Number, required: true },
    mlPoints: { type: Number, required: true },
    anomalyPoints: { type: Number, required: true },
    total: { type: Number, required: true },
    band: { type: String, enum: ['low', 'review', 'high'], required: true },
    validation: { type: String, enum: ['passed', 'warnings', 'failed'], required: true },
    aiSignalsAvailable: { type: Boolean, default: true },
    aiNote: { type: String, default: null },
    processingMs: { type: Number, required: true },
    thresholdsSnapshot: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const ReviewDecisionSchema = new Schema<IReviewDecision>(
  {
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewerName: { type: String },
    reviewerEmail: { type: String },
    action: { type: String, enum: ['approve', 'request_docs', 'escalate'], required: true },
    note: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const ClaimSchema = new Schema<IClaim>(
  {
    claimNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    patientId: { type: String, required: true, index: true },
    patientName: { type: String, required: true },
    hospitalName: { type: String, required: true },
    insurer: { type: String, required: true },
    policyNumber: { type: String, required: true },
    encounterId: { type: String, required: true, index: true },
    admissionDate: { type: Date, required: true },
    dischargeDate: { type: Date, required: true },
    diagnosis: { type: String, required: true },
    procedure: { type: String, required: true },
    claimAmount: { type: Number, required: true }, // in paise
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Extracted', 'Validated', 'Cleared', 'Pending Review', 'Documents Requested', 'Approved', 'Escalated'],
      default: 'Draft',
      index: true,
    },
    submittedAt: { type: Date, default: null },
    validatedAt: { type: Date, default: null },
    isSynthetic: { type: Boolean, default: true },
    billing: [BillingItemSchema],
    procedures: [ProcedureRecordSchema],
    diagnostics: [DiagnosticRecordSchema],
    documents: [DocumentSchema],
    findings: [ValidationFindingSchema],
    assessment: { type: RiskAssessmentSchema, default: null },
    decisions: [ReviewDecisionSchema],
  },
  {
    timestamps: true,
  }
);

ClaimSchema.index({ status: 1, 'assessment.total': -1 });
ClaimSchema.index({ patientId: 1, encounterId: 1 });

export const Claim = mongoose.model<IClaim>('Claim', ClaimSchema);
