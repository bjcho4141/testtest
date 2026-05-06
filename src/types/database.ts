/**
 * Supabase Database 타입 stub
 *
 * 실제 타입은 마이그레이션 적용 후 아래 명령으로 자동 생성:
 *   npx supabase gen types typescript --linked > src/types/database.ts
 *
 * 현재는 빌드 통과용 최소 stub. 적용 후 이 파일 전체 교체.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          kakao_id: string | null;
          role: "viewer" | "operator" | "admin" | "superadmin";
          paid_until: string | null;
          subscription_status:
            | "none"
            | "active"
            | "past_due"
            | "canceled"
            | "expired";
          active_subscription_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          kakao_id?: string | null;
          role?: "viewer" | "operator" | "admin" | "superadmin";
          paid_until?: string | null;
          subscription_status?:
            | "none"
            | "active"
            | "past_due"
            | "canceled"
            | "expired";
          active_subscription_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          kakao_id?: string | null;
          role?: "viewer" | "operator" | "admin" | "superadmin";
          paid_until?: string | null;
          subscription_status?:
            | "none"
            | "active"
            | "past_due"
            | "canceled"
            | "expired";
          active_subscription_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_paid: {
        Args: { uid: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
