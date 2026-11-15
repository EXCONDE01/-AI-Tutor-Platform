import { describe, it, expect } from 'vitest';
import { auditActionEnum, auditResourceTypeEnum } from '../../../db/schema/audit';
import {
  AUDIT_RESOURCE_TYPES,
  AUDIT_RESOURCE_TYPE_LABELS,
  AUDIT_DB_ACTIONS,
  type AuditResourceType,
  type AuditDbAction,
} from './audit-options';

describe('audit-options enum parity', () => {
  it('AUDIT_RESOURCE_TYPES matches auditResourceTypeEnum.enumValues (same members, same order)', () => {
    expect(AUDIT_RESOURCE_TYPES).toEqual(auditResourceTypeEnum.enumValues);
  });

  it('AUDIT_DB_ACTIONS matches auditActionEnum.enumValues (same members, same order)', () => {
    expect(AUDIT_DB_ACTIONS).toEqual(auditActionEnum.enumValues);
  });

  it('AUDIT_RESOURCE_TYPE_LABELS has a non-empty label for every resource type value', () => {
    for (const type of AUDIT_RESOURCE_TYPES) {
      const label = AUDIT_RESOURCE_TYPE_LABELS[type];
      expect(label).toBeDefined();
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('auditResourceTypeEnum.enumValues includes lti_launch', () => {
    expect(auditResourceTypeEnum.enumValues).toContain('lti_launch');
  });

  it('TypeScript types are correctly inferred', () => {
    // These type checks are compile-time; runtime test just verifies values exist
    const resourceType: AuditResourceType = 'lti_launch';
    const dbAction: AuditDbAction = 'lti_launch';
    expect(resourceType).toBe('lti_launch');
    expect(dbAction).toBe('lti_launch');
  });
});