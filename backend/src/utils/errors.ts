export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly fields?: Record<string, string[]>;

  constructor(code: string, statusCode: number, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.fields = fields;

    Error.captureStackTrace(this, this.constructor);
  }
}
