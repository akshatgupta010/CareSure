import mongoose, { Document, Schema } from 'mongoose';

export interface ISetting extends Document {
  key: string;
  value: any;
  updatedBy?: string | null;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    updatedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Setting = mongoose.model<ISetting>('Setting', SettingSchema);
