/**
 * Role validation utilities for onboarding and user management
 */

export type UserRole = 'teacher' | 'student' | 'parent' | 'admin';

/**
 * Validates and normalizes a role input.
 * Defaults to 'teacher' if input is invalid or missing.
 * 
 * @param input - The role input to validate (can be string, undefined, null, etc.)
 * @returns Validated role ('teacher', 'student', 'parent', or 'admin')
 */
export function parseRole(input: unknown): UserRole {
  if (typeof input === 'string') {
    const normalized = input.toLowerCase().trim();
    if (normalized === 'teacher' || normalized === 'student' || normalized === 'parent' || normalized === 'admin') {
      return normalized;
    }
  }
  // Default to teacher for any invalid input
  return 'teacher';
}

/**
 * Checks if a role is valid (strict check without defaulting)
 * 
 * @param role - The role to check
 * @returns true if role is 'teacher', 'student', 'parent', or 'admin'
 */
export function isValidRole(role: unknown): role is UserRole {
  return role === 'teacher' || role === 'student' || role === 'parent' || role === 'admin';
}