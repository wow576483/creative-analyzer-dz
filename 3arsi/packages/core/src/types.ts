// 3ARSI — shared domain types for the Wedding Operating System.
// These types are the single source of truth shared by the API (Cloudflare
// Workers) and the Web app (Next.js).

export type WeddingType =
  | 'traditional' // عرس تقليدي
  | 'modern' // عرس عصري
  | 'mixed' // مزيج
  | 'luxury'; // فاخر

export const WEDDING_TYPES: { value: WeddingType; ar: string; fr: string }[] = [
  { value: 'traditional', ar: 'تقليدي', fr: 'Traditionnel' },
  { value: 'modern', ar: 'عصري', fr: 'Moderne' },
  { value: 'mixed', ar: 'مزيج', fr: 'Mixte' },
  { value: 'luxury', ar: 'فاخر', fr: 'Luxe' },
];

export type TaskStatus = 'not_started' | 'in_progress' | 'done';
export type Priority = 'high' | 'medium' | 'low';
export type RsvpStatus = 'confirmed' | 'pending' | 'declined';

// ---- Intake: what the bride enters ----
export interface WeddingIntake {
  brideName: string;
  groomName: string;
  weddingDate: string; // ISO yyyy-mm-dd
  city: string; // wilaya code or name
  guestCount: number;
  budget: number; // DZD
  weddingType: WeddingType;
}

// ---- Generated module data ----
export interface BudgetItem {
  category: string;
  item: string;
  planned: number; // DZD
  actual: number; // DZD
  note?: string;
}

export interface BudgetPlan {
  total: number;
  items: BudgetItem[];
  byCategory: { category: string; planned: number; share: number }[];
}

export interface TimelineEntry {
  order: number;
  task: string;
  date: string; // ISO
  owner: string;
  status: TaskStatus;
  priority: Priority;
  note?: string;
}

export interface ChecklistTask {
  id: string;
  title: string;
  category: string;
  dueDate: string; // ISO
  status: TaskStatus;
  priority: Priority;
}

export interface EquipmentItem {
  list: string; // e.g. "trousseau", "venue", "music"
  room?: string;
  item: string;
  quantity: number;
  estPrice: number;
  status: TaskStatus;
  note?: string;
}

export interface WeddingEvent {
  order: number;
  name: string;
  date: string; // ISO
  time: string;
  place: string;
  guests: number;
  note?: string;
}

export interface Guest {
  id: string;
  fullName: string;
  gender: 'male' | 'female';
  relation: string;
  group: string;
  rsvp: RsvpStatus;
  plusOne: number;
  table?: number;
  phone?: string;
}

export interface TablePlan {
  number: number;
  group: string;
  capacity: number;
  assigned: number;
  note?: string;
}

export interface DashboardData {
  daysUntilWedding: number;
  progressPct: number; // 0..100 of timeline tasks done
  guests: { total: number; confirmed: number; pending: number; tables: number };
  budget: { planned: number; actual: number; remaining: number; spentPct: number };
  upcomingTasks: TimelineEntry[];
  spendByCategory: { category: string; amount: number; share: number }[];
}

// The full generated package for one bride.
export interface WeddingPackage {
  intake: WeddingIntake;
  wilayaLabel: string;
  budget: BudgetPlan;
  timeline: TimelineEntry[];
  tasks: ChecklistTask[];
  equipment: EquipmentItem[];
  events: WeddingEvent[];
  dashboard: DashboardData;
  generatedAt: string;
}
