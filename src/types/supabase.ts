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
      contracts: {
        Row: {
          id: string;
          booking_id: string | null;
          inquiry_id: string | null;
          contract_number: string | null;
          status: string;
          package_type: Database["public"]["Enums"]["package_type"];
          event_start_date: string | null;
          event_end_date: string | null;
          total_amount: number;
          deposit_amount: number;
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
        Insert: Partial<Database["public"]["Tables"]["contracts"]["Row"]> & {
          package_type: Database["public"]["Enums"]["package_type"];
        };
        Update: Partial<Database["public"]["Tables"]["contracts"]["Row"]>;
      };
      documents: {
        Row: {
          id: string;
          booking_id: string | null;
          uploaded_by: string | null;
          uploaded_by_role: string | null;
          file_name: string | null;
          file_type: string | null;
          file_size: number | null;
          storage_path: string | null;
          description: string | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["documents"]["Row"]> & {
          booking_id: string;
          file_name: string;
          storage_path: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Row"]>;
      };
      guests: {
        Row: {
          id: string;
          booking_id: string;
          first_name: string;
          last_name: string | null;
          email: string | null;
          phone: string | null;
          rsvp_status: string;
          meal_preference: string | null;
          dietary_restrictions: string | null;
          plus_one: boolean;
          plus_one_name: string | null;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["guests"]["Row"]> & {
          booking_id: string;
          first_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["guests"]["Row"]>;
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
