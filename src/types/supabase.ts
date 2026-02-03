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
      user_profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          role: 'admin' | 'client';
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role: 'admin' | 'client';
          name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          name?: string | null;
          avatar_url?: string | null;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      package_type: "3_day_weekend" | "5_day_extended" | "10_day_experience";
    };
  };
};

type PublicTables = Database["public"]["Tables"];

export type Tables<
  Name extends keyof PublicTables,
  Mode extends "Row" | "Insert" | "Update" = "Row",
> = PublicTables[Name][Mode];

export type Enums<Name extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][Name];
