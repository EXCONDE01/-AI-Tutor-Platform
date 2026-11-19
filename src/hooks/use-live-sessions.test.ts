import { describe, it, expect } from 'vitest';
import { mapSessionRow, mapMessageRow } from './use-live-sessions';

describe('mapSessionRow', () => {
  it('maps snake_case rows from the realtime shadow table', () => {
    const row = {
      id: 's1',
      student_id: 'stu1',
      student_name: 'Ada Lovelace',
      student_email: 'ada@example.com',
      class_id: 'c1',
      class_name: 'Algebra I',
      class_subject: 'Math',
      status: 'active',
      title: 'Linear equations',
      message_count: 3,
      started_at: '2026-01-01T10:00:00.000Z',
      ended_at: null,
      paused_at: null,
      total_duration_seconds: 125,
      updated_at: '2026-01-01T10:02:00.000Z',
      teacher_id: 't1',
    };

    const session = mapSessionRow(row);

    expect(session).toMatchObject({
      id: 's1',
      studentId: 'stu1',
      studentName: 'Ada Lovelace',
      studentEmail: 'ada@example.com',
      classId: 'c1',
      className: 'Algebra I',
      classSubject: 'Math',
      status: 'active',
      messageCount: 3,
      totalDurationSeconds: 125,
    });
    // Falls back to updated_at when no last message info is available
    expect(session.lastMessageAt).toBe('2026-01-01T10:02:00.000Z');
    expect(session.lastMessageContent).toBeNull();
  });

  it('passes through camelCase rows from the REST API', () => {
    const row = {
      id: 's2',
      studentId: 'stu2',
      studentName: 'Grace Hopper',
      studentEmail: 'grace@example.com',
      classId: 'c2',
      className: 'Computing',
      classSubject: 'CS',
      status: 'paused',
      title: null,
      messageCount: 7,
      startedAt: '2026-01-02T10:00:00.000Z',
      totalDurationSeconds: 60,
      updatedAt: '2026-01-02T10:01:00.000Z',
      lastMessageAt: '2026-01-02T10:00:30.000Z',
      lastMessageContent: 'Hello',
    };

    const session = mapSessionRow(row as never);

    expect(session).toMatchObject({
      id: 's2',
      studentId: 'stu2',
      studentName: 'Grace Hopper',
      classId: 'c2',
      className: 'Computing',
      messageCount: 7,
      lastMessageAt: '2026-01-02T10:00:30.000Z',
      lastMessageContent: 'Hello',
    });
  });

  it('defaults null numeric and date fields safely', () => {
    const session = mapSessionRow({
      id: 's3',
      student_id: 'stu3',
      student_name: '',
      student_email: '',
      class_id: 'c3',
      class_name: '',
      class_subject: '',
      status: 'active',
      title: null,
      message_count: null,
      started_at: null,
      ended_at: null,
      paused_at: null,
      total_duration_seconds: null,
      updated_at: null,
    });

    expect(session.messageCount).toBe(0);
    expect(session.totalDurationSeconds).toBe(0);
    expect(typeof session.startedAt).toBe('string');
  });
});

describe('mapMessageRow', () => {
  it('maps snake_case message rows', () => {
    const message = mapMessageRow({
      id: 'm1',
      session_id: 's1',
      role: 'assistant',
      content: 'Hi there',
      content_type: 'text',
      sequence: 2,
      metadata: { model: 'free-model' },
      created_at: '2026-01-01T10:00:05.000Z',
    });

    expect(message).toEqual({
      id: 'm1',
      sessionId: 's1',
      role: 'assistant',
      content: 'Hi there',
      contentType: 'text',
      sequence: 2,
      metadata: { model: 'free-model' },
      createdAt: '2026-01-01T10:00:05.000Z',
    });
  });

  it('defaults missing metadata', () => {
    const message = mapMessageRow({
      id: 'm2',
      session_id: 's1',
      role: 'user',
      content: 'hello',
      content_type: 'text',
      sequence: 1,
      metadata: null,
      created_at: '2026-01-01T10:00:00.000Z',
    });

    expect(message.metadata).toEqual({});
  });
});
