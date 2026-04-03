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
      blockchain_proofs: {
        Row: {
          anchored_at: string | null
          chain_status: string
          content_hash: string
          created_at: string
          event_data: Json
          id: string
          polygon_tx_hash: string | null
          prev_hash: string
          record_type: string
          transaction_id: string | null
          tx_ref: string
        }
        Insert: {
          anchored_at?: string | null
          chain_status?: string
          content_hash: string
          created_at?: string
          event_data?: Json
          id?: string
          polygon_tx_hash?: string | null
          prev_hash?: string
          record_type: string
          transaction_id?: string | null
          tx_ref: string
        }
        Update: {
          anchored_at?: string | null
          chain_status?: string
          content_hash?: string
          created_at?: string
          event_data?: Json
          id?: string
          polygon_tx_hash?: string | null
          prev_hash?: string
          record_type?: string
          transaction_id?: string | null
          tx_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "blockchain_proofs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
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
      crypto_support_queue: {
        Row: {
          admin_notes: string | null
          amount_sent: number | null
          created_at: string
          id: string
          network: string | null
          resolved_at: string | null
          resolved_by: string | null
          sender_email: string
          sender_name: string
          sender_wallet: string | null
          source: string | null
          status: string
          token: string | null
          tx_id: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount_sent?: number | null
          created_at?: string
          id?: string
          network?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sender_email: string
          sender_name: string
          sender_wallet?: string | null
          source?: string | null
          status?: string
          token?: string | null
          tx_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount_sent?: number | null
          created_at?: string
          id?: string
          network?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sender_email?: string
          sender_name?: string
          sender_wallet?: string | null
          source?: string | null
          status?: string
          token?: string | null
          tx_id?: string | null
          updated_at?: string
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
      document_access: {
        Row: {
          created_at: string
          document_key: string
          expires_at: string
          id: string
          os_payment_id: string | null
          price: number
          purchased_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_key: string
          expires_at?: string
          id?: string
          os_payment_id?: string | null
          price?: number
          purchased_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_key?: string
          expires_at?: string
          id?: string
          os_payment_id?: string | null
          price?: number
          purchased_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emmanuel_conversations: {
        Row: {
          admin_user_id: string
          case_ref: string | null
          created_at: string
          id: string
          is_archived: boolean
          messages: Json
          title: string | null
          updated_at: string
        }
        Insert: {
          admin_user_id?: string
          case_ref?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          messages?: Json
          title?: string | null
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          case_ref?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          messages?: Json
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      emmanuel_tool_usage: {
        Row: {
          conversation_id: string | null
          created_at: string
          execution_ms: number | null
          id: string
          parameters: Json | null
          result_summary: string | null
          tool_name: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          execution_ms?: number | null
          id?: string
          parameters?: Json | null
          result_summary?: string | null
          tool_name: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          execution_ms?: number | null
          id?: string
          parameters?: Json | null
          result_summary?: string | null
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "emmanuel_tool_usage_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "emmanuel_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      gas_reserve_ledger: {
        Row: {
          converted_at: string | null
          created_at: string
          id: string
          matic_price_usd: number
          order_amount: number
          reserve_matic: number
          reserve_rate: number
          reserve_usd: number
          status: string
          transaction_id: string | null
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          id?: string
          matic_price_usd?: number
          order_amount?: number
          reserve_matic?: number
          reserve_rate?: number
          reserve_usd?: number
          status?: string
          transaction_id?: string | null
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          id?: string
          matic_price_usd?: number
          order_amount?: number
          reserve_matic?: number
          reserve_rate?: number
          reserve_usd?: number
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gas_reserve_ledger_transaction_id_fkey"
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
          document_gates: Json | null
          estimated_duration_days: number | null
          id: string
          industry_key: string
          invoice_schema: Json | null
          is_active: boolean | null
          required_observer_roles: string[] | null
          rfq_enabled: boolean | null
          tax_rules: Json | null
        }
        Insert: {
          compliance_requirements?: string[] | null
          created_at?: string
          default_milestones: Json
          description?: string | null
          display_name: string
          document_gates?: Json | null
          estimated_duration_days?: number | null
          id?: string
          industry_key: string
          invoice_schema?: Json | null
          is_active?: boolean | null
          required_observer_roles?: string[] | null
          rfq_enabled?: boolean | null
          tax_rules?: Json | null
        }
        Update: {
          compliance_requirements?: string[] | null
          created_at?: string
          default_milestones?: Json
          description?: string | null
          display_name?: string
          document_gates?: Json | null
          estimated_duration_days?: number | null
          id?: string
          industry_key?: string
          invoice_schema?: Json | null
          is_active?: boolean | null
          required_observer_roles?: string[] | null
          rfq_enabled?: boolean | null
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
      message_threads: {
        Row: {
          category: string
          created_at: string
          id: string
          last_message_at: string | null
          participant_1: string
          participant_2: string
          status: string
          subject: string | null
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_2: string
          status?: string
          subject?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
          status?: string
          subject?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          body: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
          thread_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
          thread_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_negotiations: {
        Row: {
          agreed_at: string | null
          change_notes: string | null
          created_at: string
          drafted_by: string
          id: string
          milestones: Json
          proposed_at: string | null
          status: string
          transaction_id: string
          updated_at: string
          version: number
        }
        Insert: {
          agreed_at?: string | null
          change_notes?: string | null
          created_at?: string
          drafted_by: string
          id?: string
          milestones?: Json
          proposed_at?: string | null
          status?: string
          transaction_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          agreed_at?: string | null
          change_notes?: string | null
          created_at?: string
          drafted_by?: string
          id?: string
          milestones?: Json
          proposed_at?: string | null
          status?: string
          transaction_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "milestone_negotiations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_completed_at: string | null
          action_url: string | null
          created_at: string
          id: string
          is_action_required: boolean
          is_read: boolean
          message: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_completed_at?: string | null
          action_url?: string | null
          created_at?: string
          id?: string
          is_action_required?: boolean
          is_read?: boolean
          message?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_completed_at?: string | null
          action_url?: string | null
          created_at?: string
          id?: string
          is_action_required?: boolean
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
          login_link: string | null
          order_number: string | null
          signup_link: string | null
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
          login_link?: string | null
          order_number?: string | null
          signup_link?: string | null
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
          login_link?: string | null
          order_number?: string | null
          signup_link?: string | null
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
          escrow_fee_deducted: number
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
          trickle_amount: number
          trickle_rule: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          cancellation_reason?: string | null
          completed_at?: string | null
          confirmation_code?: string | null
          created_at?: string
          escrow_fee_deducted?: number
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
          trickle_amount?: number
          trickle_rule?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          cancellation_reason?: string | null
          completed_at?: string | null
          confirmation_code?: string | null
          created_at?: string
          escrow_fee_deducted?: number
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
          trickle_amount?: number
          trickle_rule?: string
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
      pre_order_contracts: {
        Row: {
          buyer_id: string | null
          buyer_ip: string | null
          buyer_signed_at: string | null
          buyer_typed_name: string | null
          buyer_user_agent: string | null
          contract_terms_version: string | null
          created_at: string
          id: string
          industry: string | null
          industry_addendum: string | null
          is_vendor_auto_signed: boolean | null
          milestone_count: number | null
          order_amount: number | null
          order_number: string | null
          status: string | null
          transaction_id: string | null
          vendor_id: string | null
          vendor_ip: string | null
          vendor_signed_at: string | null
          vendor_typed_name: string | null
          vendor_user_agent: string | null
        }
        Insert: {
          buyer_id?: string | null
          buyer_ip?: string | null
          buyer_signed_at?: string | null
          buyer_typed_name?: string | null
          buyer_user_agent?: string | null
          contract_terms_version?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          industry_addendum?: string | null
          is_vendor_auto_signed?: boolean | null
          milestone_count?: number | null
          order_amount?: number | null
          order_number?: string | null
          status?: string | null
          transaction_id?: string | null
          vendor_id?: string | null
          vendor_ip?: string | null
          vendor_signed_at?: string | null
          vendor_typed_name?: string | null
          vendor_user_agent?: string | null
        }
        Update: {
          buyer_id?: string | null
          buyer_ip?: string | null
          buyer_signed_at?: string | null
          buyer_typed_name?: string | null
          buyer_user_agent?: string | null
          contract_terms_version?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          industry_addendum?: string | null
          is_vendor_auto_signed?: boolean | null
          milestone_count?: number | null
          order_amount?: number | null
          order_number?: string | null
          status?: string | null
          transaction_id?: string | null
          vendor_id?: string | null
          vendor_ip?: string | null
          vendor_signed_at?: string | null
          vendor_typed_name?: string | null
          vendor_user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pre_order_contracts_transaction_id_fkey"
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
          corridor: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          location: string | null
          notification_channels: Json | null
          onboarding_industry: string | null
          phone: string | null
          phone_country_code: string | null
          preferred_currency: string | null
          preferred_language: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          corridor?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          location?: string | null
          notification_channels?: Json | null
          onboarding_industry?: string | null
          phone?: string | null
          phone_country_code?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          corridor?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          location?: string | null
          notification_channels?: Json | null
          onboarding_industry?: string | null
          phone?: string | null
          phone_country_code?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      proforma_invoices: {
        Row: {
          accepted_at: string | null
          buyer_id: string | null
          commodity_quantity: number | null
          commodity_unit: string | null
          created_at: string
          currency: string | null
          delivery_terms: string | null
          document_gates: Json | null
          gate_status: Json | null
          grand_total: number | null
          id: string
          incoterms: string | null
          industry: string | null
          insurance_details: Json | null
          insurance_required: boolean | null
          line_items: Json
          locked_price: number | null
          notes: string | null
          payment_terms: string | null
          proforma_number: string
          rejected_at: string | null
          rfq_id: string | null
          shipping_method: string | null
          status: string
          subtotal: number | null
          tax_items: Json | null
          tax_total: number | null
          transaction_id: string | null
          updated_at: string
          validity_days: number | null
          vendor_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          buyer_id?: string | null
          commodity_quantity?: number | null
          commodity_unit?: string | null
          created_at?: string
          currency?: string | null
          delivery_terms?: string | null
          document_gates?: Json | null
          gate_status?: Json | null
          grand_total?: number | null
          id?: string
          incoterms?: string | null
          industry?: string | null
          insurance_details?: Json | null
          insurance_required?: boolean | null
          line_items?: Json
          locked_price?: number | null
          notes?: string | null
          payment_terms?: string | null
          proforma_number: string
          rejected_at?: string | null
          rfq_id?: string | null
          shipping_method?: string | null
          status?: string
          subtotal?: number | null
          tax_items?: Json | null
          tax_total?: number | null
          transaction_id?: string | null
          updated_at?: string
          validity_days?: number | null
          vendor_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          buyer_id?: string | null
          commodity_quantity?: number | null
          commodity_unit?: string | null
          created_at?: string
          currency?: string | null
          delivery_terms?: string | null
          document_gates?: Json | null
          gate_status?: Json | null
          grand_total?: number | null
          id?: string
          incoterms?: string | null
          industry?: string | null
          insurance_details?: Json | null
          insurance_required?: boolean | null
          line_items?: Json
          locked_price?: number | null
          notes?: string | null
          payment_terms?: string | null
          proforma_number?: string
          rejected_at?: string | null
          rfq_id?: string | null
          shipping_method?: string | null
          status?: string
          subtotal?: number | null
          tax_items?: Json | null
          tax_total?: number | null
          transaction_id?: string | null
          updated_at?: string
          validity_days?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proforma_invoices_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfq_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proforma_invoices_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
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
      recurring_orders: {
        Row: {
          auto_renew: boolean | null
          base_amount: number | null
          buyer_id: string | null
          commodity_quantity: number | null
          commodity_unit: string | null
          created_at: string
          currency: string | null
          frequency: string | null
          id: string
          industry: string | null
          last_executed_at: string | null
          next_due_at: string | null
          status: string | null
          template_milestones: Json | null
          title: string
          total_executions: number | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          base_amount?: number | null
          buyer_id?: string | null
          commodity_quantity?: number | null
          commodity_unit?: string | null
          created_at?: string
          currency?: string | null
          frequency?: string | null
          id?: string
          industry?: string | null
          last_executed_at?: string | null
          next_due_at?: string | null
          status?: string | null
          template_milestones?: Json | null
          title: string
          total_executions?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          base_amount?: number | null
          buyer_id?: string | null
          commodity_quantity?: number | null
          commodity_unit?: string | null
          created_at?: string
          currency?: string | null
          frequency?: string | null
          id?: string
          industry?: string | null
          last_executed_at?: string | null
          next_due_at?: string | null
          status?: string | null
          template_milestones?: Json | null
          title?: string
          total_executions?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      rfq_requests: {
        Row: {
          buyer_company: string | null
          buyer_email: string | null
          buyer_id: string | null
          buyer_location: string | null
          buyer_name: string | null
          created_at: string
          expires_at: string | null
          id: string
          incoterms: string | null
          industry: string | null
          notes: string | null
          quantity: number | null
          requested_delivery_date: string | null
          required_documents: Json | null
          rfq_number: string
          specifications: Json | null
          status: string
          transaction_id: string | null
          unit: string | null
          updated_at: string
          vendor_id: string | null
          vendor_response_at: string | null
        }
        Insert: {
          buyer_company?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_location?: string | null
          buyer_name?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          incoterms?: string | null
          industry?: string | null
          notes?: string | null
          quantity?: number | null
          requested_delivery_date?: string | null
          required_documents?: Json | null
          rfq_number: string
          specifications?: Json | null
          status?: string
          transaction_id?: string | null
          unit?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_response_at?: string | null
        }
        Update: {
          buyer_company?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_location?: string | null
          buyer_name?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          incoterms?: string | null
          industry?: string | null
          notes?: string | null
          quantity?: number | null
          requested_delivery_date?: string | null
          required_documents?: Json | null
          rfq_number?: string
          specifications?: Json | null
          status?: string
          transaction_id?: string | null
          unit?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_response_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_requests_transaction_id_fkey"
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
      sar_filings: {
        Row: {
          acknowledged_at: string | null
          acknowledgement_ref: string | null
          admin_notes: string | null
          created_at: string
          drafted_by: string | null
          evidence_refs: Json | null
          filing_status: string
          id: string
          narrative: string
          regulatory_authority: string | null
          related_flag_ids: Json | null
          related_transaction_ids: Json | null
          reviewed_by: string | null
          sar_number: string
          subject_country: string | null
          subject_id: string | null
          subject_name: string
          subject_role: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledgement_ref?: string | null
          admin_notes?: string | null
          created_at?: string
          drafted_by?: string | null
          evidence_refs?: Json | null
          filing_status?: string
          id?: string
          narrative: string
          regulatory_authority?: string | null
          related_flag_ids?: Json | null
          related_transaction_ids?: Json | null
          reviewed_by?: string | null
          sar_number: string
          subject_country?: string | null
          subject_id?: string | null
          subject_name: string
          subject_role?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledgement_ref?: string | null
          admin_notes?: string | null
          created_at?: string
          drafted_by?: string | null
          evidence_refs?: Json | null
          filing_status?: string
          id?: string
          narrative?: string
          regulatory_authority?: string | null
          related_flag_ids?: Json | null
          related_transaction_ids?: Json | null
          reviewed_by?: string | null
          sar_number?: string
          subject_country?: string | null
          subject_id?: string | null
          subject_name?: string
          subject_role?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seed_token_audit_logs: {
        Row: {
          action: string
          amount: number | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          order_number: string | null
          payment_id: string | null
          purpose: string
          role: string | null
          seed_token_id: string | null
          source: string | null
          target_wallet_address: string | null
          target_wallet_label: string | null
          token_value: string
          transaction_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action?: string
          amount?: number | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          order_number?: string | null
          payment_id?: string | null
          purpose?: string
          role?: string | null
          seed_token_id?: string | null
          source?: string | null
          target_wallet_address?: string | null
          target_wallet_label?: string | null
          token_value: string
          transaction_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          amount?: number | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          order_number?: string | null
          payment_id?: string | null
          purpose?: string
          role?: string | null
          seed_token_id?: string | null
          source?: string | null
          target_wallet_address?: string | null
          target_wallet_label?: string | null
          token_value?: string
          transaction_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seed_token_audit_logs_seed_token_id_fkey"
            columns: ["seed_token_id"]
            isOneToOne: false
            referencedRelation: "seed_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      seed_tokens: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          purpose: string
          token: string
          updated_at: string
          user_id: string
          wallet_public_key: string | null
          wallet_purpose: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          purpose?: string
          token: string
          updated_at?: string
          user_id: string
          wallet_public_key?: string | null
          wallet_purpose?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          purpose?: string
          token?: string
          updated_at?: string
          user_id?: string
          wallet_public_key?: string | null
          wallet_purpose?: string
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
      supported_currencies: {
        Row: {
          country_codes: string[] | null
          created_at: string
          currency_code: string
          currency_name: string
          exchange_rate_to_usd: number | null
          id: string
          is_active: boolean | null
          is_mobile_money: boolean | null
          mobile_money_provider: string | null
          rate_updated_at: string | null
          symbol: string | null
        }
        Insert: {
          country_codes?: string[] | null
          created_at?: string
          currency_code: string
          currency_name: string
          exchange_rate_to_usd?: number | null
          id?: string
          is_active?: boolean | null
          is_mobile_money?: boolean | null
          mobile_money_provider?: string | null
          rate_updated_at?: string | null
          symbol?: string | null
        }
        Update: {
          country_codes?: string[] | null
          created_at?: string
          currency_code?: string
          currency_name?: string
          exchange_rate_to_usd?: number | null
          id?: string
          is_active?: boolean | null
          is_mobile_money?: boolean | null
          mobile_money_provider?: string | null
          rate_updated_at?: string | null
          symbol?: string | null
        }
        Relationships: []
      }
      tax_ledger: {
        Row: {
          buyer_country: string | null
          buyer_id: string | null
          buyer_name: string | null
          collection_period: string | null
          corridor_route: string | null
          created_at: string
          fiscal_quarter: string | null
          id: string
          industry: string | null
          item_category: string | null
          jurisdiction_country_code: string | null
          order_number: string | null
          remittance_notes: string | null
          remittance_reference: string | null
          remittance_status: string
          remitted_at: string | null
          remitted_by: string | null
          tariff_collected: number
          tax_authority_name: string | null
          tax_collected: number
          tax_jurisdiction: string
          tax_rate: number
          tax_type: string
          taxable_amount: number
          total_collected: number
          transaction_id: string | null
          tx_id: string | null
          updated_at: string
          vendor_country: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          buyer_country?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          collection_period?: string | null
          corridor_route?: string | null
          created_at?: string
          fiscal_quarter?: string | null
          id?: string
          industry?: string | null
          item_category?: string | null
          jurisdiction_country_code?: string | null
          order_number?: string | null
          remittance_notes?: string | null
          remittance_reference?: string | null
          remittance_status?: string
          remitted_at?: string | null
          remitted_by?: string | null
          tariff_collected?: number
          tax_authority_name?: string | null
          tax_collected?: number
          tax_jurisdiction: string
          tax_rate?: number
          tax_type?: string
          taxable_amount?: number
          total_collected?: number
          transaction_id?: string | null
          tx_id?: string | null
          updated_at?: string
          vendor_country?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          buyer_country?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          collection_period?: string | null
          corridor_route?: string | null
          created_at?: string
          fiscal_quarter?: string | null
          id?: string
          industry?: string | null
          item_category?: string | null
          jurisdiction_country_code?: string | null
          order_number?: string | null
          remittance_notes?: string | null
          remittance_reference?: string | null
          remittance_status?: string
          remitted_at?: string | null
          remitted_by?: string | null
          tariff_collected?: number
          tax_authority_name?: string | null
          tax_collected?: number
          tax_jurisdiction?: string
          tax_rate?: number
          tax_type?: string
          taxable_amount?: number
          total_collected?: number
          transaction_id?: string | null
          tx_id?: string | null
          updated_at?: string
          vendor_country?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_ledger_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          de_minimis_usd: number | null
          id: string
          industry_overrides: Json | null
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
          de_minimis_usd?: number | null
          id?: string
          industry_overrides?: Json | null
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
          de_minimis_usd?: number | null
          id?: string
          industry_overrides?: Json | null
          is_active?: boolean | null
          rate_percentage?: number
          tariff_rate_percentage?: number | null
          tax_type?: string
          trade_bloc?: string | null
        }
        Relationships: []
      }
      team_assignment_templates: {
        Row: {
          auto_trigger_mode: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          auto_trigger_mode?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          auto_trigger_mode?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_assignment_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "team_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          added_by: string
          can_finalize: boolean
          created_at: string
          display_name: string | null
          id: string
          preferred_language: string | null
          removed_at: string | null
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          added_by: string
          can_finalize?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          preferred_language?: string | null
          removed_at?: string | null
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          added_by?: string
          can_finalize?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          preferred_language?: string | null
          removed_at?: string | null
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "team_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_role_presets: {
        Row: {
          created_at: string | null
          id: string
          industry: string
          role_key: string
          role_name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          industry: string
          role_key: string
          role_name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          industry?: string
          role_key?: string
          role_name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      team_task_assignments: {
        Row: {
          completed_at: string | null
          created_at: string
          deadline_at: string | null
          evidence_url: string | null
          id: string
          instructions: string | null
          member_id: string
          milestone_key: string
          milestone_label: string | null
          sla_hours: number | null
          sort_order: number
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deadline_at?: string | null
          evidence_url?: string | null
          id?: string
          instructions?: string | null
          member_id: string
          milestone_key: string
          milestone_label?: string | null
          sla_hours?: number | null
          sort_order?: number
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deadline_at?: string | null
          evidence_url?: string | null
          id?: string
          instructions?: string | null
          member_id?: string
          milestone_key?: string
          milestone_label?: string | null
          sla_hours?: number | null
          sort_order?: number
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_task_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_task_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "team_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_template_rules: {
        Row: {
          auto_assign: boolean
          created_at: string
          id: string
          instructions: string | null
          member_id: string | null
          milestone_key: string
          milestone_label: string | null
          sort_order: number
          template_id: string
        }
        Insert: {
          auto_assign?: boolean
          created_at?: string
          id?: string
          instructions?: string | null
          member_id?: string | null
          milestone_key: string
          milestone_label?: string | null
          sort_order?: number
          template_id: string
        }
        Update: {
          auto_assign?: boolean
          created_at?: string
          id?: string
          instructions?: string | null
          member_id?: string | null
          milestone_key?: string
          milestone_label?: string | null
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_template_rules_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_template_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "team_assignment_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      team_workspaces: {
        Row: {
          archived_at: string | null
          auto_match_industry: boolean
          created_at: string
          description: string | null
          id: string
          industry: string
          owner_id: string
          role: string
          status: string
          title: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          auto_match_industry?: boolean
          created_at?: string
          description?: string | null
          id?: string
          industry?: string
          owner_id: string
          role?: string
          status?: string
          title: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          auto_match_industry?: boolean
          created_at?: string
          description?: string | null
          id?: string
          industry?: string
          owner_id?: string
          role?: string
          status?: string
          title?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_workspaces_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      tos_acceptances: {
        Row: {
          accepted_at: string
          created_at: string
          id: string
          ip_address: string | null
          tos_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          tos_version?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          tos_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trade_bloc_rules: {
        Row: {
          bloc_code: string
          bloc_name: string
          created_at: string
          documentation_required: string[] | null
          id: string
          is_active: boolean | null
          member_countries: string[] | null
          preferential_rate: number | null
          rules_of_origin: Json | null
          standard_external_rate: number | null
        }
        Insert: {
          bloc_code: string
          bloc_name: string
          created_at?: string
          documentation_required?: string[] | null
          id?: string
          is_active?: boolean | null
          member_countries?: string[] | null
          preferential_rate?: number | null
          rules_of_origin?: Json | null
          standard_external_rate?: number | null
        }
        Update: {
          bloc_code?: string
          bloc_name?: string
          created_at?: string
          documentation_required?: string[] | null
          id?: string
          is_active?: boolean | null
          member_countries?: string[] | null
          preferential_rate?: number | null
          rules_of_origin?: Json | null
          standard_external_rate?: number | null
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
          document_mode: string
          estimated_days: number
          gps_accuracy: number | null
          gps_captured_at: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          is_payment_milestone: boolean | null
          observer_id: string | null
          observer_signed: boolean | null
          observer_signed_at: string | null
          optional_documents: Json
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
          document_mode?: string
          estimated_days?: number
          gps_accuracy?: number | null
          gps_captured_at?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          is_payment_milestone?: boolean | null
          observer_id?: string | null
          observer_signed?: boolean | null
          observer_signed_at?: string | null
          optional_documents?: Json
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
          document_mode?: string
          estimated_days?: number
          gps_accuracy?: number | null
          gps_captured_at?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          is_payment_milestone?: boolean | null
          observer_id?: string | null
          observer_signed?: boolean | null
          observer_signed_at?: string | null
          optional_documents?: Json
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
          commodity_quantity: number | null
          commodity_unit: string | null
          corridor_route: string | null
          created_at: string
          delivered_date: string | null
          fee: number | null
          id: string
          industry: string | null
          item: string | null
          locked_price: number | null
          milestone_proposed_by: string | null
          milestone_status: string | null
          order_number: number | null
          order_type: string
          price_currency: string | null
          price_snapshot_at: string | null
          released_date: string | null
          settlement_completed_at: string | null
          settlement_currency: string | null
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
          commodity_quantity?: number | null
          commodity_unit?: string | null
          corridor_route?: string | null
          created_at?: string
          delivered_date?: string | null
          fee?: number | null
          id?: string
          industry?: string | null
          item?: string | null
          locked_price?: number | null
          milestone_proposed_by?: string | null
          milestone_status?: string | null
          order_number?: number | null
          order_type?: string
          price_currency?: string | null
          price_snapshot_at?: string | null
          released_date?: string | null
          settlement_completed_at?: string | null
          settlement_currency?: string | null
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
          commodity_quantity?: number | null
          commodity_unit?: string | null
          corridor_route?: string | null
          created_at?: string
          delivered_date?: string | null
          fee?: number | null
          id?: string
          industry?: string | null
          item?: string | null
          locked_price?: number | null
          milestone_proposed_by?: string | null
          milestone_status?: string | null
          order_number?: number | null
          order_type?: string
          price_currency?: string | null
          price_snapshot_at?: string | null
          released_date?: string | null
          settlement_completed_at?: string | null
          settlement_currency?: string | null
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
      vendor_claim_tokens: {
        Row: {
          claimed_by: string | null
          created_at: string
          expires_at: string
          id: string
          integration_id: string | null
          marketplace_vendor_id: string | null
          platform: string
          status: string
          token: string
          transaction_id: string | null
          updated_at: string
          vendor_email: string | null
          vendor_name: string | null
        }
        Insert: {
          claimed_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          integration_id?: string | null
          marketplace_vendor_id?: string | null
          platform: string
          status?: string
          token?: string
          transaction_id?: string | null
          updated_at?: string
          vendor_email?: string | null
          vendor_name?: string | null
        }
        Update: {
          claimed_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          integration_id?: string | null
          marketplace_vendor_id?: string | null
          platform?: string
          status?: string
          token?: string
          transaction_id?: string | null
          updated_at?: string
          vendor_email?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_claim_tokens_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
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
      vendor_rejections: {
        Row: {
          buyer_id: string | null
          buyer_name: string | null
          created_at: string
          gas_deducted: number
          id: string
          industry: string | null
          original_amount: number
          refund_amount: number
          refund_status: string
          rejection_reason: string | null
          transaction_id: string | null
          tx_id: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          buyer_id?: string | null
          buyer_name?: string | null
          created_at?: string
          gas_deducted?: number
          id?: string
          industry?: string | null
          original_amount?: number
          refund_amount?: number
          refund_status?: string
          rejection_reason?: string | null
          transaction_id?: string | null
          tx_id?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          buyer_id?: string | null
          buyer_name?: string | null
          created_at?: string
          gas_deducted?: number
          id?: string
          industry?: string | null
          original_amount?: number
          refund_amount?: number
          refund_status?: string
          rejection_reason?: string | null
          transaction_id?: string | null
          tx_id?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_rejections_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_settings: {
        Row: {
          auto_delivery: boolean | null
          auto_milestone_template: boolean
          id: string
          industry_category: string | null
          marketplace_integrations: Json | null
          notifications: Json | null
          pay_enabled: boolean | null
          payout_tier: string | null
          shipping_api_key_encrypted: string | null
          shipping_api_provider: string | null
          supported_currencies: string[] | null
          transaction_types: string[]
          updated_at: string
          vendor_id: string | null
          widget_mode: string | null
          widget_theme: Json | null
        }
        Insert: {
          auto_delivery?: boolean | null
          auto_milestone_template?: boolean
          id?: string
          industry_category?: string | null
          marketplace_integrations?: Json | null
          notifications?: Json | null
          pay_enabled?: boolean | null
          payout_tier?: string | null
          shipping_api_key_encrypted?: string | null
          shipping_api_provider?: string | null
          supported_currencies?: string[] | null
          transaction_types?: string[]
          updated_at?: string
          vendor_id?: string | null
          widget_mode?: string | null
          widget_theme?: Json | null
        }
        Update: {
          auto_delivery?: boolean | null
          auto_milestone_template?: boolean
          id?: string
          industry_category?: string | null
          marketplace_integrations?: Json | null
          notifications?: Json | null
          pay_enabled?: boolean | null
          payout_tier?: string | null
          shipping_api_key_encrypted?: string | null
          shipping_api_provider?: string | null
          supported_currencies?: string[] | null
          transaction_types?: string[]
          updated_at?: string
          vendor_id?: string | null
          widget_mode?: string | null
          widget_theme?: Json | null
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
      get_contract_audit_trail: {
        Args: { _transaction_id: string }
        Returns: Json
      }
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
