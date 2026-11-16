import { pgTable, uuid, text, timestamp, boolean, pgEnum, index, uniqueIndex, integer, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { schools } from './tenants';

export const userRoleEnum = pgEnum('user_role', ['teacher', 'student', 'parent', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'pending', 'suspended']);
export const authProviderEnum = pgEnum('auth_provider', ['email', 'google', 'microsoft', 'clever', 'lti', 'saml']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  role: userRoleEnum('role').notNull(),
  status: userStatusEnum('status').default('pending').notNull(),
  authProvider: authProviderEnum('auth_provider').default('email').notNull(),
  externalId: text('external_id'), // LTI user_id, Clever ID, etc.
  email: text('email').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  passwordHash: text('password_hash'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  locale: text('locale').default('en-US').notNull(),
  timezone: text('timezone').default('UTC').notNull(),
  metadata: jsonb('metadata').default({}).notNull(), // Flexible additional data
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  schoolIdx: index('users_school_id_idx').on(table.schoolId),
  roleIdx: index('users_role_idx').on(table.role),
  statusIdx: index('users_status_idx').on(table.status),
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  externalIdIdx: index('users_external_id_idx').on(table.externalId),
  schoolRoleIdx: index('users_school_role_idx').on(table.schoolId, table.role),
}));

export const teachers = pgTable('teachers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  employeeId: text('employee_id'),
  department: text('department'),
  gradeLevels: text('grade_levels').array().default(sql`'{}'::text[]`).notNull(),
  subjects: text('subjects').array().default(sql`'{}'::text[]`).notNull(),
  certifications: jsonb('certifications').default([]).notNull(),
  preferences: jsonb('preferences').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: uniqueIndex('teachers_user_id_idx').on(table.userId),
  employeeIdx: index('teachers_employee_id_idx').on(table.employeeId),
}));

export const students = pgTable('students', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  studentNumber: text('student_number'),
  gradeLevel: integer('grade_level'),
  dateOfBirth: timestamp('date_of_birth', { withTimezone: true }),
  iepStatus: boolean('iep_status').default(false).notNull(),
  ellStatus: boolean('ell_status').default(false).notNull(),
  accommodations: jsonb('accommodations').default({}).notNull(),
  learningPreferences: jsonb('learning_preferences').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: uniqueIndex('students_user_id_idx').on(table.userId),
  studentNumberIdx: index('students_student_number_idx').on(table.studentNumber),
  gradeIdx: index('students_grade_level_idx').on(table.gradeLevel),
}));

export const parents = pgTable('parents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  relationship: text('relationship').notNull(), // mother, father, guardian, etc.
  phoneNumber: text('phone_number'),
  preferredContactMethod: text('preferred_contact_method').default('email').notNull(),
  notificationPreferences: jsonb('notification_preferences').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: uniqueIndex('parents_user_id_idx').on(table.userId),
}));

export const studentParents = pgTable('student_parents', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id').notNull().references(() => parents.id, { onDelete: 'cascade' }),
  isPrimary: boolean('is_primary').default(false).notNull(),
  canViewGrades: boolean('can_view_grades').default(true).notNull(),
  canViewProgress: boolean('can_view_progress').default(true).notNull(),
  canReceiveAlerts: boolean('can_receive_alerts').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  studentIdx: index('student_parents_student_id_idx').on(table.studentId),
  parentIdx: index('student_parents_parent_id_idx').on(table.parentId),
  uniquePair: uniqueIndex('student_parents_unique_idx').on(table.studentId, table.parentId),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Teacher = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Parent = typeof parents.$inferSelect;
export type NewParent = typeof parents.$inferInsert;
export type StudentParent = typeof studentParents.$inferSelect;
export type NewStudentParent = typeof studentParents.$inferInsert;