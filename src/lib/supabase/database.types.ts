export type FoodSource =
  | "manual"
  | "open_food_facts"
  | "database_search"
  | "photo_label"
  | "photo_estimate";
export type Meal = "breakfast" | "lunch" | "dinner" | "snack";
export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "lightly_active" | "moderately_active" | "very_active";
export type Goal = "maintain" | "lose" | "gain";

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
      meals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["meals"]["Row"]> & {
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["meals"]["Row"]>;
        Relationships: [];
      };
      meal_items: {
        Row: {
          id: string;
          meal_id: string;
          food_id: string;
          quantity: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["meal_items"]["Row"]> & {
          meal_id: string;
          food_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["meal_items"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "meal_items_meal_id_fkey";
            columns: ["meal_id"];
            referencedRelation: "meals";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "meal_items_food_id_fkey";
            columns: ["food_id"];
            referencedRelation: "foods";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };
      profiles: {
        Row: {
          user_id: string;
          sex: Sex;
          weight_lb: number;
          height_in: number;
          age: number;
          activity_level: ActivityLevel;
          goal: Goal;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          user_id: string;
          sex: Sex;
          weight_lb: number;
          height_in: number;
          age: number;
          activity_level: ActivityLevel;
          goal: Goal;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
