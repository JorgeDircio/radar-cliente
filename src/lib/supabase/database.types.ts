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
      activities: {
        Row: {
          content: string
          id: string
          lead_id: string
          occurred_at: string
          owner_id: string
          type: Database["public"]["Enums"]["activity_type"]
        }
        Insert: {
          content: string
          id?: string
          lead_id: string
          occurred_at?: string
          owner_id?: string
          type: Database["public"]["Enums"]["activity_type"]
        }
        Update: {
          content?: string
          id?: string
          lead_id?: string
          occurred_at?: string
          owner_id?: string
          type?: Database["public"]["Enums"]["activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          business_status: string | null
          created_at: string
          denue_id: string | null
          email: string | null
          entidad: string | null
          estrato: string | null
          id: string
          lat: number | null
          lng: number | null
          municipio: string | null
          name: string
          name_normalized: string | null
          phone: string | null
          place_id: string | null
          places_fetched_at: string | null
          places_payload: Json | null
          rating: number | null
          reviews_count: number | null
          scian_code: string | null
          scian_label: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_status?: string | null
          created_at?: string
          denue_id?: string | null
          email?: string | null
          entidad?: string | null
          estrato?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          municipio?: string | null
          name: string
          name_normalized?: string | null
          phone?: string | null
          place_id?: string | null
          places_fetched_at?: string | null
          places_payload?: Json | null
          rating?: number | null
          reviews_count?: number | null
          scian_code?: string | null
          scian_label?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_status?: string | null
          created_at?: string
          denue_id?: string | null
          email?: string | null
          entidad?: string | null
          estrato?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          municipio?: string | null
          name?: string
          name_normalized?: string | null
          phone?: string | null
          place_id?: string | null
          places_fetched_at?: string | null
          places_payload?: Json | null
          rating?: number | null
          reviews_count?: number | null
          scian_code?: string | null
          scian_label?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          business_id: string
          created_at: string
          estimated_value: number | null
          id: string
          lost_reason: string | null
          next_action_at: string | null
          owner_id: string
          priority: number
          stage: Database["public"]["Enums"]["lead_stage"]
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          estimated_value?: number | null
          id?: string
          lost_reason?: string | null
          next_action_at?: string | null
          owner_id?: string
          priority?: number
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          estimated_value?: number | null
          id?: string
          lost_reason?: string | null
          next_action_at?: string | null
          owner_id?: string
          priority?: number
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_jobs: {
        Row: {
          attempts: number
          created_at: string
          id: number
          last_error: string | null
          lock_token: string | null
          locked_at: string | null
          max_attempts: number
          owner_id: string
          payload: Json
          run_after: string
          search_id: string | null
          status: Database["public"]["Enums"]["job_status"]
          type: Database["public"]["Enums"]["job_type"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: never
          last_error?: string | null
          lock_token?: string | null
          locked_at?: string | null
          max_attempts?: number
          owner_id?: string
          payload: Json
          run_after?: string
          search_id?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          type: Database["public"]["Enums"]["job_type"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: never
          last_error?: string | null
          lock_token?: string | null
          locked_at?: string | null
          max_attempts?: number
          owner_id?: string
          payload?: Json
          run_after?: string
          search_id?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          type?: Database["public"]["Enums"]["job_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_jobs_search_owner_fk"
            columns: ["search_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      scores: {
        Row: {
          business_id: string
          computed_at: string
          opportunity: number
          suggested_offer: Database["public"]["Enums"]["suggested_offer"]
          total: number | null
          viability: number
        }
        Insert: {
          business_id: string
          computed_at?: string
          opportunity: number
          suggested_offer: Database["public"]["Enums"]["suggested_offer"]
          total?: number | null
          viability: number
        }
        Update: {
          business_id?: string
          computed_at?: string
          opportunity?: number
          suggested_offer?: Database["public"]["Enums"]["suggested_offer"]
          total?: number | null
          viability?: number
        }
        Relationships: [
          {
            foreignKeyName: "scores_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      search_results: {
        Row: {
          business_id: string
          found_at: string
          search_id: string
        }
        Insert: {
          business_id: string
          found_at?: string
          search_id: string
        }
        Update: {
          business_id?: string
          found_at?: string
          search_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_results_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_results_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      searches: {
        Row: {
          auto_rescan: boolean
          center_lat: number | null
          center_lng: number | null
          created_at: string
          entidad: string | null
          id: string
          keywords: string
          last_run_at: string | null
          max_results: number
          municipio: string | null
          owner_id: string
          radius_m: number | null
          status: string
        }
        Insert: {
          auto_rescan?: boolean
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          entidad?: string | null
          id?: string
          keywords: string
          last_run_at?: string | null
          max_results?: number
          municipio?: string | null
          owner_id?: string
          radius_m?: number | null
          status?: string
        }
        Update: {
          auto_rescan?: boolean
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          entidad?: string | null
          id?: string
          keywords?: string
          last_run_at?: string | null
          max_results?: number
          municipio?: string | null
          owner_id?: string
          radius_m?: number | null
          status?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          owner_id: string
          places_monthly_budget: number
          scoring_weights: Json
          updated_at: string
        }
        Insert: {
          owner_id?: string
          places_monthly_budget?: number
          scoring_weights?: Json
          updated_at?: string
        }
        Update: {
          owner_id?: string
          places_monthly_budget?: number
          scoring_weights?: Json
          updated_at?: string
        }
        Relationships: []
      }
      signals: {
        Row: {
          business_id: string
          code: string
          created_at: string
          evidence: Json
          id: string
          type: Database["public"]["Enums"]["signal_type"]
          weight: number
        }
        Insert: {
          business_id: string
          code: string
          created_at?: string
          evidence?: Json
          id?: string
          type: Database["public"]["Enums"]["signal_type"]
          weight: number
        }
        Update: {
          business_id?: string
          code?: string
          created_at?: string
          evidence?: Json
          id?: string
          type?: Database["public"]["Enums"]["signal_type"]
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "signals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      website_audits: {
        Row: {
          business_id: string
          copyright_year: number | null
          features: Json | null
          fetched_at: string
          https: boolean | null
          id: string
          psi_scores: Json | null
          reachable: boolean
          responsive: boolean | null
          tech: Json | null
          url: string
        }
        Insert: {
          business_id: string
          copyright_year?: number | null
          features?: Json | null
          fetched_at?: string
          https?: boolean | null
          id?: string
          psi_scores?: Json | null
          reachable: boolean
          responsive?: boolean | null
          tech?: Json | null
          url: string
        }
        Update: {
          business_id?: string
          copyright_year?: number | null
          features?: Json | null
          fetched_at?: string
          https?: boolean | null
          id?: string
          psi_scores?: Json | null
          reachable?: boolean
          responsive?: boolean | null
          tech?: Json | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_audits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_scan_jobs: {
        Args: { p_limit?: number; p_search_id?: string; p_type?: Database["public"]["Enums"]["job_type"] }
        Returns: {
          attempts: number
          created_at: string
          id: number
          last_error: string | null
          lock_token: string | null
          locked_at: string | null
          max_attempts: number
          owner_id: string
          payload: Json
          run_after: string
          search_id: string | null
          status: Database["public"]["Enums"]["job_status"]
          type: Database["public"]["Enums"]["job_type"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "scan_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_discovery_job: {
        Args: {
          p_businesses: Json
          p_job_id: number
          p_lock_token: string
          p_next_start?: number
        }
        Returns: undefined
      }
      complete_audit_job: {
        Args: {
          p_audit: Json
          p_job_id: number
          p_lock_token: string
          p_score: Json
          p_signals: Json
        }
        Returns: undefined
      }
      create_discovery_search: {
        Args: { p_entidad: string; p_keywords: string; p_max_results: number }
        Returns: string
      }
      enqueue_audit_jobs: {
        Args: { p_search_id: string }
        Returns: undefined
      }
      fail_discovery_job: {
        Args: {
          p_job_id: number
          p_lock_token: string
          p_message: string
          p_retry_seconds?: number
        }
        Returns: undefined
      }
      invoke_worker: { Args: never; Returns: undefined }
      retry_discovery_search: {
        Args: { p_search_id: string }
        Returns: undefined
      }
      unaccent_immutable: { Args: { "": string }; Returns: string }
    }
    Enums: {
      activity_type:
        | "nota"
        | "llamada"
        | "whatsapp"
        | "email"
        | "propuesta"
        | "reunion"
      job_status: "pending" | "running" | "done" | "failed"
      job_type: "discover" | "enrich" | "audit" | "score"
      lead_stage:
        | "nuevo"
        | "calificado"
        | "contactado"
        | "propuesta"
        | "ganado"
        | "perdido"
      signal_type: "sin_web" | "web_mala" | "procesos_manuales" | "actividad"
      suggested_offer: "landing" | "rediseno" | "sistema_a_medida" | "ninguna"
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
      activity_type: [
        "nota",
        "llamada",
        "whatsapp",
        "email",
        "propuesta",
        "reunion",
      ],
      job_status: ["pending", "running", "done", "failed"],
      job_type: ["discover", "enrich", "audit", "score"],
      lead_stage: [
        "nuevo",
        "calificado",
        "contactado",
        "propuesta",
        "ganado",
        "perdido",
      ],
      signal_type: ["sin_web", "web_mala", "procesos_manuales", "actividad"],
      suggested_offer: ["landing", "rediseno", "sistema_a_medida", "ninguna"],
    },
  },
} as const
