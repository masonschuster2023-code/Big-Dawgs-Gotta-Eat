export type FoodSource =
  | "manual"
  | "open_food_facts"
  | "database_search"
  | "photo_label"
  | "photo_estimate";
export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export interface Database {
  public: {
    Tables: {
      day_types: {
        Row: {
          id: string;
          name: string;
          calorie_min: number;
          calorie_max: number;
          protein_g: number;
          fat_g: number;
          carb_min: number;
          carb_max: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["day_types"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["day_types"]["Row"]>;
        Relationships: [];
      };
      daily_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          day_type_id: string | null;
          going_out_flag: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["daily_logs"]["Row"]> & {
          date: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_logs"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "daily_logs_day_type_id_fkey";
            columns: ["day_type_id"];
            referencedRelation: "day_types";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };
      foods: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          source: FoodSource;
          barcode: string | null;
          fdc_id: string | null;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          serving_size: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["foods"]["Row"]> & {
          name: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
        Update: Partial<Database["public"]["Tables"]["foods"]["Row"]>;
        Relationships: [];
      };
      food_catalog: {
        Row: {
          id: string;
          fdc_id: string | null;
          name: string;
          brand: string | null;
          serving_size: number | null;
          serving_unit: string | null;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          source: "usda" | "photo_label";
          verified: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["food_catalog"]["Row"]> & {
          name: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
        Update: Partial<Database["public"]["Tables"]["food_catalog"]["Row"]>;
        Relationships: [];
      };
      food_overrides: {
        Row: {
          id: string;
          user_id: string;
          barcode: string;
          calories: number | null;
          protein: number | null;
          carbs: number | null;
          fat: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["food_overrides"]["Row"]> & {
          barcode: string;
        };
        Update: Partial<Database["public"]["Tables"]["food_overrides"]["Row"]>;
        Relationships: [];
      };
      food_logs: {
        Row: {
          id: string;
          user_id: string;
          daily_log_id: string;
          food_id: string;
          quantity: number;
          meal: Meal;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["food_logs"]["Row"]> & {
          daily_log_id: string;
          food_id: string;
          meal: Meal;
        };
        Update: Partial<Database["public"]["Tables"]["food_logs"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "food_logs_daily_log_id_fkey";
            columns: ["daily_log_id"];
            referencedRelation: "daily_logs";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "food_logs_food_id_fkey";
            columns: ["food_id"];
            referencedRelation: "foods";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
