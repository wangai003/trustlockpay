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
          deleted_at: string | null
          deleted_by: string | null
          department_id: string | null
          email: string | null
          failed_attempts: number
          id: string
          is_deleted: boolean
          is_setup: boolean
          is_team_lead: boolean
          locked_at: string | null
          name: string
          password_hash: string | null
          reinstated_at: string | null
          temp_password_hash: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          email?: string | null
          failed_attempts?: number
          id?: string
          is_deleted?: boolean
          is_setup?: boolean
          is_team_lead?: boolean
          locked_at?: string | null
          name: string
          password_hash?: string | null
          reinstated_at?: string | null
          temp_password_hash: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          email?: string | null
          failed_attempts?: number
          id?: string
          is_deleted?: boolean
          is_setup?: boolean
          is_team_lead?: boolean
          locked_at?: string | null
          name?: string
          password_hash?: string | null
          reinstated_at?: string | null
          temp_password_hash?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_accounts_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_accounts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "admin_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_action_log: {
        Row: {
          action_type: string
          admin_id: string
          case_id: string | null
          case_type: string | null
          chief_decision: string | null
          chief_notes: string | null
          chief_reviewed_at: string | null
          created_at: string
          deviation_details: string | null
          id: string
          is_deviation: boolean
          justification: string | null
          metadata: Json | null
          requires_chief_review: boolean
        }
        Insert: {
          action_type: string
          admin_id: string
          case_id?: string | null
          case_type?: string | null
          chief_decision?: string | null
          chief_notes?: string | null
          chief_reviewed_at?: string | null
          created_at?: string
          deviation_details?: string | null
          id?: string
          is_deviation?: boolean
          justification?: string | null
          metadata?: Json | null
          requires_chief_review?: boolean
        }
        Update: {
          action_type?: string
          admin_id?: string
          case_id?: string | null
          case_type?: string | null
          chief_decision?: string | null
          chief_notes?: string | null
          chief_reviewed_at?: string | null
          created_at?: string
          deviation_details?: string | null
          id?: string
          is_deviation?: boolean
          justification?: string | null
          metadata?: Json | null
          requires_chief_review?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "admin_action_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_aliases: {
        Row: {
          admin_id: string
          alias: string
          created_at: string
          id: string
        }
        Insert: {
          admin_id: string
          alias: string
          created_at?: string
          id?: string
        }
        Update: {
          admin_id?: string
          alias?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_aliases_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: true
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_cross_department_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          completed_at: string | null
          created_at: string
          created_by_admin_id: string | null
          dependency_chain: Json | null
          id: string
          message: string | null
          override_at: string | null
          override_by: string | null
          override_note: string | null
          priority: string
          related_entity_id: string | null
          related_entity_type: string | null
          source_department: string
          status: string
          target_department: string
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          completed_at?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          dependency_chain?: Json | null
          id?: string
          message?: string | null
          override_at?: string | null
          override_by?: string | null
          override_note?: string | null
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          source_department: string
          status?: string
          target_department: string
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          completed_at?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          dependency_chain?: Json | null
          id?: string
          message?: string | null
          override_at?: string | null
          override_by?: string | null
          override_note?: string | null
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          source_department?: string
          status?: string
          target_department?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_cross_department_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_cross_department_alerts_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_cross_department_alerts_override_by_fkey"
            columns: ["override_by"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_department_rr_pointer: {
        Row: {
          department_slug: string
          last_assigned_index: number
          updated_at: string
        }
        Insert: {
          department_slug: string
          last_assigned_index?: number
          updated_at?: string
        }
        Update: {
          department_slug?: string
          last_assigned_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_department_tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          department_slug: string
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          priority: string
          related_entity_id: string | null
          related_entity_type: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          department_slug: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          department_slug?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_department_tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_department_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_department_transfers: {
        Row: {
          admin_id: string
          created_at: string
          from_department_slug: string
          id: string
          reason: string | null
          to_department_slug: string
          transferred_by: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          from_department_slug: string
          id?: string
          reason?: string | null
          to_department_slug: string
          transferred_by: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          from_department_slug?: string
          id?: string
          reason?: string | null
          to_department_slug?: string
          transferred_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_department_transfers_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_department_transfers_transferred_by_fkey"
            columns: ["transferred_by"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_departments: {
        Row: {
          access_modules: string[]
          can_message_clients: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          access_modules?: string[]
          can_message_clients?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          access_modules?: string[]
          can_message_clients?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      admin_dept_chat_messages: {
        Row: {
          body: string
          created_at: string
          department_slug: string
          encryption_version: number | null
          id: string
          is_encrypted: boolean
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          department_slug: string
          encryption_version?: number | null
          id?: string
          is_encrypted?: boolean
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          department_slug?: string
          encryption_version?: number | null
          id?: string
          is_encrypted?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_dept_chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_direct_messages: {
        Row: {
          body: string
          created_at: string
          encryption_version: number | null
          id: string
          is_encrypted: boolean
          is_read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          encryption_version?: number | null
          id?: string
          is_encrypted?: boolean
          is_read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          encryption_version?: number | null
          id?: string
          is_encrypted?: boolean
          is_read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_direct_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_signals: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          is_resolved: boolean
          resolved_at: string | null
          severity: string
          signal_type: string
          source_assistant: string
          summary: string
          target_role: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          severity?: string
          signal_type: string
          source_assistant: string
          summary: string
          target_role?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          severity?: string
          signal_type?: string
          source_assistant?: string
          summary?: string
          target_role?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_signals_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
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
      arbitration_fee_orders: {
        Row: {
          arbitration_fee: number
          created_at: string
          dispute_id: string
          escrow_amount: number
          id: string
          os_payment_id: string | null
          requested_by: string
          requester_role: string
          status: string
          transaction_id: string
          tx_id: string | null
          updated_at: string
        }
        Insert: {
          arbitration_fee: number
          created_at?: string
          dispute_id: string
          escrow_amount: number
          id?: string
          os_payment_id?: string | null
          requested_by: string
          requester_role: string
          status?: string
          transaction_id: string
          tx_id?: string | null
          updated_at?: string
        }
        Update: {
          arbitration_fee?: number
          created_at?: string
          dispute_id?: string
          escrow_amount?: number
          id?: string
          os_payment_id?: string | null
          requested_by?: string
          requester_role?: string
          status?: string
          transaction_id?: string
          tx_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arbitration_fee_orders_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arbitration_fee_orders_os_payment_id_fkey"
            columns: ["os_payment_id"]
            isOneToOne: false
            referencedRelation: "os_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arbitration_fee_orders_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      arbitrator_proposals: {
        Row: {
          arbitrator_credentials: string | null
          arbitrator_email: string | null
          arbitrator_institution: string | null
          arbitrator_name: string
          auto_assign_deadline: string
          counterparty_responded_at: string | null
          counterparty_response: string
          created_at: string
          dispute_id: string
          id: string
          proposed_by: string
          proposer_role: string
          updated_at: string
        }
        Insert: {
          arbitrator_credentials?: string | null
          arbitrator_email?: string | null
          arbitrator_institution?: string | null
          arbitrator_name: string
          auto_assign_deadline?: string
          counterparty_responded_at?: string | null
          counterparty_response?: string
          created_at?: string
          dispute_id: string
          id?: string
          proposed_by: string
          proposer_role: string
          updated_at?: string
        }
        Update: {
          arbitrator_credentials?: string | null
          arbitrator_email?: string | null
          arbitrator_institution?: string | null
          arbitrator_name?: string
          auto_assign_deadline?: string
          counterparty_responded_at?: string | null
          counterparty_response?: string
          created_at?: string
          dispute_id?: string
          id?: string
          proposed_by?: string
          proposer_role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arbitrator_proposals_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      arbitrator_sessions: {
        Row: {
          access_count: number
          access_password_hash: string
          access_token: string
          arbitrator_email: string | null
          arbitrator_name: string
          case_bundle_generated: boolean
          case_bundle_url: string | null
          created_at: string
          dispute_id: string
          expires_at: string
          id: string
          last_accessed_at: string | null
          ruling_anchored: boolean
          ruling_distributed: boolean
          ruling_file_name: string | null
          ruling_file_url: string | null
          ruling_uploaded_at: string | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          access_count?: number
          access_password_hash: string
          access_token?: string
          arbitrator_email?: string | null
          arbitrator_name: string
          case_bundle_generated?: boolean
          case_bundle_url?: string | null
          created_at?: string
          dispute_id: string
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          ruling_anchored?: boolean
          ruling_distributed?: boolean
          ruling_file_name?: string | null
          ruling_file_url?: string | null
          ruling_uploaded_at?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          access_count?: number
          access_password_hash?: string
          access_token?: string
          arbitrator_email?: string | null
          arbitrator_name?: string
          case_bundle_generated?: boolean
          case_bundle_url?: string | null
          created_at?: string
          dispute_id?: string
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          ruling_anchored?: boolean
          ruling_distributed?: boolean
          ruling_file_name?: string | null
          ruling_file_url?: string | null
          ruling_uploaded_at?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arbitrator_sessions_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arbitrator_sessions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "audit_access_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "audit_sessions_safe"
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
      bulk_import_jobs: {
        Row: {
          created_at: string
          error_log: Json | null
          file_url: string | null
          id: string
          processed_rows: number | null
          status: string
          total_rows: number | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          error_log?: Json | null
          file_url?: string | null
          id?: string
          processed_rows?: number | null
          status?: string
          total_rows?: number | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          error_log?: Json | null
          file_url?: string | null
          id?: string
          processed_rows?: number | null
          status?: string
          total_rows?: number | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      business_kyc_profiles: {
        Row: {
          admin_notes: string | null
          authorization_doc_url: string | null
          business_activity_description: string | null
          business_type: string | null
          company_legal_name: string
          created_at: string
          id: string
          incorporation_date: string | null
          jurisdiction: string | null
          registered_address: string | null
          registration_number: string | null
          signatory_name: string | null
          signatory_title: string | null
          tax_id: string | null
          trading_name: string | null
          updated_at: string
          user_id: string
          verification_status: string
        }
        Insert: {
          admin_notes?: string | null
          authorization_doc_url?: string | null
          business_activity_description?: string | null
          business_type?: string | null
          company_legal_name: string
          created_at?: string
          id?: string
          incorporation_date?: string | null
          jurisdiction?: string | null
          registered_address?: string | null
          registration_number?: string | null
          signatory_name?: string | null
          signatory_title?: string | null
          tax_id?: string | null
          trading_name?: string | null
          updated_at?: string
          user_id: string
          verification_status?: string
        }
        Update: {
          admin_notes?: string | null
          authorization_doc_url?: string | null
          business_activity_description?: string | null
          business_type?: string | null
          company_legal_name?: string
          created_at?: string
          id?: string
          incorporation_date?: string | null
          jurisdiction?: string | null
          registered_address?: string | null
          registration_number?: string | null
          signatory_name?: string | null
          signatory_title?: string | null
          tax_id?: string | null
          trading_name?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: string
        }
        Relationships: []
      }
      checkout_sessions: {
        Row: {
          amount: number
          buyer_email: string
          buyer_location: string | null
          buyer_name: string
          confirmation_code: string | null
          created_at: string
          expires_at: string
          fee: number
          id: string
          industry: string | null
          order_type: string | null
          payment_method: string
          payment_proof: Json | null
          processor_id: string | null
          session_data: Json
          status: string
          total: number
          transaction_id: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount: number
          buyer_email: string
          buyer_location?: string | null
          buyer_name: string
          confirmation_code?: string | null
          created_at?: string
          expires_at?: string
          fee?: number
          id: string
          industry?: string | null
          order_type?: string | null
          payment_method: string
          payment_proof?: Json | null
          processor_id?: string | null
          session_data?: Json
          status?: string
          total: number
          transaction_id?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          buyer_email?: string
          buyer_location?: string | null
          buyer_name?: string
          confirmation_code?: string | null
          created_at?: string
          expires_at?: string
          fee?: number
          id?: string
          industry?: string | null
          order_type?: string | null
          payment_method?: string
          payment_proof?: Json | null
          processor_id?: string | null
          session_data?: Json
          status?: string
          total?: number
          transaction_id?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      chief_admin_config: {
        Row: {
          admin_id: string
          designated_at: string
          designated_by: string
          id: string
          is_active: boolean
          override_window_hours: number
          rank: number
        }
        Insert: {
          admin_id: string
          designated_at?: string
          designated_by?: string
          id?: string
          is_active?: boolean
          override_window_hours?: number
          rank?: number
        }
        Update: {
          admin_id?: string
          designated_at?: string
          designated_by?: string
          id?: string
          is_active?: boolean
          override_window_hours?: number
          rank?: number
        }
        Relationships: [
          {
            foreignKeyName: "chief_admin_config_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
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
      deployment_history: {
        Row: {
          block_number: number | null
          constructor_args: Json | null
          contract_address: string
          contract_name: string
          created_at: string
          deployer_address: string
          gas_used: string | null
          id: string
          initiated_by_admin_id: string | null
          metadata: Json | null
          network: string
          status: string
          tx_hash: string
          verification_status: string | null
          verification_url: string | null
        }
        Insert: {
          block_number?: number | null
          constructor_args?: Json | null
          contract_address: string
          contract_name: string
          created_at?: string
          deployer_address: string
          gas_used?: string | null
          id?: string
          initiated_by_admin_id?: string | null
          metadata?: Json | null
          network: string
          status?: string
          tx_hash: string
          verification_status?: string | null
          verification_url?: string | null
        }
        Update: {
          block_number?: number | null
          constructor_args?: Json | null
          contract_address?: string
          contract_name?: string
          created_at?: string
          deployer_address?: string
          gas_used?: string | null
          id?: string
          initiated_by_admin_id?: string | null
          metadata?: Json | null
          network?: string
          status?: string
          tx_hash?: string
          verification_status?: string | null
          verification_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deployment_history_initiated_by_admin_id_fkey"
            columns: ["initiated_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
        ]
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
          original_resolution: string | null
          overridden_at: string | null
          overridden_by: string | null
          override_deadline: string | null
          override_reason: string | null
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
          original_resolution?: string | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_deadline?: string | null
          override_reason?: string | null
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
          original_resolution?: string | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_deadline?: string | null
          override_reason?: string | null
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
            foreignKeyName: "disputes_overridden_by_fkey"
            columns: ["overridden_by"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
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
      document_scan_results: {
        Row: {
          confidence_score: number | null
          country_detected: string | null
          created_at: string
          document_ref: string
          document_source: string
          document_type: string | null
          file_url: string | null
          findings: Json | null
          forgery_indicators: Json | null
          id: string
          industry_detected: string | null
          is_reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          scanned_by: string
          transaction_id: string | null
          user_id: string | null
          verdict: string
          verification_portal_url: string | null
        }
        Insert: {
          confidence_score?: number | null
          country_detected?: string | null
          created_at?: string
          document_ref: string
          document_source: string
          document_type?: string | null
          file_url?: string | null
          findings?: Json | null
          forgery_indicators?: Json | null
          id?: string
          industry_detected?: string | null
          is_reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          scanned_by?: string
          transaction_id?: string | null
          user_id?: string | null
          verdict?: string
          verification_portal_url?: string | null
        }
        Update: {
          confidence_score?: number | null
          country_detected?: string | null
          created_at?: string
          document_ref?: string
          document_source?: string
          document_type?: string | null
          file_url?: string | null
          findings?: Json | null
          forgery_indicators?: Json | null
          id?: string
          industry_detected?: string | null
          is_reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          scanned_by?: string
          transaction_id?: string | null
          user_id?: string | null
          verdict?: string
          verification_portal_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_scan_results_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
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
      encrypted_messages: {
        Row: {
          created_at: string
          encrypted_body: string
          encryption_version: number
          id: string
          is_read: boolean
          nonce: string
          recipient_id: string
          sender_id: string
          sender_public_key_id: string | null
          thread_id: string | null
        }
        Insert: {
          created_at?: string
          encrypted_body: string
          encryption_version?: number
          id?: string
          is_read?: boolean
          nonce: string
          recipient_id: string
          sender_id: string
          sender_public_key_id?: string | null
          thread_id?: string | null
        }
        Update: {
          created_at?: string
          encrypted_body?: string
          encryption_version?: number
          id?: string
          is_read?: boolean
          nonce?: string
          recipient_id?: string
          sender_id?: string
          sender_public_key_id?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "encrypted_messages_sender_public_key_id_fkey"
            columns: ["sender_public_key_id"]
            isOneToOne: false
            referencedRelation: "encryption_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      encryption_keys: {
        Row: {
          created_at: string
          id: string
          key_version: number
          public_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_version?: number
          public_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_version?: number
          public_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      escrow_extensions: {
        Row: {
          created_at: string
          extra_days: number
          id: string
          reason: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          transaction_id: string
          tx_id: string
        }
        Insert: {
          created_at?: string
          extra_days?: number
          id?: string
          reason: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transaction_id: string
          tx_id: string
        }
        Update: {
          created_at?: string
          extra_days?: number
          id?: string
          reason?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transaction_id?: string
          tx_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_extensions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_release_reminders: {
        Row: {
          id: string
          reminder_type: string
          sent_at: string
          transaction_id: string
        }
        Insert: {
          id?: string
          reminder_type: string
          sent_at?: string
          transaction_id: string
        }
        Update: {
          id?: string
          reminder_type?: string
          sent_at?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_release_reminders_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      external_fee_entries: {
        Row: {
          amount: number
          base_currency: string | null
          created_at: string
          currency: string
          dispute_note: string | null
          dispute_status: string | null
          disputed_at: string | null
          evidence_note: string | null
          exchange_rate_snapshot: number | null
          fee_label: string
          fee_phase: string | null
          id: string
          is_pre_escrow: boolean | null
          logged_by: string
          logged_by_role: string
          milestone_index: number
          normalized_amount: number | null
          paid_to: string | null
          receipt_url: string | null
          required_scope: string[] | null
          transaction_id: string
          updated_at: string
          verified_at: string | null
          verified_by_counterparty: boolean | null
        }
        Insert: {
          amount?: number
          base_currency?: string | null
          created_at?: string
          currency?: string
          dispute_note?: string | null
          dispute_status?: string | null
          disputed_at?: string | null
          evidence_note?: string | null
          exchange_rate_snapshot?: number | null
          fee_label: string
          fee_phase?: string | null
          id?: string
          is_pre_escrow?: boolean | null
          logged_by: string
          logged_by_role: string
          milestone_index: number
          normalized_amount?: number | null
          paid_to?: string | null
          receipt_url?: string | null
          required_scope?: string[] | null
          transaction_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by_counterparty?: boolean | null
        }
        Update: {
          amount?: number
          base_currency?: string | null
          created_at?: string
          currency?: string
          dispute_note?: string | null
          dispute_status?: string | null
          disputed_at?: string | null
          evidence_note?: string | null
          exchange_rate_snapshot?: number | null
          fee_label?: string
          fee_phase?: string | null
          id?: string
          is_pre_escrow?: boolean | null
          logged_by?: string
          logged_by_role?: string
          milestone_index?: number
          normalized_amount?: number | null
          paid_to?: string | null
          receipt_url?: string | null
          required_scope?: string[] | null
          transaction_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by_counterparty?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "external_fee_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      financing_application_documents: {
        Row: {
          application_id: string
          created_at: string
          document_type: string
          file_name: string | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          document_type: string
          file_name?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          document_type?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financing_application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "financing_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      financing_application_items: {
        Row: {
          application_id: string
          category: string
          created_at: string
          description: string
          exchange_rate_snapshot: number | null
          id: string
          local_currency_amount: number | null
          local_currency_code: string | null
          quantity: number
          sort_order: number
          tax_amount: number | null
          unit_price_usd: number
          updated_at: string
        }
        Insert: {
          application_id: string
          category?: string
          created_at?: string
          description: string
          exchange_rate_snapshot?: number | null
          id?: string
          local_currency_amount?: number | null
          local_currency_code?: string | null
          quantity?: number
          sort_order?: number
          tax_amount?: number | null
          unit_price_usd?: number
          updated_at?: string
        }
        Update: {
          application_id?: string
          category?: string
          created_at?: string
          description?: string
          exchange_rate_snapshot?: number | null
          id?: string
          local_currency_amount?: number | null
          local_currency_code?: string | null
          quantity?: number
          sort_order?: number
          tax_amount?: number | null
          unit_price_usd?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financing_application_items_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "financing_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      financing_applications: {
        Row: {
          approved_amount: number | null
          approved_tenure_days: number | null
          certificate_id: string | null
          counter_amount: number | null
          counter_offered_at: string | null
          counter_offered_by: string | null
          counter_rate_percent: number | null
          counter_tenure_days: number | null
          created_at: string
          decided_by: string | null
          decision_at: string | null
          id: string
          industry: string | null
          interest_rate_percent: number | null
          lender_decision_note: string | null
          lender_id: string
          lender_notes: string | null
          lender_target_id: string | null
          proposed_terms: Json | null
          rejection_reason: string | null
          requested_amount: number
          review_started_at: string | null
          reviewing_lender_id: string | null
          status: string
          trade_scope: string | null
          transaction_id: string | null
          updated_at: string
          vendor_id: string
          vendor_notes: string | null
          visibility: string | null
        }
        Insert: {
          approved_amount?: number | null
          approved_tenure_days?: number | null
          certificate_id?: string | null
          counter_amount?: number | null
          counter_offered_at?: string | null
          counter_offered_by?: string | null
          counter_rate_percent?: number | null
          counter_tenure_days?: number | null
          created_at?: string
          decided_by?: string | null
          decision_at?: string | null
          id?: string
          industry?: string | null
          interest_rate_percent?: number | null
          lender_decision_note?: string | null
          lender_id: string
          lender_notes?: string | null
          lender_target_id?: string | null
          proposed_terms?: Json | null
          rejection_reason?: string | null
          requested_amount?: number
          review_started_at?: string | null
          reviewing_lender_id?: string | null
          status?: string
          trade_scope?: string | null
          transaction_id?: string | null
          updated_at?: string
          vendor_id: string
          vendor_notes?: string | null
          visibility?: string | null
        }
        Update: {
          approved_amount?: number | null
          approved_tenure_days?: number | null
          certificate_id?: string | null
          counter_amount?: number | null
          counter_offered_at?: string | null
          counter_offered_by?: string | null
          counter_rate_percent?: number | null
          counter_tenure_days?: number | null
          created_at?: string
          decided_by?: string | null
          decision_at?: string | null
          id?: string
          industry?: string | null
          interest_rate_percent?: number | null
          lender_decision_note?: string | null
          lender_id?: string
          lender_notes?: string | null
          lender_target_id?: string | null
          proposed_terms?: Json | null
          rejection_reason?: string | null
          requested_amount?: number
          review_started_at?: string | null
          reviewing_lender_id?: string | null
          status?: string
          trade_scope?: string | null
          transaction_id?: string | null
          updated_at?: string
          vendor_id?: string
          vendor_notes?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_financing_applications_lender_target"
            columns: ["lender_target_id"]
            isOneToOne: false
            referencedRelation: "lender_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flashvet_document_analyses: {
        Row: {
          confidence_score: number | null
          created_at: string
          dimension_scores: Json | null
          document_name: string
          document_type: string | null
          findings_summary: string | null
          id: string
          lender_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          dimension_scores?: Json | null
          document_name: string
          document_type?: string | null
          findings_summary?: string | null
          id?: string
          lender_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          dimension_scores?: Json | null
          document_name?: string
          document_type?: string | null
          findings_summary?: string | null
          id?: string
          lender_id?: string
        }
        Relationships: []
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
          cross_field_flags: Json | null
          document_category: string | null
          file_url: string | null
          id: string
          metadata: Json | null
          name: string
          reviewed_at: string | null
          selfie_match_status: string | null
          status: string | null
          vendor_id: string | null
          verification_answers: Json | null
        }
        Insert: {
          created_at?: string
          cross_field_flags?: Json | null
          document_category?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          name: string
          reviewed_at?: string | null
          selfie_match_status?: string | null
          status?: string | null
          vendor_id?: string | null
          verification_answers?: Json | null
        }
        Update: {
          created_at?: string
          cross_field_flags?: Json | null
          document_category?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          reviewed_at?: string | null
          selfie_match_status?: string | null
          status?: string | null
          vendor_id?: string | null
          verification_answers?: Json | null
        }
        Relationships: []
      }
      kyc_queue: {
        Row: {
          cross_field_report: Json | null
          documents: string | null
          id: string
          kyc_id: string
          status: string | null
          submitted_at: string
          tier_change: string | null
          vendor_id: string | null
          vendor_name: string | null
          verification_method: string | null
          video_call_completed_at: string | null
          video_call_notes: string | null
          video_call_requested: boolean | null
        }
        Insert: {
          cross_field_report?: Json | null
          documents?: string | null
          id?: string
          kyc_id: string
          status?: string | null
          submitted_at?: string
          tier_change?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
          verification_method?: string | null
          video_call_completed_at?: string | null
          video_call_notes?: string | null
          video_call_requested?: boolean | null
        }
        Update: {
          cross_field_report?: Json | null
          documents?: string | null
          id?: string
          kyc_id?: string
          status?: string | null
          submitted_at?: string
          tier_change?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
          verification_method?: string | null
          video_call_completed_at?: string | null
          video_call_notes?: string | null
          video_call_requested?: boolean | null
        }
        Relationships: []
      }
      lender_certificates: {
        Row: {
          blockchain_proof_id: string | null
          certificate_metadata: Json | null
          created_at: string
          download_count: number
          expires_at: string
          file_url: string | null
          generation_status: string
          id: string
          status: string
          transaction_id: string
          updated_at: string
          vendor_id: string
          verification_token: string
        }
        Insert: {
          blockchain_proof_id?: string | null
          certificate_metadata?: Json | null
          created_at?: string
          download_count?: number
          expires_at?: string
          file_url?: string | null
          generation_status?: string
          id?: string
          status?: string
          transaction_id: string
          updated_at?: string
          vendor_id: string
          verification_token?: string
        }
        Update: {
          blockchain_proof_id?: string | null
          certificate_metadata?: Json | null
          created_at?: string
          download_count?: number
          expires_at?: string
          file_url?: string | null
          generation_status?: string
          id?: string
          status?: string
          transaction_id?: string
          updated_at?: string
          vendor_id?: string
          verification_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "lender_certificates_blockchain_proof_id_fkey"
            columns: ["blockchain_proof_id"]
            isOneToOne: false
            referencedRelation: "blockchain_proofs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lender_certificates_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      lender_disbursement_records: {
        Row: {
          amount_usd: number
          application_id: string | null
          created_at: string
          disbursed_at: string
          disbursement_date: string | null
          document_url: string | null
          exchange_rate_snapshot: number | null
          extraction_confidence: number | null
          id: string
          lender_id: string
          local_currency_amount: number | null
          local_currency_code: string | null
          notes: string | null
          reference_number: string | null
          source: string
          status: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          amount_usd: number
          application_id?: string | null
          created_at?: string
          disbursed_at?: string
          disbursement_date?: string | null
          document_url?: string | null
          exchange_rate_snapshot?: number | null
          extraction_confidence?: number | null
          id?: string
          lender_id: string
          local_currency_amount?: number | null
          local_currency_code?: string | null
          notes?: string | null
          reference_number?: string | null
          source?: string
          status?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          amount_usd?: number
          application_id?: string | null
          created_at?: string
          disbursed_at?: string
          disbursement_date?: string | null
          document_url?: string | null
          exchange_rate_snapshot?: number | null
          extraction_confidence?: number | null
          id?: string
          lender_id?: string
          local_currency_amount?: number | null
          local_currency_code?: string | null
          notes?: string | null
          reference_number?: string | null
          source?: string
          status?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lender_disbursement_records_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "financing_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      lender_exposure: {
        Row: {
          active_facilities: number | null
          exposure_limit: number | null
          id: string
          lender_id: string
          total_exposure: number | null
          updated_at: string | null
        }
        Insert: {
          active_facilities?: number | null
          exposure_limit?: number | null
          id?: string
          lender_id: string
          total_exposure?: number | null
          updated_at?: string | null
        }
        Update: {
          active_facilities?: number | null
          exposure_limit?: number | null
          id?: string
          lender_id?: string
          total_exposure?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lender_kyb_queue: {
        Row: {
          approved_tier: number | null
          created_at: string
          id: string
          lender_id: string
          review_notes: string | null
          reviewed_by: string | null
          status: string
          submitted_documents: Json | null
          updated_at: string
        }
        Insert: {
          approved_tier?: number | null
          created_at?: string
          id?: string
          lender_id: string
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_documents?: Json | null
          updated_at?: string
        }
        Update: {
          approved_tier?: number | null
          created_at?: string
          id?: string
          lender_id?: string
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_documents?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      lender_profiles: {
        Row: {
          bio: string | null
          created_at: string
          facility_limit: number | null
          id: string
          institution_name: string
          institution_type: string
          is_verified: boolean
          kyb_status: string
          lender_tier: number
          lending_license_number: string | null
          license_jurisdiction: string | null
          logo_url: string | null
          operating_regions: string[] | null
          sector_focus: string[] | null
          social_links: Json | null
          status: string
          terms_template: Json | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          facility_limit?: number | null
          id?: string
          institution_name: string
          institution_type?: string
          is_verified?: boolean
          kyb_status?: string
          lender_tier?: number
          lending_license_number?: string | null
          license_jurisdiction?: string | null
          logo_url?: string | null
          operating_regions?: string[] | null
          sector_focus?: string[] | null
          social_links?: Json | null
          status?: string
          terms_template?: Json | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          facility_limit?: number | null
          id?: string
          institution_name?: string
          institution_type?: string
          is_verified?: boolean
          kyb_status?: string
          lender_tier?: number
          lending_license_number?: string | null
          license_jurisdiction?: string | null
          logo_url?: string | null
          operating_regions?: string[] | null
          sector_focus?: string[] | null
          social_links?: Json | null
          status?: string
          terms_template?: Json | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      liability_contracts: {
        Row: {
          contract_version: number
          created_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          lender_id: string
          metadata: Json | null
          signature_text: string
          signed_at: string
          title_position: string | null
          updated_at: string
        }
        Insert: {
          contract_version?: number
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          lender_id: string
          metadata?: Json | null
          signature_text: string
          signed_at?: string
          title_position?: string | null
          updated_at?: string
        }
        Update: {
          contract_version?: number
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          lender_id?: string
          metadata?: Json | null
          signature_text?: string
          signed_at?: string
          title_position?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      message_threads: {
        Row: {
          case_status: string
          category: string
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          id: string
          last_message_at: string | null
          participant_1: string
          participant_1_role: string | null
          participant_2: string
          participant_2_role: string | null
          status: string
          subject: string | null
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          case_status?: string
          category?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_1_role?: string | null
          participant_2: string
          participant_2_role?: string | null
          status?: string
          subject?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          case_status?: string
          category?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_1_role?: string | null
          participant_2?: string
          participant_2_role?: string | null
          status?: string
          subject?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
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
          admin_account_id: string | null
          attachment_name: string | null
          attachment_url: string | null
          attachments: Json | null
          body: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
          thread_id: string
        }
        Insert: {
          admin_account_id?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          attachments?: Json | null
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
          thread_id: string
        }
        Update: {
          admin_account_id?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          attachments?: Json | null
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_admin_account_id_fkey"
            columns: ["admin_account_id"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_agreements: {
        Row: {
          agreed_at: string | null
          change_notes: string | null
          created_at: string
          id: string
          locked_by_buyer: boolean
          locked_by_vendor: boolean
          milestones: Json
          proposed_by: string
          proposer_role: string
          status: string
          transaction_id: string
          updated_at: string
          version: number
        }
        Insert: {
          agreed_at?: string | null
          change_notes?: string | null
          created_at?: string
          id?: string
          locked_by_buyer?: boolean
          locked_by_vendor?: boolean
          milestones?: Json
          proposed_by: string
          proposer_role: string
          status?: string
          transaction_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          agreed_at?: string | null
          change_notes?: string | null
          created_at?: string
          id?: string
          locked_by_buyer?: boolean
          locked_by_vendor?: boolean
          milestones?: Json
          proposed_by?: string
          proposer_role?: string
          status?: string
          transaction_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "milestone_agreements_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_counter_proposals: {
        Row: {
          buyer_country_code: string | null
          buyer_email: string
          buyer_full_name: string
          buyer_id: string | null
          buyer_phone: string | null
          created_at: string
          id: string
          industry: string | null
          order_amount: number | null
          order_item: string | null
          proposal_number: string
          proposed_schedule: Json
          site_id: string | null
          standalone_link_id: string | null
          status: string
          updated_at: string
          vendor_id: string
          vendor_notes: string | null
          vendor_schedule: Json
        }
        Insert: {
          buyer_country_code?: string | null
          buyer_email: string
          buyer_full_name: string
          buyer_id?: string | null
          buyer_phone?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          order_amount?: number | null
          order_item?: string | null
          proposal_number?: string
          proposed_schedule?: Json
          site_id?: string | null
          standalone_link_id?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
          vendor_notes?: string | null
          vendor_schedule?: Json
        }
        Update: {
          buyer_country_code?: string | null
          buyer_email?: string
          buyer_full_name?: string
          buyer_id?: string | null
          buyer_phone?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          order_amount?: number | null
          order_item?: string | null
          proposal_number?: string
          proposed_schedule?: Json
          site_id?: string | null
          standalone_link_id?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
          vendor_notes?: string | null
          vendor_schedule?: Json
        }
        Relationships: []
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
      offline_reconciliations: {
        Row: {
          confirmed_by_buyer: boolean
          confirmed_by_vendor: boolean
          created_at: string
          evidence_note: string | null
          evidence_url: string | null
          id: string
          milestone_index: number
          milestone_name: string
          proposed_by: string
          proposed_by_role: string
          status: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          confirmed_by_buyer?: boolean
          confirmed_by_vendor?: boolean
          created_at?: string
          evidence_note?: string | null
          evidence_url?: string | null
          id?: string
          milestone_index: number
          milestone_name: string
          proposed_by: string
          proposed_by_role?: string
          status?: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          confirmed_by_buyer?: boolean
          confirmed_by_vendor?: boolean
          created_at?: string
          evidence_note?: string | null
          evidence_url?: string | null
          id?: string
          milestone_index?: number
          milestone_name?: string
          proposed_by?: string
          proposed_by_role?: string
          status?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_reconciliations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
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
          metadata: Json | null
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
          metadata?: Json | null
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
          metadata?: Json | null
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
      platform_analytics_snapshots: {
        Row: {
          created_at: string
          dimension_key: string | null
          dimension_value: string | null
          id: string
          metric_key: string
          metric_value: number
          snapshot_date: string
        }
        Insert: {
          created_at?: string
          dimension_key?: string | null
          dimension_value?: string | null
          id?: string
          metric_key: string
          metric_value?: number
          snapshot_date: string
        }
        Update: {
          created_at?: string
          dimension_key?: string | null
          dimension_value?: string | null
          id?: string
          metric_key?: string
          metric_value?: number
          snapshot_date?: string
        }
        Relationships: []
      }
      platform_api_keys: {
        Row: {
          api_key_hash: string
          contact_email: string | null
          created_at: string
          id: string
          is_active: boolean
          payout_account: string | null
          platform_fee_percent: number
          platform_name: string
          settings: Json | null
          updated_at: string
        }
        Insert: {
          api_key_hash: string
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          payout_account?: string | null
          platform_fee_percent?: number
          platform_name: string
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          api_key_hash?: string
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          payout_account?: string | null
          platform_fee_percent?: number
          platform_name?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      platform_widget_configs: {
        Row: {
          allowed_payment_methods: string[] | null
          auto_kyc_passthrough: boolean
          auto_refund_window_hours: number | null
          brand_logo_url: string | null
          brand_name: string | null
          brand_primary_color: string | null
          created_at: string
          custom_checkout_message: string | null
          default_industry_override: string | null
          enable_bulk_onboarding: boolean
          id: string
          max_order_amount: number | null
          min_order_amount: number | null
          multi_vendor_enabled: boolean
          platform_commission_percent: number | null
          product_api_url: string | null
          require_buyer_account: boolean
          sandbox_mode: boolean
          updated_at: string
          vendor_id: string
          webhook_secret: string | null
          webhook_url: string | null
          white_label_enabled: boolean
        }
        Insert: {
          allowed_payment_methods?: string[] | null
          auto_kyc_passthrough?: boolean
          auto_refund_window_hours?: number | null
          brand_logo_url?: string | null
          brand_name?: string | null
          brand_primary_color?: string | null
          created_at?: string
          custom_checkout_message?: string | null
          default_industry_override?: string | null
          enable_bulk_onboarding?: boolean
          id?: string
          max_order_amount?: number | null
          min_order_amount?: number | null
          multi_vendor_enabled?: boolean
          platform_commission_percent?: number | null
          product_api_url?: string | null
          require_buyer_account?: boolean
          sandbox_mode?: boolean
          updated_at?: string
          vendor_id: string
          webhook_secret?: string | null
          webhook_url?: string | null
          white_label_enabled?: boolean
        }
        Update: {
          allowed_payment_methods?: string[] | null
          auto_kyc_passthrough?: boolean
          auto_refund_window_hours?: number | null
          brand_logo_url?: string | null
          brand_name?: string | null
          brand_primary_color?: string | null
          created_at?: string
          custom_checkout_message?: string | null
          default_industry_override?: string | null
          enable_bulk_onboarding?: boolean
          id?: string
          max_order_amount?: number | null
          min_order_amount?: number | null
          multi_vendor_enabled?: boolean
          platform_commission_percent?: number | null
          product_api_url?: string | null
          require_buyer_account?: boolean
          sandbox_mode?: boolean
          updated_at?: string
          vendor_id?: string
          webhook_secret?: string | null
          webhook_url?: string | null
          white_label_enabled?: boolean
        }
        Relationships: []
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
          account_type: string | null
          account_type_confirmed: boolean | null
          avatar_url: string | null
          business_email: string | null
          business_phone: string | null
          business_phone_country_code: string | null
          company_name: string | null
          corridor: string | null
          created_at: string
          email: string
          entity_type: string
          entity_type_confirmed: boolean
          full_name: string | null
          id: string
          location: string | null
          notification_channels: Json | null
          onboarding_industry: string | null
          phone: string | null
          phone_country_code: string | null
          preferred_currency: string | null
          preferred_language: string | null
          social_links: Json | null
          status: string
          updated_at: string
          wallet_address: string | null
          wallet_verified: boolean | null
          website_url: string | null
        }
        Insert: {
          account_type?: string | null
          account_type_confirmed?: boolean | null
          avatar_url?: string | null
          business_email?: string | null
          business_phone?: string | null
          business_phone_country_code?: string | null
          company_name?: string | null
          corridor?: string | null
          created_at?: string
          email: string
          entity_type?: string
          entity_type_confirmed?: boolean
          full_name?: string | null
          id: string
          location?: string | null
          notification_channels?: Json | null
          onboarding_industry?: string | null
          phone?: string | null
          phone_country_code?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          social_links?: Json | null
          status?: string
          updated_at?: string
          wallet_address?: string | null
          wallet_verified?: boolean | null
          website_url?: string | null
        }
        Update: {
          account_type?: string | null
          account_type_confirmed?: boolean | null
          avatar_url?: string | null
          business_email?: string | null
          business_phone?: string | null
          business_phone_country_code?: string | null
          company_name?: string | null
          corridor?: string | null
          created_at?: string
          email?: string
          entity_type?: string
          entity_type_confirmed?: boolean
          full_name?: string | null
          id?: string
          location?: string | null
          notification_channels?: Json | null
          onboarding_industry?: string | null
          phone?: string | null
          phone_country_code?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          social_links?: Json | null
          status?: string
          updated_at?: string
          wallet_address?: string | null
          wallet_verified?: boolean | null
          website_url?: string | null
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
          file_url: string | null
          generation_status: string
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
          file_url?: string | null
          generation_status?: string
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
          file_url?: string | null
          generation_status?: string
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
      repayment_confirmations: {
        Row: {
          amount_usd: number
          application_id: string
          created_at: string
          id: string
          lender_id: string
          lender_responded_at: string | null
          lender_response: string
          lender_response_note: string | null
          notes: string | null
          proof_file_name: string | null
          proof_url: string | null
          reference_number: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount_usd: number
          application_id: string
          created_at?: string
          id?: string
          lender_id: string
          lender_responded_at?: string | null
          lender_response?: string
          lender_response_note?: string | null
          notes?: string | null
          proof_file_name?: string | null
          proof_url?: string | null
          reference_number?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount_usd?: number
          application_id?: string
          created_at?: string
          id?: string
          lender_id?: string
          lender_responded_at?: string | null
          lender_response?: string
          lender_response_note?: string | null
          notes?: string | null
          proof_file_name?: string | null
          proof_url?: string | null
          reference_number?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repayment_confirmations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "financing_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_requests: {
        Row: {
          buyer_company: string | null
          buyer_country_code_1: string | null
          buyer_country_code_2: string | null
          buyer_country_code_3: string | null
          buyer_email: string | null
          buyer_id: string | null
          buyer_location: string | null
          buyer_name: string | null
          buyer_phone_1: string | null
          buyer_phone_2: string | null
          buyer_phone_3: string | null
          created_at: string
          customer_response: string | null
          customer_response_at: string | null
          expires_at: string | null
          id: string
          incoterms: string | null
          industry: string | null
          notes: string | null
          quantity: number | null
          requested_delivery_date: string | null
          required_documents: Json | null
          rfq_label: string | null
          rfq_number: string
          specifications: Json | null
          standalone_link_id: string | null
          status: string
          transaction_id: string | null
          unit: string | null
          updated_at: string
          vendor_id: string | null
          vendor_response_at: string | null
        }
        Insert: {
          buyer_company?: string | null
          buyer_country_code_1?: string | null
          buyer_country_code_2?: string | null
          buyer_country_code_3?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_location?: string | null
          buyer_name?: string | null
          buyer_phone_1?: string | null
          buyer_phone_2?: string | null
          buyer_phone_3?: string | null
          created_at?: string
          customer_response?: string | null
          customer_response_at?: string | null
          expires_at?: string | null
          id?: string
          incoterms?: string | null
          industry?: string | null
          notes?: string | null
          quantity?: number | null
          requested_delivery_date?: string | null
          required_documents?: Json | null
          rfq_label?: string | null
          rfq_number: string
          specifications?: Json | null
          standalone_link_id?: string | null
          status?: string
          transaction_id?: string | null
          unit?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_response_at?: string | null
        }
        Update: {
          buyer_company?: string | null
          buyer_country_code_1?: string | null
          buyer_country_code_2?: string | null
          buyer_country_code_3?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_location?: string | null
          buyer_name?: string | null
          buyer_phone_1?: string | null
          buyer_phone_2?: string | null
          buyer_phone_3?: string | null
          created_at?: string
          customer_response?: string | null
          customer_response_at?: string | null
          expires_at?: string | null
          id?: string
          incoterms?: string | null
          industry?: string | null
          notes?: string | null
          quantity?: number | null
          requested_delivery_date?: string | null
          required_documents?: Json | null
          rfq_label?: string | null
          rfq_number?: string
          specifications?: Json | null
          standalone_link_id?: string | null
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
      sandbox_leads: {
        Row: {
          business: string | null
          country_code: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          role: string | null
        }
        Insert: {
          business?: string | null
          country_code?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          business?: string | null
          country_code?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: []
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
      standalone_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          page_url: string | null
          standalone_link_id: string | null
          vendor_id: string | null
          visitor_fingerprint: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          standalone_link_id?: string | null
          vendor_id?: string | null
          visitor_fingerprint?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          standalone_link_id?: string | null
          vendor_id?: string | null
          visitor_fingerprint?: string | null
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
          remittance_fee_percentage: number
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
          remittance_fee_percentage?: number
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
          remittance_fee_percentage?: number
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
          lead_verified_at: string | null
          lead_verified_by: string | null
          member_id: string
          milestone_key: string
          milestone_label: string | null
          reassigned_from: string | null
          sla_hours: number | null
          sort_order: number
          status: string
          transaction_milestone_id: string | null
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
          lead_verified_at?: string | null
          lead_verified_by?: string | null
          member_id: string
          milestone_key: string
          milestone_label?: string | null
          reassigned_from?: string | null
          sla_hours?: number | null
          sort_order?: number
          status?: string
          transaction_milestone_id?: string | null
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
          lead_verified_at?: string | null
          lead_verified_by?: string | null
          member_id?: string
          milestone_key?: string
          milestone_label?: string | null
          reassigned_from?: string | null
          sla_hours?: number | null
          sort_order?: number
          status?: string
          transaction_milestone_id?: string | null
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
            foreignKeyName: "team_task_assignments_transaction_milestone_id_fkey"
            columns: ["transaction_milestone_id"]
            isOneToOne: false
            referencedRelation: "transaction_milestones"
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
      team_workspace_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          body: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
          workspace_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
          workspace_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_workspace_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "team_workspaces"
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
          invite_code: string | null
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
          invite_code?: string | null
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
          invite_code?: string | null
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
      thread_internal_notes: {
        Row: {
          admin_account_id: string
          body: string
          created_at: string
          encryption_version: number | null
          id: string
          is_encrypted: boolean
          thread_id: string
          updated_at: string
        }
        Insert: {
          admin_account_id: string
          body: string
          created_at?: string
          encryption_version?: number | null
          id?: string
          is_encrypted?: boolean
          thread_id: string
          updated_at?: string
        }
        Update: {
          admin_account_id?: string
          body?: string
          created_at?: string
          encryption_version?: number | null
          id?: string
          is_encrypted?: boolean
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_internal_notes_admin_account_id_fkey"
            columns: ["admin_account_id"]
            isOneToOne: false
            referencedRelation: "admin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_internal_notes_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
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
          gps_address: string | null
          gps_captured_at: string | null
          gps_city: string | null
          gps_country: string | null
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
          required_scope: string[] | null
          settlement_type: string
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
          gps_address?: string | null
          gps_captured_at?: string | null
          gps_city?: string | null
          gps_country?: string | null
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
          required_scope?: string[] | null
          settlement_type?: string
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
          gps_address?: string | null
          gps_captured_at?: string | null
          gps_city?: string | null
          gps_country?: string | null
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
          required_scope?: string[] | null
          settlement_type?: string
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
      transaction_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          metadata: Json | null
          new_status: string
          old_status: string | null
          source: string | null
          transaction_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          metadata?: Json | null
          new_status: string
          old_status?: string | null
          source?: string | null
          transaction_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string
          old_status?: string | null
          source?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_status_history_transaction_id_fkey"
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
          auto_release_days: number | null
          auto_release_extended_count: number | null
          auto_release_paused: boolean | null
          buyer_company_name: string | null
          buyer_entity_type: string | null
          buyer_id: string | null
          buyer_location: string | null
          buyer_name: string | null
          cart_id: string | null
          commodity_quantity: number | null
          commodity_unit: string | null
          corridor_route: string | null
          created_at: string
          delivered_date: string | null
          fee: number | null
          id: string
          inbound_routed_at: string | null
          incoterm: string | null
          industry: string | null
          item: string | null
          locked_price: number | null
          milestone_proposed_by: string | null
          milestone_status: string | null
          order_number: number | null
          order_type: string
          platform_id: string | null
          price_currency: string | null
          price_snapshot_at: string | null
          released_date: string | null
          settlement_completed_at: string | null
          settlement_currency: string | null
          shipped_date: string | null
          status: string
          tax_breakdown: Json | null
          tracking: string | null
          trade_scope: string
          transaction_source: string | null
          transport_legs: Json | null
          tx_id: string
          type: string | null
          updated_at: string
          vendor_entity_type: string | null
          vendor_id: string | null
          vendor_location: string | null
          vendor_name: string | null
        }
        Insert: {
          amount?: number
          auto_release_date?: string | null
          auto_release_days?: number | null
          auto_release_extended_count?: number | null
          auto_release_paused?: boolean | null
          buyer_company_name?: string | null
          buyer_entity_type?: string | null
          buyer_id?: string | null
          buyer_location?: string | null
          buyer_name?: string | null
          cart_id?: string | null
          commodity_quantity?: number | null
          commodity_unit?: string | null
          corridor_route?: string | null
          created_at?: string
          delivered_date?: string | null
          fee?: number | null
          id?: string
          inbound_routed_at?: string | null
          incoterm?: string | null
          industry?: string | null
          item?: string | null
          locked_price?: number | null
          milestone_proposed_by?: string | null
          milestone_status?: string | null
          order_number?: number | null
          order_type?: string
          platform_id?: string | null
          price_currency?: string | null
          price_snapshot_at?: string | null
          released_date?: string | null
          settlement_completed_at?: string | null
          settlement_currency?: string | null
          shipped_date?: string | null
          status?: string
          tax_breakdown?: Json | null
          tracking?: string | null
          trade_scope?: string
          transaction_source?: string | null
          transport_legs?: Json | null
          tx_id: string
          type?: string | null
          updated_at?: string
          vendor_entity_type?: string | null
          vendor_id?: string | null
          vendor_location?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          auto_release_date?: string | null
          auto_release_days?: number | null
          auto_release_extended_count?: number | null
          auto_release_paused?: boolean | null
          buyer_company_name?: string | null
          buyer_entity_type?: string | null
          buyer_id?: string | null
          buyer_location?: string | null
          buyer_name?: string | null
          cart_id?: string | null
          commodity_quantity?: number | null
          commodity_unit?: string | null
          corridor_route?: string | null
          created_at?: string
          delivered_date?: string | null
          fee?: number | null
          id?: string
          inbound_routed_at?: string | null
          incoterm?: string | null
          industry?: string | null
          item?: string | null
          locked_price?: number | null
          milestone_proposed_by?: string | null
          milestone_status?: string | null
          order_number?: number | null
          order_type?: string
          platform_id?: string | null
          price_currency?: string | null
          price_snapshot_at?: string | null
          released_date?: string | null
          settlement_completed_at?: string | null
          settlement_currency?: string | null
          shipped_date?: string | null
          status?: string
          tax_breakdown?: Json | null
          tracking?: string | null
          trade_scope?: string
          transaction_source?: string | null
          transport_legs?: Json | null
          tx_id?: string
          type?: string | null
          updated_at?: string
          vendor_entity_type?: string | null
          vendor_id?: string | null
          vendor_location?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platform_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      ubo_declarations: {
        Row: {
          address: string | null
          business_kyc_id: string
          created_at: string
          date_of_birth: string | null
          full_name: string
          id: string
          id_document_url: string | null
          nationality: string | null
          ownership_percentage: number
          updated_at: string
          verification_status: string
        }
        Insert: {
          address?: string | null
          business_kyc_id: string
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          id?: string
          id_document_url?: string | null
          nationality?: string | null
          ownership_percentage?: number
          updated_at?: string
          verification_status?: string
        }
        Update: {
          address?: string | null
          business_kyc_id?: string
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          id?: string
          id_document_url?: string | null
          nationality?: string | null
          ownership_percentage?: number
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ubo_declarations_business_kyc_id_fkey"
            columns: ["business_kyc_id"]
            isOneToOne: false
            referencedRelation: "business_kyc_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      vendor_bills: {
        Row: {
          amount: number
          bill_type: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          paid_at: string | null
          reminder_count: number
          reminder_sent_at: string | null
          site_id: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount?: number
          bill_type: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          paid_at?: string | null
          reminder_count?: number
          reminder_sent_at?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          bill_type?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          paid_at?: string | null
          reminder_count?: number
          reminder_sent_at?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bills_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "vendor_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_claim_tokens: {
        Row: {
          claimed_by: string | null
          created_at: string
          expires_at: string
          id: string
          industry: string | null
          integration_id: string | null
          marketplace_vendor_id: string | null
          platform: string
          platform_id: string | null
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
          industry?: string | null
          integration_id?: string | null
          marketplace_vendor_id?: string | null
          platform: string
          platform_id?: string | null
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
          industry?: string | null
          integration_id?: string | null
          marketplace_vendor_id?: string | null
          platform?: string
          platform_id?: string | null
          status?: string
          token?: string
          transaction_id?: string | null
          updated_at?: string
          vendor_email?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_claim_tokens_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platform_api_keys"
            referencedColumns: ["id"]
          },
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
      vendor_document_vault: {
        Row: {
          category: string | null
          created_at: string
          expiry_date: string | null
          file_size: string | null
          file_type: string | null
          file_url: string
          flagged_reason: string | null
          id: string
          last_validated_at: string | null
          tags: string[] | null
          updated_at: string
          use_count: number | null
          user_id: string
          validation_notes: string | null
          validation_status: string | null
          vault_name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          file_size?: string | null
          file_type?: string | null
          file_url: string
          flagged_reason?: string | null
          id?: string
          last_validated_at?: string | null
          tags?: string[] | null
          updated_at?: string
          use_count?: number | null
          user_id: string
          validation_notes?: string | null
          validation_status?: string | null
          vault_name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          file_size?: string | null
          file_type?: string | null
          file_url?: string
          flagged_reason?: string | null
          id?: string
          last_validated_at?: string | null
          tags?: string[] | null
          updated_at?: string
          use_count?: number | null
          user_id?: string
          validation_notes?: string | null
          validation_status?: string | null
          vault_name?: string
        }
        Relationships: []
      }
      vendor_offerings: {
        Row: {
          base_price: number | null
          category: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          industry_key: string
          is_active: boolean
          metadata: Json | null
          name: string
          network_mode: string
          offering_type: string
          site_id: string | null
          unit_label: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          base_price?: number | null
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          industry_key?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          network_mode?: string
          offering_type?: string
          site_id?: string | null
          unit_label?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          base_price?: number | null
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          industry_key?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          network_mode?: string
          offering_type?: string
          site_id?: string | null
          unit_label?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_offerings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "vendor_sites"
            referencedColumns: ["id"]
          },
        ]
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
      vendor_risk_scores: {
        Row: {
          composite_score: number
          computed_at: string
          created_at: string
          id: string
          pillar_scores: Json
          risk_tier: string
          score_metadata: Json | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          composite_score?: number
          computed_at?: string
          created_at?: string
          id?: string
          pillar_scores?: Json
          risk_tier?: string
          score_metadata?: Json | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          composite_score?: number
          computed_at?: string
          created_at?: string
          id?: string
          pillar_scores?: Json
          risk_tier?: string
          score_metadata?: Json | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
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
      vendor_site_configs: {
        Row: {
          created_at: string
          custom_settings: Json | null
          display_name: string | null
          id: string
          network_mode: string
          payment_methods: string[] | null
          site_id: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          custom_settings?: Json | null
          display_name?: string | null
          id?: string
          network_mode?: string
          payment_methods?: string[] | null
          site_id: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          custom_settings?: Json | null
          display_name?: string | null
          id?: string
          network_mode?: string
          payment_methods?: string[] | null
          site_id?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      vendor_site_industries: {
        Row: {
          created_at: string
          id: string
          industry_key: string
          site_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry_key: string
          site_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          industry_key?: string
          site_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_site_industries_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "vendor_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_sites: {
        Row: {
          created_at: string
          default_trade_scope: string
          display_currency: string
          id: string
          industry: string | null
          is_active: boolean | null
          name: string
          platform: string | null
          url: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          default_trade_scope?: string
          display_currency?: string
          id?: string
          industry?: string | null
          is_active?: boolean | null
          name: string
          platform?: string | null
          url?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          default_trade_scope?: string
          display_currency?: string
          id?: string
          industry?: string | null
          is_active?: boolean | null
          name?: string
          platform?: string | null
          url?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      vendor_subscriptions: {
        Row: {
          amount_paid: number
          billing_cycle: string
          created_at: string
          expires_at: string | null
          grace_ends_at: string | null
          id: string
          payment_id: string | null
          plan_id: string
          starts_at: string
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount_paid?: number
          billing_cycle?: string
          created_at?: string
          expires_at?: string | null
          grace_ends_at?: string | null
          id?: string
          payment_id?: string | null
          plan_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount_paid?: number
          billing_cycle?: string
          created_at?: string
          expires_at?: string | null
          grace_ends_at?: string | null
          id?: string
          payment_id?: string | null
          plan_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      vendor_widget_fees: {
        Row: {
          created_at: string
          id: string
          install_fee_paid: boolean
          payment_confirmed: boolean
          pending_restoration_fee: boolean
          site_id: string | null
          total_install_fees_charged: number
          updated_at: string
          vendor_id: string
          widget_state: string
        }
        Insert: {
          created_at?: string
          id?: string
          install_fee_paid?: boolean
          payment_confirmed?: boolean
          pending_restoration_fee?: boolean
          site_id?: string | null
          total_install_fees_charged?: number
          updated_at?: string
          vendor_id: string
          widget_state?: string
        }
        Update: {
          created_at?: string
          id?: string
          install_fee_paid?: boolean
          payment_confirmed?: boolean
          pending_restoration_fee?: boolean
          site_id?: string | null
          total_install_fees_charged?: number
          updated_at?: string
          vendor_id?: string
          widget_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_widget_fees_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "vendor_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          offering_id: string | null
          referrer_url: string | null
          site_id: string | null
          user_agent: string | null
          vendor_id: string
          visitor_fingerprint: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          offering_id?: string | null
          referrer_url?: string | null
          site_id?: string | null
          user_agent?: string | null
          vendor_id: string
          visitor_fingerprint?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          offering_id?: string | null
          referrer_url?: string | null
          site_id?: string | null
          user_agent?: string | null
          vendor_id?: string
          visitor_fingerprint?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      arbitrator_sessions_safe: {
        Row: {
          access_count: number | null
          arbitrator_email: string | null
          arbitrator_name: string | null
          case_bundle_generated: boolean | null
          case_bundle_url: string | null
          created_at: string | null
          dispute_id: string | null
          expires_at: string | null
          id: string | null
          last_accessed_at: string | null
          ruling_anchored: boolean | null
          ruling_distributed: boolean | null
          ruling_file_name: string | null
          ruling_file_url: string | null
          ruling_uploaded_at: string | null
          status: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          access_count?: number | null
          arbitrator_email?: string | null
          arbitrator_name?: string | null
          case_bundle_generated?: boolean | null
          case_bundle_url?: string | null
          created_at?: string | null
          dispute_id?: string | null
          expires_at?: string | null
          id?: string | null
          last_accessed_at?: string | null
          ruling_anchored?: boolean | null
          ruling_distributed?: boolean | null
          ruling_file_name?: string | null
          ruling_file_url?: string | null
          ruling_uploaded_at?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          access_count?: number | null
          arbitrator_email?: string | null
          arbitrator_name?: string | null
          case_bundle_generated?: boolean | null
          case_bundle_url?: string | null
          created_at?: string | null
          dispute_id?: string | null
          expires_at?: string | null
          id?: string | null
          last_accessed_at?: string | null
          ruling_anchored?: boolean | null
          ruling_distributed?: boolean | null
          ruling_file_name?: string | null
          ruling_file_url?: string | null
          ruling_uploaded_at?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arbitrator_sessions_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arbitrator_sessions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_sessions_safe: {
        Row: {
          access_count: number | null
          allowed_tables: string[] | null
          auditor_email: string | null
          auditor_name: string | null
          can_export: boolean | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string | null
          is_active: boolean | null
          last_accessed_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_count?: number | null
          allowed_tables?: string[] | null
          auditor_email?: string | null
          auditor_name?: string | null
          can_export?: boolean | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string | null
          is_active?: boolean | null
          last_accessed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_count?: number | null
          allowed_tables?: string[] | null
          auditor_email?: string | null
          auditor_name?: string | null
          can_export?: boolean | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string | null
          is_active?: boolean | null
          last_accessed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles_counterparty_safe: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          entity_type: string | null
          full_name: string | null
          id: string | null
          status: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          entity_type?: string | null
          full_name?: string | null
          id?: string | null
          status?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          entity_type?: string | null
          full_name?: string | null
          id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      transaction_observers_safe: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string | null
          invite_accepted: boolean | null
          invited_by: string | null
          milestone_ids: string[] | null
          observer_email: string | null
          observer_name: string | null
          observer_role: string | null
          permissions: string[] | null
          transaction_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          invite_accepted?: boolean | null
          invited_by?: string | null
          milestone_ids?: string[] | null
          observer_email?: string | null
          observer_name?: string | null
          observer_role?: string | null
          permissions?: string[] | null
          transaction_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          invite_accepted?: boolean | null
          invited_by?: string | null
          milestone_ids?: string[] | null
          observer_email?: string | null
          observer_name?: string | null
          observer_role?: string | null
          permissions?: string[] | null
          transaction_id?: string | null
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
    }
    Functions: {
      add_admin_account: {
        Args: { _name: string; _username: string }
        Returns: Json
      }
      compute_match_score: {
        Args: { _user_a: string; _user_b: string }
        Returns: Json
      }
      compute_vendor_risk_score: { Args: { _vendor_id: string }; Returns: Json }
      create_system_notification: {
        Args: {
          _action_url?: string
          _is_action_required?: boolean
          _message: string
          _related_entity_id?: string
          _related_entity_type?: string
          _title: string
          _type?: string
          _user_id: string
        }
        Returns: string
      }
      generate_admin_alias: { Args: never; Returns: string }
      generate_temp_password: { Args: never; Returns: string }
      get_arbitrator_session_by_token: {
        Args: { _token: string }
        Returns: {
          arbitrator_name: string
          case_bundle_generated: boolean
          case_bundle_url: string
          created_at: string
          dispute_id: string
          expires_at: string
          id: string
          ruling_anchored: boolean
          ruling_distributed: boolean
          ruling_file_name: string
          ruling_file_url: string
          ruling_uploaded_at: string
          status: string
          transaction_id: string
        }[]
      }
      get_audit_session_by_token: {
        Args: { _token: string }
        Returns: {
          access_count: number
          allowed_tables: string[]
          auditor_name: string
          can_export: boolean
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          last_accessed_at: string
        }[]
      }
      get_contract_audit_trail: {
        Args: { _transaction_id: string }
        Returns: Json
      }
      get_industry_release_days: {
        Args: { p_industry: string }
        Returns: number
      }
      get_lender_license_self: {
        Args: never
        Returns: {
          lending_license_number: string
          license_jurisdiction: string
        }[]
      }
      get_masked_arbitrator_proposals: {
        Args: { _dispute_id: string; _user_id: string }
        Returns: Json[]
      }
      get_recommended_matches: {
        Args: {
          _limit?: number
          _target_role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: {
          avatar_url: string
          company_name: string
          corridor: string
          entity_type: string
          full_name: string
          location: string
          match_breakdown: Json
          match_score: number
          onboarding_industry: string
          user_id: string
        }[]
      }
      get_top_matches: {
        Args: {
          _limit?: number
          _target_role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: {
          avatar_url: string
          company_name: string
          corridor: string
          entity_type: string
          full_name: string
          location: string
          match_breakdown: Json
          match_score: number
          onboarding_industry: string
          user_id: string
        }[]
      }
      get_vendor_claim_by_token: {
        Args: { p_token: string }
        Returns: {
          expires_at: string
          id: string
          status: string
          vendor_name: string
        }[]
      }
      get_vendor_counter_proposals: {
        Args: { _vendor_id: string }
        Returns: Json[]
      }
      get_vendor_rfq_requests: { Args: { _vendor_id: string }; Returns: Json[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_arbitrator_password: { Args: { _password: string }; Returns: string }
      hash_password: { Args: { _password: string }; Returns: string }
      increment_lender_exposure: {
        Args: { p_amount: number; p_lender_id: string }
        Returns: undefined
      }
      route_department_alert: {
        Args: {
          _admin_id?: string
          _alert_type: string
          _entity_id?: string
          _entity_type?: string
          _message: string
          _priority?: string
          _source_dept: string
          _target_dept: string
          _title: string
        }
        Returns: string
      }
      verify_admin_password: {
        Args: { _account_id: string; _password: string }
        Returns: boolean
      }
      verify_admin_temp_password: {
        Args: { _account_id: string; _password: string }
        Returns: boolean
      }
      verify_arbitrator_password: {
        Args: { _password: string; _session_id: string }
        Returns: boolean
      }
      verify_audit_password: {
        Args: { _password: string; _session_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "vendor" | "buyer" | "lender"
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
      app_role: ["admin", "vendor", "buyer", "lender"],
    },
  },
} as const
