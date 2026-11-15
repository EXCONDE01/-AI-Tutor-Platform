import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { ensureAppUser } from "@/lib/auth/provision";
import { getDb } from "@/lib/db";
import { users, teachers, students, parents } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session.data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authUser = session.data.user;
    const authUserId = authUser.id;
    const email = authUser.email;

    if (!email) {
      return NextResponse.json({ error: "Auth user has no email" }, { status: 400 });
    }

    const database = getDb();

    // First, check if user already exists in our users table
    const existingUsers = await database
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      const existingRole = existingUser.role as "teacher" | "student" | "parent" | "admin";
      // Verify profile row exists for their role
      await ensureProfileRow(database, existingUser.id, existingRole);
      return NextResponse.json({ role: existingRole });
    }

    // User doesn't exist yet - check if they have existing profile rows
    // This can happen if the user was created via another method
    const existingTeacher = await database
      .select()
      .from(teachers)
      .innerJoin(users, eq(teachers.userId, users.id))
      .where(eq(users.email, email))
      .limit(1);

    if (existingTeacher.length > 0) {
      return NextResponse.json({ role: "teacher" });
    }

    const existingStudent = await database
      .select()
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .where(eq(users.email, email))
      .limit(1);

    if (existingStudent.length > 0) {
      return NextResponse.json({ role: "student" });
    }

    const existingParent = await database
      .select()
      .from(parents)
      .innerJoin(users, eq(parents.userId, users.id))
      .where(eq(users.email, email))
      .limit(1);

    if (existingParent.length > 0) {
      return NextResponse.json({ role: "parent" });
    }

    // Check for admin email
    if (email === "christianexconde01@gmail.com") {
      return NextResponse.json({ role: "admin" });
    }

    // No existing profile - default to student for new signups
    // (can be changed during onboarding)
    const appUser = await ensureAppUser("student", request);
    if (!appUser) {
      return NextResponse.json({ error: "No app user found" }, { status: 404 });
    }

    return NextResponse.json({ role: appUser.role });
  } catch (error) {
    console.error('[/api/auth/role] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

async function ensureProfileRow(
  database: ReturnType<typeof getDb>,
  userId: string,
  role: "teacher" | "student" | "parent" | "admin"
): Promise<void> {
  if (role === "teacher") {
    await database
      .insert(teachers)
      .values({ userId })
      .onConflictDoNothing();
  } else if (role === "student") {
    await database
      .insert(students)
      .values({ userId })
      .onConflictDoNothing();
  } else if (role === "parent") {
    await database
      .insert(parents)
      .values({ userId, relationship: "guardian" })
      .onConflictDoNothing();
  }
}
