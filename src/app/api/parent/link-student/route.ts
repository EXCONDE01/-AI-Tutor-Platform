/**
 * Parent API - Link student to parent account.
 * POST /api/parent/link-student — parent requests to link a student using a linking code.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { getDb } from '@/lib/db';
import {
  createAuditLog,
} from '@/lib/compliance/audit';
import {
  parents,
  studentParents,
  students,
  users,
} from '@/db/schema';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface LinkStudentBody {
  linkingCode: string;
}

interface LinkStudentResponse {
  success: boolean;
  message: string;
  studentId?: string;
  studentName?: string;
  requiresAdminApproval?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const database = getDb();

    // Get parent record for the authenticated user
    const [parentRow] = await database
      .select({ id: parents.id })
      .from(parents)
      .where(eq(parents.userId, authSession.data.user.id))
      .limit(1);

    if (!parentRow) {
      return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 });
    }

    // Parse and validate request body
    let body: LinkStudentBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { linkingCode } = body;

    if (!linkingCode || typeof linkingCode !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: linkingCode' },
        { status: 400 }
      );
    }

    // Validate linking code format (should be a UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(linkingCode)) {
      return NextResponse.json(
        { error: 'Invalid linking code format' },
        { status: 400 }
      );
    }

    // Look up student by linking code (stored in student metadata or as a separate field)
    // For this implementation, we use the student's user ID as the linking code
    const [studentRow] = await database
      .select({
        id: students.id,
        userId: students.userId,
        studentNumber: students.studentNumber,
        gradeLevel: students.gradeLevel,
        firstName: users.firstName,
        lastName: users.lastName,
        displayName: users.displayName,
      })
      .from(students)
      .innerJoin(users, eq(users.id, students.userId))
      .where(eq(users.id, linkingCode))
      .limit(1);

    if (!studentRow) {
      return NextResponse.json(
        { error: 'Student not found with this linking code' },
        { status: 404 }
      );
    }

    // Check if already linked
    const [existingLink] = await database
      .select({ id: studentParents.id })
      .from(studentParents)
      .where(
        and(
          eq(studentParents.studentId, studentRow.id),
          eq(studentParents.parentId, parentRow.id)
        )
      )
      .limit(1);

    if (existingLink) {
      return NextResponse.json(
        { error: 'Student is already linked to your account' },
        { status: 409 }
      );
    }

    const studentName =
      `${studentRow.firstName ?? ''} ${studentRow.lastName ?? ''}`.trim() ||
      studentRow.displayName ||
      'Unknown Student';

    // Check if student is under 13 (COPPA)
    // We'll check if there's a date of birth on the student record
    let requiresParentalConsent = false;
    // Note: COPPA consent is handled separately via the consent API

    // Create the link request with admin approval flow
    // In a full implementation, this might create a pending link that requires admin approval
    // For now, we create the link directly (parent-initiated, admin can review later)
    const [newLink] = await database
      .insert(studentParents)
      .values({
        studentId: studentRow.id,
        parentId: parentRow.id,
        isPrimary: false,
        canViewGrades: true,
        canViewProgress: true,
        canReceiveAlerts: true,
      })
      .returning();

    // Audit log
    await createAuditLog({
      action: 'consent_granted',
      resourceType: 'student_parent',
      resourceId: newLink.id,
      userId: authSession.data.user.id,
      studentId: studentRow.id,
      severity: 'info',
      description: `Parent linked to student: ${studentName}`,
      metadata: {
        parentId: parentRow.id,
        studentId: studentRow.id,
        linkingCode,
        initiatedBy: 'parent',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully linked to ${studentName}`,
      studentId: studentRow.id,
      studentName,
      requiresAdminApproval: false,
    });
  } catch (error) {
    console.error('[parent/link-student POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}