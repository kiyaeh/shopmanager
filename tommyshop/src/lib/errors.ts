/**
 * Shared error classes — safe to import in both server and client components.
 * This file must NOT import from 'next/headers', '@supabase/ssr', or any
 * other server-only module.
 */

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string, public detail?: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
