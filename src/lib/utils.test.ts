import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges classes correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar');
  });

  it('dedupes conflicting Tailwind classes', () => {
    // twMerge should handle conflicting classes like p-2 and p-4
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('handles complex tailwind conflicts', () => {
    expect(cn('bg-red-500 text-white', 'bg-blue-500')).toBe('text-white bg-blue-500');
  });

  it('handles array inputs', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('handles object inputs', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('');
  });

  it('handles mixed inputs', () => {
    expect(cn('base', { conditional: true }, ['array', 'items'])).toBe('base conditional array items');
  });

  it('handles Tailwind responsive variants', () => {
    // twMerge keeps the last occurrence of conflicting utilities
    expect(cn('md:flex', 'hidden')).toBe('md:flex hidden');
  });
});