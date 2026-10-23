import mongoose, { Document, Schema } from 'mongoose';

export interface IEvaluationRun extends Document {
  datasetLabel: string;
  datasetSize: number;
  metrics: any;
  createdAt: Date;
}

const EvaluationRunSchema = new Schema<IEvaluationRun>(
  {
    datasetLabel: { type: String, required: true },
    datasetSize: { type: Number, required: true },
    metrics: { type: Schema.Types.Mixed, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const EvaluationRun = mongoose.model<IEvaluationRun>('EvaluationRun', EvaluationRunSchema);
