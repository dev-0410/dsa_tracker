export type StudyPlanStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type StudyPlanItemStatus = "TODO" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
export type StudyPlanDifficulty = "EASY" | "MEDIUM" | "HARD";
export type StudyPlanPlatform = "LEETCODE" | "CODEFORCES";
export type StudyPlanLane = "LEARN" | "REVIEW" | "EXPLORE" | "CHALLENGE";

export interface CreateStudyPlanInput {
  title?: string;
  startDate?: string;
  durationDays: number;
  problemsPerDay: number;
}

export interface PlanScheduleCandidate {
  problemId: string;
  rank: number;
  lane: StudyPlanLane;
  difficulty: StudyPlanDifficulty;
  estimatedMinutes: number;
  primaryTopicId: string | null;
  pattern?: string | null;
}

export interface ScheduledPlanItem extends PlanScheduleCandidate {
  scheduledFor: string;
  position: number;
}

export interface StudyPlanProblemView {
  id: string;
  title: string;
  slug: string;
  url: string;
  platform: StudyPlanPlatform;
  difficulty: StudyPlanDifficulty;
  estimatedMinutes: number;
  pattern: string | null;
  topics: Array<{ id: string; slug: string; name: string; isPrimary: boolean }>;
}

export interface StudyPlanItemView {
  id: string;
  status: StudyPlanItemStatus;
  scheduledFor: string;
  position: number;
  completedAt: string | null;
  problem: StudyPlanProblemView;
}

export interface StudyPlanDayView {
  date: string;
  totalMinutes: number;
  completed: number;
  skipped: number;
  items: StudyPlanItemView[];
}

export interface StudyPlanProgress {
  total: number;
  completed: number;
  skipped: number;
  inProgress: number;
  remaining: number;
  percent: number;
  totalMinutes: number;
}

export interface StudyPlanView {
  id: string;
  title: string;
  description: string | null;
  status: StudyPlanStatus;
  startDate: string;
  endDate: string;
  minutesPerDay: number;
  createdAt: string;
  progress: StudyPlanProgress;
  days: StudyPlanDayView[];
}

export interface StudyPlansView {
  active: StudyPlanView | null;
  history: StudyPlanView[];
}
