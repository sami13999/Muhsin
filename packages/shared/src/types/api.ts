/**
 * Standard MUSHIN API error envelope (Doc-20 §Error Handling).
 * Every error response MUST conform to this shape.
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

/**
 * Standard MUSHIN API success envelope with pagination.
 */
export interface ApiSuccess<T> {
  data: T;
  meta?: {
    cursor?: string;
    hasMore?: boolean;
    total?: number;
  };
}

/**
 * Rate limit headers (Doc-20 §Rate Limiting).
 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
}
