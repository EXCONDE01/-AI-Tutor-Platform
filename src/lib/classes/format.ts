/**
 * Formatting helpers for teacher classes.
 * Pure functions with no React dependencies.
 */

export type ClassStatus = "active" | "draft" | "archived";

export interface ClassData {
  id: string;
  name: string;
  subject: string;
  gradeLevel: number | null;
  status: ClassStatus;
  joinCode: string;
  description: string | null;
  maxStudents: number | null;
  studentCount: number;
  term: string | null;
  year: number | null;
  createdAt: string;
}

/**
 * Student enrolled class - API response from /api/student/classes
 */
export interface StudentEnrolledClass {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  gradeLevel: number | null;
  term: string | null;
  year: number | null;
  status: string;
  room: string | null;
  teacherName: string;
  teacherEmail: string;
  hasTutorConfig: boolean;
  enrolledAt?: string | null;
  sessionCount?: number;
  lastSessionAt?: string | null;
}

/**
 * Format grade level with ordinal suffix (e.g., "9th grade", "10th grade").
 * Handles 1st, 2nd, 3rd, and 11th/12th/13th special cases.
 */
export function formatGradeLevel(gradeLevel: number | null | undefined): string {
  if (gradeLevel === null || gradeLevel === undefined || gradeLevel <= 0) {
    return "Grade not set";
  }

  const suffix = getOrdinalSuffix(gradeLevel);
  return `${gradeLevel}${suffix} grade`;
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st, etc.)
 */
function getOrdinalSuffix(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;

  // Special cases: 11th, 12th, 13th
  if (mod100 >= 11 && mod100 <= 13) {
    return "th";
  }

  switch (mod10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/**
 * Format class metadata: "Subject · Grade Level"
 */
export function formatClassMeta(subject: string, gradeLevel: number | null | undefined): string {
  const grade = formatGradeLevel(gradeLevel);
  return `${subject} · ${grade}`;
}

/**
 * Map class status to badge variant.
 */
export function classStatusVariant(status: string): "success" | "secondary" | "outline" {
  switch (status) {
    case "active":
      return "success";
    case "draft":
      return "secondary";
    case "archived":
      return "outline";
    default:
      return "outline";
  }
}

/**
 * Check if a class matches a search query (case-insensitive name/subject contains).
 * Empty query matches all.
 */
export function matchesClassQuery(cls: ClassData, query: string): boolean {
  if (!query || query.trim() === "") return true;

  const q = query.trim().toLowerCase();
  const nameMatch = cls.name.toLowerCase().includes(q);
  const subjectMatch = cls.subject.toLowerCase().includes(q);

  return nameMatch || subjectMatch;
}

/**
 * Format term value to Title Case.
 * Handles: fall → Fall, spring → Spring, summer → Summer, year → Year,
 * quarter1 → Quarter 1, quarter2 → Quarter 2, quarter3 → Quarter 3, quarter4 → Quarter 4.
 * Returns null for null/undefined/empty.
 */
export function formatTerm(term: string | null | undefined): string | null {
  if (!term || term.trim() === "") return null;

  const termMap: Record<string, string> = {
    fall: "Fall",
    spring: "Spring",
    summer: "Summer",
    year: "Year",
    quarter1: "Quarter 1",
    quarter2: "Quarter 2",
    quarter3: "Quarter 3",
    quarter4: "Quarter 4",
  };

  const lowerTerm = term.toLowerCase().trim();
  return termMap[lowerTerm] ?? term.charAt(0).toUpperCase() + term.slice(1);
}

/**
 * Format term and year into a display string.
 * Examples: "Fall 2026", "2026", "Fall", null.
 * Returns null if both term and year are null/undefined/empty.
 */
export function formatTermYear(term: string | null | undefined, year: number | null | undefined): string | null {
  const formattedTerm = formatTerm(term);
  const hasYear = year !== null && year !== undefined;

  if (formattedTerm && hasYear) {
    return `${formattedTerm} ${year}`;
  }
  if (formattedTerm) {
    return formattedTerm;
  }
  if (hasYear) {
    return String(year);
  }
  return null;
}

/**
 * Format session count for display.
 * Returns "No sessions yet" for 0, null, or undefined.
 * Returns "1 session" for 1.
 * Returns "{n} sessions" for n > 1.
 */
export function formatSessionCount(count: number | null | undefined): string {
  if (!count || count <= 0) {
    return "No sessions yet";
  }
  if (count === 1) {
    return "1 session";
  }
  return `${count} sessions`;
}

/**
 * Check if a student enrolled class matches a search query.
 * Matches against name, subject, teacher name (case-insensitive).
 */
export function matchesStudentClassQuery(cls: StudentEnrolledClass, query: string): boolean {
  if (!query || query.trim() === "") return true;

  const q = query.trim().toLowerCase();
  const nameMatch = cls.name.toLowerCase().includes(q);
  const subjectMatch = cls.subject.toLowerCase().includes(q);
  const teacherMatch = cls.teacherName.toLowerCase().includes(q);

  return nameMatch || subjectMatch || teacherMatch;
}