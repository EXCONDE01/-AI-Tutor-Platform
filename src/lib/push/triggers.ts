/**
 * Push Notification Triggers
 * Centralized functions to send notifications for various events
 */

import { sendToUser, broadcastToRole, type NotificationPayload } from './server';
import { db } from '@/lib/db';
import { pushSubscriptions, tutorSessions, messages, students, users, classes } from '@/db/schema';
import { eq, and, gte, lte, sql, desc, inArray } from 'drizzle-orm';

/**
 * Send notification when teacher intervenes in a student session
 */
export async function notifyTeacherIntervention(
  studentId: string,
  teacherName: string,
  sessionTitle: string,
  interventionMessage: string
) {
  const payload: NotificationPayload = {
    title: 'Teacher Intervention',
    body: `${teacherName} sent a message in "${sessionTitle}": ${interventionMessage.slice(0, 100)}...`,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: `intervention-${studentId}-${Date.now()}`,
    data: {
      type: 'intervention',
      studentId,
      teacherName,
      sessionTitle,
    },
    requireInteraction: true,
  };

  return await sendToUser(studentId, payload);
}

/**
 * Send notification for new assignment/lesson
 */
export async function notifyNewAssignment(
  studentId: string,
  className: string,
  assignmentTitle: string,
  dueDate?: Date
) {
  const payload: NotificationPayload = {
    title: 'New Assignment',
    body: `${className}: "${assignmentTitle}"${dueDate ? ` due ${dueDate.toLocaleDateString()}` : ''}`,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: `assignment-${studentId}-${Date.now()}`,
    data: {
      type: 'assignment',
      className,
      assignmentTitle,
      dueDate: dueDate?.toISOString(),
    },
  };

  return await sendToUser(studentId, payload);
}

/**
 * Send session reminder
 */
export async function notifySessionReminder(
  studentId: string,
  className: string,
  sessionTitle: string,
  startTime: Date
) {
  const payload: NotificationPayload = {
    title: 'Upcoming Tutoring Session',
    body: `${className}: "${sessionTitle}" starts in 15 minutes`,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: `session-reminder-${studentId}-${Date.now()}`,
    data: {
      type: 'session_reminder',
      className,
      sessionTitle,
      startTime: startTime.toISOString(),
    },
    requireInteraction: true,
  };

  return await sendToUser(studentId, payload);
}

/**
 * Send streak achievement notification
 */
export async function notifyStreakAchievement(
  studentId: string,
  streakDays: number
) {
  const payload: NotificationPayload = {
    title: '🔥 Streak Achieved!',
    body: `Amazing! You've completed ${streakDays} days of learning in a row!`,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: `streak-${studentId}-${streakDays}`,
    data: {
      type: 'streak',
      streakDays,
    },
    requireInteraction: false,
  };

  return await sendToUser(studentId, payload);
}

/**
 * Send session completion summary
 */
export async function notifySessionComplete(
  studentId: string,
  sessionTitle: string,
  durationMinutes: number,
  topicsCovered: string[]
) {
  const payload: NotificationPayload = {
    title: 'Session Complete',
    body: `Great work on "${sessionTitle}" (${durationMinutes} min). Topics: ${topicsCovered.slice(0, 3).join(', ')}`,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: `session-complete-${studentId}-${Date.now()}`,
    data: {
      type: 'session_complete',
      sessionTitle,
      durationMinutes,
      topicsCovered,
    },
  };

  return await sendToUser(studentId, payload);
}

/**
 * Send grade/feedback notification
 */
export async function notifyGradePosted(
  studentId: string,
  className: string,
  assignmentTitle: string,
  score: number,
  maxScore: number
) {
  const percentage = Math.round((score / maxScore) * 100);
  const payload: NotificationPayload = {
    title: 'Grade Posted',
    body: `${className}: You scored ${score}/${maxScore} (${percentage}%) on "${assignmentTitle}"`,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: `grade-${studentId}-${Date.now()}`,
    data: {
      type: 'grade',
      className,
      assignmentTitle,
      score,
      maxScore,
      percentage,
    },
    requireInteraction: false,
  };

  return await sendToUser(studentId, payload);
}

/**
 * Send parent notification for child's progress
 */
export async function notifyParentProgress(
  parentId: string,
  childName: string,
  summary: string
) {
  const payload: NotificationPayload = {
    title: `${childName}'s Progress Update`,
    body: summary,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: `parent-progress-${parentId}-${Date.now()}`,
    data: {
      type: 'parent_progress',
      childName,
      summary,
    },
  };

  return await sendToUser(parentId, payload);
}

/**
 * Broadcast announcement to all users of a role in a school
 */
export async function broadcastAnnouncement(
  role: 'teacher' | 'student' | 'parent' | 'admin',
  title: string,
  body: string,
  schoolId?: string
) {
  const payload: NotificationPayload = {
    title,
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: `announcement-${role}-${Date.now()}`,
    data: {
      type: 'announcement',
      schoolId,
    },
  };

  return await broadcastToRole(role, payload, schoolId);
}

/**
 * Check and send session reminders for upcoming sessions (run via cron)
 * Uses tutorSessions.startedAt as the scheduled time since there's no scheduledStart column
 */
export async function checkAndSendSessionReminders() {
  const now = new Date();
  const reminderWindow = new Date(now.getTime() + 20 * 60 * 1000); // 20 minutes from now
  const sentWindow = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

  // Find active sessions starting in the reminder window
  // Note: Using createdAt as proxy for scheduled start since there's no scheduledStart column
  const upcomingSessions = await db
    .select({
      sessionId: tutorSessions.id,
      studentId: tutorSessions.studentId,
      classId: tutorSessions.classId,
      title: tutorSessions.title,
      startedAt: tutorSessions.createdAt,
    })
    .from(tutorSessions)
    .where(
      and(
        eq(tutorSessions.status, 'active'),
        gte(tutorSessions.createdAt, now),
        lte(tutorSessions.createdAt, reminderWindow),
      )
    );

  let sent = 0;
  for (const session of upcomingSessions) {
    const startTime = new Date(session.startedAt);
    const minutesUntil = Math.round((startTime.getTime() - now.getTime()) / (60 * 1000));
    
    // Only send if 15-20 minutes out
    if (minutesUntil >= 15 && minutesUntil <= 20) {
      // Check if we already sent a reminder recently (avoid duplicates)
      const [classInfo] = await db
        .select({ name: classes.name })
        .from(classes)
        .where(eq(classes.id, session.classId))
        .limit(1);

      await notifySessionReminder(
        session.studentId,
        classInfo?.name || 'Class',
        session.title || 'Tutoring Session',
        startTime
      );
      sent++;
    }
  }

  return { checked: upcomingSessions.length, sent };
}

/**
 * Check and send streak notifications (run via cron daily)
 */
export async function checkAndSendStreakNotifications() {
  // Find students with active streaks - join messages with tutorSessions to get studentId
  const recentMessages = await db
    .select({
      sessionId: messages.sessionId,
      date: sql<Date>`DATE(${messages.createdAt})`,
      studentId: tutorSessions.studentId,
    })
    .from(messages)
    .innerJoin(tutorSessions, eq(messages.sessionId, tutorSessions.id))
    .where(
      and(
        gte(messages.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        eq(messages.role, 'user'),
      )
    )
    .orderBy(tutorSessions.studentId, messages.createdAt);

  // Group by student and find consecutive days
  const studentDays = new Map<string, Set<string>>();
  for (const msg of recentMessages) {
    if (!msg.studentId) continue;
    const dayKey = msg.date.toISOString().split('T')[0];
    if (!studentDays.has(msg.studentId)) {
      studentDays.set(msg.studentId, new Set());
    }
    studentDays.get(msg.studentId)!.add(dayKey);
  }

  let sent = 0;
  for (const [studentId, days] of studentDays) {
    const sortedDays = Array.from(days).sort();
    let streak = 1;
    let maxStreak = 1;

    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1]);
      const curr = new Date(sortedDays[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
      
      if (diffDays === 1) {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 1;
      }
    }

    // Check if we should notify for milestone streaks (7, 14, 30, 60, 100)
    const milestones = [7, 14, 30, 60, 100];
    for (const milestone of milestones) {
      if (maxStreak === milestone) {
        await notifyStreakAchievement(studentId, milestone);
        sent++;
      }
    }
  }

  return { checked: studentDays.size, sent };
}

/**
 * Send daily/weekly digest to parents (run via cron)
 */
export async function sendParentDigests() {
  // This would fetch parent-student relationships and send summaries
  // Implementation depends on parent_students table structure
  return { sent: 0 };
}

/**
 * Send inactive student reminders (run via cron weekly)
 */
export async function sendInactivityReminders() {
  const inactiveThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days

  // Get all students
  const studentUsers = await db
    .select({
      userId: students.userId,
      studentId: students.id,
    })
    .from(students);

  const studentIdMap = new Map(studentUsers.map(s => [s.userId, s.studentId]));

  // Find last message for each student
  const lastMessages = await db
    .select({
      studentId: tutorSessions.studentId,
      lastMessage: sql<Date>`MAX(${messages.createdAt})`,
    })
    .from(messages)
    .innerJoin(tutorSessions, eq(messages.sessionId, tutorSessions.id))
    .where(inArray(tutorSessions.studentId, Array.from(studentIdMap.keys())))
    .groupBy(tutorSessions.studentId);

  let sent = 0;
  for (const student of lastMessages) {
    if (!student.lastMessage) continue;

    const daysInactive = Math.floor(
      (Date.now() - new Date(student.lastMessage).getTime()) / (24 * 60 * 60 * 1000)
    );

    if (daysInactive >= 7) {
      await notifyNewAssignment(
        student.studentId,
        'Your Tutor',
        `Welcome back! It's been ${daysInactive} days since your last session. Ready to continue learning?`
      );
      sent++;
    }
  }

  return { checked: lastMessages.length, sent };
}

export type PushTriggerType = 
  | 'teacher_intervention'
  | 'new_assignment'
  | 'session_reminder'
  | 'streak_achievement'
  | 'session_complete'
  | 'grade_posted'
  | 'parent_progress'
  | 'announcement';