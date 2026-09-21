export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          currency: string
          external_ref: string | null
          id: string
          institution_id: string
          is_active: boolean
          is_own: boolean
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          external_ref?: string | null
          id?: string
          institution_id: string
          is_active?: boolean
          is_own?: boolean
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          external_ref?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean
          is_own?: boolean
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          owner_type: Database["public"]["Enums"]["owner_type"]
          percentage: number | null
          person_id: string | null
          source: Database["public"]["Enums"]["decision_source"]
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          owner_type: Database["public"]["Enums"]["owner_type"]
          percentage?: number | null
          person_id?: string | null
          source?: Database["public"]["Enums"]["decision_source"]
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          owner_type?: Database["public"]["Enums"]["owner_type"]
          percentage?: number | null
          person_id?: string | null
          source?: Database["public"]["Enums"]["decision_source"]
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "allocations_person_id_user_id_fkey"
            columns: ["person_id", "user_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "allocations_transaction_id_user_id_fkey"
            columns: ["transaction_id", "user_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      cards: {
        Row: {
          billing_account_id: string | null
          closing_day: number | null
          created_at: string
          due_day: number | null
          holder_name: string | null
          id: string
          institution_id: string
          is_active: boolean
          last_four: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_account_id?: string | null
          closing_day?: number | null
          created_at?: string
          due_day?: number | null
          holder_name?: string | null
          id?: string
          institution_id: string
          is_active?: boolean
          last_four?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_account_id?: string | null
          closing_day?: number | null
          created_at?: string
          due_day?: number | null
          holder_name?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean
          last_four?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_billing_account_id_user_id_fkey"
            columns: ["billing_account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "cards_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          is_system_seed: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_system_seed?: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_system_seed?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      imports: {
        Row: {
          account_id: string | null
          card_id: string | null
          created_at: string
          detected_institution_id: string | null
          error_count: number
          error_summary: Json | null
          format: Database["public"]["Enums"]["file_format"]
          id: string
          mime_type: string
          original_filename: string
          parser_name: string
          parser_version: string
          period_end: string | null
          period_start: string | null
          row_count: number
          sha256: string
          size_bytes: number
          source_kind: Database["public"]["Enums"]["source_kind"]
          status: Database["public"]["Enums"]["import_status"]
          storage_path: string | null
          success_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          card_id?: string | null
          created_at?: string
          detected_institution_id?: string | null
          error_count?: number
          error_summary?: Json | null
          format: Database["public"]["Enums"]["file_format"]
          id?: string
          mime_type: string
          original_filename: string
          parser_name: string
          parser_version: string
          period_end?: string | null
          period_start?: string | null
          row_count?: number
          sha256: string
          size_bytes: number
          source_kind: Database["public"]["Enums"]["source_kind"]
          status?: Database["public"]["Enums"]["import_status"]
          storage_path?: string | null
          success_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          card_id?: string | null
          created_at?: string
          detected_institution_id?: string | null
          error_count?: number
          error_summary?: Json | null
          format?: Database["public"]["Enums"]["file_format"]
          id?: string
          mime_type?: string
          original_filename?: string
          parser_name?: string
          parser_version?: string
          period_end?: string | null
          period_start?: string | null
          row_count?: number
          sha256?: string
          size_bytes?: number
          source_kind?: Database["public"]["Enums"]["source_kind"]
          status?: Database["public"]["Enums"]["import_status"]
          storage_path?: string | null
          success_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imports_account_id_user_id_fkey"
            columns: ["account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "imports_card_id_user_id_fkey"
            columns: ["card_id", "user_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "imports_detected_institution_id_fkey"
            columns: ["detected_institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          code: string
          country: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          notes: string | null
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          currency: string
          display_name: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          display_name?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          display_name?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      raw_records: {
        Row: {
          created_at: string
          external_id: string | null
          id: string
          import_id: string
          parse_errors: Json | null
          parse_status: Database["public"]["Enums"]["parse_status"]
          raw_payload: Json
          raw_text: string | null
          record_hash: string
          source_row_number: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          id?: string
          import_id: string
          parse_errors?: Json | null
          parse_status?: Database["public"]["Enums"]["parse_status"]
          raw_payload: Json
          raw_text?: string | null
          record_hash: string
          source_row_number?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          id?: string
          import_id?: string
          parse_errors?: Json | null
          parse_status?: Database["public"]["Enums"]["parse_status"]
          raw_payload?: Json
          raw_text?: string | null
          record_hash?: string
          source_row_number?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_records_import_id_user_id_fkey"
            columns: ["import_id", "user_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_user_id_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          card_id: string | null
          category_confidence: number | null
          category_id: string | null
          category_source: Database["public"]["Enums"]["decision_source"]
          competence_month: string
          created_at: string
          currency: string
          dedupe_key: string
          description_normalized: string
          description_raw: string
          direction: Database["public"]["Enums"]["transaction_direction"]
          external_id: string | null
          id: string
          import_id: string
          is_void: boolean
          manual_locks: Json
          nature: Database["public"]["Enums"]["economic_nature"]
          nature_confidence: number | null
          nature_source: Database["public"]["Enums"]["decision_source"]
          occurred_on: string | null
          ownership_confidence: number | null
          ownership_source: Database["public"]["Enums"]["decision_source"]
          posted_on: string | null
          raw_record_id: string | null
          review_status: Database["public"]["Enums"]["review_status"]
          subcategory_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          card_id?: string | null
          category_confidence?: number | null
          category_id?: string | null
          category_source?: Database["public"]["Enums"]["decision_source"]
          competence_month: string
          created_at?: string
          currency?: string
          dedupe_key: string
          description_normalized: string
          description_raw: string
          direction: Database["public"]["Enums"]["transaction_direction"]
          external_id?: string | null
          id?: string
          import_id: string
          is_void?: boolean
          manual_locks?: Json
          nature?: Database["public"]["Enums"]["economic_nature"]
          nature_confidence?: number | null
          nature_source?: Database["public"]["Enums"]["decision_source"]
          occurred_on?: string | null
          ownership_confidence?: number | null
          ownership_source?: Database["public"]["Enums"]["decision_source"]
          posted_on?: string | null
          raw_record_id?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          subcategory_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          card_id?: string | null
          category_confidence?: number | null
          category_id?: string | null
          category_source?: Database["public"]["Enums"]["decision_source"]
          competence_month?: string
          created_at?: string
          currency?: string
          dedupe_key?: string
          description_normalized?: string
          description_raw?: string
          direction?: Database["public"]["Enums"]["transaction_direction"]
          external_id?: string | null
          id?: string
          import_id?: string
          is_void?: boolean
          manual_locks?: Json
          nature?: Database["public"]["Enums"]["economic_nature"]
          nature_confidence?: number | null
          nature_source?: Database["public"]["Enums"]["decision_source"]
          occurred_on?: string | null
          ownership_confidence?: number | null
          ownership_source?: Database["public"]["Enums"]["decision_source"]
          posted_on?: string | null
          raw_record_id?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          subcategory_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_user_id_fkey"
            columns: ["account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "transactions_card_id_user_id_fkey"
            columns: ["card_id", "user_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "transactions_category_id_user_id_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "transactions_import_id_user_id_fkey"
            columns: ["import_id", "user_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "transactions_raw_record_id_user_id_fkey"
            columns: ["raw_record_id", "user_id"]
            isOneToOne: false
            referencedRelation: "raw_records"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "transactions_subcategory_id_user_id_fkey"
            columns: ["subcategory_id", "user_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assert_transaction_allocation_total: {
        Args: { target_transaction_id: string; target_user_id: string }
        Returns: undefined
      }
      import_nubank_statement_csv: {
        Args: {
          p_filename: string
          p_rows: Json
          p_sha256: string
          p_size_bytes: number
          p_storage_path: string
        }
        Returns: string
      }
      seed_default_categories: {
        Args: { target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      account_type:
        | "checking"
        | "savings"
        | "payment"
        | "cash"
        | "investment"
        | "other"
      category_kind: "expense" | "income"
      decision_source:
        | "manual"
        | "user_rule"
        | "merchant_mapping"
        | "global_rule"
        | "parser"
        | "heuristic"
        | "ai_suggestion"
        | "unknown"
      economic_nature:
        | "income"
        | "expense"
        | "own_transfer"
        | "card_payment"
        | "investment"
        | "redemption"
        | "refund"
        | "third_party"
        | "loan_given"
        | "loan_received"
        | "loan_repayment"
        | "reversal"
        | "investment_income"
        | "adjustment"
        | "unclassified"
      file_format: "csv" | "pdf"
      import_status:
        | "uploaded"
        | "identified"
        | "processing"
        | "processed"
        | "partial"
        | "failed"
        | "duplicate"
      owner_type: "self" | "third_party"
      parse_status: "pending" | "parsed" | "ignored" | "failed"
      review_status: "pending" | "suggested" | "confirmed" | "not_required"
      source_kind: "bank_statement" | "card_statement" | "other"
      transaction_direction: "inflow" | "outflow" | "neutral"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: [
        "checking",
        "savings",
        "payment",
        "cash",
        "investment",
        "other",
      ],
      category_kind: ["expense", "income"],
      decision_source: [
        "manual",
        "user_rule",
        "merchant_mapping",
        "global_rule",
        "parser",
        "heuristic",
        "ai_suggestion",
        "unknown",
      ],
      economic_nature: [
        "income",
        "expense",
        "own_transfer",
        "card_payment",
        "investment",
        "redemption",
        "refund",
        "third_party",
        "loan_given",
        "loan_received",
        "loan_repayment",
        "reversal",
        "investment_income",
        "adjustment",
        "unclassified",
      ],
      file_format: ["csv", "pdf"],
      import_status: [
        "uploaded",
        "identified",
        "processing",
        "processed",
        "partial",
        "failed",
        "duplicate",
      ],
      owner_type: ["self", "third_party"],
      parse_status: ["pending", "parsed", "ignored", "failed"],
      review_status: ["pending", "suggested", "confirmed", "not_required"],
      source_kind: ["bank_statement", "card_statement", "other"],
      transaction_direction: ["inflow", "outflow", "neutral"],
    },
  },
} as const

