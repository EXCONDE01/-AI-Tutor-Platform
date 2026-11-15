import { describe, it, expect } from 'vitest';
import { parseRole, isValidRole, type UserRole } from './roles';

describe('parseRole', () => {
  it('returns "teacher" for valid teacher input', () => {
    expect(parseRole('teacher')).toBe('teacher');
    expect(parseRole('TEACHER')).toBe('teacher');
    expect(parseRole('Teacher')).toBe('teacher');
    expect(parseRole('  teacher  ')).toBe('teacher');
  });

  it('returns "student" for valid student input', () => {
    expect(parseRole('student')).toBe('student');
    expect(parseRole('STUDENT')).toBe('student');
    expect(parseRole('Student')).toBe('student');
    expect(parseRole('  student  ')).toBe('student');
  });

  it('defaults to "teacher" for invalid string input', () => {
    expect(parseRole('invalid')).toBe('teacher');
    expect(parseRole('')).toBe('teacher');
  });

  it('defaults to "teacher" for non-string input', () => {
    expect(parseRole(null)).toBe('teacher');
    expect(parseRole(undefined)).toBe('teacher');
    expect(parseRole(123)).toBe('teacher');
    expect(parseRole({})).toBe('teacher');
    expect(parseRole([])).toBe('teacher');
  });

  it('always returns a valid UserRole type', () => {
    const result: UserRole = parseRole('anything');
    expect(['teacher', 'student', 'parent', 'admin']).toContain(result);
  });
});

describe('isValidRole', () => {
  it('returns true for "teacher"', () => {
    expect(isValidRole('teacher')).toBe(true);
  });

  it('returns true for "student"', () => {
    expect(isValidRole('student')).toBe(true);
  });

  it('returns false for invalid strings', () => {
    expect(isValidRole('invalid')).toBe(false);
    expect(isValidRole('')).toBe(false);
  });

  it('returns true for "parent" and "admin"', () => {
    expect(isValidRole('parent')).toBe(true);
    expect(isValidRole('admin')).toBe(true);
  });

  it('returns false for non-string input', () => {
    expect(isValidRole(null)).toBe(false);
    expect(isValidRole(undefined)).toBe(false);
    expect(isValidRole(123)).toBe(false);
    expect(isValidRole({})).toBe(false);
  });

  it('narrows type correctly', () => {
    const role: unknown = 'teacher';
    if (isValidRole(role)) {
      // TypeScript should narrow to UserRole
      expect(role).toBe('teacher');
    }
  });
});