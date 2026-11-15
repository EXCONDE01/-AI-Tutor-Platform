import { describe, it, expect } from 'vitest';
import { DEMO_DISTRICT_ID, DEMO_SCHOOL_ID } from './tenant';

describe('Demo tenant constants', () => {
  it('DEMO_DISTRICT_ID is a valid UUID v4', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(DEMO_DISTRICT_ID).toMatch(uuidRegex);
  });

  it('DEMO_SCHOOL_ID is a valid UUID v4', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(DEMO_SCHOOL_ID).toMatch(uuidRegex);
  });

  it('DEMO_DISTRICT_ID matches the seeded value', () => {
    expect(DEMO_DISTRICT_ID).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('DEMO_SCHOOL_ID matches the seeded value', () => {
    expect(DEMO_SCHOOL_ID).toBe('22222222-2222-4222-8222-222222222222');
  });

  it('Both IDs are different', () => {
    expect(DEMO_DISTRICT_ID).not.toBe(DEMO_SCHOOL_ID);
  });
});