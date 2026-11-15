/**
 * Audit Severity Mapping
 * Maps compliance audit severity inputs to database enum values
 */

export type AuditSeverityInput = 'info' | 'warning' | 'critical' | 'error';
export type DbAuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export function mapAuditSeverity(s: AuditSeverityInput): DbAuditSeverity {
  switch (s) {
    case 'info':
      return 'low';
    case 'warning':
      return 'medium';
    case 'error':
      return 'high';
    case 'critical':
      return 'critical';
    default:
      return 'low';
  }
}