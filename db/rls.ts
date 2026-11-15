import { pgTable, uuid, text, timestamp, boolean, pgEnum, index, uniqueIndex, integer, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Row Level Security (RLS) Policies for AI Tutor Platform
 * 
 * These policies enforce multi-tenant isolation at the database level.
 * They use PostgreSQL's RLS with session variables set by the application.
 * 
 * Session variables used:
 * - app.current_user_id: UUID of the authenticated user
 * - app.current_teacher_id: UUID of the teacher (when user is a teacher)
 * - app.current_student_id: UUID of the student (when user is a student)
 * - app.current_parent_id: UUID of the parent (when user is a parent)
 * - app.current_school_id: UUID of the current school context
 * - app.current_district_id: UUID of the current district context
 * - app.current_role: Role of the current user (teacher, student, parent, admin)
 * - app.is_district_admin: Boolean for district-level admin
 * - app.is_school_admin: Boolean for school-level admin
 * - app.is_super_admin: Boolean for platform super admin
 * 
 * Application middleware MUST set these variables on each request:
 * SELECT set_config('app.current_user_id', $1, false);
 * SELECT set_config('app.current_role', $2, false);
 * etc.
 * 
 * NOTE: The live RLS policies are now applied via drizzle/migrations/ (migration 0003_rls_policies.sql).
 * This file remains as documentation of the policy definitions.
 * 
 * The app connects as neondb_owner (table owner), which bypasses RLS by default.
 * Policies are enforced when Neon Auth sets session variables via the set_app_context() function.
 */

// ============================================================================
// RLS ENABLE STATEMENTS (run after table creation)
// ============================================================================

export const rlsEnableStatements = [
  // Tenants
  'ALTER TABLE districts ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE schools ENABLE ROW LEVEL SECURITY;',
  
  // Users
  'ALTER TABLE users ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE students ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE parents ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE student_parents ENABLE ROW LEVEL SECURITY;',
  
  // Classes
  'ALTER TABLE classes ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE tutor_configs ENABLE ROW LEVEL SECURITY;',
  
  // Sessions
  'ALTER TABLE tutor_sessions ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE messages ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE session_summaries ENABLE ROW LEVEL SECURITY;',
  
  // Interventions
  'ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE intervention_actions ENABLE ROW LEVEL SECURITY;',
  
  // LTI
  'ALTER TABLE lti_platforms ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE lti_deployments ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE nrps_cache ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE ags_line_items ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE ags_scores ENABLE ROW LEVEL SECURITY;',
  
  // Artifacts
  'ALTER TABLE generated_artifacts ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;',
  
  // Audit
  'ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;',
  
  // Compliance
  'ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE retention_jobs ENABLE ROW LEVEL SECURITY;',
];

// ============================================================================
// RLS POLICY DEFINITIONS
// ============================================================================

export const rlsPolicies = [
  // ==========================================================================
  // DISTRICTS
  // ==========================================================================
  // Super admins see all districts
  `CREATE POLICY districts_super_admin ON districts
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  // District admins see their own district
  `CREATE POLICY districts_district_admin ON districts
   FOR ALL TO authenticated
   USING (id = current_setting('app.current_district_id', true)::uuid
          AND current_setting('app.is_district_admin', true)::boolean)
   WITH CHECK (id = current_setting('app.current_district_id', true)::boolean
               AND current_setting('app.is_district_admin', true)::boolean);`,

  // ==========================================================================
  // SCHOOLS
  // ==========================================================================
  // Super admins see all
  `CREATE POLICY schools_super_admin ON schools
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  // District admins see schools in their district
  `CREATE POLICY schools_district_admin ON schools
   FOR ALL TO authenticated
   USING (district_id = current_setting('app.current_district_id', true)::uuid
          AND current_setting('app.is_district_admin', true)::boolean)
   WITH CHECK (district_id = current_setting('app.current_district_id', true)::uuid
               AND current_setting('app.is_district_admin', true)::boolean);`,

  // School admins see their own school
  `CREATE POLICY schools_school_admin ON schools
   FOR ALL TO authenticated
   USING (id = current_setting('app.current_school_id', true)::uuid
          AND current_setting('app.is_school_admin', true)::boolean)
   WITH CHECK (id = current_setting('app.current_school_id', true)::uuid
               AND current_setting('app.is_school_admin', true)::boolean);`,

  // Teachers/students/parents see their school
  `CREATE POLICY schools_member ON schools
   FOR SELECT TO authenticated
   USING (id = current_setting('app.current_school_id', true)::uuid);`,

  // ==========================================================================
  // USERS
  // ==========================================================================
  // Super admins see all
  `CREATE POLICY users_super_admin ON users
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  // District admins see users in their district
  `CREATE POLICY users_district_admin ON users
   FOR ALL TO authenticated
   USING (school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
   AND current_setting('app.is_district_admin', true)::boolean)
   WITH CHECK (school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
   AND current_setting('app.is_district_admin', true)::boolean);`,

  // School admins see users in their school
  `CREATE POLICY users_school_admin ON users
   FOR ALL TO authenticated
   USING (school_id = current_setting('app.current_school_id', true)::uuid
          AND current_setting('app.is_school_admin', true)::boolean)
   WITH CHECK (school_id = current_setting('app.current_school_id', true)::uuid
               AND current_setting('app.is_school_admin', true)::boolean);`,

  // Users see themselves
  `CREATE POLICY users_self ON users
   FOR SELECT TO authenticated
   USING (id = current_setting('app.current_user_id', true)::uuid);`,

  // Users update themselves (limited fields via app logic)
  `CREATE POLICY users_self_update ON users
   FOR UPDATE TO authenticated
   USING (id = current_setting('app.current_user_id', true)::uuid)
   WITH CHECK (id = current_setting('app.current_user_id', true)::uuid);`,

  // Teachers see students in their classes
  `CREATE POLICY users_teacher_students ON users
   FOR SELECT TO authenticated
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
          AND current_setting('app.current_role', true) = 'teacher');`,

  // Parents see their children
  `CREATE POLICY users_parent_children ON users
   FOR SELECT TO authenticated
   USING (role = 'student'
          AND id IN (
            SELECT u.id FROM users u
            JOIN students s ON u.id = s.user_id
            JOIN student_parents sp ON s.id = sp.student_id
            JOIN parents p ON sp.parent_id = p.id
            WHERE p.user_id = current_setting('app.current_user_id', true)::uuid
          )
          AND current_setting('app.current_role', true) = 'parent');`,

  // ==========================================================================
  // TEACHERS
  // ==========================================================================
  `CREATE POLICY teachers_super_admin ON teachers
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY teachers_district_admin ON teachers
   FOR ALL TO authenticated
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
   AND current_setting('app.is_district_admin', true)::boolean);`,

  `CREATE POLICY teachers_school_admin ON teachers
   FOR ALL TO authenticated
   USING (user_id IN (
     SELECT id FROM users WHERE school_id = current_setting('app.current_school_id', true)::uuid
   )
   AND current_setting('app.is_school_admin', true)::boolean)
   WITH CHECK (user_id IN (
     SELECT id FROM users WHERE school_id = current_setting('app.current_school_id', true)::uuid
   )
   AND current_setting('app.is_school_admin', true)::boolean);`,

  `CREATE POLICY teachers_self ON teachers
   FOR SELECT TO authenticated
   USING (user_id = current_setting('app.current_user_id', true)::uuid);`,

  // ==========================================================================
  // STUDENTS
  // ==========================================================================
  `CREATE POLICY students_super_admin ON students
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY students_district_admin ON students
   FOR ALL TO authenticated
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
   AND current_setting('app.is_district_admin', true)::boolean);`,

  `CREATE POLICY students_school_admin ON students
   FOR ALL TO authenticated
   USING (user_id IN (
     SELECT id FROM users WHERE school_id = current_setting('app.current_school_id', true)::uuid
   )
   AND current_setting('app.is_school_admin', true)::boolean)
   WITH CHECK (user_id IN (
     SELECT id FROM users WHERE school_id = current_setting('app.current_school_id', true)::uuid
   )
   AND current_setting('app.is_school_admin', true)::boolean);`,

  `CREATE POLICY students_self ON students
   FOR SELECT TO authenticated
   USING (user_id = current_setting('app.current_user_id', true)::uuid);`,

  `CREATE POLICY students_teacher ON students
   FOR SELECT TO authenticated
   USING (id IN (
     SELECT cs.student_id FROM class_students cs
     JOIN classes c ON cs.class_id = c.id
     JOIN teachers t ON c.teacher_id = t.id
     WHERE t.user_id = current_setting('app.current_user_id', true)::uuid
     AND cs.is_active = true
   )
   AND current_setting('app.current_role', true) = 'teacher');`,

  `CREATE POLICY students_parent ON students
   FOR SELECT TO authenticated
   USING (id IN (
     SELECT sp.student_id FROM student_parents sp
     JOIN parents p ON sp.parent_id = p.id
     WHERE p.user_id = current_setting('app.current_user_id', true)::uuid
   )
   AND current_setting('app.current_role', true) = 'parent');`,

  // ==========================================================================
  // PARENTS
  // ==========================================================================
  `CREATE POLICY parents_super_admin ON parents
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY parents_district_admin ON parents
   FOR ALL TO authenticated
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
   AND current_setting('app.is_district_admin', true)::boolean);`,

  `CREATE POLICY parents_school_admin ON parents
   FOR ALL TO authenticated
   USING (user_id IN (
     SELECT id FROM users WHERE school_id = current_setting('app.current_school_id', true)::uuid
   )
   AND current_setting('app.is_school_admin', true)::boolean)
   WITH CHECK (user_id IN (
     SELECT id FROM users WHERE school_id = current_setting('app.current_school_id', true)::uuid
   )
   AND current_setting('app.is_school_admin', true)::boolean);`,

  `CREATE POLICY parents_self ON parents
   FOR SELECT TO authenticated
   USING (user_id = current_setting('app.current_user_id', true)::uuid);`,

  // ==========================================================================
  // STUDENT_PARENTS
  // ==========================================================================
  `CREATE POLICY student_parents_super_admin ON student_parents
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY student_parents_teacher ON student_parents
   FOR SELECT TO authenticated
   USING (student_id IN (
     SELECT cs.student_id FROM class_students cs
     JOIN classes c ON cs.class_id = c.id
     JOIN teachers t ON c.teacher_id = t.id
     WHERE t.user_id = current_setting('app.current_user_id', true)::uuid
     AND cs.is_active = true
   )
   AND current_setting('app.current_role', true) = 'teacher');`,

  `CREATE POLICY student_parents_parent ON student_parents
   FOR SELECT TO authenticated
   USING (parent_id IN (
     SELECT id FROM parents WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
   AND current_setting('app.current_role', true) = 'parent');`,

  // ==========================================================================
  // CLASSES
  // ==========================================================================
  `CREATE POLICY classes_super_admin ON classes
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY classes_district_admin ON classes
   FOR ALL TO authenticated
   USING (school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
   AND current_setting('app.is_district_admin', true)::boolean)
   WITH CHECK (school_id IN (
     SELECT id FROM schools WHERE district_id = current_setting('app.current_district_id', true)::uuid
   )
   AND current_setting('app.is_district_admin', true)::boolean);`,

  `CREATE POLICY classes_school_admin ON classes
   FOR ALL TO authenticated
   USING (school_id = current_setting('app.current_school_id', true)::uuid
          AND current_setting('app.is_school_admin', true)::boolean)
   WITH CHECK (school_id = current_setting('app.current_school_id', true)::uuid
               AND current_setting('app.is_school_admin', true)::boolean);`,

  `CREATE POLICY classes_teacher ON classes
   FOR ALL TO authenticated
   USING (teacher_id IN (
     SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
   AND current_setting('app.current_role', true) = 'teacher')
   WITH CHECK (teacher_id IN (
     SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
   AND current_setting('app.current_role', true) = 'teacher');`,

  `CREATE POLICY classes_student ON classes
   FOR SELECT TO authenticated
   USING (id IN (
     SELECT cs.class_id FROM class_students cs
     JOIN students s ON cs.student_id = s.id
     WHERE s.user_id = current_setting('app.current_user_id', true)::uuid
     AND cs.is_active = true
   )
   AND current_setting('app.current_role', true) = 'student');`,

  `CREATE POLICY classes_parent ON classes
   FOR SELECT TO authenticated
   USING (id IN (
     SELECT cs.class_id FROM class_students cs
     JOIN students s ON cs.student_id = s.id
     JOIN student_parents sp ON s.id = sp.student_id
     JOIN parents p ON sp.parent_id = p.id
     WHERE p.user_id = current_setting('app.current_user_id', true)::uuid
     AND cs.is_active = true
   )
   AND current_setting('app.current_role', true) = 'parent');`,

  // ==========================================================================
  // CLASS_STUDENTS
  // ==========================================================================
  `CREATE POLICY class_students_super_admin ON class_students
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY class_students_district_admin ON class_students
   FOR ALL TO authenticated
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
   AND current_setting('app.is_district_admin', true)::boolean);`,

  `CREATE POLICY class_students_school_admin ON class_students
   FOR ALL TO authenticated
   USING (class_id IN (
     SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
   )
   AND current_setting('app.is_school_admin', true)::boolean)
   WITH CHECK (class_id IN (
     SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
   )
   AND current_setting('app.is_school_admin', true)::boolean);`,

  `CREATE POLICY class_students_teacher ON class_students
   FOR ALL TO authenticated
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
   AND current_setting('app.current_role', true) = 'teacher');`,

  `CREATE POLICY class_students_student ON class_students
   FOR SELECT TO authenticated
   USING (student_id IN (
     SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
   AND current_setting('app.current_role', true) = 'student');`,

  `CREATE POLICY class_students_parent ON class_students
   FOR SELECT TO authenticated
   USING (student_id IN (
     SELECT sp.student_id FROM student_parents sp
     JOIN parents p ON sp.parent_id = p.id
     WHERE p.user_id = current_setting('app.current_user_id', true)::uuid
   )
   AND current_setting('app.current_role', true) = 'parent');`,

  // ==========================================================================
  // TUTOR_CONFIGS
  // ==========================================================================
  `CREATE POLICY tutor_configs_super_admin ON tutor_configs
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY tutor_configs_district_admin ON tutor_configs
   FOR ALL TO authenticated
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
   AND current_setting('app.is_district_admin', true)::boolean);`,

  `CREATE POLICY tutor_configs_school_admin ON tutor_configs
   FOR ALL TO authenticated
   USING (class_id IN (
     SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
   )
   AND current_setting('app.is_school_admin', true)::boolean)
   WITH CHECK (class_id IN (
     SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
   )
   AND current_setting('app.is_school_admin', true)::boolean);`,

  `CREATE POLICY tutor_configs_teacher ON tutor_configs
   FOR ALL TO authenticated
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
   AND current_setting('app.current_role', true) = 'teacher');`,

  // ==========================================================================
  // TUTOR_SESSIONS
  // ==========================================================================
  `CREATE POLICY tutor_sessions_super_admin ON tutor_sessions
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY tutor_sessions_district_admin ON tutor_sessions
   FOR ALL TO authenticated
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
   AND current_setting('app.is_district_admin', true)::boolean);`,

  `CREATE POLICY tutor_sessions_school_admin ON tutor_sessions
   FOR ALL TO authenticated
   USING (class_id IN (
     SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
   )
   AND current_setting('app.is_school_admin', true)::boolean)
   WITH CHECK (class_id IN (
     SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
   )
   AND current_setting('app.is_school_admin', true)::boolean);`,

  `CREATE POLICY tutor_sessions_teacher ON tutor_sessions
   FOR ALL TO authenticated
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
   AND current_setting('app.current_role', true) = 'teacher');`,

  `CREATE POLICY tutor_sessions_student ON tutor_sessions
   FOR SELECT TO authenticated
   USING (student_id IN (
     SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
   AND current_setting('app.current_role', true) = 'student');`,

  // Students can create their own sessions (via app logic validation)
  `CREATE POLICY tutor_sessions_student_create ON tutor_sessions
   FOR INSERT TO authenticated
   WITH CHECK (student_id IN (
     SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
   AND current_setting('app.current_role', true) = 'student');`,

  // ==========================================================================
  // MESSAGES
  // ==========================================================================
  `CREATE POLICY messages_super_admin ON messages
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY messages_participant ON messages
   FOR ALL TO authenticated
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
   ));`,

  // ==========================================================================
  // SESSION_SUMMARIES
  // ==========================================================================
  `CREATE POLICY session_summaries_super_admin ON session_summaries
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY session_summaries_teacher ON session_summaries
   FOR SELECT TO authenticated
   USING (class_id IN (
     SELECT id FROM classes WHERE teacher_id IN (
       SELECT id FROM teachers WHERE user_id = current_setting('app.current_user_id', true)::uuid
     )
   )
   AND current_setting('app.current_role', true) = 'teacher');`,

  `CREATE POLICY session_summaries_student ON session_summaries
   FOR SELECT TO authenticated
   USING (student_id IN (
     SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
   AND current_setting('app.current_role', true) = 'student');`,

  // ==========================================================================
  // INTERVENTIONS
  // ==========================================================================
  `CREATE POLICY interventions_super_admin ON interventions
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY interventions_district_admin ON interventions
   FOR ALL TO authenticated
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
   AND current_setting('app.is_district_admin', true)::boolean);`,

  `CREATE POLICY interventions_school_admin ON interventions
   FOR ALL TO authenticated
   USING (class_id IN (
     SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
   )
   AND current_setting('app.is_school_admin', true)::boolean)
   WITH CHECK (class_id IN (
     SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
   )
   AND current_setting('app.is_school_admin', true)::boolean);`,

  `CREATE POLICY interventions_teacher ON interventions
   FOR ALL TO authenticated
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
   AND current_setting('app.current_role', true) = 'teacher');`,

  `CREATE POLICY interventions_student ON interventions
   FOR SELECT TO authenticated
   USING (student_id IN (
     SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)::uuid
   )
   AND current_setting('app.current_role', true) = 'student');`,

  // ==========================================================================
  // INTERVENTION_ACTIONS
  // ==========================================================================
  `CREATE POLICY intervention_actions_super_admin ON intervention_actions
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY intervention_actions_teacher ON intervention_actions
   FOR ALL TO authenticated
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
   AND current_setting('app.current_role', true) = 'teacher');`,

  // ==========================================================================
  // LTI_PLATFORMS
  // ==========================================================================
  `CREATE POLICY lti_platforms_super_admin ON lti_platforms
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY lti_platforms_district_admin ON lti_platforms
   FOR ALL TO authenticated
   USING ((district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL)
          AND current_setting('app.is_district_admin', true)::boolean)
   WITH CHECK ((district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL)
               AND current_setting('app.is_district_admin', true)::boolean);`,

  // ==========================================================================
  // LTI_DEPLOYMENTS
  // ==========================================================================
  `CREATE POLICY lti_deployments_super_admin ON lti_deployments
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY lti_deployments_district_admin ON lti_deployments
   FOR ALL TO authenticated
   USING (platform_id IN (
     SELECT id FROM lti_platforms WHERE district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL
   )
   AND current_setting('app.is_district_admin', true)::boolean)
   WITH CHECK (platform_id IN (
     SELECT id FROM lti_platforms WHERE district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL
   )
   AND current_setting('app.is_district_admin', true)::boolean);`,

  `CREATE POLICY lti_deployments_school_admin ON lti_deployments
   FOR ALL TO authenticated
   USING ((school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL)
          AND current_setting('app.is_school_admin', true)::boolean)
   WITH CHECK ((school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL)
               AND current_setting('app.is_school_admin', true)::boolean);`,

  // ==========================================================================
  // NRPS_CACHE
  // ==========================================================================
  `CREATE POLICY nrps_cache_super_admin ON nrps_cache
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY nrps_cache_district_admin ON nrps_cache
   FOR ALL TO authenticated
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
   AND current_setting('app.is_district_admin', true)::boolean);`,

  `CREATE POLICY nrps_cache_school_admin ON nrps_cache
   FOR ALL TO authenticated
   USING (deployment_id IN (
     SELECT id FROM lti_deployments WHERE school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL
   )
   AND current_setting('app.is_school_admin', true)::boolean)
   WITH CHECK (deployment_id IN (
     SELECT id FROM lti_deployments WHERE school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL
   )
   AND current_setting('app.is_school_admin', true)::boolean);`,

  // ==========================================================================
  // AGS_LINE_ITEMS
  // ==========================================================================
  `CREATE POLICY ags_line_items_super_admin ON ags_line_items
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY ags_line_items_district_admin ON ags_line_items
   FOR ALL TO authenticated
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
   AND current_setting('app.is_district_admin', true)::boolean);`,

  `CREATE POLICY ags_line_items_school_admin ON ags_line_items
   FOR ALL TO authenticated
   USING (deployment_id IN (
     SELECT id FROM lti_deployments WHERE school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL
   )
   AND current_setting('app.is_school_admin', true)::boolean)
   WITH CHECK (deployment_id IN (
     SELECT id FROM lti_deployments WHERE school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL
   )
   AND current_setting('app.is_school_admin', true)::boolean);`,

  `CREATE POLICY ags_line_items_teacher ON ags_line_items
   FOR SELECT TO authenticated
   USING (deployment_id IN (
     SELECT ld.id FROM lti_deployments ld
     JOIN nrps_cache nc ON ld.id = nc.deployment_id
     WHERE nc.context_id IN (
       SELECT c.lti_context_id FROM classes c
       JOIN teachers t ON c.teacher_id = t.id
       WHERE t.user_id = current_setting('app.current_user_id', true)::uuid
     )
   )
   AND current_setting('app.current_role', true) = 'teacher');`,

  // ==========================================================================
  // AGS_SCORES
  // ==========================================================================
  `CREATE POLICY ags_scores_super_admin ON ags_scores
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY ags_scores_teacher ON ags_scores
   FOR ALL TO authenticated
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
   AND current_setting('app.current_role', true) = 'teacher');`,

  `CREATE POLICY ags_scores_student ON ags_scores
   FOR SELECT TO authenticated
   USING (user_id = current_setting('app.current_user_id', true)::uuid
          AND current_setting('app.current_role', true) = 'student');`,

  // ==========================================================================
  // GENERATED_ARTIFACTS
  // ==========================================================================
  `CREATE POLICY generated_artifacts_super_admin ON generated_artifacts
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY generated_artifacts_district_admin ON generated_artifacts
   FOR ALL TO authenticated
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
   AND current_setting('app.is_district_admin', true)::boolean);`,

  `CREATE POLICY generated_artifacts_school_admin ON generated_artifacts
   FOR ALL TO authenticated
   USING (class_id IN (
     SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
   )
   AND current_setting('app.is_school_admin', true)::boolean)
   WITH CHECK (class_id IN (
     SELECT id FROM classes WHERE school_id = current_setting('app.current_school_id', true)::uuid
   )
   AND current_setting('app.is_school_admin', true)::boolean);`,

  `CREATE POLICY generated_artifacts_teacher ON generated_artifacts
   FOR ALL TO authenticated
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
   AND current_setting('app.current_role', true) = 'teacher');`,

  `CREATE POLICY generated_artifacts_student ON generated_artifacts
   FOR SELECT TO authenticated
   USING ((student_id IN (
     SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)::uuid
   ) OR student_id IS NULL)
   AND current_setting('app.current_role', true) = 'student');`,

  // ==========================================================================
  // EXPORT_JOBS
  // ==========================================================================
  `CREATE POLICY export_jobs_super_admin ON export_jobs
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY export_jobs_teacher ON export_jobs
   FOR ALL TO authenticated
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
   AND current_setting('app.current_role', true) = 'teacher');`,

  // ==========================================================================
  // OAUTH_TOKENS
  // ==========================================================================
  `CREATE POLICY oauth_tokens_super_admin ON oauth_tokens
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY oauth_tokens_self ON oauth_tokens
   FOR ALL TO authenticated
   USING (user_id = current_setting('app.current_user_id', true)::uuid)
   WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);`,

  // ==========================================================================
  // AUDIT_LOGS
  // ==========================================================================
  `CREATE POLICY audit_logs_super_admin ON audit_logs
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY audit_logs_district_admin ON audit_logs
   FOR SELECT TO authenticated
   USING ((district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL)
          AND current_setting('app.is_district_admin', true)::boolean);`,

  `CREATE POLICY audit_logs_school_admin ON audit_logs
   FOR SELECT TO authenticated
   USING ((school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL)
          AND current_setting('app.is_school_admin', true)::boolean);`,

  `CREATE POLICY audit_logs_self ON audit_logs
   FOR SELECT TO authenticated
   USING (user_id = current_setting('app.current_user_id', true)::uuid);`,

  // ==========================================================================
  // CONSENT_RECORDS
  // ==========================================================================
  `CREATE POLICY consent_records_super_admin ON consent_records
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY consent_records_district_admin ON consent_records
   FOR ALL TO authenticated
   USING ((district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL)
          AND current_setting('app.is_district_admin', true)::boolean)
   WITH CHECK ((district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL)
               AND current_setting('app.is_district_admin', true)::boolean);`,

  `CREATE POLICY consent_records_school_admin ON consent_records
   FOR ALL TO authenticated
   USING ((school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL)
          AND current_setting('app.is_school_admin', true)::boolean)
   WITH CHECK ((school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL)
               AND current_setting('app.is_school_admin', true)::boolean);`,

  `CREATE POLICY consent_records_self ON consent_records
   FOR SELECT TO authenticated
   USING (user_id = current_setting('app.current_user_id', true)::uuid);`,

  `CREATE POLICY consent_records_parent ON consent_records
   FOR SELECT TO authenticated
   USING (student_id IN (
     SELECT sp.student_id FROM student_parents sp
     JOIN parents p ON sp.parent_id = p.id
     WHERE p.user_id = current_setting('app.current_user_id', true)::uuid
   )
   AND current_setting('app.current_role', true) = 'parent');`,

  // ==========================================================================
  // DATA_DELETION_REQUESTS
  // ==========================================================================
  `CREATE POLICY data_deletion_requests_super_admin ON data_deletion_requests
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY data_deletion_requests_district_admin ON data_deletion_requests
   FOR ALL TO authenticated
   USING ((district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL)
          AND current_setting('app.is_district_admin', true)::boolean)
   WITH CHECK ((district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL)
               AND current_setting('app.is_district_admin', true)::boolean);`,

  `CREATE POLICY data_deletion_requests_school_admin ON data_deletion_requests
   FOR ALL TO authenticated
   USING ((school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL)
          AND current_setting('app.is_school_admin', true)::boolean)
   WITH CHECK ((school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL)
               AND current_setting('app.is_school_admin', true)::boolean);`,

  `CREATE POLICY data_deletion_requests_self ON data_deletion_requests
   FOR ALL TO authenticated
   USING (user_id = current_setting('app.current_user_id', true)::uuid
          OR requested_by = current_setting('app.current_user_id', true)::uuid)
   WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid
               OR requested_by = current_setting('app.current_user_id', true)::uuid);`,

  // ==========================================================================
  // RETENTION_POLICIES
  // ==========================================================================
  `CREATE POLICY retention_policies_super_admin ON retention_policies
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY retention_policies_district_admin ON retention_policies
   FOR ALL TO authenticated
   USING ((district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL)
          AND current_setting('app.is_district_admin', true)::boolean)
   WITH CHECK ((district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL)
               AND current_setting('app.is_district_admin', true)::boolean);`,

  `CREATE POLICY retention_policies_school_admin ON retention_policies
   FOR ALL TO authenticated
   USING ((school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL)
          AND current_setting('app.is_school_admin', true)::boolean)
   WITH CHECK ((school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL)
               AND current_setting('app.is_school_admin', true)::boolean);`,

  // ==========================================================================
  // RETENTION_JOBS
  // ==========================================================================
  `CREATE POLICY retention_jobs_super_admin ON retention_jobs
   FOR ALL TO authenticated
   USING (current_setting('app.is_super_admin', true)::boolean)
   WITH CHECK (current_setting('app.is_super_admin', true)::boolean);`,

  `CREATE POLICY retention_jobs_district_admin ON retention_jobs
   FOR SELECT TO authenticated
   USING (policy_id IN (
     SELECT id FROM retention_policies WHERE district_id = current_setting('app.current_district_id', true)::uuid OR district_id IS NULL
   )
   AND current_setting('app.is_district_admin', true)::boolean);`,

  `CREATE POLICY retention_jobs_school_admin ON retention_jobs
   FOR SELECT TO authenticated
   USING (policy_id IN (
     SELECT id FROM retention_policies WHERE school_id = current_setting('app.current_school_id', true)::uuid OR school_id IS NULL
   )
   AND current_setting('app.is_school_admin', true)::boolean);`,

];

// ============================================================================
// HELPER FUNCTIONS FOR RLS
// ============================================================================

export const rlsHelperFunctions = [
  // Function to set all session variables at once
  `CREATE OR REPLACE FUNCTION set_app_context(
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
  END; $$;`,

  // Function to clear context
  `CREATE OR REPLACE FUNCTION clear_app_context() RETURNS void LANGUAGE plpgsql AS $$
  BEGIN
    PERFORM set_config('app.current_user_id', '', false);
    PERFORM set_config('app.current_role', '', false);
    PERFORM set_config('app.current_teacher_id', '', false);
    PERFORM set_config('app.current_student_id', '', false);
    PERFORM set_config('app.current_parent_id', '', false);
    PERFORM set_config('app.current_school_id', '', false);
    PERFORM set_config('app.current_district_id', '', false);
    PERFORM set_config('app.is_district_admin', 'false', false);
    PERFORM set_config('app.is_school_admin', 'false', false);
    PERFORM set_config('app.is_super_admin', 'false', false);
  END; $$;`,

  // Function to get current user's school
  `CREATE OR REPLACE FUNCTION get_user_school(p_user_id uuid) RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT school_id FROM users WHERE id = p_user_id;
  $$;`,

  // Function to get current user's district
  `CREATE OR REPLACE FUNCTION get_user_district(p_user_id uuid) RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT s.district_id FROM users u
    JOIN schools s ON u.school_id = s.id
    WHERE u.id = p_user_id;
  $$;`,

  // Function to check if user is teacher of a class
  `CREATE OR REPLACE FUNCTION is_teacher_of_class(p_user_id uuid, p_class_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
      SELECT 1 FROM classes c
      JOIN teachers t ON c.teacher_id = t.id
      WHERE c.id = p_class_id AND t.user_id = p_user_id
    );
  $$;`,

  // Function to check if student is in class
  `CREATE OR REPLACE FUNCTION is_student_in_class(p_student_id uuid, p_class_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
      SELECT 1 FROM class_students
      WHERE student_id = p_student_id AND class_id = p_class_id AND is_active = true
    );
  $$;`,
];

// ============================================================================
// EXPORTS
// ============================================================================

export const allRlsStatements = [
  ...rlsEnableStatements,
  ...rlsPolicies,
  ...rlsHelperFunctions,
];