import { describe, it, expect } from "vitest";
import {
  formatGradeLevel,
  formatClassMeta,
  classStatusVariant,
  matchesClassQuery,
  formatTerm,
  formatTermYear,
  formatSessionCount,
  matchesStudentClassQuery,
  type ClassData,
  type StudentEnrolledClass,
} from "./format";

describe("formatGradeLevel", () => {
  it("handles 1st grade", () => {
    expect(formatGradeLevel(1)).toBe("1st grade");
  });

  it("handles 2nd grade", () => {
    expect(formatGradeLevel(2)).toBe("2nd grade");
  });

  it("handles 3rd grade", () => {
    expect(formatGradeLevel(3)).toBe("3rd grade");
  });

  it("handles 4th grade", () => {
    expect(formatGradeLevel(4)).toBe("4th grade");
  });

  it("handles 11th grade (special case)", () => {
    expect(formatGradeLevel(11)).toBe("11th grade");
  });

  it("handles 12th grade (special case)", () => {
    expect(formatGradeLevel(12)).toBe("12th grade");
  });

  it("handles 13th grade (special case)", () => {
    expect(formatGradeLevel(13)).toBe("13th grade");
  });

  it("handles 21st grade", () => {
    expect(formatGradeLevel(21)).toBe("21st grade");
  });

  it("handles null", () => {
    expect(formatGradeLevel(null)).toBe("Grade not set");
  });

  it("handles undefined", () => {
    expect(formatGradeLevel(undefined)).toBe("Grade not set");
  });

  it("handles zero", () => {
    expect(formatGradeLevel(0)).toBe("Grade not set");
  });

  it("handles negative numbers", () => {
    expect(formatGradeLevel(-1)).toBe("Grade not set");
  });
});

describe("formatClassMeta", () => {
  it("formats subject and grade level", () => {
    expect(formatClassMeta("Mathematics", 9)).toBe("Mathematics · 9th grade");
  });

  it("handles null grade level", () => {
    expect(formatClassMeta("Science", null)).toBe("Science · Grade not set");
  });

  it("handles undefined grade level", () => {
    expect(formatClassMeta("English", undefined)).toBe("English · Grade not set");
  });
});

describe("classStatusVariant", () => {
  it("returns success for active", () => {
    expect(classStatusVariant("active")).toBe("success");
  });

  it("returns secondary for draft", () => {
    expect(classStatusVariant("draft")).toBe("secondary");
  });

  it("returns outline for archived", () => {
    expect(classStatusVariant("archived")).toBe("outline");
  });

  it("returns outline for unknown status", () => {
    expect(classStatusVariant("unknown")).toBe("outline");
  });

  it("returns outline for empty string", () => {
    expect(classStatusVariant("")).toBe("outline");
  });
});

describe("matchesClassQuery", () => {
  const mockClass: ClassData = {
    id: "1",
    name: "Algebra I - Period 3",
    subject: "Mathematics",
    gradeLevel: 9,
    status: "active",
    joinCode: "ABC123",
    description: "Algebra fundamentals",
    maxStudents: 30,
    studentCount: 15,
    term: "Fall",
    year: 2024,
    createdAt: "2024-01-15T00:00:00Z",
  };

  it("returns true for empty query", () => {
    expect(matchesClassQuery(mockClass, "")).toBe(true);
  });

  it("returns true for whitespace-only query", () => {
    expect(matchesClassQuery(mockClass, "   ")).toBe(true);
  });

  it("matches name case-insensitively", () => {
    expect(matchesClassQuery(mockClass, "algebra")).toBe(true);
    expect(matchesClassQuery(mockClass, "ALGEBRA")).toBe(true);
    expect(matchesClassQuery(mockClass, "Algebra")).toBe(true);
  });

  it("matches subject case-insensitively", () => {
    expect(matchesClassQuery(mockClass, "math")).toBe(true);
    expect(matchesClassQuery(mockClass, "MATHEMATICS")).toBe(true);
    expect(matchesClassQuery(mockClass, "Mathematics")).toBe(true);
  });

  it("returns false for non-matching query", () => {
    expect(matchesClassQuery(mockClass, "history")).toBe(false);
    expect(matchesClassQuery(mockClass, "biology")).toBe(false);
  });

  it("matches partial strings", () => {
    expect(matchesClassQuery(mockClass, "alg")).toBe(true);
    expect(matchesClassQuery(mockClass, "matic")).toBe(true);
  });
});

describe("formatTerm", () => {
  it("formats fall", () => {
    expect(formatTerm("fall")).toBe("Fall");
  });

  it("formats spring", () => {
    expect(formatTerm("spring")).toBe("Spring");
  });

  it("formats summer", () => {
    expect(formatTerm("summer")).toBe("Summer");
  });

  it("formats year", () => {
    expect(formatTerm("year")).toBe("Year");
  });

  it("formats quarter1", () => {
    expect(formatTerm("quarter1")).toBe("Quarter 1");
  });

  it("formats quarter2", () => {
    expect(formatTerm("quarter2")).toBe("Quarter 2");
  });

  it("formats quarter3", () => {
    expect(formatTerm("quarter3")).toBe("Quarter 3");
  });

  it("formats quarter4", () => {
    expect(formatTerm("quarter4")).toBe("Quarter 4");
  });

  it("handles unknown term by capitalizing", () => {
    expect(formatTerm("custom")).toBe("Custom");
  });

  it("returns null for null", () => {
    expect(formatTerm(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(formatTerm(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(formatTerm("")).toBeNull();
  });

  it("returns null for whitespace", () => {
    expect(formatTerm("   ")).toBeNull();
  });
});

describe("formatTermYear", () => {
  it("formats term and year together", () => {
    expect(formatTermYear("fall", 2026)).toBe("Fall 2026");
  });

  it("formats quarter and year", () => {
    expect(formatTermYear("quarter1", 2026)).toBe("Quarter 1 2026");
  });

  it("returns term only when year is null", () => {
    expect(formatTermYear("spring", null)).toBe("Spring");
  });

  it("returns term only when year is undefined", () => {
    expect(formatTermYear("summer", undefined)).toBe("Summer");
  });

  it("returns year only when term is null", () => {
    expect(formatTermYear(null, 2026)).toBe("2026");
  });

  it("returns year only when term is undefined", () => {
    expect(formatTermYear(undefined, 2026)).toBe("2026");
  });

  it("returns year only when term is empty string", () => {
    expect(formatTermYear("", 2026)).toBe("2026");
  });

  it("returns null when both are null", () => {
    expect(formatTermYear(null, null)).toBeNull();
  });

  it("returns null when both are undefined", () => {
    expect(formatTermYear(undefined, undefined)).toBeNull();
  });
});

describe("formatSessionCount", () => {
  it("returns 'No sessions yet' for 0", () => {
    expect(formatSessionCount(0)).toBe("No sessions yet");
  });

  it("returns 'No sessions yet' for null", () => {
    expect(formatSessionCount(null)).toBe("No sessions yet");
  });

  it("returns 'No sessions yet' for undefined", () => {
    expect(formatSessionCount(undefined)).toBe("No sessions yet");
  });

  it("returns '1 session' for 1", () => {
    expect(formatSessionCount(1)).toBe("1 session");
  });

  it("returns '5 sessions' for 5", () => {
    expect(formatSessionCount(5)).toBe("5 sessions");
  });
});

describe("matchesStudentClassQuery", () => {
  const mockStudentClass: StudentEnrolledClass = {
    id: "1",
    name: "Algebra I - Period 3",
    description: "Algebra fundamentals",
    subject: "Mathematics",
    gradeLevel: 9,
    term: "fall",
    year: 2024,
    status: "active",
    room: "Room 101",
    teacherName: "Mr. Smith",
    teacherEmail: "smith@school.edu",
    hasTutorConfig: true,
    enrolledAt: "2024-01-15T00:00:00Z",
    sessionCount: 5,
    lastSessionAt: "2024-01-20T00:00:00Z",
  };

  it("returns true for empty query", () => {
    expect(matchesStudentClassQuery(mockStudentClass, "")).toBe(true);
  });

  it("returns true for whitespace-only query", () => {
    expect(matchesStudentClassQuery(mockStudentClass, "   ")).toBe(true);
  });

  it("matches name case-insensitively", () => {
    expect(matchesStudentClassQuery(mockStudentClass, "algebra")).toBe(true);
    expect(matchesStudentClassQuery(mockStudentClass, "ALGEBRA")).toBe(true);
    expect(matchesStudentClassQuery(mockStudentClass, "Algebra")).toBe(true);
  });

  it("matches subject case-insensitively", () => {
    expect(matchesStudentClassQuery(mockStudentClass, "math")).toBe(true);
    expect(matchesStudentClassQuery(mockStudentClass, "MATHEMATICS")).toBe(true);
    expect(matchesStudentClassQuery(mockStudentClass, "Mathematics")).toBe(true);
  });

  it("matches teacher name case-insensitively", () => {
    expect(matchesStudentClassQuery(mockStudentClass, "smith")).toBe(true);
    expect(matchesStudentClassQuery(mockStudentClass, "SMITH")).toBe(true);
    expect(matchesStudentClassQuery(mockStudentClass, "Mr. Smith")).toBe(true);
  });

  it("returns false for non-matching query", () => {
    expect(matchesStudentClassQuery(mockStudentClass, "history")).toBe(false);
    expect(matchesStudentClassQuery(mockStudentClass, "biology")).toBe(false);
  });

  it("matches partial strings", () => {
    expect(matchesStudentClassQuery(mockStudentClass, "alg")).toBe(true);
    expect(matchesStudentClassQuery(mockStudentClass, "matic")).toBe(true);
    expect(matchesStudentClassQuery(mockStudentClass, "smit")).toBe(true);
  });
});