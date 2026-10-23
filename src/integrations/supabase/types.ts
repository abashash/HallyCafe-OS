export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      alerts: {
        Row: {
          created_at: string;
          id: string;
          ingredient_id: string | null;
          is_read: boolean;
          message: string;
          severity: string;
          type: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          ingredient_id?: string | null;
          is_read?: boolean;
          message: string;
          severity?: string;
          type: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          ingredient_id?: string | null;
          is_read?: boolean;
          message?: string;
          severity?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          },
        ];
      };
      app_settings: {
        Row: {
          created_at: string;
          currency_label: string;
          id: string;
          monthly_sales_units: number;
          singleton: boolean;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          currency_label?: string;
          id?: string;
          monthly_sales_units?: number;
          singleton?: boolean;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          currency_label?: string;
          id?: string;
          monthly_sales_units?: number;
          singleton?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          created_at: string;
          details: Json | null;
          entity: string;
          entity_id: string | null;
          id: string;
          user_email: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          details?: Json | null;
          entity: string;
          entity_id?: string | null;
          id?: string;
          user_email?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          details?: Json | null;
          entity?: string;
          entity_id?: string | null;
          id?: string;
          user_email?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_published: boolean;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_published?: boolean;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_published?: boolean;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      ingredient_price_history: {
        Row: {
          avg_cost_after: number;
          changed_at: string;
          conversion_factor: number | null;
          id: string;
          ingredient_id: string;
          purchase_price: number | null;
          purchase_unit: string | null;
          quantity: number | null;
          source: string;
          unit_cost: number;
        };
        Insert: {
          avg_cost_after: number;
          changed_at?: string;
          conversion_factor?: number | null;
          id?: string;
          ingredient_id: string;
          purchase_price?: number | null;
          purchase_unit?: string | null;
          quantity?: number | null;
          source?: string;
          unit_cost: number;
        };
        Update: {
          avg_cost_after?: number;
          changed_at?: string;
          conversion_factor?: number | null;
          id?: string;
          ingredient_id?: string;
          purchase_price?: number | null;
          purchase_unit?: string | null;
          quantity?: number | null;
          source?: string;
          unit_cost?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ingredient_price_history_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          },
        ];
      };
      ingredients: {
        Row: {
          avg_cost: number;
          base_unit: string;
          conversion_factor: number;
          created_at: string;
          id: string;
          ingredient_group: string;
          last_cost: number;
          last_purchase_price: number;
          min_stock: number;
          name: string;
          notes: string | null;
          purchase_unit: string;
          purchased_cost_total: number;
          purchased_qty_total: number;
          stock_qty: number;
          supplier_id: string | null;
          unit_category: string;
          updated_at: string;
        };
        Insert: {
          avg_cost?: number;
          base_unit?: string;
          conversion_factor?: number;
          created_at?: string;
          id?: string;
          ingredient_group?: string;
          last_cost?: number;
          last_purchase_price?: number;
          min_stock?: number;
          name: string;
          notes?: string | null;
          purchase_unit?: string;
          purchased_cost_total?: number;
          purchased_qty_total?: number;
          stock_qty?: number;
          supplier_id?: string | null;
          unit_category?: string;
          updated_at?: string;
        };
        Update: {
          avg_cost?: number;
          base_unit?: string;
          conversion_factor?: number;
          created_at?: string;
          id?: string;
          ingredient_group?: string;
          last_cost?: number;
          last_purchase_price?: number;
          min_stock?: number;
          name?: string;
          notes?: string | null;
          purchase_unit?: string;
          purchased_cost_total?: number;
          purchased_qty_total?: number;
          stock_qty?: number;
          supplier_id?: string | null;
          unit_category?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ingredients_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_items: {
        Row: {
          base_quantity: number;
          base_unit_price: number;
          conversion_factor: number;
          created_at: string;
          id: string;
          ingredient_id: string;
          invoice_id: string;
          quantity: number;
          total_price: number;
          unit: string;
          unit_price: number;
        };
        Insert: {
          base_quantity?: number;
          base_unit_price?: number;
          conversion_factor?: number;
          created_at?: string;
          id?: string;
          ingredient_id: string;
          invoice_id: string;
          quantity: number;
          total_price?: number;
          unit?: string;
          unit_price?: number;
        };
        Update: {
          base_quantity?: number;
          base_unit_price?: number;
          conversion_factor?: number;
          created_at?: string;
          id?: string;
          ingredient_id?: string;
          invoice_id?: string;
          quantity?: number;
          total_price?: number;
          unit?: string;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_items_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          created_at: string;
          created_by: string | null;
          due_date: string | null;
          id: string;
          image_paths: string[];
          invoice_date: string;
          invoice_number: string | null;
          notes: string | null;
          paid_amount: number;
          payment_date: string | null;
          payment_status: string;
          payment_type: string;
          supplier_id: string | null;
          total_amount: number;
          updated_at: string;
          vat_amount: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          due_date?: string | null;
          id?: string;
          image_paths?: string[];
          invoice_date?: string;
          invoice_number?: string | null;
          notes?: string | null;
          paid_amount?: number;
          payment_date?: string | null;
          payment_status?: string;
          payment_type?: string;
          supplier_id?: string | null;
          total_amount?: number;
          updated_at?: string;
          vat_amount?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          due_date?: string | null;
          id?: string;
          image_paths?: string[];
          invoice_date?: string;
          invoice_number?: string | null;
          notes?: string | null;
          paid_amount?: number;
          payment_date?: string | null;
          payment_status?: string;
          payment_type?: string;
          supplier_id?: string | null;
          total_amount?: number;
          updated_at?: string;
          vat_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_items: {
        Row: {
          category_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          is_available: boolean;
          is_featured: boolean;
          is_published: boolean;
          is_seasonal: boolean;
          name: string;
          price_options: Json;
          selling_price: number;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_available?: boolean;
          is_featured?: boolean;
          is_published?: boolean;
          is_seasonal?: boolean;
          name: string;
          price_options?: Json;
          selling_price?: number;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_available?: boolean;
          is_featured?: boolean;
          is_published?: boolean;
          is_seasonal?: boolean;
          name?: string;
          price_options?: Json;
          selling_price?: number;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_sales: {
        Row: {
          created_at: string;
          id: string;
          menu_item_id: string;
          month: number;
          quantity: number;
          updated_at: string;
          year: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          menu_item_id: string;
          month: number;
          quantity?: number;
          updated_at?: string;
          year: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          menu_item_id?: string;
          month?: number;
          quantity?: number;
          updated_at?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "monthly_sales_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      operating_expenses: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          created_by: string | null;
          expense_date: string;
          id: string;
          is_monthly: boolean;
          notes: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          amount?: number;
          category?: string;
          created_at?: string;
          created_by?: string | null;
          expense_date?: string;
          id?: string;
          is_monthly?: boolean;
          notes?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          created_by?: string | null;
          expense_date?: string;
          id?: string;
          is_monthly?: boolean;
          notes?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      public_site_settings: {
        Row: {
          about_body: string | null;
          about_title: string | null;
          accent_color: string | null;
          address: string | null;
          balad_url: string | null;
          cafe_name: string | null;
          cover_image_url: string | null;
          created_at: string;
          custom_links: Json;
          email: string | null;
          facebook_url: string | null;
          google_maps_url: string | null;
          home_summary: string | null;
          home_title: string | null;
          id: string;
          instagram_url: string | null;
          linkedin_url: string | null;
          logo_url: string | null;
          map_url: string | null;
          mobile: string | null;
          neshan_url: string | null;
          opening_hours: string | null;
          phone: string | null;
          primary_color: string | null;
          singleton: boolean;
          surface_color: string | null;
          telegram_url: string | null;
          updated_at: string;
          waze_url: string | null;
          whatsapp_url: string | null;
          x_url: string | null;
          youtube_url: string | null;
        };
        Insert: {
          about_body?: string | null;
          about_title?: string | null;
          accent_color?: string | null;
          address?: string | null;
          balad_url?: string | null;
          cafe_name?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          custom_links?: Json;
          email?: string | null;
          facebook_url?: string | null;
          google_maps_url?: string | null;
          home_summary?: string | null;
          home_title?: string | null;
          id?: string;
          instagram_url?: string | null;
          linkedin_url?: string | null;
          logo_url?: string | null;
          map_url?: string | null;
          mobile?: string | null;
          neshan_url?: string | null;
          opening_hours?: string | null;
          phone?: string | null;
          primary_color?: string | null;
          singleton?: boolean;
          surface_color?: string | null;
          telegram_url?: string | null;
          updated_at?: string;
          waze_url?: string | null;
          whatsapp_url?: string | null;
          x_url?: string | null;
          youtube_url?: string | null;
        };
        Update: {
          about_body?: string | null;
          about_title?: string | null;
          accent_color?: string | null;
          address?: string | null;
          balad_url?: string | null;
          cafe_name?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          custom_links?: Json;
          email?: string | null;
          facebook_url?: string | null;
          google_maps_url?: string | null;
          home_summary?: string | null;
          home_title?: string | null;
          id?: string;
          instagram_url?: string | null;
          linkedin_url?: string | null;
          logo_url?: string | null;
          map_url?: string | null;
          mobile?: string | null;
          neshan_url?: string | null;
          opening_hours?: string | null;
          phone?: string | null;
          primary_color?: string | null;
          singleton?: boolean;
          surface_color?: string | null;
          telegram_url?: string | null;
          updated_at?: string;
          waze_url?: string | null;
          whatsapp_url?: string | null;
          x_url?: string | null;
          youtube_url?: string | null;
        };
        Relationships: [];
      };
      recipe_items: {
        Row: {
          created_at: string;
          id: string;
          ingredient_id: string;
          menu_item_id: string;
          quantity: number;
          unit: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          ingredient_id: string;
          menu_item_id: string;
          quantity?: number;
          unit?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          ingredient_id?: string;
          menu_item_id?: string;
          quantity?: number;
          unit?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_items_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_items_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      suppliers: {
        Row: {
          address: string | null;
          contact_person: string | null;
          created_at: string;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          contact_person?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          contact_person?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      to_base_qty: { Args: { _qty: number; _unit: string }; Returns: number };
    };
    Enums: {
      app_role: "admin" | "staff";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
    },
  },
} as const;
