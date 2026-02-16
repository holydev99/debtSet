export interface Debt {
  id: string;
  user_id: string;
  title: string;
  amount: number;       // Use number
  description?: string; // The "?" means it's optional
  payback_date: string; // ISO date string
  is_paid: boolean;
  created_at: string;
  paid_at:string;
  notification_id:string;
}