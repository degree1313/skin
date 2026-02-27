export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          active_category: "retinoid" | "aha" | "bha" | "other";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          active_category: "retinoid" | "aha" | "bha" | "other";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          active_category?: "retinoid" | "aha" | "bha" | "other";
          created_at?: string;
        };
        Relationships: [];
      };
      product_usage_logs: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          routine_slot: "am" | "pm";
          dose: "half_pea" | "pea" | "dime" | "one_pump" | "two_pumps";
          used_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          product_id: string;
          routine_slot: "am" | "pm";
          dose: "half_pea" | "pea" | "dime" | "one_pump" | "two_pumps";
          used_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          routine_slot?: "am" | "pm";
          dose?: "half_pea" | "pea" | "dime" | "one_pump" | "two_pumps";
          used_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_usage_logs_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      daily_checkins: {
        Row: {
          id: string;
          user_id: string;
          stinging_level: number;
          stinging_minutes: number;
          tightness: boolean;
          flaking_severity: number;
          itchiness_level: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          stinging_level?: number;
          stinging_minutes?: number;
          tightness?: boolean;
          flaking_severity?: number;
          itchiness_level?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stinging_level?: number;
          stinging_minutes?: number;
          tightness?: boolean;
          flaking_severity?: number;
          itchiness_level?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_checkins_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      active_category: "retinoid" | "aha" | "bha" | "other";
      dose: "half_pea" | "pea" | "dime" | "one_pump" | "two_pumps";
      routine_slot: "am" | "pm";
    };
  };
}

