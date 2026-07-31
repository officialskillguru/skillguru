export type Success<T> = {
  success: true;
  data: T;
};

export type Failure<E> = {
  success: false;
  error: E;
};

export type Result<T, E = AppError> = Success<T> | Failure<E>;

export type ErrorCode =
  | "AUTH_ERROR"
  | "AUTHORIZATION_ERROR"
  | "PROFILE_MISSING"
  | "TRIGGER_FAILURE"
  | "DATABASE_ERROR"
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"
  | "CONFLICT_ERROR"
  | "RATE_LIMIT_ERROR"
  | "UNEXPECTED_ERROR";

export class AppError extends Error {
  constructor(
    public override message: string,
    public code: ErrorCode,
    public developerMessage: string,
    public recoveryAction?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, developerMessage: string, recoveryAction?: string, originalError?: unknown) {
    super(message, "AUTH_ERROR", developerMessage, recoveryAction, originalError);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, developerMessage: string, recoveryAction?: string, originalError?: unknown) {
    super(message, "AUTHORIZATION_ERROR", developerMessage, recoveryAction, originalError);
    this.name = "AuthorizationError";
  }
}

export class ProfileMissingError extends AppError {
  constructor(message: string, developerMessage: string, recoveryAction?: string, originalError?: unknown) {
    super(message, "PROFILE_MISSING", developerMessage, recoveryAction, originalError);
    this.name = "ProfileMissingError";
  }
}

export class TriggerFailureError extends AppError {
  constructor(message: string, developerMessage: string, recoveryAction?: string, originalError?: unknown) {
    super(message, "TRIGGER_FAILURE", developerMessage, recoveryAction, originalError);
    this.name = "TriggerFailureError";
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, developerMessage: string, recoveryAction?: string, originalError?: unknown) {
    super(message, "DATABASE_ERROR", developerMessage, recoveryAction, originalError);
    this.name = "DatabaseError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, developerMessage: string, recoveryAction?: string, originalError?: unknown) {
    super(message, "VALIDATION_ERROR", developerMessage, recoveryAction, originalError);
    this.name = "ValidationError";
  }
}

export class NetworkError extends AppError {
  constructor(message: string, developerMessage: string, recoveryAction?: string, originalError?: unknown) {
    super(message, "NETWORK_ERROR", developerMessage, recoveryAction, originalError);
    this.name = "NetworkError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, developerMessage: string, recoveryAction?: string, originalError?: unknown) {
    super(message, "CONFLICT_ERROR", developerMessage, recoveryAction, originalError);
    this.name = "ConflictError";
  }
}

export class UnexpectedError extends AppError {
  constructor(message: string, developerMessage: string, recoveryAction?: string, originalError?: unknown) {
    super(message, "UNEXPECTED_ERROR", developerMessage, recoveryAction, originalError);
    this.name = "UnexpectedError";
  }
}

export class RateLimitError extends AppError {
  public retryAfterMs: number;

  constructor(message: string, developerMessage: string, retryAfterMs: number, recoveryAction?: string, originalError?: unknown) {
    super(message, "RATE_LIMIT_ERROR", developerMessage, recoveryAction, originalError);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export const ok = <T>(data: T): Success<T> => ({ success: true, data });
export const fail = <E>(error: E): Failure<E> => ({ success: false, error });

/** Type guard: narrows a Result<T> to Success<T> */
export function isSuccess<T, E = AppError>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

/** Type guard: narrows a Result<T> to Failure<E> */
export function isFailure<T, E = AppError>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}
