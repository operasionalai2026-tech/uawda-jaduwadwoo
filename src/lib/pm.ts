// Konstanta & label untuk model Project/Task management.
// Client-safe: tidak mengimpor apa pun yang server-only, jadi boleh dipakai
// di Server maupun Client Components.

export type TaskStatus = "idea" | "todo" | "in_progress" | "in_review" | "done" | "cancelled";
export type TaskType = "fitur" | "pengembangan" | "masalah";
export type TaskLevel = "urgent" | "medium" | "low";

export const TASK_STATUSES: TaskStatus[] = [
  "idea",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "cancelled",
];
export const TASK_TYPES: TaskType[] = ["fitur", "pengembangan", "masalah"];
export const TASK_LEVELS: TaskLevel[] = ["urgent", "medium", "low"];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  idea: "Idea",
  todo: "TO DO",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancel",
};

export const STATUS_COLOR: Record<TaskStatus, string> = {
  idea: "bg-violet-50 text-violet-700 border-violet-100",
  todo: "bg-slate-100 text-slate-600 border-slate-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-100",
  in_review: "bg-amber-50 text-amber-700 border-amber-100",
  done: "bg-emerald-50 text-emerald-700 border-emerald-100",
  cancelled: "bg-rose-50 text-rose-600 border-rose-100",
};

export const TYPE_LABEL: Record<TaskType, string> = {
  fitur: "Fitur",
  pengembangan: "Pengembangan",
  masalah: "Masalah",
};

export const TYPE_COLOR: Record<TaskType, string> = {
  fitur: "bg-indigo-50 text-indigo-700 border-indigo-100",
  pengembangan: "bg-cyan-50 text-cyan-700 border-cyan-100",
  masalah: "bg-orange-50 text-orange-700 border-orange-100",
};

export const LEVEL_LABEL: Record<TaskLevel, string> = {
  urgent: "Urgent",
  medium: "Medium",
  low: "Low",
};

export const LEVEL_COLOR: Record<TaskLevel, string> = {
  urgent: "bg-rose-50 text-rose-700 border-rose-100",
  medium: "bg-amber-50 text-amber-700 border-amber-100",
  low: "bg-slate-100 text-slate-500 border-slate-200",
};

// Untuk mengurutkan berdasarkan prioritas (urgent dulu).
export const LEVEL_RANK: Record<TaskLevel, number> = { urgent: 0, medium: 1, low: 2 };

export const LEVEL_POINTS: Record<TaskLevel, number> = { urgent: 30, medium: 20, low: 10 };

// --- Forum ---
export type ThreadCategory = "idea" | "improvement" | "issue";
export type ThreadType = "internal" | "global";

export const THREAD_CATEGORIES: ThreadCategory[] = ["idea", "improvement", "issue"];
export const THREAD_TYPES: ThreadType[] = ["internal", "global"];

export const THREAD_CATEGORY_LABEL: Record<ThreadCategory, string> = {
  idea: "Idea",
  improvement: "Improvement",
  issue: "Issue",
};

export const THREAD_CATEGORY_COLOR: Record<ThreadCategory, string> = {
  idea: "bg-violet-50 text-violet-700 border-violet-100",
  improvement: "bg-cyan-50 text-cyan-700 border-cyan-100",
  issue: "bg-orange-50 text-orange-700 border-orange-100",
};

export const THREAD_TYPE_LABEL: Record<ThreadType, string> = {
  internal: "Internal Divisi",
  global: "Global",
};

// --- Rapat / Meeting ---
// Status ditampilkan sbg spec: Done / In Progress / Due Soon. Diturunkan dari
// kolom status lama (scheduled/ongoing/done/cancelled) + waktu.
export type MeetingDisplayStatus = "done" | "in_progress" | "due_soon" | "cancelled";

export const MEETING_STATUS_LABEL: Record<MeetingDisplayStatus, string> = {
  done: "Done",
  in_progress: "In Progress",
  due_soon: "Due Soon",
  cancelled: "Cancelled",
};

export const MEETING_STATUS_COLOR: Record<MeetingDisplayStatus, string> = {
  done: "bg-emerald-50 text-emerald-700 border-emerald-100",
  in_progress: "bg-blue-50 text-blue-700 border-blue-100",
  due_soon: "bg-amber-50 text-amber-700 border-amber-100",
  cancelled: "bg-rose-50 text-rose-600 border-rose-100",
};

// Petakan status DB + waktu ke status tampilan.
export function meetingDisplayStatus(dbStatus: string): MeetingDisplayStatus {
  if (dbStatus === "done") return "done";
  if (dbStatus === "ongoing") return "in_progress";
  if (dbStatus === "cancelled") return "cancelled";
  return "due_soon"; // scheduled
}

// Transisi status yang boleh dilakukan oleh assignee (staff) atas task-nya
// sendiri. Approval idea -> todo hanya boleh reviewer (Lead/Management/Owner).
export const ASSIGNEE_NEXT_STATUS: Record<TaskStatus, TaskStatus[]> = {
  idea: [], // menunggu approval reviewer
  todo: ["in_progress"],
  in_progress: ["in_review", "todo"],
  in_review: ["done", "in_progress"],
  done: [],
  cancelled: [],
};

// Transisi status yang boleh dilakukan reviewer (Lead/Management/Owner).
export const REVIEWER_NEXT_STATUS: Record<TaskStatus, TaskStatus[]> = {
  idea: ["todo", "cancelled"],
  todo: ["in_progress", "cancelled"],
  in_progress: ["in_review", "todo", "cancelled"],
  in_review: ["done", "in_progress", "cancelled"],
  done: ["in_progress"],
  cancelled: ["todo"],
};
