import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fgmdixxhzwhgaiajcxal.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnbWRpeHhoendoZ2FpYWpjeGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NzM1NzQsImV4cCI6MjA5MzI0OTU3NH0.YDXk2lWWlN5SAN1MoXnL0JSVj8c7F_ZI_EOGclb3eas';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface UserModel {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  class_id?: string | null;
  className?: string | null;
  roll_no?: string | null;
  device_id?: string | null;
}

export interface ClassModel {
  id: string;
  name: string;
}

export interface SubjectModel {
  id: string;
  name: string;
}

export interface AssignmentModel {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  class_name?: string;
  subject_name?: string;
}

export interface SessionModel {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  code: string;
  security_level: string;
  rssi_threshold: number;
  start_time: string;
  end_time?: string | null;
  is_active: boolean;
  lecture_time?: string | null;
  class_ids?: string[] | null;
  teacher_name?: string | null;
  class_name?: string | null;
  subject_name?: string | null;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  timestamp: string;
  status: 'present' | 'absent';
  student_name?: string;
  student_email?: string;
  student_roll_no?: string;
  subject_name?: string;
}
