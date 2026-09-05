/**
 * Audit logging tests.
 * Tests audit record validation and middleware behavior.
 */
import { describe, it, expect } from 'vitest';
import { validateAuditRecord, type AuditRecord } from '@mushin/shared';

describe('Audit Logging', () => {
  describe('validateAuditRecord', () => {
    const validRecord: Partial<AuditRecord> = {
      auditId: 'audit-001',
      staffUserId: 'stf-001',
      staffRole: 'admin',
      action: 'workspace.suspend',
      targetType: 'workspace',
      targetId: 'ws-001',
      reason: 'Abusive usage pattern detected',
      requestId: 'req-001',
      occurredAt: new Date(),
    };

    it('should return null for valid record', () => {
      const error = validateAuditRecord(validRecord);
      expect(error).toBeNull();
    });

    it('should require auditId', () => {
      const error = validateAuditRecord({ ...validRecord, auditId: undefined });
      expect(error).toContain('auditId is required');
    });

    it('should require staffUserId', () => {
      const error = validateAuditRecord({ ...validRecord, staffUserId: '' });
      expect(error).toContain('staffUserId is required');
    });

    it('should require staffRole', () => {
      const error = validateAuditRecord({ ...validRecord, staffRole: undefined as any });
      expect(error).toContain('staffRole is required');
    });

    it('should require action', () => {
      const error = validateAuditRecord({ ...validRecord, action: undefined as any });
      expect(error).toContain('action is required');
    });

    it('should require targetType', () => {
      const error = validateAuditRecord({ ...validRecord, targetType: undefined as any });
      expect(error).toContain('targetType is required');
    });

    it('should require targetId', () => {
      const error = validateAuditRecord({ ...validRecord, targetId: '' });
      expect(error).toContain('targetId is required');
    });

    it('should require requestId', () => {
      const error = validateAuditRecord({ ...validRecord, requestId: '' });
      expect(error).toContain('requestId is required');
    });

    it('should require reason for mutating actions (min 10 chars)', () => {
      const error = validateAuditRecord({
        ...validRecord,
        reason: 'short',
        action: 'workspace.suspend',
      });
      expect(error).toContain('Reason required');
      expect(error).toContain('min 10 chars');
    });

    it('should accept short reason for non-mutating actions', () => {
      const error = validateAuditRecord({
        ...validRecord,
        reason: '',
        action: 'workspace.view',
      });
      expect(error).toBeNull();
    });

    it('should accept valid reason for mutating actions', () => {
      const error = validateAuditRecord({
        ...validRecord,
        reason: 'Repeated spam reports from this workspace',
        action: 'workspace.suspend',
      });
      expect(error).toBeNull();
    });
  });
});
