export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      bookings: {
        Row: {
          id: string;
          package_type: "3_day_weekend" | "5_day_extended" | "10_day_experience";
          start_date: string;
          end_date: string;
          base_price: number;
          status: string;
          created_at: string | null;
          updated_at: string | null;
          is_last_minute: boolean;
          estimated_day_guests: number | null;
          estimated_overnight_guests: number | null;
          rv_sites: number | null;
          special_requests: string | null;
          client_name: string | null;
          client_email: string | null;
          contract_sent_date: string | null;
          contract_signed_date: string | null;
          created_by: string | null;
          inquiry_id: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["bookings"]["Row"]> & {
          package_type: Database["public"]["Tables"]["bookings"]["Row"]["package_type"];
          start_date: string;
          end_date: string;
          base_price: number;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Row"]>;
      };
      venue_settings: {
        Row: {
          id: string;
          business_name: string;
          business_address: string;
          timezone: string;
          max_reception_guests: number;
          included_camping_guests: number;
          included_rv_sites: number;
          season_start: string;
          season_end: string;
          deposit_percent: number;
          payment_offsets: Json;
          package_base_prices: Json;
          upsell_unit_prices: Json;
          gst_rate: number;
          created_at: string | null;
          updated_at: string | null;
          damage_deposit_amount?: number;
          damage_deposit_refund_days?: number;
        };
        Insert: Partial<Database["public"]["Tables"]["venue_settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["venue_settings"]["Row"]>;
      };
      payment_schedule: {
        Row: {
          id: string;
          booking_id: string | null;
          installment_order: number;
          label: string;
          amount: number;
          due_date: string;
          status: string;
          stripe_payment_intent_id: string | null;
          paid_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["payment_schedule"]["Row"]> & {
          booking_id?: string | null;
          installment_order: number;
          label: string;
          amount: number;
          due_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["payment_schedule"]["Row"]>;
      };
      damage_deposits: {
        Row: {
          id: string;
          booking_id: string | null;
          amount: number;
          status: "pending" | "collected" | "refunded" | "deducted" | "waived";
          collected_at: string | null;
          refunded_at: string | null;
          deductions: number;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["damage_deposits"]["Row"]> & {
          amount?: number;
        };
        Update: Partial<Database["public"]["Tables"]["damage_deposits"]["Row"]>;
      };
      upsells: {
        Row: {
          id: string;
          booking_id: string | null;
          type: "rv_site_overage" | "tent_camping_overage" | "firewood_bundle";
          quantity: number;
          unit_price: number;
          total_amount: number;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["upsells"]["Row"]> & {
          type: Database["public"]["Tables"]["upsells"]["Row"]["type"];
          quantity?: number;
          unit_price?: number;
        };
        Update: Partial<Database["public"]["Tables"]["upsells"]["Row"]>;
      };
      inquiries: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          source: string | null;
          status: "inquiry" | "contacted" | "tour_scheduled" | "proposal_sent" | "booked" | "completed" | "declined" | "hold";
          event_start_date: string | null;
          event_end_date: string | null;
          estimated_guest_count: number | null;
          notes: string | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["inquiries"]["Row"]> & {
          full_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["inquiries"]["Row"]>;
      };
      calendar_blocks: {
        Row: {
          id: string;
          type: "hold" | "blocked" | "maintenance";
          start_date: string;
          end_date: string;
          label: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["calendar_blocks"]["Row"]> & {
          type?: Database["public"]["Tables"]["calendar_blocks"]["Row"]["type"];
          start_date: string;
          end_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["calendar_blocks"]["Row"]>;
      };
      proposals: {
        Row: {
          id: string;
          inquiry_id: string | null;
          booking_id: string | null;
          title: string | null;
          status: "draft" | "sent" | "accepted" | "expired" | "declined";
          total_amount: number | null;
          pdf_url: string | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["proposals"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["proposals"]["Row"]>;
      };
      invoices: {
        Row: {
          id: string;
          booking_id: string | null;
          amount: number;
          status: "draft" | "sent" | "paid" | "overdue" | "void";
          due_date: string | null;
          paid_at: string | null;
          provider_invoice_id: string | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["invoices"]["Row"]> & {
          amount?: number;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Row"]>;
      };
      templates: {
        Row: {
          id: string;
          name: string;
          type: "email" | "sms" | "document";
          subject: string | null;
          body: string | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["templates"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["templates"]["Row"]>;
      };
      communication_logs: {
        Row: {
          id: string;
          booking_id: string | null;
          inquiry_id: string | null;
          channel: "email" | "sms" | "note";
          direction: "inbound" | "outbound";
          subject: string | null;
          body: string | null;
          status: "logged" | "sent" | "failed";
          provider: string | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["communication_logs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["communication_logs"]["Row"]>;
      };
      contracts: {
        Row: {
          id: string;
          booking_id: string | null;
          inquiry_id: string | null;
          contract_number: string;
          status: "draft" | "sent" | "viewed" | "signed" | "expired" | "cancelled";
          package_type: "3_day_weekend" | "5_day_extended" | "10_day_experience";
          event_start_date: string | null;
          event_end_date: string | null;
          total_amount: number | null;
          deposit_amount: number | null;
          client_name: string | null;
          client_email: string | null;
          client_phone: string | null;
          sent_at: string | null;
          viewed_at: string | null;
          signed_at: string | null;
          client_ip_address: string | null;
          client_signature_data: string | null;
          pdf_url: string | null;
          signed_pdf_url: string | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["contracts"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["contracts"]["Row"]>;
      };
      contacts: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          contact_type: "client" | "vendor" | "lead";
          booking_id: string | null;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["contacts"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Row"]>;
      };
      message_threads: {
        Row: {
          id: string;
          contact_id: string | null;
          subject: string | null;
          last_message_at: string | null;
          unread_count: number;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["message_threads"]["Row"]> & {
          contact_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["message_threads"]["Row"]>;
      };
      messages: {
        Row: {
          id: string;
          thread_id: string | null;
          direction: "inbound" | "outbound";
          channel: "sms" | "email" | "facebook_messenger";
          from_address: string | null;
          to_address: string | null;
          subject: string | null;
          body: string;
          status: "sent" | "delivered" | "failed" | "read";
          external_id: string | null;
          sent_by: string | null;
          sent_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["messages"]["Row"]> & {
          direction: Database["public"]["Tables"]["messages"]["Row"]["direction"];
          channel: Database["public"]["Tables"]["messages"]["Row"]["channel"];
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Row"]>;
      };
      tours: {
        Row: {
          id: string;
          inquiry_id: string;
          tour_date: string;
          tour_time: string;
          attendees: Json;
          status: "scheduled" | "completed" | "cancelled" | "no_show";
          tour_notes: string | null;
          staff_assigned: string | null;
          follow_up_sent: boolean;
          outcome: "interested" | "not_interested" | "booked" | "thinking" | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["tours"]["Row"]> & {
          inquiry_id: string;
          tour_date: string;
          tour_time: string;
        };
        Update: Partial<Database["public"]["Tables"]["tours"]["Row"]>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      package_type: "3_day_weekend" | "5_day_extended" | "10_day_experience";
      damage_deposit_status: "pending" | "collected" | "refunded" | "deducted" | "waived";
      upsell_type: "rv_site_overage" | "tent_camping_overage" | "firewood_bundle";
      inquiry_status: "inquiry" | "contacted" | "tour_scheduled" | "proposal_sent" | "booked" | "completed" | "declined" | "hold";
      calendar_block_type: "hold" | "blocked" | "maintenance";
      proposal_status: "draft" | "sent" | "accepted" | "expired" | "declined";
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "void";
      template_type: "email" | "sms" | "document";
      communication_channel: "email" | "sms" | "note";
      communication_direction: "inbound" | "outbound";
      communication_status: "logged" | "sent" | "failed";
      contract_status: "draft" | "sent" | "viewed" | "signed" | "expired" | "cancelled";
      tour_status: "scheduled" | "completed" | "cancelled" | "no_show";
      tour_outcome: "interested" | "not_interested" | "booked" | "thinking";
      contact_type: "client" | "vendor" | "lead";
      message_direction: "inbound" | "outbound";
      message_channel: "sms" | "email" | "facebook_messenger";
      message_status: "sent" | "delivered" | "failed" | "read";
    };
  };
};

type PublicTables = Database["public"]["Tables"];

export type Tables<
  Name extends keyof PublicTables,
  Mode extends "Row" | "Insert" | "Update" = "Row",
> = PublicTables[Name][Mode];

export type Enums<Name extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][Name];
