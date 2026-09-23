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
      audit_events: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          payload: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          payload?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      card_statements: {
        Row: {
          card_id: string
          created_at: string
          cycle_end: string | null
          cycle_start: string | null
          due_on: string | null
          id: string
          import_id: string
          status: Database["public"]["Enums"]["card_statement_status"]
          total_due: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          cycle_end?: string | null
          cycle_start?: string | null
          due_on?: string | null
          id?: string
          import_id: string
          status?: Database["public"]["Enums"]["card_statement_status"]
          total_due?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          cycle_end?: string | null
          cycle_start?: string | null
          due_on?: string | null
          id?: string
          import_id?: string
          status?: Database["public"]["Enums"]["card_statement_status"]
          total_due?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_statements_card_id_user_id_fkey"
            columns: ["card_id", "user_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "card_statements_import_id_user_id_fkey"
            columns: ["import_id", "user_id"]
            isOneToOne: false
            referencedRelation: "imports"
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
      classification_rule_applications: {
        Row: {
          applied_at: string
          field: string
          id: string
          merchant_id: string | null
          rule_id: string | null
          source: Database["public"]["Enums"]["decision_source"]
          transaction_id: string
          user_id: string
          value: Json
        }
        Insert: {
          applied_at?: string
          field: string
          id?: string
          merchant_id?: string | null
          rule_id?: string | null
          source: Database["public"]["Enums"]["decision_source"]
          transaction_id: string
          user_id: string
          value: Json
        }
        Update: {
          applied_at?: string
          field?: string
          id?: string
          merchant_id?: string | null
          rule_id?: string | null
          source?: Database["public"]["Enums"]["decision_source"]
          transaction_id?: string
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "classification_rule_applications_merchant_id_user_id_fkey"
            columns: ["merchant_id", "user_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "classification_rule_applications_rule_id_user_id_fkey"
            columns: ["rule_id", "user_id"]
            isOneToOne: false
            referencedRelation: "classification_rules"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "classification_rule_applications_transaction_id_user_id_fkey"
            columns: ["transaction_id", "user_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      classification_rules: {
        Row: {
          category_id: string | null
          created_at: string
          description_contains: string
          id: string
          is_active: boolean
          name: string
          nature: Database["public"]["Enums"]["economic_nature"] | null
          priority: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description_contains: string
          id?: string
          is_active?: boolean
          name: string
          nature?: Database["public"]["Enums"]["economic_nature"] | null
          priority?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description_contains?: string
          id?: string
          is_active?: boolean
          name?: string
          nature?: Database["public"]["Enums"]["economic_nature"] | null
          priority?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classification_rules_category_id_user_id_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
        ]
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
      installment_allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          installment_id: string
          owner_type: Database["public"]["Enums"]["owner_type"]
          person_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          installment_id: string
          owner_type: Database["public"]["Enums"]["owner_type"]
          person_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          installment_id?: string
          owner_type?: Database["public"]["Enums"]["owner_type"]
          person_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_allocations_installment_id_user_id_fkey"
            columns: ["installment_id", "user_id"]
            isOneToOne: false
            referencedRelation: "installments"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "installment_allocations_person_id_user_id_fkey"
            columns: ["person_id", "user_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      installment_groups: {
        Row: {
          card_id: string | null
          created_at: string
          currency: string
          description: string
          id: string
          original_amount: number | null
          purchase_date: string | null
          source_confidence: number
          source_group_key: string
          status: Database["public"]["Enums"]["installment_group_status"]
          total_installments: number
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id?: string | null
          created_at?: string
          currency?: string
          description: string
          id?: string
          original_amount?: number | null
          purchase_date?: string | null
          source_confidence?: number
          source_group_key: string
          status?: Database["public"]["Enums"]["installment_group_status"]
          total_installments: number
          updated_at?: string
          user_id: string
        }
        Update: {
          card_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          id?: string
          original_amount?: number | null
          purchase_date?: string | null
          source_confidence?: number
          source_group_key?: string
          status?: Database["public"]["Enums"]["installment_group_status"]
          total_installments?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_groups_card_id_user_id_fkey"
            columns: ["card_id", "user_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      installments: {
        Row: {
          amount: number
          competence_month: string
          created_at: string
          id: string
          installment_group_id: string
          installment_number: number
          status: Database["public"]["Enums"]["installment_status"]
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          competence_month: string
          created_at?: string
          id?: string
          installment_group_id: string
          installment_number: number
          status: Database["public"]["Enums"]["installment_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          competence_month?: string
          created_at?: string
          id?: string
          installment_group_id?: string
          installment_number?: number
          status?: Database["public"]["Enums"]["installment_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_installment_group_id_user_id_fkey"
            columns: ["installment_group_id", "user_id"]
            isOneToOne: false
            referencedRelation: "installment_groups"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "installments_transaction_id_user_id_fkey"
            columns: ["transaction_id", "user_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "user_id"]
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
      merchant_aliases: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          normalized_alias: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          normalized_alias: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          normalized_alias?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_aliases_merchant_id_user_id_fkey"
            columns: ["merchant_id", "user_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      merchants: {
        Row: {
          canonical_name: string
          created_at: string
          default_category_id: string | null
          default_nature: Database["public"]["Enums"]["economic_nature"] | null
          id: string
          is_confirmed: boolean
          normalized_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          canonical_name: string
          created_at?: string
          default_category_id?: string | null
          default_nature?: Database["public"]["Enums"]["economic_nature"] | null
          id?: string
          is_confirmed?: boolean
          normalized_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          canonical_name?: string
          created_at?: string
          default_category_id?: string | null
          default_nature?: Database["public"]["Enums"]["economic_nature"] | null
          id?: string
          is_confirmed?: boolean
          normalized_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchants_default_category_id_user_id_fkey"
            columns: ["default_category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      monthly_closing_versions: {
        Row: {
          created_at: string
          id: string
          metrics: Json
          monthly_closing_id: string
          quality_check: Json
          status: Database["public"]["Enums"]["monthly_closing_status"]
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          metrics: Json
          monthly_closing_id: string
          quality_check: Json
          status: Database["public"]["Enums"]["monthly_closing_status"]
          user_id: string
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          metrics?: Json
          monthly_closing_id?: string
          quality_check?: Json
          status?: Database["public"]["Enums"]["monthly_closing_status"]
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_closing_versions_monthly_closing_id_user_id_fkey"
            columns: ["monthly_closing_id", "user_id"]
            isOneToOne: false
            referencedRelation: "monthly_closings"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      monthly_closings: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          month: string
          reopened_at: string | null
          status: Database["public"]["Enums"]["monthly_closing_status"]
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          month: string
          reopened_at?: string | null
          status?: Database["public"]["Enums"]["monthly_closing_status"]
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          month?: string
          reopened_at?: string | null
          status?: Database["public"]["Enums"]["monthly_closing_status"]
          updated_at?: string
          user_id?: string
          version?: number
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
      person_aliases: {
        Row: {
          created_at: string
          id: string
          normalized_alias: string
          person_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          normalized_alias: string
          person_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          normalized_alias?: string
          person_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_aliases_person_id_user_id_fkey"
            columns: ["person_id", "user_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "user_id"]
          },
        ]
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
      review_items: {
        Row: {
          created_at: string
          detail: Json
          id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["review_item_status"]
          transaction_id: string
          type: Database["public"]["Enums"]["review_item_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["review_item_status"]
          transaction_id: string
          type: Database["public"]["Enums"]["review_item_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["review_item_status"]
          transaction_id?: string
          type?: Database["public"]["Enums"]["review_item_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_items_transaction_id_user_id_fkey"
            columns: ["transaction_id", "user_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      settlement_allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          settlement_id: string
          third_party_entry_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          settlement_id: string
          third_party_entry_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          settlement_id?: string
          third_party_entry_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_allocations_settlement_id_user_id_fkey"
            columns: ["settlement_id", "user_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "settlement_allocations_third_party_entry_id_user_id_fkey"
            columns: ["third_party_entry_id", "user_id"]
            isOneToOne: false
            referencedRelation: "third_party_entries"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          occurred_on: string
          person_id: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          occurred_on?: string
          person_id: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          occurred_on?: string
          person_id?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_person_id_user_id_fkey"
            columns: ["person_id", "user_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "settlements_transaction_id_user_id_fkey"
            columns: ["transaction_id", "user_id"]
            isOneToOne: false
            referencedRelation: "transactions"
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
      third_party_entries: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["third_party_entry_kind"]
          note: string | null
          occurred_on: string
          person_id: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["third_party_entry_kind"]
          note?: string | null
          occurred_on?: string
          person_id: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["third_party_entry_kind"]
          note?: string | null
          occurred_on?: string
          person_id?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "third_party_entries_person_id_user_id_fkey"
            columns: ["person_id", "user_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "third_party_entries_transaction_id_user_id_fkey"
            columns: ["transaction_id", "user_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      transaction_links: {
        Row: {
          amount: number
          confirmed_by_user: boolean
          created_at: string
          from_transaction_id: string
          id: string
          link_type: Database["public"]["Enums"]["link_type"]
          status: Database["public"]["Enums"]["review_status"]
          to_transaction_id: string
          user_id: string
        }
        Insert: {
          amount: number
          confirmed_by_user?: boolean
          created_at?: string
          from_transaction_id: string
          id?: string
          link_type: Database["public"]["Enums"]["link_type"]
          status?: Database["public"]["Enums"]["review_status"]
          to_transaction_id: string
          user_id: string
        }
        Update: {
          amount?: number
          confirmed_by_user?: boolean
          created_at?: string
          from_transaction_id?: string
          id?: string
          link_type?: Database["public"]["Enums"]["link_type"]
          status?: Database["public"]["Enums"]["review_status"]
          to_transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_links_from_transaction_id_user_id_fkey"
            columns: ["from_transaction_id", "user_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "transaction_links_to_transaction_id_user_id_fkey"
            columns: ["to_transaction_id", "user_id"]
            isOneToOne: false
            referencedRelation: "transactions"
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
      assert_installment_allocation_total: {
        Args: { target_installment_id: string; target_user_id: string }
        Returns: undefined
      }
      assert_settlement_allocation_total: {
        Args: { target_settlement_id: string; target_user_id: string }
        Returns: undefined
      }
      assert_transaction_allocation_total: {
        Args: { target_transaction_id: string; target_user_id: string }
        Returns: undefined
      }
      close_month: {
        Args: { p_confirm_pending?: boolean; target_month: string }
        Returns: string
      }
      create_confirmed_transaction_link: {
        Args: {
          p_amount: number
          p_from_transaction_id: string
          p_link_type: Database["public"]["Enums"]["link_type"]
          p_to_transaction_id: string
        }
        Returns: string
      }
      import_card_statement: {
        Args: {
          p_card_last_fours?: Json
          p_cycle_end?: string
          p_cycle_start?: string
          p_due_on?: string
          p_filename: string
          p_institution_code: string
          p_mime_type: string
          p_parser_name: string
          p_parser_version: string
          p_rows?: Json
          p_sha256: string
          p_size_bytes: number
          p_storage_path: string
        }
        Returns: string
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
      import_nubank_statement_pdf: {
        Args: {
          p_filename: string
          p_rows: Json
          p_sha256: string
          p_size_bytes: number
          p_storage_path: string
        }
        Returns: string
      }
      month_category_metrics: {
        Args: { target_month: string }
        Returns: {
          category_name: string
          personal_expenses: number
        }[]
      }
      month_closing_quality: { Args: { target_month: string }; Returns: Json }
      month_metrics: {
        Args: { target_month: string }
        Returns: {
          income: number
          personal_expenses: number
        }[]
      }
      month_quality_check: {
        Args: { target_month: string; target_user_id: string }
        Returns: Json
      }
      monthly_metrics_history: {
        Args: never
        Returns: {
          competence_month: string
          income: number
          personal_expenses: number
        }[]
      }
      reopen_month: { Args: { target_month: string }; Returns: undefined }
      reprocess_transaction_classification: {
        Args: { p_transaction_id: string }
        Returns: undefined
      }
      seed_default_categories: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      set_transaction_nature_manual: {
        Args: {
          p_nature: Database["public"]["Enums"]["economic_nature"]
          p_transaction_id: string
        }
        Returns: undefined
      }
      set_transaction_ownership: {
        Args: { p_allocations: Json; p_mode: string; p_transaction_id: string }
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
      card_statement_status: "processing" | "processed" | "partial" | "failed"
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
      installment_group_status: "active" | "completed" | "cancelled"
      installment_status: "scheduled" | "realized" | "void"
      link_type:
        | "reversal_of"
        | "pays_statement"
        | "own_transfer_pair"
        | "settles_third_party"
        | "duplicate_of"
        | "related"
      monthly_closing_status: "in_progress" | "closed_with_pending" | "closed"
      owner_type: "self" | "third_party"
      parse_status: "pending" | "parsed" | "ignored" | "failed"
      review_item_status: "open" | "resolved" | "dismissed"
      review_item_type:
        | "category"
        | "ownership"
        | "nature"
        | "competence"
        | "reconciliation"
        | "possible_duplicate"
      review_status: "pending" | "suggested" | "confirmed" | "not_required"
      source_kind: "bank_statement" | "card_statement" | "other"
      third_party_entry_kind:
        | "charge"
        | "reimbursement"
        | "settlement"
        | "adjustment"
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
      card_statement_status: ["processing", "processed", "partial", "failed"],
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
      installment_group_status: ["active", "completed", "cancelled"],
      installment_status: ["scheduled", "realized", "void"],
      link_type: [
        "reversal_of",
        "pays_statement",
        "own_transfer_pair",
        "settles_third_party",
        "duplicate_of",
        "related",
      ],
      monthly_closing_status: ["in_progress", "closed_with_pending", "closed"],
      owner_type: ["self", "third_party"],
      parse_status: ["pending", "parsed", "ignored", "failed"],
      review_item_status: ["open", "resolved", "dismissed"],
      review_item_type: [
        "category",
        "ownership",
        "nature",
        "competence",
        "reconciliation",
        "possible_duplicate",
      ],
      review_status: ["pending", "suggested", "confirmed", "not_required"],
      source_kind: ["bank_statement", "card_statement", "other"],
      third_party_entry_kind: [
        "charge",
        "reimbursement",
        "settlement",
        "adjustment",
      ],
      transaction_direction: ["inflow", "outflow", "neutral"],
    },
  },
} as const

