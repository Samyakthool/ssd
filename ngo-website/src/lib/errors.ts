import crypto from 'crypto';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, code: string, statusCode: number = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

export interface ErrorResponseBody {
  success: false;
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export function formatErrorResponse(
  error: unknown,
  requestId: string = generateRequestId()
): { statusCode: number; status: number; body: ErrorResponseBody } {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      status: error.statusCode,
      body: {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          requestId,
          details: error.details,
        },
      },
    };
  }

  // Generic / Unexpected internal error - Log details server-side, hide from user
  console.error(`[Unhandled Server Error] [Request ID: ${requestId}]:`, error);

  return {
    statusCode: 500,
    status: 500,
    body: {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal error occurred. Please contact Central Command support with this request ID.',
        requestId,
      },
    },
  };
}
