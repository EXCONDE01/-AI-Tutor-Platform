import { pgTable, uuid, text, timestamp, boolean, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const districtStatusEnum = pgEnum('district_status', ['active', 'inactive', 'pending']);
export const schoolStatusEnum = pgEnum('school_status', ['active', 'inactive', 'pending']);

export const districts = pgTable('districts', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  status: districtStatusEnum('status').default('pending').notNull(),
  settings: text('settings').default('{}').notNull(), // JSONB as text for flexibility
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  nameIdx: uniqueIndex('districts_name_idx').on(table.name),
  statusIdx: index('districts_status_idx').on(table.status),
}));

export const schools = pgTable('schools', {
  id: uuid('id').defaultRandom().primaryKey(),
  districtId: uuid('district_id').notNull().references(() => districts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  status: schoolStatusEnum('status').default('pending').notNull(),
  settings: text('settings').default('{}').notNull(), // JSONB as text
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  districtIdx: index('schools_district_id_idx').on(table.districtId),
  nameIdx: uniqueIndex('schools_district_name_idx').on(table.districtId, table.name),
  statusIdx: index('schools_status_idx').on(table.status),
}));

export type District = typeof districts.$inferSelect;
export type NewDistrict = typeof districts.$inferInsert;
export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;