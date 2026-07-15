import type { PostgrestError } from '@supabase/supabase-js';
import type { AppError } from './result';

/**
 * Type guard for standard Error objects
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard for Supabase PostgrestError
 */
export function isSupabaseError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'code' in error &&
    'details' in error &&
    'hint' in error
  );
}

/**
 * Type guard for AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'code' in error
  );
}

/**
 * Safely converts an unknown error into a readable string message.
 */
export function toErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof (error as Record<string, unknown>).message === 'string') {
      return (error as Record<string, unknown>).message as string;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown error object";
    }
  }
  
  return typeof error === 'string' ? error : String(error);
}
