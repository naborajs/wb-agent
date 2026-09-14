/**
 * Shared TypeScript domain models for WB-Agent Dashboard.
 */

export interface Lead {
  id: string;
  name: string;
  phone: string;
  company_name?: string;
  company_type?: string;
  city?: string;
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "NEGOTIATION" | "WON" | "LOST";
  score: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  lead_id?: string;
  channel_id: string;
  status: "ACTIVE" | "PAUSED" | "HANDOFF" | "CLOSED";
  mode: "AI" | "HUMAN" | "PAUSED";
  unread_count: number;
  last_message_at?: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: "customer" | "agent" | "operator" | "system";
  content: string;
  media_type?: string;
  media_url?: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  target_segment: string;
  initial_message_template: string;
  status: "draft" | "active" | "paused" | "completed" | "archived";
  daily_limit: number;
  jitter_min_seconds: number;
  jitter_max_seconds: number;
  personalization_enabled: boolean;
  total_leads?: number;
  sent_count?: number;
  delivered_count?: number;
  replied_count?: number;
  response_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignLead {
  id: string;
  lead_id: string;
  lead_name?: string;
  lead_phone?: string;
  lead_company?: string;
  status: string;
  delivery_status: "pending" | "sent" | "delivered" | "read" | "failed" | "replied";
  personalized_message?: string;
  sent_at?: string;
  replied_at?: string;
  created_at: string;
}

export interface CampaignStats {
  total_leads: number;
  sent_count: number;
  delivered_count: number;
  replied_count: number;
  failed_count: number;
  opted_out_count: number;
  response_rate: number;
  delivery_rate: number;
}

export interface FridayActionParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  default?: unknown;
}

export interface FridayAction {
  name: string;
  display_name: string;
  description: string;
  category: "ui" | "campaign" | "leads" | "pricing" | "system";
  parameters: FridayActionParameter[];
}

export interface AgentNotification {
  id: string;
  sender_brain: "EDITH" | "FRIDAY";
  title: string;
  content: string;
  category: string;
  severity: "info" | "warning" | "critical" | "success";
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export interface WatchdogAlert {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  title: string;
  description: string;
  conversation_id?: string;
  order_id?: string;
  suggested_action?: string;
  created_at: string;
}

export interface QuoteItem {
  id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  subtotal: number;
}

export interface Quote {
  id: string;
  quote_number: string;
  customer_id: string;
  customer_name?: string;
  customer_company?: string;
  status: "draft" | "sent" | "accepted" | "expired" | "rejected";
  total_amount: number;
  discount_amount: number;
  valid_until?: string;
  created_at?: string;
  items: QuoteItem[];
}
