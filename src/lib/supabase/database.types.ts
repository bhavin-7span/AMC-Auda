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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          challan_enabled: boolean
          id: number
          route_tracking_enabled: boolean
          updated_at: string
        }
        Insert: {
          challan_enabled?: boolean
          id?: number
          route_tracking_enabled?: boolean
          updated_at?: string
        }
        Update: {
          challan_enabled?: boolean
          id?: number
          route_tracking_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      attendance_corrections: {
        Row: {
          after: Json
          before: Json
          corrected_at: string
          corrected_by: string
          id: string
          punch_id: string
          reason: string
        }
        Insert: {
          after: Json
          before: Json
          corrected_at?: string
          corrected_by: string
          id?: string
          punch_id: string
          reason: string
        }
        Update: {
          after?: Json
          before?: Json
          corrected_at?: string
          corrected_by?: string
          id?: string
          punch_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_corrections_punch_id_fkey"
            columns: ["punch_id"]
            isOneToOne: false
            referencedRelation: "attendance_punches"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_punches: {
        Row: {
          accuracy_m: number | null
          attendance_date: string
          captured_offline: boolean
          client_captured_at: string | null
          clock_suspect: boolean
          created_at: string
          device_time: string | null
          distance_to_site_m: number | null
          face_distance: number
          face_model_version: string
          flags: string[]
          id: string
          inside_geofence: boolean
          is_mocked: boolean
          latitude: number
          longitude: number
          punch_type: string
          punched_at: string
          selfie_path: string | null
          shift_id: string | null
          user_id: string
          work_location_id: string | null
        }
        Insert: {
          accuracy_m?: number | null
          attendance_date: string
          captured_offline?: boolean
          client_captured_at?: string | null
          clock_suspect?: boolean
          created_at?: string
          device_time?: string | null
          distance_to_site_m?: number | null
          face_distance: number
          face_model_version: string
          flags?: string[]
          id?: string
          inside_geofence?: boolean
          is_mocked?: boolean
          latitude: number
          longitude: number
          punch_type: string
          punched_at?: string
          selfie_path?: string | null
          shift_id?: string | null
          user_id?: string
          work_location_id?: string | null
        }
        Update: {
          accuracy_m?: number | null
          attendance_date?: string
          captured_offline?: boolean
          client_captured_at?: string | null
          clock_suspect?: boolean
          created_at?: string
          device_time?: string | null
          distance_to_site_m?: number | null
          face_distance?: number
          face_model_version?: string
          flags?: string[]
          id?: string
          inside_geofence?: boolean
          is_mocked?: boolean
          latitude?: number
          longitude?: number
          punch_type?: string
          punched_at?: string
          selfie_path?: string | null
          shift_id?: string | null
          user_id?: string
          work_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_punches_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_punches_work_location_id_fkey"
            columns: ["work_location_id"]
            isOneToOne: false
            referencedRelation: "work_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_rules: {
        Row: {
          count_field_duty_as_work: boolean
          day_end_rule: string
          day_start_rule: string
          deduct_breaks: boolean
          half_day_minutes: number
          id: number
          shift_window_minutes: number
          timezone: string
          updated_at: string
        }
        Insert: {
          count_field_duty_as_work?: boolean
          day_end_rule?: string
          day_start_rule?: string
          deduct_breaks?: boolean
          half_day_minutes?: number
          id?: number
          shift_window_minutes?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          count_field_duty_as_work?: boolean
          day_end_rule?: string
          day_start_rule?: string
          deduct_breaks?: boolean
          half_day_minutes?: number
          id?: number
          shift_window_minutes?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          after: Json | null
          before: Json | null
          client: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          source_ip: unknown
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          after?: Json | null
          before?: Json | null
          client?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          source_ip?: unknown
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          after?: Json | null
          before?: Json | null
          client?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          source_ip?: unknown
        }
        Relationships: []
      }
      challan_types: {
        Row: {
          code: string
          created_at: string
          department_id: string | null
          id: string
          is_active: boolean
          name: string
          name_i18n: Json
          rule_section: string | null
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_i18n?: Json
          rule_section?: string | null
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_i18n?: Json
          rule_section?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "challan_types_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_i18n: Json
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_i18n?: Json
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_i18n?: Json
          sort_order?: number
        }
        Relationships: []
      }
      employee_profiles: {
        Row: {
          created_at: string
          email: string | null
          employee_id: string
          face_embedding: number[] | null
          face_enrolled_at: string | null
          face_image_path: string | null
          face_model_version: string | null
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          employee_id: string
          face_embedding?: number[] | null
          face_enrolled_at?: string | null
          face_image_path?: string | null
          face_model_version?: string | null
          full_name?: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          employee_id?: string
          face_embedding?: number[] | null
          face_enrolled_at?: string | null
          face_image_path?: string | null
          face_model_version?: string | null
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      employee_shifts: {
        Row: {
          created_at: string
          effective_from: string
          id: string
          shift_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          effective_from: string
          id?: string
          shift_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          id?: string
          shift_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_shifts_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_rules: {
        Row: {
          channel: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_i18n: Json
          sort_order: number
          target_role: string
          template_code: string | null
          threshold_minutes: number | null
          trigger: string
          updated_at: string
        }
        Insert: {
          channel: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_i18n?: Json
          sort_order?: number
          target_role?: string
          template_code?: string | null
          threshold_minutes?: number | null
          trigger: string
          updated_at?: string
        }
        Update: {
          channel?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_i18n?: Json
          sort_order?: number
          target_role?: string
          template_code?: string | null
          threshold_minutes?: number | null
          trigger?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_rules_template_code_fkey"
            columns: ["template_code"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["code"]
          },
        ]
      }
      inspection_comments: {
        Row: {
          author_id: string
          body: string
          client_created_at: string | null
          created_at: string
          id: string
          inspection_id: string
        }
        Insert: {
          author_id?: string
          body: string
          client_created_at?: string | null
          created_at?: string
          id: string
          inspection_id: string
        }
        Update: {
          author_id?: string
          body?: string
          client_created_at?: string | null
          created_at?: string
          id?: string
          inspection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_comments_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_events: {
        Row: {
          action: string
          actor_id: string | null
          assigned_to: string | null
          created_at: string
          from_status: string | null
          id: string
          inspection_id: string
          note: string | null
          to_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          assigned_to?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          inspection_id: string
          note?: string | null
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          assigned_to?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          inspection_id?: string
          note?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_events_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_evidence: {
        Row: {
          accuracy_m: number | null
          captured_at: string
          clock_suspect: boolean
          created_at: string
          id: string
          inspection_id: string
          is_mocked: boolean
          latitude: number | null
          longitude: number | null
          media_type: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          accuracy_m?: number | null
          captured_at: string
          clock_suspect?: boolean
          created_at?: string
          id: string
          inspection_id: string
          is_mocked?: boolean
          latitude?: number | null
          longitude?: number | null
          media_type: string
          storage_path: string
          uploaded_by?: string
        }
        Update: {
          accuracy_m?: number | null
          captured_at?: string
          clock_suspect?: boolean
          created_at?: string
          id?: string
          inspection_id?: string
          is_mocked?: boolean
          latitude?: number | null
          longitude?: number | null
          media_type?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_evidence_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_statuses: {
        Row: {
          code: string
          color: string | null
          is_active: boolean
          is_terminal: boolean
          name: string
          name_i18n: Json
          sort_order: number
        }
        Insert: {
          code: string
          color?: string | null
          is_active?: boolean
          is_terminal?: boolean
          name: string
          name_i18n?: Json
          sort_order?: number
        }
        Update: {
          code?: string
          color?: string | null
          is_active?: boolean
          is_terminal?: boolean
          name?: string
          name_i18n?: Json
          sort_order?: number
        }
        Relationships: []
      }
      inspection_transitions: {
        Row: {
          action: string
          actor: string
          from_status: string
          to_status: string
        }
        Insert: {
          action: string
          actor: string
          from_status: string
          to_status: string
        }
        Update: {
          action?: string
          actor?: string
          from_status?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_transitions_from_status_fkey"
            columns: ["from_status"]
            isOneToOne: false
            referencedRelation: "inspection_statuses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "inspection_transitions_to_status_fkey"
            columns: ["to_status"]
            isOneToOne: false
            referencedRelation: "inspection_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      inspection_types: {
        Row: {
          code: string
          created_at: string
          department_id: string | null
          form_schema: Json
          id: string
          is_active: boolean
          min_evidence: number
          name: string
          name_i18n: Json
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          department_id?: string | null
          form_schema?: Json
          id?: string
          is_active?: boolean
          min_evidence?: number
          name: string
          name_i18n?: Json
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          department_id?: string | null
          form_schema?: Json
          id?: string
          is_active?: boolean
          min_evidence?: number
          name?: string
          name_i18n?: Json
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "inspection_types_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          assigned_to: string | null
          captured_offline: boolean
          closed_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          department_id: string
          form_data: Json
          gps_accuracy_m: number | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          inspection_type_id: string
          is_mocked: boolean
          last_op_id: string | null
          latitude: number
          location_name: string | null
          longitude: number
          priority: string
          ref_no: string
          scheduled_at: string
          status: string
          submitted_at: string | null
          supervisor_remarks: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          captured_offline?: boolean
          closed_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          department_id: string
          form_data?: Json
          gps_accuracy_m?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id: string
          inspection_type_id: string
          is_mocked?: boolean
          last_op_id?: string | null
          latitude: number
          location_name?: string | null
          longitude: number
          priority?: string
          ref_no?: string
          scheduled_at?: string
          status: string
          submitted_at?: string | null
          supervisor_remarks?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          captured_offline?: boolean
          closed_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          department_id?: string
          form_data?: Json
          gps_accuracy_m?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          inspection_type_id?: string
          is_mocked?: boolean
          last_op_id?: string | null
          latitude?: number
          location_name?: string | null
          longitude?: number
          priority?: string
          ref_no?: string
          scheduled_at?: string
          status?: string
          submitted_at?: string | null
          supervisor_remarks?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_inspection_type_id_fkey"
            columns: ["inspection_type_id"]
            isOneToOne: false
            referencedRelation: "inspection_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_status_fkey"
            columns: ["status"]
            isOneToOne: false
            referencedRelation: "inspection_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      location_points: {
        Row: {
          accuracy_m: number | null
          activity: string | null
          altitude: number | null
          battery_level: number | null
          event: string | null
          heading: number | null
          id: string
          is_charging: boolean | null
          is_mock: boolean
          is_moving: boolean | null
          latitude: number
          longitude: number
          odometer_m: number | null
          received_at: string
          recorded_at: string
          speed_mps: number | null
          user_id: string
        }
        Insert: {
          accuracy_m?: number | null
          activity?: string | null
          altitude?: number | null
          battery_level?: number | null
          event?: string | null
          heading?: number | null
          id: string
          is_charging?: boolean | null
          is_mock?: boolean
          is_moving?: boolean | null
          latitude: number
          longitude: number
          odometer_m?: number | null
          received_at?: string
          recorded_at: string
          speed_mps?: number | null
          user_id: string
        }
        Update: {
          accuracy_m?: number | null
          activity?: string | null
          altitude?: number | null
          battery_level?: number | null
          event?: string | null
          heading?: number | null
          id?: string
          is_charging?: boolean | null
          is_mock?: boolean
          is_moving?: boolean | null
          latitude?: number
          longitude?: number
          odometer_m?: number | null
          received_at?: string
          recorded_at?: string
          speed_mps?: number | null
          user_id?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body: string
          channel: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          locale: string
          name_i18n: Json
          sort_order: number
          subject: string | null
          updated_at: string
        }
        Insert: {
          body: string
          channel: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          locale?: string
          name_i18n?: Json
          sort_order?: number
          subject?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          locale?: string
          name_i18n?: Json
          sort_order?: number
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          allow_field_duty: boolean
          created_at: string
          early_leave_grace_minutes: number
          end_time: string
          id: string
          is_active: boolean
          is_default: boolean
          late_grace_minutes: number
          max_breaks: number
          min_work_minutes: number
          name: string
          start_time: string
        }
        Insert: {
          allow_field_duty?: boolean
          created_at?: string
          early_leave_grace_minutes?: number
          end_time: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          late_grace_minutes?: number
          max_breaks?: number
          min_work_minutes?: number
          name: string
          start_time: string
        }
        Update: {
          allow_field_duty?: boolean
          created_at?: string
          early_leave_grace_minutes?: number
          end_time?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          late_grace_minutes?: number
          max_breaks?: number
          min_work_minutes?: number
          name?: string
          start_time?: string
        }
        Relationships: []
      }
      staff_roles: {
        Row: {
          department_id: string | null
          role: string
          supervisor_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          department_id?: string | null
          role?: string
          supervisor_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          department_id?: string | null
          role?: string
          supervisor_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          revoked_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          revoked_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      work_locations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          radius_m: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          radius_m: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          radius_m?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_inspection_comment: {
        Args: {
          p_body: string
          p_client_created_at?: string
          p_id: string
          p_inspection_id: string
        }
        Returns: Json
      }
      add_inspection_evidence: { Args: { p: Json }; Returns: Json }
      admin_audit_search: {
        Args: {
          p_action?: string
          p_actor?: string
          p_entity?: string
          p_from?: string
          p_page?: number
          p_page_size?: number
          p_to?: string
        }
        Returns: Json
      }
      admin_bulk_upload_master: {
        Args: { p_rows: Json; p_type: string }
        Returns: Json
      }
      admin_bulk_upload_users: { Args: { p_rows: Json }; Returns: Json }
      admin_correct_attendance: {
        Args: {
          p_inside_geofence?: boolean
          p_punch_id: string
          p_punch_type?: string
          p_punched_at?: string
          p_reason: string
          p_work_location_id?: string
        }
        Returns: {
          accuracy_m: number | null
          attendance_date: string
          captured_offline: boolean
          client_captured_at: string | null
          clock_suspect: boolean
          created_at: string
          device_time: string | null
          distance_to_site_m: number | null
          face_distance: number
          face_model_version: string
          flags: string[]
          id: string
          inside_geofence: boolean
          is_mocked: boolean
          latitude: number
          longitude: number
          punch_type: string
          punched_at: string
          selfie_path: string | null
          shift_id: string | null
          user_id: string
          work_location_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "attendance_punches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_dashboard_widgets: {
        Args: { p_department?: string; p_from?: string; p_to?: string }
        Returns: Json
      }
      admin_list_attendance: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_exceptions_only?: boolean
          p_page?: number
          p_page_size?: number
          p_user?: string
        }
        Returns: Json
      }
      admin_list_inspections: {
        Args: {
          p_assigned_to?: string
          p_department?: string
          p_dir?: string
          p_from?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_sort?: string
          p_status?: string
          p_to?: string
          p_type?: string
        }
        Returns: Json
      }
      admin_list_users: {
        Args: {
          p_department?: string
          p_page?: number
          p_page_size?: number
          p_role?: string
          p_search?: string
        }
        Returns: Json
      }
      admin_log_export: {
        Args: { p_filters: Json; p_format: string; p_report: string }
        Returns: string
      }
      admin_report: {
        Args: {
          p_filters?: Json
          p_page?: number
          p_page_size?: number
          p_report: string
        }
        Returns: Json
      }
      admin_set_master_active: {
        Args: { p_active: boolean; p_id: string; p_type: string }
        Returns: boolean
      }
      admin_set_role: {
        Args: {
          p_department?: string
          p_role: string
          p_supervisor?: string
          p_user_id: string
        }
        Returns: {
          department_id: string | null
          role: string
          supervisor_id: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "staff_roles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_system_health: { Args: never; Returns: Json }
      admin_travel_report: {
        Args: { p_date: string; p_user: string }
        Returns: Json
      }
      admin_update_attendance_rules: {
        Args: { p_payload: Json }
        Returns: {
          count_field_duty_as_work: boolean
          day_end_rule: string
          day_start_rule: string
          deduct_breaks: boolean
          half_day_minutes: number
          id: number
          shift_window_minutes: number
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance_rules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_upsert_employee_profile: {
        Args: {
          p_email?: string
          p_employee_id: string
          p_full_name: string
          p_user_id: string
        }
        Returns: {
          created_at: string
          email: string | null
          employee_id: string
          face_embedding: number[] | null
          face_enrolled_at: string | null
          face_image_path: string | null
          face_model_version: string | null
          full_name: string
          id: string
        }
        SetofOptions: {
          from: "*"
          to: "employee_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_upsert_escalation_rule: {
        Args: { p_payload: Json }
        Returns: {
          channel: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_i18n: Json
          sort_order: number
          target_role: string
          template_code: string | null
          threshold_minutes: number | null
          trigger: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "escalation_rules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_upsert_master: {
        Args: { p_payload: Json; p_type: string }
        Returns: Json
      }
      admin_upsert_notification_template: {
        Args: { p_payload: Json }
        Returns: {
          body: string
          channel: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          locale: string
          name_i18n: Json
          sort_order: number
          subject: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_templates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_inspection: {
        Args: {
          p_assignee: string
          p_event_id?: string
          p_id: string
          p_note?: string
        }
        Returns: Json
      }
      attendance_resolve: {
        Args: { p_time: string; p_user: string }
        Returns: {
          attendance_date: string
          shift_id: string
        }[]
      }
      attendance_shift_for: {
        Args: { p_date: string; p_user: string }
        Returns: {
          allow_field_duty: boolean
          created_at: string
          early_leave_grace_minutes: number
          end_time: string
          id: string
          is_active: boolean
          is_default: boolean
          late_grace_minutes: number
          max_breaks: number
          min_work_minutes: number
          name: string
          start_time: string
        }
        SetofOptions: {
          from: "*"
          to: "shifts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_own_employee_profile: {
        Args: { p_employee_id: string }
        Returns: undefined
      }
      get_assignable_staff: { Args: never; Returns: Json }
      get_inspection_detail: { Args: { p_id: string }; Returns: Json }
      get_inspection_masters: { Args: never; Returns: Json }
      get_inspections: {
        Args: {
          p_after_id?: string
          p_after_updated?: string
          p_limit?: number
        }
        Returns: Json
      }
      get_my_attendance_context: { Args: never; Returns: Json }
      get_team_locations: { Args: never; Returns: Json }
      ingest_location_points: { Args: { "": Json }; Returns: Json }
      inspection_can_manage: {
        Args: {
          p_assigned_to: string
          p_created_by: string
          p_department: string
        }
        Returns: boolean
      }
      inspection_can_manage_staff: {
        Args: { p_user: string }
        Returns: boolean
      }
      inspection_can_view: {
        Args: {
          p_assigned_to: string
          p_created_by: string
          p_department: string
        }
        Returns: boolean
      }
      inspection_evidence_readable: {
        Args: { p_name: string }
        Returns: boolean
      }
      inspection_is_owner: {
        Args: { p_assigned_to: string; p_created_by: string }
        Returns: boolean
      }
      inspection_json: { Args: { p_id: string }; Returns: Json }
      inspection_manager_actions: {
        Args: { p_from_status: string }
        Returns: Json
      }
      inspection_role: { Args: never; Returns: string }
      is_employee_id_available: {
        Args: { p_employee_id: string }
        Returns: boolean
      }
      issue_tracking_token: { Args: never; Returns: Json }
      revoke_my_tracking_tokens: { Args: never; Returns: undefined }
      save_inspection: { Args: { p: Json }; Returns: Json }
      set_own_face_embedding: {
        Args: { p_embedding: number[]; p_model_version: string }
        Returns: undefined
      }
      transition_inspection: {
        Args: {
          p_action: string
          p_event_id?: string
          p_id: string
          p_note?: string
        }
        Returns: Json
      }
      write_audit_log: {
        Args: {
          p_action: string
          p_after?: Json
          p_before?: Json
          p_client?: string
          p_entity: string
          p_entity_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
