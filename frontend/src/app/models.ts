export type Role = 'admin' | 'manager' | 'sales_rep';
export type CustomerStatus = 'Lead' | 'Onboarding' | 'Active' | 'At Risk' | 'Churned';
export type Segment = 'Enterprise' | 'Mid-Market' | 'SMB';
export type DealStage = 'Prospecting' | 'Qualification' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type ActivityType = 'Call' | 'Email' | 'Meeting' | 'Note' | 'Task';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  region: string;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface InteractionLog {
  timestamp: string;
  channel: ActivityType;
  summary: string;
  owner_name: string;
}

export interface Customer {
  id: string;
  company_name: string;
  primary_contact: string;
  email: string;
  phone: string;
  address: string;
  industry: string;
  segment: Segment;
  status: CustomerStatus;
  health_score: number;
  annual_revenue: number;
  employee_count: number;
  notes: string;
  owner_id: string;
  owner_name: string;
  history: InteractionLog[];
  created_at: string;
  updated_at: string;
}

export interface DealHistoryEntry {
  timestamp: string;
  stage: DealStage;
  note: string;
  probability: number;
}

export interface Deal {
  id: string;
  title: string;
  customer_id: string;
  customer_name: string;
  owner_id: string;
  owner_name: string;
  stage: DealStage;
  value: number;
  probability: number;
  expected_close_date: string;
  description: string;
  history: DealHistoryEntry[];
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  title: string;
  activity_type: ActivityType;
  customer_id: string;
  customer_name: string;
  assigned_to_id: string;
  assigned_to_name: string;
  priority: Priority;
  due_date: string;
  status: 'Pending' | 'Completed';
  deal_id: string | null;
  notes: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  total_customers: number;
  active_customers: number;
  total_pipeline_value: number;
  weighted_pipeline_value: number;
  open_deals: number;
  won_deals: number;
  overdue_activities: number;
  monthly_forecast: number;
}

export interface PipelineStageSummary {
  stage: DealStage;
  count: number;
  value: number;
}

export interface RevenueForecastPoint {
  month: string;
  value: number;
}

export interface AcquisitionMetric {
  label: string;
  value: number;
}

export interface ActivityReportSummary {
  label: string;
  pending: number;
  completed: number;
}
