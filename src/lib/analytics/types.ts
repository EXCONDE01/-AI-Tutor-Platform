export interface AnalyticsRange { days: number; start: string; end: string; classId: string | null }
export interface AnalyticsOverview {
  total: number; active: number; paused: number; completed: number; abandoned: number; error: number;
  students: number; messages: number; interventions: number;
  avgDuration: number; totalDuration: number; completedRate: number;
}
export interface SessionDay { date: string; count: number; messages: number; avgDuration: number }
export interface RecentSession {
  id: string; title: string | null; studentName: string; className: string; status: string;
  messageCount: number; startedAt: string; lastMessageAt: string | null;
}
export interface StudentEngagement {
  studentId: string; studentName: string; studentEmail: string; sessionCount: number;
  messageCount: number; totalDuration: number; avgDuration: number; lastSession: string | null;
}
export interface TopicCount { topic: string; count: number }
export interface StruggleCount { struggle: string; count: number }
export interface InterventionRow { type: string; severity: string; status: string; count: number }
export interface TokenStats { totalTokens: number; avgTokensPerMessage: number; messageCount: number; hasTokenData: boolean }
export interface WeeklyProgress { week: string; sessions: number; avgDuration: number; completedSessions: number }
export interface AnalyticsClass { id: string; name: string; subject: string }
export interface AnalyticsData {
  range: AnalyticsRange; classes: AnalyticsClass[]; overview: AnalyticsOverview;
  sessionsByDay: SessionDay[]; recentSessions: RecentSession[]; studentEngagement: StudentEngagement[];
  topics: TopicCount[]; struggles: StruggleCount[]; interventions: InterventionRow[];
  tokens: TokenStats; weeklyProgress: WeeklyProgress[];
}