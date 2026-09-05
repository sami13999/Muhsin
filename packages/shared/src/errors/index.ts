import type { ApiError } from '../types/api.js';

/**
 * Base application error. All MUSHIN errors extend this.
 * Carries a machine-readable code and HTTP status.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }

  toEnvelope(requestId?: string): ApiError {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
        ...(requestId ? { requestId } : {}),
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} not found: ${id}`, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFLICT', message, 409, details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number) {
    super('RATE_LIMITED', 'Too many requests', 429, {
      retryAfterSeconds,
    });
    this.name = 'RateLimitError';
  }
}

export class InsufficientCreditError extends AppError {
  constructor(required: bigint, available: bigint) {
    super('INSUFFICIENT_CREDIT', 'Insufficient credit balance', 402, {
      requiredCents: required.toString(),
      availableCents: available.toString(),
    });
    this.name = 'InsufficientCreditError';
  }
}

export class IdempotencyConflictError extends AppError {
  constructor(existingKey: string) {
    super(
      'IDEMPOTENCY_CONFLICT',
      'Idempotency key already used with different request body',
      409,
      { existingKey },
    );
    this.name = 'IdempotencyConflictError';
  }
}

export class ConsentRequiredError extends AppError {
  constructor(channel: string) {
    super('CONSENT_REQUIRED', `Consent required for channel: ${channel}`, 403, {
      channel,
    });
    this.name = 'ConsentRequiredError';
  }
}
