// Rucno pisani tipovi koji prate supabase/schema.sql.
// (Kasnije mozes generisati automatski sa: npx supabase gen types typescript)

export type Role = 'resident' | 'admin' | 'superadmin';
export type PaymentStatus = 'Plaćeno' | 'Na čekanju';
export type TicketStatus = 'Novo' | 'Zakazano' | 'U toku' | 'Rešeno';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type PollStatus = 'active' | 'closed';

export interface Building {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  name: string;
  role: Role;
  unit: string | null;
  building_id: string | null;
  balance: number;
  payment_status: PaymentStatus;
  created_at: string;
}

export interface Ticket {
  id: number;
  unit: string;
  title: string;
  category: string;
  description: string | null;
  status: TicketStatus;
  building_id: string;
  reported_by: string | null;
  priority: TicketPriority;
  due_at: string | null;
  assigned_to: string | null;
  updated_at: string;
  location: string | null;
  is_emergency: boolean;
  appointment_date: string | null;
  appointment_start: string | null;
  appointment_end: string | null;
  appointment_status: string;
  created_at: string;
}

export interface TicketRating { id: number; ticket_id: number; resident_id: string; rating: number; comment: string | null; created_at: string; }

export interface TicketComment {
  id: number;
  ticket_id: number;
  author_id: string;
  body: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  created_at: string;
}

export interface TicketPhoto {
  id: number;
  ticket_id: number;
  storage_path: string;
  created_at: string;
}

export interface Poll {
  id: number;
  title: string;
  description: string | null;
  building_id: string | null;
  status: PollStatus;
  created_by: string | null;
  created_at: string;
}

export interface PollOption {
  id: number;
  poll_id: number;
  label: string;
  votes: number;
}

export interface PollVote {
  id: number;
  poll_id: number;
  option_id: number;
  voter_id: string;
  created_at: string;
}

export interface BulletinPost {
  id: number;
  title: string;
  body: string;
  building_id: string | null;
  author_id: string | null;
  author_name: string;
  created_at: string;
}

export interface Invoice {
  id: number;
  unit: string;
  building_id: string;
  amount: number;
  month: string;
  status: string;
  created_at: string;
}

export interface PermissionRow {
  key: string;
  value: boolean;
}

export interface AppNotification {
  id: number;
  recipient_id: string;
  type: string;
  icon: string;
  title: string;
  sub: string | null;
  target: string | null;
  read: boolean;
  dismissed: boolean;
  persistent: boolean;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: number;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

// Minimalan Database tip da @supabase/ssr klijenti budu tipizirani.
// Nije 100% kompletan Supabase generated tip, ali dovoljan za select/insert/update sa .from('table').
type Table<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};

export interface Database {
    public: {
      Tables: {
      buildings: Table<Building>;
      profiles: Table<Profile>;
      tickets: Table<Ticket>;
      ticket_photos: Table<TicketPhoto>;
      ticket_comments: Table<TicketComment>;
      audit_logs: Table<AuditLog>;
      ticket_ratings: Table<TicketRating>;
      user_notification_preferences: Table<{ user_id: string; push_enabled: boolean; email_enabled: boolean; problem_updates: boolean; comments_replies: boolean; building_announcements: boolean; appointment_reminders: boolean; updated_at: string }>;
      polls: Table<Poll>;
      poll_options: Table<PollOption>;
      poll_votes: Table<PollVote>;
      bulletin_posts: Table<BulletinPost>;
      invoices: Table<Invoice>;
      permissions: Table<PermissionRow>;
      notifications: Table<AppNotification>;
      push_subscriptions: Table<PushSubscriptionRow>;
    };
    Views: Record<string, never>;
    Functions: {
      cast_vote: {
        Args: { p_poll_id: number; p_option_id: number };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
