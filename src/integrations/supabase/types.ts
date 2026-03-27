export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      acknowledgement_forms: {
        Row: {
          buyer_ip: string | null
          buyer_signature_at: string | null
          created_at: string
          form_type: string
          id: string
          metadata: Json | null
          milestone_id: string | null
          pdf_url: string | null
          signed_by_buyer: boolean | null
          signed_by_vendor: boolean | null
          terms_text: string | null
          title: string
          transaction_id: string
          vendor_ip: string | null
          vendor_signature_at: string | null
        }
        Insert: {
          buyer_ip?: string | null
          buyer_signature_at?: string | null
          created_at?: string
          form_type: string
          id?: string
          metadata?: Json | null
          milestone_id?: string | null
          pdf_url?: string | null
          signed_by_buyer?: boolean | null
          signed_by_vendor?: boolean | null
          terms_text?: string | null
          title: string
          transaction_id: string
          vendor_ip?: string | null
          vendor_signature_at?: string | null
        }
        Update: {
          buyer_ip?: string | null
          buyer_signature_at?: string | null
          created_at?: string
          form_type?: string
          id?: string
          metadata?: Json | null
          milestone_id?: string | null
          pdf_url?: string | null
          signed_by_buyer?: boolean | null
          signed_by_vendor?: boolean | null
          terms_text?: string | null
          title?: string
          transaction_id?: string
          vendor_ip?: string | null
          vendor_signature_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acknowledgement_forms_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "transaction_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acknowledgement_forms_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_accounts: {
        Row: {
          created_at: string
          email: string | null
          failed_attempts: number
          id: string
          is_setup: boolean
          locked_at: string | null
          name: string
          password_hash: string | null
          temp_password_hash: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          failed_attempts?: number
          id?: string
          is_setup?: boolean
          locked_at?: string | null
          name: string
          password_hash?: string | null
          temp_password_hash: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string | null
          failed_attempts?: number
          id?: string
          is_setup?: boolean
          locked_at?: string | null
          name?: string
          password_hash?: string | null
          temp_password_hash?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          assistant_name: string | null
          created_at: string
          id: string
          query_count: number
          role: string | null
          tokens_used: number
          user_id: string
        }
        Insert: {
          assistant_name?: string | null
          created_at?: string
          id?: string
          query_count?: number
          role?: string | null
          tokens_used?: number
          user_id: string
        }
        Update: {
          assistant_name?: string | null
          created_at?: string
          id?: string
          query_count?: number
          role?: string | null
          tokens_used?: number
          user_id?: string
        }
        Relationships: []
      }
      archived_reports: {
        Row: {
          created_at: string
          file_size: string | null
          file_type: string | null
          file_url: string | null
          id: string
          name: string
          owner_id: string | null
          owner_role: string | null
        }
        Insert: {
          created_at?: string
          file_size?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          name: string
          owner_id?: string | null
          owner_role?: string | null
        }
        Update: {
          created_at?: string
          file_size?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          owner_role?: string | null
        }
        Relationships: []
      }
      audit_access_logs: {
        Row: {
          action: string | null
          created_at: string
          id: string
          ip_address: string | null
          page_viewed: string | null
          session_id: string
          user_agent: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          page_viewed?: string | null
          session_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          page_viewed?: string | null
          session_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_access_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "audit_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_sessions: {
        Row: {
          access_count: number
          access_log: Json
          access_token: string
          allowed_tables: string[]
          auditor_email: string | null
          auditor_name: string
          auditor_password_hash: string | null
          can_export: boolean
          created_at: string
          created_by: string
          expires_at: string
          id: string
          is_active: boolean
          last_accessed_at: string | null
          updated_at: string
        }
        Insert: {
          access_count?: number
          access_log?: Json
          access_token?: string
          allowed_tables?: string[]
          auditor_email?: string | null
          auditor_name: string
          auditor_password_hash?: string | null
          can_export?: boolean
          created_at?: string
          created_by?: string
          expires_at: string
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          updated_at?: string
        }
        Update: {
          access_count?: number
          access_log?: Json
          access_token?: string
          allowed_tables?: string[]
          auditor_email?: string | null
          auditor_name?: string
          auditor_password_hash?: string | null
          can_export?: boolean
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      compliance_flags: {
        Row: {
          created_at: string
          description: string | null
          flag_id: string
          id: string
          related_buyer_id: string | null
          related_vendor_id: string | null
          severity: string | null
          status: string | null
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          flag_id: string
          id?: string
          related_buyer_id?: string | null
          related_vendor_id?: string | null
          severity?: string | null
          status?: string | null
          type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          flag_id?: string
          id?: string
          related_buyer_id?: string | null
          related_vendor_id?: string | null
          severity?: string | null
          status?: string | null
          type?: string
        }
        Relationships: []
      }
      dispute_evidence: {
        Row: {
          created_at: string
          dispute_id: string
          file_name: string | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          dispute_id: string
          file_name?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          dispute_id?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_evidence_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          ai_confidence: number | null
          ai_recommendation: string | null
          amount: number | null
          arbitration_fee: number | null
          arbitration_ruling: string | null
          arbitrator_id: string | null
          buyer_id: string | null
          buyer_name: string | null
          created_at: string
          description: string | null
          dispute_id: string
          id: string
          priority: string | null
          reason: string | null
          resolution: string | null
          ruling_accepted_buyer: boolean | null
          ruling_accepted_vendor: boolean | null
          status: string
          transaction_id: string | null
          tx_id: string | null
          updated_at: string
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_recommendation?: string | null
          amount?: number | null
          arbitration_fee?: number | null
          arbitration_ruling?: string | null
          arbitrator_id?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          created_at?: string
          description?: string | null
          dispute_id: string
          id?: string
          priority?: string | null
          reason?: string | null
          resolution?: string | null
          ruling_accepted_buyer?: boolean | null
          ruling_accepted_vendor?: boolean | null
          status?: string
          transaction_id?: string | null
          tx_id?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_recommendation?: string | null
          amount?: number | null
          arbitration_fee?: number | null
          arbitration_ruling?: string | null
          arbitrator_id?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          created_at?: string
          description?: string | null
          dispute_id?: string
          id?: string
          priority?: string | null
          reason?: string | null
          resolution?: string | null
          ruling_accepted_buyer?: boolean | null
          ruling_accepted_vendor?: boolean | null
          status?: string
          transaction_id?: string | null
          tx_id?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_templates: {
        Row: {
          compliance_requirements: string[] | null
          created_at: string
          default_milestones: Json
          description: string | null
          display_name: string
          estimated_duration_days: number | null
          id: string
          industry_key: string
          is_active: boolean | null
          required_observer_roles: string[] | null
          tax_rules: Json | null
        }
        Insert: {
          compliance_requirements?: string[] | null
          created_at?: string
          default_milestones: Json
          description?: string | null
          display_name: string
          estimated_duration_days?: number | null
          id?: string
          industry_key: string
          is_active?: boolean | null
          required_observer_roles?: string[] | null
          tax_rules?: Json | null
        }
        Update: {
          compliance_requirements?: string[] | null
          created_at?: string
          default_milestones?: Json
          description?: string | null
          display_name?: string
          estimated_duration_days?: number | null
          id?: string
          industry_key?: string
          is_active?: boolean | null
          required_observer_roles?: string[] | null
          tax_rules?: Json | null
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          name: string
          reviewed_at: string | null
          status: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          name: string
          reviewed_at?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          name?: string
          reviewed_at?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      kyc_queue: {
        Row: {
          documents: string | null
          id: string
          kyc_id: string
          status: string | null
          submitted_at: string
          tier_change: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          documents?: string | null
          id?: string
          kyc_id: string
          status?: string | null
          submitted_at?: string
          tier_change?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          documents?: string | null
          id?: string
          kyc_id?: string
          status?: string | null
          submitted_at?: string
          tier_change?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_carbon_copies: {
        Row: {
          admin_activated: boolean | null
          amount: number | null
          buyer_id: string | null
          buyer_name: string | null
          checkout_details: Json | null
          confirmation_code: string | null
          created_at: string
          fee: number | null
          id: string
          item: string | null
          order_number: string | null
          status: string | null
          transaction_id: string | null
          updated_at: string
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          admin_activated?: boolean | null
          amount?: number | null
          buyer_id?: string | null
          buyer_name?: string | null
          checkout_details?: Json | null
          confirmation_code?: string | null
          created_at?: string
          fee?: number | null
          id?: string
          item?: string | null
          order_number?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          admin_activated?: boolean | null
          amount?: number | null
          buyer_id?: string | null
          buyer_name?: string | null
          checkout_details?: Json | null
          confirmation_code?: string | null
          created_at?: string
          fee?: number | null
          id?: string
          item?: string | null
          order_number?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_carbon_copies_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      os_payments: {
        Row: {
          action: string | null
          amount: number
          created_at: string
          fee: number | null
          id: string
          method: string | null
          refund_email: string | null
          refund_reason: string | null
          role: string | null
          service: string | null
          split_percentage: number | null
          split_recipient: string | null
          status: string | null
          total: number | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          amount: number
          created_at?: string
          fee?: number | null
          id?: string
          method?: string | null
          refund_email?: string | null
          refund_reason?: string | null
          role?: string | null
          service?: string | null
          split_percentage?: number | null
          split_recipient?: string | null
          status?: string | null
          total?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          amount?: number
          created_at?: string
          fee?: number | null
          id?: string
          method?: string | null
          refund_email?: string | null
          refund_reason?: string | null
          role?: string | null
          service?: string | null
          split_percentage?: number | null
          split_recipient?: string | null
          status?: string | null
          total?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      payout_field_configs: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          id: string
          is_active: boolean | null
          payout_method: string
          provider: string | null
          required_fields: Json
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          payout_method?: string
          provider?: string | null
          required_fields?: Json
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          payout_method?: string
          provider?: string | null
          required_fields?: Json
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount: number
          cancellation_reason: string | null
          completed_at: string | null
          confirmation_code: string | null
          created_at: string
          fee: number | null
          id: string
          mode: string | null
          net_amount: number | null
          order_number: string | null
          payment_category: string | null
          payment_provider: string | null
          payout_type: string | null
          provider_details: Json | null
          role: string | null
          seed_token: string | null
          status: string | null
          transaction_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          cancellation_reason?: string | null
          completed_at?: string | null
          confirmation_code?: string | null
          created_at?: string
          fee?: number | null
          id?: string
          mode?: string | null
          net_amount?: number | null
          order_number?: string | null
          payment_category?: string | null
          payment_provider?: string | null
          payout_type?: string | null
          provider_details?: Json | null
          role?: string | null
          seed_token?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          cancellation_reason?: string | null
          completed_at?: string | null
          confirmation_code?: string | null
          created_at?: string
          fee?: number | null
          id?: string
          mode?: string | null
          net_amount?: number | null
          order_number?: string | null
          payment_category?: string | null
          payment_provider?: string | null
          payout_type?: string | null
          provider_details?: Json | null
          role?: string | null
          seed_token?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          eta: string | null
          id: string
          method: string | null
          payout_id: string
          status: string
          transaction_id: string | null
          tx_id: string | null
          vendor_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          eta?: string | null
          id?: string
          method?: string | null
          payout_id: string
          status?: string
          transaction_id?: string | null
          tx_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          eta?: string | null
          id?: string
          method?: string | null
          payout_id?: string
          status?: string
          transaction_id?: string | null
          tx_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          location: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          location?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      protection_documents: {
        Row: {
          archived_at: string | null
          created_at: string
          document_type: string
          id: string
          industry: string | null
          is_archived: boolean | null
          metadata: Json | null
          retention_years: number | null
          role: string | null
          signed_by_buyer: string | null
          signed_by_vendor: string | null
          title: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          document_type: string
          id?: string
          industry?: string | null
          is_archived?: boolean | null
          metadata?: Json | null
          retention_years?: number | null
          role?: string | null
          signed_by_buyer?: string | null
          signed_by_vendor?: string | null
          title: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          document_type?: string
          id?: string
          industry?: string | null
          is_archived?: boolean | null
          metadata?: Json | null
          retention_years?: number | null
          role?: string | null
          signed_by_buyer?: string | null
          signed_by_vendor?: string | null
          title?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protection_documents_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions_screening_logs: {
        Row: {
          admin_notes: string | null
          country: string
          created_at: string
          full_name: string
          id: string
          matched_entries: Json | null
          result: string
          reviewed_by_admin: boolean | null
          risk_score: number | null
          screened_at: string | null
          screening_source: string | null
          transaction_id: string | null
          user_id: string
          user_role: string | null
        }
        Insert: {
          admin_notes?: string | null
          country: string
          created_at?: string
          full_name: string
          id?: string
          matched_entries?: Json | null
          result: string
          reviewed_by_admin?: boolean | null
          risk_score?: number | null
          screened_at?: string | null
          screening_source?: string | null
          transaction_id?: string | null
          user_id: string
          user_role?: string | null
        }
        Update: {
          admin_notes?: string | null
          country?: string
          created_at?: string
          full_name?: string
          id?: string
          matched_entries?: Json | null
          result?: string
          reviewed_by_admin?: boolean | null
          risk_score?: number | null
          screened_at?: string | null
          screening_source?: string | null
          transaction_id?: string | null
          user_id?: string
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_screening_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      seed_tokens: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          token: string
          updated_at: string
          user_id: string
          wallet_public_key: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          token: string
          updated_at?: string
          user_id: string
          wallet_public_key?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          token?: string
          updated_at?: string
          user_id?: string
          wallet_public_key?: string | null
        }
        Relationships: []
      }
      standalone_links: {
        Row: {
          created_at: string
          grand_total: number
          id: string
          industry: string | null
          invoice_items: Json
          link_id: string
          note: string | null
          status: string
          subtotal: number
          tax_items: Json
          tax_total: number
          title: string
          updated_at: string
          vendor_id: string
          vendor_name: string | null
        }
        Insert: {
          created_at?: string
          grand_total?: number
          id?: string
          industry?: string | null
          invoice_items?: Json
          link_id: string
          note?: string | null
          status?: string
          subtotal?: number
          tax_items?: Json
          tax_total?: number
          title: string
          updated_at?: string
          vendor_id: string
          vendor_name?: string | null
        }
        Update: {
          created_at?: string
          grand_total?: number
          id?: string
          industry?: string | null
          invoice_items?: Json
          link_id?: string
          note?: string | null
          status?: string
          subtotal?: number
          tax_items?: Json
          tax_total?: number
          title?: string
          updated_at?: string
          vendor_id?: string
          vendor_name?: string | null
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          id: string
          is_active: boolean | null
          rate_percentage: number
          tariff_rate_percentage: number | null
          tax_type: string
          trade_bloc: string | null
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          rate_percentage?: number
          tariff_rate_percentage?: number | null
          tax_type?: string
          trade_bloc?: string | null
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          rate_percentage?: number
          tariff_rate_percentage?: number | null
          tax_type?: string
          trade_bloc?: string | null
        }
        Relationships: []
      }
      transaction_milestones: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          id: string
          is_payment_milestone: boolean | null
          observer_id: string | null
          observer_signed: boolean | null
          observer_signed_at: string | null
          payment_amount: number | null
          payment_released: boolean | null
          position: number
          required_documents: string[] | null
          status: string | null
          title: string
          transaction_id: string
          updated_at: string
          uploaded_documents: Json | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_payment_milestone?: boolean | null
          observer_id?: string | null
          observer_signed?: boolean | null
          observer_signed_at?: string | null
          payment_amount?: number | null
          payment_released?: boolean | null
          position?: number
          required_documents?: string[] | null
          status?: string | null
          title: string
          transaction_id: string
          updated_at?: string
          uploaded_documents?: Json | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_payment_milestone?: boolean | null
          observer_id?: string | null
          observer_signed?: boolean | null
          observer_signed_at?: string | null
          payment_amount?: number | null
          payment_released?: boolean | null
          position?: number
          required_documents?: string[] | null
          status?: string | null
          title?: string
          transaction_id?: string
          updated_at?: string
          uploaded_documents?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_milestones_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_observers: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string | null
          id: string
          invite_accepted: boolean | null
          invited_by: string | null
          milestone_ids: string[] | null
          observer_email: string
          observer_name: string
          observer_role: string | null
          permissions: string[] | null
          transaction_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invite_accepted?: boolean | null
          invited_by?: string | null
          milestone_ids?: string[] | null
          observer_email: string
          observer_name: string
          observer_role?: string | null
          permissions?: string[] | null
          transaction_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invite_accepted?: boolean | null
          invited_by?: string | null
          milestone_ids?: string[] | null
          observer_email?: string
          observer_name?: string
          observer_role?: string | null
          permissions?: string[] | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_observers_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          auto_release_date: string | null
          buyer_id: string | null
          buyer_location: string | null
          buyer_name: string | null
          created_at: string
          delivered_date: string | null
          fee: number | null
          id: string
          industry: string | null
          item: string | null
          milestone_proposed_by: string | null
          milestone_status: string | null
          order_number: number | null
          released_date: string | null
          shipped_date: string | null
          status: string
          tax_breakdown: Json | null
          tracking: string | null
          tx_id: string
          type: string | null
          updated_at: string
          vendor_id: string | null
          vendor_location: string | null
          vendor_name: string | null
        }
        Insert: {
          amount?: number
          auto_release_date?: string | null
          buyer_id?: string | null
          buyer_location?: string | null
          buyer_name?: string | null
          created_at?: string
          delivered_date?: string | null
          fee?: number | null
          id?: string
          industry?: string | null
          item?: string | null
          milestone_proposed_by?: string | null
          milestone_status?: string | null
          order_number?: number | null
          released_date?: string | null
          shipped_date?: string | null
          status?: string
          tax_breakdown?: Json | null
          tracking?: string | null
          tx_id: string
          type?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_location?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          auto_release_date?: string | null
          buyer_id?: string | null
          buyer_location?: string | null
          buyer_name?: string | null
          created_at?: string
          delivered_date?: string | null
          fee?: number | null
          id?: string
          industry?: string | null
          item?: string | null
          milestone_proposed_by?: string | null
          milestone_status?: string | null
          order_number?: number | null
          released_date?: string | null
          shipped_date?: string | null
          status?: string
          tax_breakdown?: Json | null
          tracking?: string | null
          tx_id?: string
          type?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_location?: string | null
          vendor_name?: string | null
        }
        Relationships: []
      }
      user_onboarding_tasks: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          role: string
          task_key: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          role: string
          task_key: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          role?: string
          task_key?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_consent_records: {
        Row: {
          auto_accept_enabled: boolean | null
          browser_fingerprint: string | null
          consent_type: string
          created_at: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          plan_id: string | null
          revoked_at: string | null
          typed_name: string
          user_agent: string | null
          vendor_id: string
        }
        Insert: {
          auto_accept_enabled?: boolean | null
          browser_fingerprint?: string | null
          consent_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          plan_id?: string | null
          revoked_at?: string | null
          typed_name: string
          user_agent?: string | null
          vendor_id: string
        }
        Update: {
          auto_accept_enabled?: boolean | null
          browser_fingerprint?: string | null
          consent_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          plan_id?: string | null
          revoked_at?: string | null
          typed_name?: string
          user_agent?: string | null
          vendor_id?: string
        }
        Relationships: []
      }
      vendor_plans: {
        Row: {
          billing_cycle: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_trial: boolean | null
          plan_id: string
          started_at: string | null
          vendor_id: string | null
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_trial?: boolean | null
          plan_id?: string
          started_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_trial?: boolean | null
          plan_id?: string
          started_at?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      vendor_settings: {
        Row: {
          auto_delivery: boolean | null
          id: string
          notifications: Json | null
          pay_enabled: boolean | null
          payout_tier: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          auto_delivery?: boolean | null
          id?: string
          notifications?: Json | null
          pay_enabled?: boolean | null
          payout_tier?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          auto_delivery?: boolean | null
          id?: string
          notifications?: Json | null
          pay_enabled?: boolean | null
          payout_tier?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      vendor_sites: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          platform: string | null
          url: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          platform?: string | null
          url?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          platform?: string | null
          url?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      vendor_widget_fees: {
        Row: {
          created_at: string
          id: string
          install_fee_paid: boolean
          pending_restoration_fee: boolean
          total_install_fees_charged: number
          updated_at: string
          vendor_id: string
          widget_state: string
        }
        Insert: {
          created_at?: string
          id?: string
          install_fee_paid?: boolean
          pending_restoration_fee?: boolean
          total_install_fees_charged?: number
          updated_at?: string
          vendor_id: string
          widget_state?: string
        }
        Update: {
          created_at?: string
          id?: string
          install_fee_paid?: boolean
          pending_restoration_fee?: boolean
          total_install_fees_charged?: number
          updated_at?: string
          vendor_id?: string
          widget_state?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_password: { Args: { _password: string }; Returns: string }
      verify_admin_password: {
        Args: { _account_id: string; _password: string }
        Returns: boolean
      }
      verify_admin_temp_password: {
        Args: { _account_id: string; _password: string }
        Returns: boolean
      }
      verify_audit_password: {
        Args: { _password: string; _session_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "vendor" | "buyer"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "vendor", "buyer"],
    },
  },
} as const
