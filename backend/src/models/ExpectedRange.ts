import mongoose, { Document, Schema } from 'mongoose';

export interface IExpectedRange extends Document {
  procedureKey: string;
  minAmount: number;
  maxAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ExpectedRangeSchema = new Schema<IExpectedRange>(
  {
    procedureKey: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    minAmount: {
      type: Number,
      required: true,
    },
    maxAmount: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ExpectedRange = mongoose.model<IExpectedRange>('ExpectedRange', ExpectedRangeSchema);
