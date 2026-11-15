/**
 * Idempotent demo tenant seed script.
 * 
 * Upserts:
 * - district id `11111111-1111-4111-8111-111111111111`, name `Demo District`, status `active`
 * - school id `22222222-2222-4222-8222-222222222222`, districtId = the district above, name `Demo High School`, status `active`
 * - teacher user id `33333333-3333-4333-8333-333333333333`, schoolId = demo school, role `teacher`, email `teacher@demo.local`
 * - teacher profile id `44444444-4444-4444-8444-444444444444`, userId = teacher user above
 * - class id `55555555-5555-4555-8555-555555555555`, schoolId = demo school, teacherId = teacher profile above, name `Algebra I - Demo`
 * - tutor_config id `66666666-6666-4666-8666-666666666666`, classId = class above, createdBy = teacher profile above
 * 
 * These fixed UUIDs are contractual — another agent hardcodes them as defaults in `src/lib/tenant.ts`.
 * 
 * Usage: npm run db:seed
 */

import './load-env';

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import { districts, schools, users, teachers, classes, tutorConfigs } from '../db/schema';

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL_UNPOOLED or DATABASE_URL must be set');
  process.exit(1);
}

const DEMO_DISTRICT_ID = '11111111-1111-4111-8111-111111111111';
const DEMO_SCHOOL_ID = '22222222-2222-4222-8222-222222222222';
const DEMO_TEACHER_USER_ID = '33333333-3333-4333-8333-333333333333';
const DEMO_TEACHER_ID = '44444444-4444-4444-8444-444444444444';
const DEMO_CLASS_ID = '55555555-5555-4555-8555-555555555555';
const DEMO_TUTOR_CONFIG_ID = '66666666-6666-4666-8666-666666666666';

const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 15000,
});

const tutorConfig = {
  model: {
    provider: 'openai' as const,
    // OpenRouter free model (OpenAI-compatible wire format)
    modelName: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    temperature: 0.7,
    maxTokens: 1500,
    topP: 1,
  },
  systemPrompt: {
    base: 'You are a helpful AI tutor for high school students. Guide them through problems step by step.',
    subjectSpecific: 'Focus on Algebra I concepts: linear equations, inequalities, functions, polynomials, and quadratic equations.',
    gradeLevelAdjustments: 'Adjust explanations for 9th grade level. Use clear language and real-world examples.',
    customInstructions: 'Encourage students to show their work. Ask guiding questions rather than giving answers directly.',
  },
  pedagogy: {
    scaffoldingLevel: 'moderate' as const,
    questionStyle: 'socratic' as const,
    feedbackFrequency: 'immediate' as const,
    encourageMetacognition: true,
    allowStruggleTime: 30,
  },
  content: {
    allowedTopics: ['algebra', 'linear equations', 'quadratic equations', 'functions', 'polynomials', 'inequalities', 'graphing', 'word problems'],
    blockedTopics: ['violence', 'hate speech', 'sexual content', 'illegal activities', 'self-harm', 'personal information'],
    curriculumAlignment: ['CCSS.MATH.CONTENT.HSA.REI', 'CCSS.MATH.CONTENT.HSF.IF', 'CCSS.MATH.CONTENT.HSA.APR'],
    difficultyRange: { min: 1, max: 10 },
    language: 'en',
    enableMultiLanguage: false,
  },
  tools: {
    enableCalculator: true,
    enableCodeExecution: false,
    enableWebSearch: false,
    enableImageGeneration: false,
    enableRAG: false,
    ragCollections: [],
    customTools: [],
  },
  session: {
    maxDurationMinutes: 45,
    maxMessagesPerSession: 50,
    autoSummarize: true,
    summaryIntervalMinutes: 15,
    requireLearningObjectives: true,
  },
  safety: {
    contentFilterLevel: 'strict' as const,
    piiDetection: true,
    profanityFilter: true,
    escalationKeywords: ['suicide', 'self-harm', 'abuse', 'violence', 'emergency'],
    requireHumanReview: false,
  },
  analytics: {
    trackEngagement: true,
    trackLearningProgress: true,
    trackMisconceptions: true,
    generateInsights: true,
    insightFrequency: 'weekly' as const,
  },
};

async function main() {
  const db = drizzle(pool);

  console.log('Seeding demo district...');
  await db
    .insert(districts)
    .values({
      id: DEMO_DISTRICT_ID,
      name: 'Demo District',
      status: 'active',
      settings: '{}',
    })
    .onConflictDoNothing({ target: districts.id });

  console.log('Seeding demo school...');
  await db
    .insert(schools)
    .values({
      id: DEMO_SCHOOL_ID,
      districtId: DEMO_DISTRICT_ID,
      name: 'Demo High School',
      status: 'active',
      settings: '{}',
      address: '',
      phone: '',
      email: '',
    })
    .onConflictDoNothing({ target: schools.id });

  console.log('Seeding demo teacher user...');
  await db
    .insert(users)
    .values({
      id: DEMO_TEACHER_USER_ID,
      schoolId: DEMO_SCHOOL_ID,
      role: 'teacher',
      status: 'active',
      authProvider: 'email',
      email: 'teacher@demo.local',
      emailVerified: true,
      firstName: 'Demo',
      lastName: 'Teacher',
      displayName: 'Demo Teacher',
      locale: 'en-US',
      timezone: 'UTC',
      metadata: {},
    })
    .onConflictDoNothing({ target: users.id });

  console.log('Seeding demo teacher profile...');
  await db
    .insert(teachers)
    .values({
      id: DEMO_TEACHER_ID,
      userId: DEMO_TEACHER_USER_ID,
      employeeId: 'EMP-001',
      department: 'Mathematics',
      gradeLevels: ['9'],
      subjects: ['Algebra I', 'Mathematics'],
      certifications: [],
      preferences: {},
    })
    .onConflictDoNothing({ target: teachers.id });

  console.log('Seeding demo class...');
  await db
    .insert(classes)
    .values({
      id: DEMO_CLASS_ID,
      schoolId: DEMO_SCHOOL_ID,
      teacherId: DEMO_TEACHER_ID,
      name: 'Algebra I - Demo',
      description: 'Demo class for local development',
      subject: 'Mathematics',
      gradeLevel: 9,
      term: 'fall',
      year: 2026,
      status: 'active',
      room: '101',
      schedule: {},
      settings: {},
      maxStudents: 30,
    })
    .onConflictDoNothing({ target: classes.id });

  console.log('Seeding demo tutor config...');
  await db
    .insert(tutorConfigs)
    .values({
      id: DEMO_TUTOR_CONFIG_ID,
      classId: DEMO_CLASS_ID,
      config: tutorConfig,
      version: 1,
      isActive: true,
      createdBy: DEMO_TEACHER_ID,
    })
    .onConflictDoUpdate({
      target: tutorConfigs.classId,
      set: {
        config: tutorConfig,
        version: sql`${tutorConfigs.version} + 1`,
        updatedAt: new Date(),
      },
    });

  // Verify the inserts
  const district = await db.select().from(districts).where(eq(districts.id, DEMO_DISTRICT_ID)).limit(1);
  const school = await db.select().from(schools).where(eq(schools.id, DEMO_SCHOOL_ID)).limit(1);
  const teacherUser = await db.select().from(users).where(eq(users.id, DEMO_TEACHER_USER_ID)).limit(1);
  const teacher = await db.select().from(teachers).where(eq(teachers.id, DEMO_TEACHER_ID)).limit(1);
  const classRow = await db.select().from(classes).where(eq(classes.id, DEMO_CLASS_ID)).limit(1);
  const tutorConfigRow = await db.select().from(tutorConfigs).where(eq(tutorConfigs.id, DEMO_TUTOR_CONFIG_ID)).limit(1);

  console.log('\n=== Seed Summary ===');
  console.log('Demo district:', district[0]?.id ?? 'NOT FOUND');
  console.log('Demo school:', school[0]?.id ?? 'NOT FOUND');
  console.log('Demo teacher user:', teacherUser[0]?.id ?? 'NOT FOUND');
  console.log('Demo teacher profile:', teacher[0]?.id ?? 'NOT FOUND');
  console.log('Demo class:', classRow[0]?.id ?? 'NOT FOUND', '-', classRow[0]?.name ?? '');
  console.log('Demo tutor config:', tutorConfigRow[0]?.id ?? 'NOT FOUND', '- classId:', tutorConfigRow[0]?.classId ?? '', '- model:', (tutorConfigRow[0]?.config as any)?.model?.modelName ?? '');

  // Counts
  const userCount = await db.$count(users);
  const classCount = await db.$count(classes);
  const tutorConfigCount = await db.$count(tutorConfigs);
  console.log('\nCounts:');
  console.log('  users:', userCount);
  console.log('  classes:', classCount);
  console.log('  tutor_configs:', tutorConfigCount);

  console.log('\nSeed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });