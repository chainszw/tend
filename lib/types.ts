export type Role = "elder" | "family" | "caretaker";

export const ROLE_LABELS: Record<Role, string> = {
  elder: "This is my own care",
  family: "Family member",
  caretaker: "Caretaker",
};

export interface Circle {
  id: string;
  code: string;
  elder_name: string;
  elder_email: string | null;
  timezone: string;
  created_at: string;
}

export interface Member {
  id: string;
  circle_id: string;
  name: string;
  email: string | null;
  role: Role;
  notify: boolean;
  created_at: string;
}

export interface Medication {
  id: string;
  circle_id: string;
  name: string;
  dosage: string;
  instructions: string;
  purpose: string;
  times: string[];
  days: number[];
  start_date: string;
  end_date: string | null;
  active: boolean;
  created_at: string;
}

export type LoggedStatus = "taken" | "skipped";

export interface DoseLog {
  medication_id: string;
  scheduled_for: string;
  status: LoggedStatus;
  logged_at: string;
}

export interface Appointment {
  id: string;
  circle_id: string;
  doctor: string;
  specialty: string;
  location: string;
  starts_at: string;
  notes: string;
  prep_questions: string[];
}

export interface ActivityEntry {
  id: string;
  member_name: string;
  member_role: Role;
  summary: string;
  created_at: string;
}

/** Result shape shared by every server action that backs a form. */
export interface ActionState {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}
