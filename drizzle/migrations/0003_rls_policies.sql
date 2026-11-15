-- Custom SQL migration file, put your code below! --

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Tenants
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parents ENABLE ROW LEVEL SECURITY;

-- Classes
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_configs ENABLE ROW LEVEL SECURITY;

-- Sessions
ALTER TABLE tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_summaries ENABLE ROW LEVEL SECURITY;

-- Interventions
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_actions ENABLE ROW LEVEL SECURITY;

-- LTI
ALTER TABLE lti_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nrps_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ags_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ags_scores ENABLE ROW LEVEL SECURITY;

-- Artifacts
ALTER TABLE generated_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Audit
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Compliance
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- Note: No "TO authenticated" clause - policies apply to all roles (PUBLIC).
-- The app connects as neondb_owner which bypasses RLS by default.
-- When Neon Auth sets session variables, policies will enforce correctly.
-- ============================================================================

-- DISTRICTS
DROP POLICY IF EXISTS districts_super_admin ON districts;
CREATE POLICY districts_super_admin ON districts
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS districts_district_admin ON districts;
CREATE POLICY districts_district_admin ON districts
 FOR ALL
 USING (id = current_setting('app.current_district_id', true)::uuid
        AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK (id = current_setting('app.current_district_id', true)::uuid
             AND current_setting('app.is_district_admin', true)::boolean);

-- SCHOOLS
DROP POLICY IF EXISTS schools_super_admin ON schools;
CREATE POLICY schools_super_admin ON schools
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS schools_district_admin ON schools;
CREATE POLICY schools_district_admin ON schools
 FOR ALL
 USING (district_id = current_setting('app.current_district_id', true)::uuid
        AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK (district_id = current_setting('app.current_district_id', true)::uuid
             AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS schools_school_admin ON schools;
CREATE POLICY schools_school_admin ON schools
 FOR ALL
 USING (id = current_setting('app.current_school_id', true)::uuid
        AND current_setting('app.is_school_admin', true)::boolean)
 WITH CHECK (id = current_setting('app.current_school_id', true)::uuid
             AND current_setting('app.is_school_admin', true)::boolean);

DROP POLICY IF EXISTS schools_member ON schools;
CREATE POLICY schools_member ON schools
 FOR SELECT
 USING (id = current_setting('app.current_school_id', true)::uuid);

-- USERS
DROP POLICY IF EXISTS users_super_admin ON users;
CREATE POLICY users_super_admin ON users
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS users_district_admin ON users;
CREATE POLICY users_district_admin ON users
 FOR ALL
 USING (school_id IN (
   SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
 )
 AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK (school_id IN (
   SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
 )
 AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS users_school_admin ON users;
CREATE POLICY users_school_admin ON users
 FOR ALL
 USING (school_id = current_setting('app.current_school_id', true)::uuid
        AND current_setting('app.is_school_admin', true)::boolean)
 WITH CHECK (school_id = current_setting('app.current_school_id', true)::uuid
             AND current_setting('app.is_school_admin', true)::boolean);

DROP POLICY IF EXISTS users_self ON users;
CREATE POLICY users_self ON users
 FOR SELECT
 USING (id = current_setting('app.current_user_id', true)::uuid);

DROP POLICY IF EXISTS users_self_update ON users;
CREATE POLICY users_self_update ON users
 FOR UPDATE
 USING (id = current_setting('app.current_user_id', true)::uuid)
 WITH CHECK (id = current_setting('app.current_user_id', true)::uuid);

DROP POLICY IF EXISTS users_teacher_students ON users;
CREATE POLICY users_teacher_students ON users
 FOR SELECT
 USING (role = 'student'
        AND id IN (
          SELECT u.id FROM users u
          JOIN students s ON u.id = s.user_id
          JOIN class_students cs ON s.id = cs.student_id
          JOIN classes c ON cs.class_id = c.id
          JOIN teachers t ON c.teacher_id = t.id
          WHERE t.user_id = current_setting('app.current_user_id', true)::uuid
          AND cs.is_active = true
        )
        AND current_setting('app.current_role', true) = 'teacher');

DROP POLICY IF EXISTS users_parent_children ON users;
CREATE POLICY users_parent_children ON users
 FOR SELECT
 USING (role = 'student'
        AND id IN (
          SELECT u.id FROM users u
          JOIN students s ON u.id = s.user_id
          JOIN student_parents sp ON s.id = sp.student_id
          JOIN parents p ON sp.parent_id = p.id
          WHERE p.user_id = current_setting('app.current_user_id', true)::uuid
        )
        AND current_setting('app.current_role', true) = 'parent');

-- TEACHERS
DROP POLICY IF EXISTS teachers_super_admin ON teachers;
CREATE POLICY teachers_super_admin ON teachers
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS teachers_district_admin ON teachers;
CREATE POLICY teachers_district_admin ON teachers
 FOR ALL
 USING (user_id IN (
   SELECT id FROM users WHERE school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK (user_id IN (
   SELECT id FROM users WHERE school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS teachers_school_admin ON teachers;
CREATE POLICY teachers_school_admin ON teachers
 FOR ALL
 USING (user_id IN (
   SELECT id FROM users WHERE school_id = current_setting('app.current_school_id', true)::uuid
 )
 AND current_setting('app.is_school_admin', true)::boolean)
 WITH CHECK (user_id IN (
   SELECT id FROM users WHERE school_id = current_setting('app.current_school_id', true)::uuid
 )
 AND current_setting('app.is_school_admin', true)::boolean);

DROP POLICY IF EXISTS teachers_self ON teachers;
CREATE POLICY teachers_self ON teachers
 FOR SELECT
 USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- STUDENTS
DROP POLICY IF EXISTS students_super_admin ON students;
CREATE POLICY students_super_admin ON students
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS students_district_admin ON students;
CREATE POLICY students_district_admin ON students
 FOR ALL
 USING (user_id IN (
   SELECT id FROM users WHERE school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK (user_id IN (
   SELECT id FROM users WHERE school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS students_school_admin ON students;
CREATE POLICY students_school_admin ON students
 FOR ALL
 USING (user_id IN (
   SELECT id FROM users WHERE school_id = current_setting('app.current_school_id', true)::uuid
 )
 AND current_setting('app.is_school_admin', true)::boolean)
 WITH CHECK (user_id IN (
   SELECT id FROM users WHERE school_id = current_setting('app.current_school_id', true)::uuid
 )
 AND current_setting('app.is_school_admin', true)::boolean);

DROP POLICY IF EXISTS students_self ON students;
CREATE POLICY students_self ON students
 FOR SELECT
 USING (user_id = current_setting('app.current_user_id', true)::uuid);

DROP POLICY IF EXISTS students_teacher ON students;
CREATE POLICY students_teacher ON students
 FOR SELECT
 USING (id IN (
   SELECT cs.student_id FROM class_students cs
   JOIN classes c ON cs.class_id = c.id
   JOIN teachers t ON c.teacher_id = t.id
   WHERE t.user_id = current_setting('app.current_user_id', true)::uuid
   AND cs.is_active = true
 )
 AND current_setting('app.current_role', true) = 'teacher');

DROP POLICY IF EXISTS students_parent ON students;
CREATE POLICY students_parent ON students
 FOR SELECT
 USING (id IN (
   SELECT sp.student_id FROM student_parents sp
   JOIN parents p ON sp.parent_id = p.id
   WHERE p.user_id = current_setting('app.current_user_id', true)::uuid
 )
 AND current_setting('app.current_role', true) = 'parent');

-- PARENTS
DROP POLICY IF EXISTS parents_super_admin ON parents;
CREATE POLICY parents_super_admin ON parents
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS parents_district_admin ON parents;
CREATE POLICY parents_district_admin ON parents
 FOR ALL
 USING (user_id IN (
   SELECT id FROM users WHERE school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK (user_id IN (
   SELECT id FROM users WHERE school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS parents_school_admin ON parents;
CREATE POLICY parents_school_admin ON parents
 FOR ALL
 USING (user_id IN (
   SELECT id FROM users WHERE school_id = current_setting('app.current_school_id', true)::uuid
 )
 AND current_setting('app.is_school_admin', true)::boolean)
 WITH CHECK (user_id IN (
   SELECT id FROM users WHERE school_id = current_setting('app.current_school_id', true)::uuid
 )
 AND current_setting('app.is_school_admin', true)::boolean);

DROP POLICY IF EXISTS parents_self ON parents;
CREATE POLICY parents_self ON parents
 FOR SELECT
 USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- STUDENT_PARENTS
DROP POLICY IF EXISTS student_parents_super_admin ON student_parents;
CREATE POLICY student_parents_super_admin ON student_parents
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS student_parents_teacher ON student_parents;
CREATE POLICY student_parents_teacher ON student_parents
 FOR SELECT
 USING (student_id IN (
   SELECT cs.student_id FROM class_students cs
   JOIN classes c ON cs.class_id = c.id
   JOIN teachers t ON c.teacher_id = t.id
   WHERE t.user_id = current_setting('app.current_user_id', true)::uuid
   AND cs.is_active = true
 )
 AND current_setting('app.current_role', true) = 'teacher');

DROP POLICY IF EXISTS student_parents_parent ON student_parents;
CREATE POLICY student_parents_parent ON student_parents
 FOR SELECT
 USING (parent_id IN (
   SELECT id FROM parents WHERE user_id = current_setting('app.current_user_id', true)::uuid
 )
 AND current_setting('app.current_role', true) = 'parent');

-- CLASSES
DROP POLICY IF EXISTS classes_super_admin ON classes;
CREATE POLICY classes_super_admin ON classes
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS classes_district_admin ON classes;
CREATE POLICY classes_district_admin ON classes
 FOR ALL
 USING (school_id IN (
   SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
 )
 AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK (school_id IN (
   SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
 )
 AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS classes_school_admin ON classes;
CREATE POLICY classes_school_admin ON classes
 FOR ALL
 USING (school_id = current_setting('app.current_school_id', true)::uuid
        AND current_setting('app.is_school_admin', true)::boolean)
 WITH CHECK (school_id = current_setting('app.current_school_id', true)::uuid
             AND current_setting('app.is_school_admin', true)::boolean);

DROP POLICY IF EXISTS classes_teacher ON classes;
CREATE POLICY classes_teacher ON classes
 FOR ALL
 USING (teacher_id IN (
   SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
 )
 AND current_setting('app.current_role', true) = 'teacher')
 WITH CHECK (teacher_id IN (
   SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
 )
 AND current_setting('app.current_role', true) = 'teacher');

DROP POLICY IF EXISTS classes_student ON classes;
CREATE POLICY classes_student ON classes
 FOR SELECT
 USING (id IN (
   SELECT cs.class_id FROM class_students cs
   JOIN students s ON cs.student_id = s.id
   WHERE s.user_id = current_setting('app.current_user_id', true)::uuid
   AND cs.is_active = true
 )
 AND current_setting('app.current_role', true) = 'student');

DROP POLICY IF EXISTS classes_parent ON classes;
CREATE POLICY classes_parent ON classes
 FOR SELECT
 USING (id IN (
   SELECT cs.class_id FROM class_students cs
   JOIN students s ON cs.student_id = s.id
   JOIN student_parents sp ON s.id = sp.student_id
   JOIN parents p ON sp.parent_id = p.id
   WHERE p.user_id = current_setting('app.current_user_id', true)::uuid
   AND cs.is_active = true
 )
 AND current_setting('app.current_role', true) = 'parent');

-- CLASS_STUDENTS
DROP POLICY IF EXISTS class_students_super_admin ON class_students;
CREATE POLICY class_students_super_admin ON class_students
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS class_students_district_admin ON class_students;
CREATE POLICY class_students_district_admin ON class_students
 FOR ALL
 USING (class_id IN (
   SELECT id FROM classes WHERE school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK (class_id IN (
   SELECT id FROM classes WHERE school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS class_students_school_admin ON class_students;
CREATE POLICY class_students_school_admin ON class_students
 FOR ALL
 USING (class_id IN (
   SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
 )
 AND current_setting('app.is_school_admin', true)::boolean)
 WITH CHECK (class_id IN (
   SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
 )
 AND current_setting('app.is_school_admin', true)::boolean);

DROP POLICY IF EXISTS class_students_teacher ON class_students;
CREATE POLICY class_students_teacher ON class_students
 FOR ALL
 USING (class_id IN (
   SELECT id FROM classes WHERE teacher_id IN (
     SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
 )
 AND current_setting('app.current_role', true) = 'teacher')
 WITH CHECK (class_id IN (
   SELECT id FROM classes WHERE teacher_id IN (
     SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
 )
 AND current_setting('app.current_role', true) = 'teacher');

DROP POLICY IF EXISTS class_students_student ON class_students;
CREATE POLICY class_students_student ON class_students
 FOR SELECT
 USING (student_id IN (
   SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)::uuid
 )
 AND current_setting('app.current_role', true) = 'student');

DROP POLICY IF EXISTS class_students_parent ON class_students;
CREATE POLICY class_students_parent ON class_students
 FOR SELECT
 USING (student_id IN (
   SELECT sp.student_id FROM student_parents sp
   JOIN parents p ON sp.parent_id = p.id
   WHERE p.user_id = current_setting('app.current_user_id', true)::uuid
 )
 AND current_setting('app.current_role', true) = 'parent');

-- TUTOR_CONFIGS
DROP POLICY IF EXISTS tutor_configs_super_admin ON tutor_configs;
CREATE POLICY tutor_configs_super_admin ON tutor_configs
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS tutor_configs_district_admin ON tutor_configs;
CREATE POLICY tutor_configs_district_admin ON tutor_configs
 FOR ALL
 USING (class_id IN (
   SELECT id FROM classes WHERE school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK (class_id IN (
   SELECT id FROM classes WHERE school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS tutor_configs_school_admin ON tutor_configs;
CREATE POLICY tutor_configs_school_admin ON tutor_configs
 FOR ALL
 USING (class_id IN (
   SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
 )
 AND current_setting('app.is_school_admin', true)::boolean)
 WITH CHECK (class_id IN (
   SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
 )
 AND current_setting('app.is_school_admin', true)::boolean);

DROP POLICY IF EXISTS tutor_configs_teacher ON tutor_configs;
CREATE POLICY tutor_configs_teacher ON tutor_configs
 FOR ALL
 USING (class_id IN (
   SELECT id FROM classes WHERE teacher_id IN (
     SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
 )
 AND current_setting('app.current_role', true) = 'teacher')
 WITH CHECK (class_id IN (
   SELECT id FROM classes WHERE teacher_id IN (
     SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
 )
 AND current_setting('app.current_role', true) = 'teacher');

-- TUTOR_SESSIONS
DROP POLICY IF EXISTS tutor_sessions_super_admin ON tutor_sessions;
CREATE POLICY tutor_sessions_super_admin ON tutor_sessions
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS tutor_sessions_district_admin ON tutor_sessions;
CREATE POLICY tutor_sessions_district_admin ON tutor_sessions
 FOR ALL
 USING (class_id IN (
   SELECT id FROM classes WHERE school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK (class_id IN (
   SELECT id FROM classes WHERE school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS tutor_sessions_school_admin ON tutor_sessions;
CREATE POLICY tutor_sessions_school_admin ON tutor_sessions
 FOR ALL
 USING (class_id IN (
   SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
 )
 AND current_setting('app.is_school_admin', true)::boolean)
 WITH CHECK (class_id IN (
   SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
 )
 AND current_setting('app.is_school_admin', true)::boolean);

DROP POLICY IF EXISTS tutor_sessions_teacher ON tutor_sessions;
CREATE POLICY tutor_sessions_teacher ON tutor_sessions
 FOR ALL
 USING (class_id IN (
   SELECT id FROM classes WHERE teacher_id IN (
     SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
 )
 AND current_setting('app.current_role', true) = 'teacher')
 WITH CHECK (class_id IN (
   SELECT id FROM classes WHERE teacher_id IN (
     SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
 )
 AND current_setting('app.current_role', true) = 'teacher');

DROP POLICY IF EXISTS tutor_sessions_student ON tutor_sessions;
CREATE POLICY tutor_sessions_student ON tutor_sessions
 FOR SELECT
 USING (student_id IN (
   SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)::uuid
 )
 AND current_setting('app.current_role', true) = 'student');

DROP POLICY IF EXISTS tutor_sessions_student_create ON tutor_sessions;
CREATE POLICY tutor_sessions_student_create ON tutor_sessions
 FOR INSERT
 WITH CHECK (student_id IN (
   SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)::uuid
 )
 AND current_setting('app.current_role', true) = 'student');

-- MESSAGES
DROP POLICY IF EXISTS messages_super_admin ON messages;
CREATE POLICY messages_super_admin ON messages
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS messages_participant ON messages;
CREATE POLICY messages_participant ON messages
 FOR ALL
 USING (session_id IN (
   SELECT id FROM tutor_sessions WHERE 
   (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)::uuid) 
    AND current_setting('app.current_role', true) = 'student')
   OR
   (class_id IN (
     SELECT id FROM classes WHERE teacher_id IN (
       SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
     )
   ) AND current_setting('app.current_role', true) = 'teacher')
 ))
 WITH CHECK (session_id IN (
   SELECT id FROM tutor_sessions WHERE 
   (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)::uuid) 
    AND current_setting('app.current_role', true) = 'student')
   OR
   (class_id IN (
     SELECT id FROM classes WHERE teacher_id IN (
       SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
     )
   ) AND current_setting('app.current_role', true) = 'teacher')
 ));

-- SESSION_SUMMARIES
DROP POLICY IF EXISTS session_summaries_super_admin ON session_summaries;
CREATE POLICY session_summaries_super_admin ON session_summaries
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS session_summaries_teacher ON session_summaries;
CREATE POLICY session_summaries_teacher ON session_summaries
 FOR SELECT
 USING (class_id IN (
   SELECT id FROM classes WHERE teacher_id IN (
     SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
 )
 AND current_setting('app.current_role', true) = 'teacher');

DROP POLICY IF EXISTS session_summaries_student ON session_summaries;
CREATE POLICY session_summaries_student ON session_summaries
 FOR SELECT
 USING (student_id IN (
   SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)::uuid
 )
 AND current_setting('app.current_role', true) = 'student');

-- INTERVENTIONS
DROP POLICY IF EXISTS interventions_super_admin ON interventions;
CREATE POLICY interventions_super_admin ON interventions
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS interventions_district_admin ON interventions;
CREATE POLICY interventions_district_admin ON interventions
 FOR ALL
 USING (class_id IN (
   SELECT id FROM classes WHERE school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK (class_id IN (
   SELECT id FROM classes WHERE school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS interventions_school_admin ON interventions;
CREATE POLICY interventions_school_admin ON interventions
 FOR ALL
 USING (class_id IN (
   SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
 )
 AND current_setting('app.is_school_admin', true)::boolean)
 WITH CHECK (class_id IN (
   SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
 )
 AND current_setting('app.is_school_admin', true)::boolean);

DROP POLICY IF EXISTS interventions_teacher ON interventions;
CREATE POLICY interventions_teacher ON interventions
 FOR ALL
 USING (class_id IN (
   SELECT id FROM classes WHERE teacher_id IN (
     SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
 )
 AND current_setting('app.current_role', true) = 'teacher')
 WITH CHECK (class_id IN (
   SELECT id FROM classes WHERE teacher_id IN (
     SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
 )
 AND current_setting('app.current_role', true) = 'teacher');

DROP POLICY IF EXISTS interventions_student ON interventions;
CREATE POLICY interventions_student ON interventions
 FOR SELECT
 USING (student_id IN (
   SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)::uuid
 )
 AND current_setting('app.current_role', true) = 'student');

-- INTERVENTION_ACTIONS
DROP POLICY IF EXISTS intervention_actions_super_admin ON intervention_actions;
CREATE POLICY intervention_actions_super_admin ON intervention_actions
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS intervention_actions_teacher ON intervention_actions;
CREATE POLICY intervention_actions_teacher ON intervention_actions
 FOR ALL
 USING (intervention_id IN (
   SELECT id FROM interventions WHERE class_id IN (
     SELECT id FROM classes WHERE teacher_id IN (
       SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
     )
   )
 )
 AND current_setting('app.current_role', true) = 'teacher')
 WITH CHECK (intervention_id IN (
   SELECT id FROM interventions WHERE class_id IN (
     SELECT id FROM classes WHERE teacher_id IN (
       SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
     )
   )
 )
 AND current_setting('app.current_role', true) = 'teacher');

-- LTI_PLATFORMS
DROP POLICY IF EXISTS lti_platforms_super_admin ON lti_platforms;
CREATE POLICY lti_platforms_super_admin ON lti_platforms
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS lti_platforms_district_admin ON lti_platforms;
CREATE POLICY lti_platforms_district_admin ON lti_platforms
 FOR ALL
 USING ((district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL)
        AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK ((district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL)
             AND current_setting('app.is_district_admin', true)::boolean);

-- LTI_DEPLOYMENTS
DROP POLICY IF EXISTS lti_deployments_super_admin ON lti_deployments;
CREATE POLICY lti_deployments_super_admin ON lti_deployments
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS lti_deployments_district_admin ON lti_deployments;
CREATE POLICY lti_deployments_district_admin ON lti_deployments
 FOR ALL
 USING (platform_id IN (
   SELECT id FROM lti_platforms WHERE district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL
 )
 AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK (platform_id IN (
   SELECT id FROM lti_platforms WHERE district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL
 )
 AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS lti_deployments_school_admin ON lti_deployments;
CREATE POLICY lti_deployments_school_admin ON lti_deployments
 FOR ALL
 USING ((school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL)
        AND current_setting('app.is_school_admin', true)::boolean)
 WITH CHECK ((school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL)
             AND current_setting('app.is_school_admin', true)::boolean);

-- NRPS_CACHE
DROP POLICY IF EXISTS nrps_cache_super_admin ON nrps_cache;
CREATE POLICY nrps_cache_super_admin ON nrps_cache
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS nrps_cache_district_admin ON nrps_cache;
CREATE POLICY nrps_cache_district_admin ON nrps_cache
 FOR ALL
 USING (deployment_id IN (
   SELECT id FROM lti_deployments WHERE platform_id IN (
     SELECT id FROM lti_platforms WHERE district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK (deployment_id IN (
   SELECT id FROM lti_deployments WHERE platform_id IN (
     SELECT id FROM lti_platforms WHERE district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS nrps_cache_school_admin ON nrps_cache;
CREATE POLICY nrps_cache_school_admin ON nrps_cache
 FOR ALL
 USING (deployment_id IN (
   SELECT id FROM lti_deployments WHERE school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL
 )
 AND current_setting('app.is_school_admin', true)::boolean)
 WITH CHECK (deployment_id IN (
   SELECT id FROM lti_deployments WHERE school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL
 )
 AND current_setting('app.is_school_admin', true)::boolean);

-- AGS_LINE_ITEMS
DROP POLICY IF EXISTS ags_line_items_super_admin ON ags_line_items;
CREATE POLICY ags_line_items_super_admin ON ags_line_items
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS ags_line_items_district_admin ON ags_line_items;
CREATE POLICY ags_line_items_district_admin ON ags_line_items
 FOR ALL
 USING (deployment_id IN (
   SELECT id FROM lti_deployments WHERE platform_id IN (
     SELECT id FROM lti_platforms WHERE district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK (deployment_id IN (
   SELECT id FROM lti_deployments WHERE platform_id IN (
     SELECT id FROM lti_platforms WHERE district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS ags_line_items_school_admin ON ags_line_items;
CREATE POLICY ags_line_items_school_admin ON ags_line_items
 FOR ALL
 USING (deployment_id IN (
   SELECT id FROM lti_deployments WHERE school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL
 )
 AND current_setting('app.is_school_admin', true)::boolean)
 WITH CHECK (deployment_id IN (
   SELECT id FROM lti_deployments WHERE school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL
 )
 AND current_setting('app.is_school_admin', true)::boolean);

DROP POLICY IF EXISTS ags_line_items_teacher ON ags_line_items;
CREATE POLICY ags_line_items_teacher ON ags_line_items
 FOR SELECT
 USING (deployment_id IN (
   SELECT ld.id FROM lti_deployments ld
   JOIN nrps_cache nc ON ld.id = nc.deployment_id
   WHERE nc.context_id IN (
     SELECT c.lti_context_id FROM classes c
     JOIN teachers t ON c.teacher_id = t.id
     WHERE t.user_id = current_setting('app.current_user_id', true)::uuid
   )
 )
 AND current_setting('app.current_role', true) = 'teacher');

-- AGS_SCORES
DROP POLICY IF EXISTS ags_scores_super_admin ON ags_scores;
CREATE POLICY ags_scores_super_admin ON ags_scores
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS ags_scores_teacher ON ags_scores;
CREATE POLICY ags_scores_teacher ON ags_scores
 FOR ALL
 USING (line_item_id IN (
   SELECT id FROM ags_line_items WHERE deployment_id IN (
     SELECT ld.id FROM lti_deployments ld
     JOIN nrps_cache nc ON ld.id = nc.deployment_id
     WHERE nc.context_id IN (
       SELECT c.lti_context_id FROM classes c
       JOIN teachers t ON c.teacher_id = t.id
       WHERE t.user_id = current_setting('app.current_user_id', true)::uuid
     )
   )
 )
 AND current_setting('app.current_role', true) = 'teacher')
 WITH CHECK (line_item_id IN (
   SELECT id FROM ags_line_items WHERE deployment_id IN (
     SELECT ld.id FROM lti_deployments ld
     JOIN nrps_cache nc ON ld.id = nc.deployment_id
     WHERE nc.context_id IN (
       SELECT c.lti_context_id FROM classes c
       JOIN teachers t ON c.teacher_id = t.id
       WHERE t.user_id = current_setting('app.current_user_id', true)::uuid
     )
   )
 )
 AND current_setting('app.current_role', true) = 'teacher');

DROP POLICY IF EXISTS ags_scores_student ON ags_scores;
CREATE POLICY ags_scores_student ON ags_scores
 FOR SELECT
 USING (user_id = current_setting('app.current_user_id', true)::uuid
        AND current_setting('app.current_role', true) = 'student');

-- GENERATED_ARTIFACTS
DROP POLICY IF EXISTS generated_artifacts_super_admin ON generated_artifacts;
CREATE POLICY generated_artifacts_super_admin ON generated_artifacts
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS generated_artifacts_district_admin ON generated_artifacts;
CREATE POLICY generated_artifacts_district_admin ON generated_artifacts
 FOR ALL
 USING (class_id IN (
   SELECT id FROM classes WHERE school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK (class_id IN (
   SELECT id FROM classes WHERE school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
 )
 AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS generated_artifacts_school_admin ON generated_artifacts;
CREATE POLICY generated_artifacts_school_admin ON generated_artifacts
 FOR ALL
 USING (class_id IN (
   SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
 )
 AND current_setting('app.is_school_admin', true)::boolean)
 WITH CHECK (class_id IN (
   SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
 )
 AND current_setting('app.is_school_admin', true)::boolean);

DROP POLICY IF EXISTS generated_artifacts_teacher ON generated_artifacts;
CREATE POLICY generated_artifacts_teacher ON generated_artifacts
 FOR ALL
 USING (class_id IN (
   SELECT id FROM classes WHERE teacher_id IN (
     SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
 )
 AND current_setting('app.current_role', true) = 'teacher')
 WITH CHECK (class_id IN (
   SELECT id FROM classes WHERE teacher_id IN (
     SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
 )
 AND current_setting('app.current_role', true) = 'teacher');

DROP POLICY IF EXISTS generated_artifacts_student ON generated_artifacts;
CREATE POLICY generated_artifacts_student ON generated_artifacts
 FOR SELECT
 USING ((student_id IN (
   SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)::uuid
 ) OR student_id IS NULL)
 AND current_setting('app.current_role', true) = 'student');

-- EXPORT_JOBS
DROP POLICY IF EXISTS export_jobs_super_admin ON export_jobs;
CREATE POLICY export_jobs_super_admin ON export_jobs
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS export_jobs_teacher ON export_jobs;
CREATE POLICY export_jobs_teacher ON export_jobs
 FOR ALL
 USING (artifact_id IN (
   SELECT id FROM generated_artifacts WHERE class_id IN (
     SELECT id FROM classes WHERE teacher_id IN (
       SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
     )
   )
 )
 AND current_setting('app.current_role', true) = 'teacher')
 WITH CHECK (artifact_id IN (
   SELECT id FROM generated_artifacts WHERE class_id IN (
     SELECT id FROM classes WHERE teacher_id IN (
       SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
     )
   )
 )
 AND current_setting('app.current_role', true) = 'teacher');

-- OAUTH_TOKENS
DROP POLICY IF EXISTS oauth_tokens_super_admin ON oauth_tokens;
CREATE POLICY oauth_tokens_super_admin ON oauth_tokens
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS oauth_tokens_self ON oauth_tokens;
CREATE POLICY oauth_tokens_self ON oauth_tokens
 FOR ALL
 USING (user_id = current_setting('app.current_user_id', true)::uuid)
 WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

-- AUDIT_LOGS
DROP POLICY IF EXISTS audit_logs_super_admin ON audit_logs;
CREATE POLICY audit_logs_super_admin ON audit_logs
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS audit_logs_district_admin ON audit_logs;
CREATE POLICY audit_logs_district_admin ON audit_logs
 FOR SELECT
 USING ((district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL)
        AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS audit_logs_school_admin ON audit_logs;
CREATE POLICY audit_logs_school_admin ON audit_logs
 FOR SELECT
 USING ((school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL)
        AND current_setting('app.is_school_admin', true)::boolean);

DROP POLICY IF EXISTS audit_logs_self ON audit_logs;
CREATE POLICY audit_logs_self ON audit_logs
 FOR SELECT
 USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- CONSENT_RECORDS
DROP POLICY IF EXISTS consent_records_super_admin ON consent_records;
CREATE POLICY consent_records_super_admin ON consent_records
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS consent_records_district_admin ON consent_records;
CREATE POLICY consent_records_district_admin ON consent_records
 FOR ALL
 USING ((district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL)
        AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK ((district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL)
             AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS consent_records_school_admin ON consent_records;
CREATE POLICY consent_records_school_admin ON consent_records
 FOR ALL
 USING ((school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL)
        AND current_setting('app.is_school_admin', true)::boolean)
 WITH CHECK ((school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL)
             AND current_setting('app.is_school_admin', true)::boolean);

DROP POLICY IF EXISTS consent_records_self ON consent_records;
CREATE POLICY consent_records_self ON consent_records
 FOR SELECT
 USING (user_id = current_setting('app.current_user_id', true)::uuid);

DROP POLICY IF EXISTS consent_records_parent ON consent_records;
CREATE POLICY consent_records_parent ON consent_records
 FOR SELECT
 USING (student_id IN (
   SELECT sp.student_id FROM student_parents sp
   JOIN parents p ON sp.parent_id = p.id
   WHERE p.user_id = current_setting('app.current_user_id', true)::uuid
 )
 AND current_setting('app.current_role', true) = 'parent');

-- DATA_DELETION_REQUESTS
DROP POLICY IF EXISTS data_deletion_requests_super_admin ON data_deletion_requests;
CREATE POLICY data_deletion_requests_super_admin ON data_deletion_requests
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS data_deletion_requests_district_admin ON data_deletion_requests;
CREATE POLICY data_deletion_requests_district_admin ON data_deletion_requests
 FOR ALL
 USING ((district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL)
        AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK ((district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL)
             AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS data_deletion_requests_school_admin ON data_deletion_requests;
CREATE POLICY data_deletion_requests_school_admin ON data_deletion_requests
 FOR ALL
 USING ((school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL)
        AND current_setting('app.is_school_admin', true)::boolean)
 WITH CHECK ((school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL)
             AND current_setting('app.is_school_admin', true)::boolean);

DROP POLICY IF EXISTS data_deletion_requests_self ON data_deletion_requests;
CREATE POLICY data_deletion_requests_self ON data_deletion_requests
 FOR ALL
 USING (user_id = current_setting('app.current_user_id', true)::uuid
        OR requested_by = current_setting('app.current_user_id', true)::uuid)
 WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid
             OR requested_by = current_setting('app.current_user_id', true)::uuid);

-- RETENTION_POLICIES
DROP POLICY IF EXISTS retention_policies_super_admin ON retention_policies;
CREATE POLICY retention_policies_super_admin ON retention_policies
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS retention_policies_district_admin ON retention_policies;
CREATE POLICY retention_policies_district_admin ON retention_policies
 FOR ALL
 USING ((district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL)
        AND current_setting('app.is_district_admin', true)::boolean)
 WITH CHECK ((district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL)
             AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS retention_policies_school_admin ON retention_policies;
CREATE POLICY retention_policies_school_admin ON retention_policies
 FOR ALL
 USING ((school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL)
        AND current_setting('app.is_school_admin', true)::boolean)
 WITH CHECK ((school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL)
             AND current_setting('app.is_school_admin', true)::boolean);

-- RETENTION_JOBS
DROP POLICY IF EXISTS retention_jobs_super_admin ON retention_jobs;
CREATE POLICY retention_jobs_super_admin ON retention_jobs
 FOR ALL
 USING (current_setting('app.is_super_admin', true)::boolean)
 WITH CHECK (current_setting('app.is_super_admin', true)::boolean);

DROP POLICY IF EXISTS retention_jobs_district_admin ON retention_jobs;
CREATE POLICY retention_jobs_district_admin ON retention_jobs
 FOR SELECT
 USING (policy_id IN (
   SELECT id FROM retention_policies WHERE district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL
 )
 AND current_setting('app.is_district_admin', true)::boolean);

DROP POLICY IF EXISTS retention_jobs_school_admin ON retention_jobs;
CREATE POLICY retention_jobs_school_admin ON retention_jobs
 FOR SELECT
 USING (policy_id IN (
   SELECT id FROM retention_policies WHERE school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL
 )
 AND current_setting('app.is_school_admin', true)::boolean);

-- ============================================================================
-- HELPER FUNCTION FOR RLS
-- ============================================================================

CREATE OR REPLACE FUNCTION set_app_context(
  p_user_id uuid,
  p_role text,
  p_teacher_id uuid DEFAULT NULL,
  p_student_id uuid DEFAULT NULL,
  p_parent_id uuid DEFAULT NULL,
  p_school_id uuid DEFAULT NULL,
  p_district_id uuid DEFAULT NULL,
  p_is_district_admin boolean DEFAULT false,
  p_is_school_admin boolean DEFAULT false,
  p_is_super_admin boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::text, false);
  PERFORM set_config('app.current_role', p_role, false);
  PERFORM set_config('app.current_teacher_id', COALESCE(p_teacher_id::text, ''), false);
  PERFORM set_config('app.current_student_id', COALESCE(p_student_id::text, ''), false);
  PERFORM set_config('app.current_parent_id', COALESCE(p_parent_id::text, ''), false);
  PERFORM set_config('app.current_school_id', COALESCE(p_school_id::text, ''), false);
  PERFORM set_config('app.current_district_id', COALESCE(p_district_id::text, ''), false);
  PERFORM set_config('app.is_district_admin', p_is_district_admin::text, false);
  PERFORM set_config('app.is_school_admin', p_is_school_admin::text, false);
  PERFORM set_config('app.is_super_admin', p_is_super_admin::text, false);
END;
$$;