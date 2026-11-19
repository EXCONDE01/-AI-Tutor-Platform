-- Custom SQL migration file for Neon Realtime shadow tables
-- These tables bypass RLS and are kept in sync with triggers
-- This allows Neon Realtime to subscribe to live data without RLS issues

-- ============================================================================
-- Shadow table for teacher active sessions (no RLS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS teacher_active_sessions_realtime (
  id uuid NOT NULL,
  student_id uuid NOT NULL,
  student_name text NOT NULL,
  student_email text NOT NULL,
  class_id uuid NOT NULL,
  class_name text NOT NULL,
  class_subject text NOT NULL,
  status text NOT NULL,
  title text,
  message_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  paused_at timestamptz,
  total_duration_seconds integer,
  updated_at timestamptz NOT NULL,
  teacher_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_active_sessions_realtime_teacher 
ON teacher_active_sessions_realtime (teacher_id);

-- ============================================================================
-- Shadow table for session messages (no RLS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_messages_realtime (
  id uuid NOT NULL,
  session_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  content_type text NOT NULL,
  sequence integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_session_messages_realtime_session 
ON session_messages_realtime (session_id);

-- ============================================================================
-- Disable RLS on shadow tables
-- ============================================================================
ALTER TABLE teacher_active_sessions_realtime DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_messages_realtime DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Grant permissions to neondb_owner (Neon Realtime role)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON teacher_active_sessions_realtime TO neondb_owner;
GRANT SELECT, INSERT, UPDATE, DELETE ON session_messages_realtime TO neondb_owner;

-- ============================================================================
-- Trigger function to sync tutor_sessions to teacher_active_sessions_realtime
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_teacher_active_sessions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_teacher_id uuid;
BEGIN
  -- Get teacher_id from classes
  SELECT teacher_id INTO v_teacher_id FROM classes WHERE id = NEW.class_id;
  
  IF TG_OP = 'DELETE' THEN
    DELETE FROM teacher_active_sessions_realtime WHERE id = OLD.id;
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' THEN
      INSERT INTO teacher_active_sessions_realtime (
        id, student_id, student_name, student_email, class_id, class_name, 
        class_subject, status, title, message_count, started_at, ended_at, 
        paused_at, total_duration_seconds, updated_at, teacher_id
      )
      SELECT 
        NEW.id, s.id, u.first_name || ' ' || u.last_name, u.email, c.id, c.name, 
        c.subject, NEW.status::text, NEW.title, NEW.message_count, NEW.started_at, 
        NEW.ended_at, NEW.paused_at, NEW.total_duration_seconds, NEW.updated_at, v_teacher_id
      FROM students s
      INNER JOIN users u ON u.id = s.user_id
      INNER JOIN classes c ON c.id = NEW.class_id
      WHERE s.id = NEW.student_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Delete old entry if exists
    DELETE FROM teacher_active_sessions_realtime WHERE id = NEW.id;
    -- Insert new entry if active
    IF NEW.status = 'active' THEN
      INSERT INTO teacher_active_sessions_realtime (
        id, student_id, student_name, student_email, class_id, class_name, 
        class_subject, status, title, message_count, started_at, ended_at, 
        paused_at, total_duration_seconds, updated_at, teacher_id
      )
      SELECT 
        NEW.id, s.id, u.first_name || ' ' || u.last_name, u.email, c.id, c.name, 
        c.subject, NEW.status::text, NEW.title, NEW.message_count, NEW.started_at, 
        NEW.ended_at, NEW.paused_at, NEW.total_duration_seconds, NEW.updated_at, v_teacher_id
      FROM students s
      INNER JOIN users u ON u.id = s.user_id
      INNER JOIN classes c ON c.id = NEW.class_id
      WHERE s.id = NEW.student_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger on tutor_sessions
DROP TRIGGER IF EXISTS trigger_sync_teacher_active_sessions ON tutor_sessions;
CREATE TRIGGER trigger_sync_teacher_active_sessions
AFTER INSERT OR UPDATE OR DELETE ON tutor_sessions
FOR EACH ROW EXECUTE FUNCTION sync_teacher_active_sessions();

-- ============================================================================
-- Trigger function to sync messages to session_messages_realtime
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_session_messages_realtime()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM session_messages_realtime WHERE id = OLD.id;
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO session_messages_realtime (id, session_id, role, content, content_type, sequence, metadata, created_at)
    VALUES (NEW.id, NEW.session_id, NEW.role::text, NEW.content, NEW.content_type, NEW.sequence, NEW.metadata, NEW.created_at)
    ON CONFLICT (id) DO UPDATE SET
      session_id = EXCLUDED.session_id,
      role = EXCLUDED.role,
      content = EXCLUDED.content,
      content_type = EXCLUDED.content_type,
      sequence = EXCLUDED.sequence,
      metadata = EXCLUDED.metadata,
      created_at = EXCLUDED.created_at;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger on messages
DROP TRIGGER IF EXISTS trigger_sync_session_messages_realtime ON messages;
CREATE TRIGGER trigger_sync_session_messages_realtime
AFTER INSERT OR UPDATE OR DELETE ON messages
FOR EACH ROW EXECUTE FUNCTION sync_session_messages_realtime();

-- ============================================================================
-- Initial sync of existing data
-- ============================================================================
INSERT INTO teacher_active_sessions_realtime (
  id, student_id, student_name, student_email, class_id, class_name, 
  class_subject, status, title, message_count, started_at, ended_at, 
  paused_at, total_duration_seconds, updated_at, teacher_id
)
SELECT 
  ts.id, s.id, u.first_name || ' ' || u.last_name, u.email, c.id, c.name, 
  c.subject, ts.status::text, ts.title, ts.message_count, ts.started_at, 
  ts.ended_at, ts.paused_at, ts.total_duration_seconds, ts.updated_at, c.teacher_id
FROM tutor_sessions ts
INNER JOIN classes c ON c.id = ts.class_id
INNER JOIN students s ON s.id = ts.student_id
INNER JOIN users u ON u.id = s.user_id
WHERE ts.status = 'active'
ON CONFLICT (id) DO NOTHING;

INSERT INTO session_messages_realtime (id, session_id, role, content, content_type, sequence, metadata, created_at)
SELECT id, session_id, role::text, content, content_type, sequence, metadata, created_at
FROM messages
ON CONFLICT (id) DO NOTHING;