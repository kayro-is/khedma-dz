// Fichier généré par « pnpm cloud test types » — ne pas modifier à la main.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string;
          admin_id: string | null;
          created_at: string;
          details: Json;
          id: number;
          target_id: string | null;
          target_table: string | null;
        };
        Insert: {
          action: string;
          admin_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: never;
          target_id?: string | null;
          target_table?: string | null;
        };
        Update: {
          action?: string;
          admin_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: never;
          target_id?: string | null;
          target_table?: string | null;
        };
        Relationships: [];
      };
      artisan_profiles: {
        Row: {
          availability: Database['public']['Enums']['artisan_availability'];
          base_commune_id: number;
          business_name: string;
          created_at: string;
          description: string | null;
          is_published: boolean;
          primary_category_id: string;
          professional_phone: string | null;
          rating_avg: number | null;
          review_count: number;
          service_radius_km: number;
          updated_at: string;
          user_id: string;
          verification_status: Database['public']['Enums']['verification_status'];
          verified_at: string | null;
          years_experience: number | null;
        };
        Insert: {
          availability?: Database['public']['Enums']['artisan_availability'];
          base_commune_id: number;
          business_name: string;
          created_at?: string;
          description?: string | null;
          is_published?: boolean;
          primary_category_id: string;
          professional_phone?: string | null;
          rating_avg?: number | null;
          review_count?: number;
          service_radius_km?: number;
          updated_at?: string;
          user_id: string;
          verification_status?: Database['public']['Enums']['verification_status'];
          verified_at?: string | null;
          years_experience?: number | null;
        };
        Update: {
          availability?: Database['public']['Enums']['artisan_availability'];
          base_commune_id?: number;
          business_name?: string;
          created_at?: string;
          description?: string | null;
          is_published?: boolean;
          primary_category_id?: string;
          professional_phone?: string | null;
          rating_avg?: number | null;
          review_count?: number;
          service_radius_km?: number;
          updated_at?: string;
          user_id?: string;
          verification_status?: Database['public']['Enums']['verification_status'];
          verified_at?: string | null;
          years_experience?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'artisan_profiles_base_commune_id_fkey';
            columns: ['base_commune_id'];
            isOneToOne: false;
            referencedRelation: 'communes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'artisan_profiles_primary_category_id_fkey';
            columns: ['primary_category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'artisan_profiles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      artisan_service_areas: {
        Row: {
          artisan_id: string;
          commune_id: number;
          created_at: string;
        };
        Insert: {
          artisan_id: string;
          commune_id: number;
          created_at?: string;
        };
        Update: {
          artisan_id?: string;
          commune_id?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'artisan_service_areas_artisan_id_fkey';
            columns: ['artisan_id'];
            isOneToOne: false;
            referencedRelation: 'artisan_profiles';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'artisan_service_areas_commune_id_fkey';
            columns: ['commune_id'];
            isOneToOne: false;
            referencedRelation: 'communes';
            referencedColumns: ['id'];
          },
        ];
      };
      artisan_services: {
        Row: {
          artisan_id: string;
          category_id: string;
          created_at: string;
          description: string | null;
          price_from: number | null;
        };
        Insert: {
          artisan_id: string;
          category_id: string;
          created_at?: string;
          description?: string | null;
          price_from?: number | null;
        };
        Update: {
          artisan_id?: string;
          category_id?: string;
          created_at?: string;
          description?: string | null;
          price_from?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'artisan_services_artisan_id_fkey';
            columns: ['artisan_id'];
            isOneToOne: false;
            referencedRelation: 'artisan_profiles';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'artisan_services_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name_ar: string;
          name_fr: string;
          search_terms: string[];
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name_ar: string;
          name_fr: string;
          search_terms?: string[];
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name_ar?: string;
          name_fr?: string;
          search_terms?: string[];
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      communes: {
        Row: {
          centroid: unknown;
          created_at: string;
          id: number;
          is_active: boolean;
          name_ar: string;
          name_fr: string;
          official_code: string | null;
          updated_at: string;
          wilaya_id: number;
        };
        Insert: {
          centroid?: unknown;
          created_at?: string;
          id?: never;
          is_active?: boolean;
          name_ar: string;
          name_fr: string;
          official_code?: string | null;
          updated_at?: string;
          wilaya_id: number;
        };
        Update: {
          centroid?: unknown;
          created_at?: string;
          id?: never;
          is_active?: boolean;
          name_ar?: string;
          name_fr?: string;
          official_code?: string | null;
          updated_at?: string;
          wilaya_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'communes_wilaya_id_fkey';
            columns: ['wilaya_id'];
            isOneToOne: false;
            referencedRelation: 'wilayas';
            referencedColumns: ['id'];
          },
        ];
      };
      conversation_members: {
        Row: {
          conversation_id: string;
          created_at: string;
          last_read_at: string | null;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          created_at?: string;
          last_read_at?: string | null;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          created_at?: string;
          last_read_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversation_members_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversation_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          last_message_at: string | null;
          pair_key: string;
          request_id: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          last_message_at?: string | null;
          pair_key: string;
          request_id?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          last_message_at?: string | null;
          pair_key?: string;
          request_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      favorites: {
        Row: {
          artisan_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          artisan_id: string;
          created_at?: string;
          user_id?: string;
        };
        Update: {
          artisan_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'favorites_artisan_id_fkey';
            columns: ['artisan_id'];
            isOneToOne: false;
            referencedRelation: 'artisan_profiles';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'favorites_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      jobs: {
        Row: {
          agreed_amount: number;
          artisan_id: string | null;
          client_id: string | null;
          completed_at: string | null;
          completion_declared_at: string | null;
          created_at: string;
          id: string;
          proposal_id: string | null;
          request_id: string | null;
          status: Database['public']['Enums']['job_status'];
          updated_at: string;
        };
        Insert: {
          agreed_amount: number;
          artisan_id?: string | null;
          client_id?: string | null;
          completed_at?: string | null;
          completion_declared_at?: string | null;
          created_at?: string;
          id?: string;
          proposal_id?: string | null;
          request_id?: string | null;
          status?: Database['public']['Enums']['job_status'];
          updated_at?: string;
        };
        Update: {
          agreed_amount?: number;
          artisan_id?: string | null;
          client_id?: string | null;
          completed_at?: string | null;
          completion_declared_at?: string | null;
          created_at?: string;
          id?: string;
          proposal_id?: string | null;
          request_id?: string | null;
          status?: Database['public']['Enums']['job_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'jobs_artisan_id_fkey';
            columns: ['artisan_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'jobs_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'jobs_proposal_id_fkey';
            columns: ['proposal_id'];
            isOneToOne: true;
            referencedRelation: 'proposals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'jobs_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: true;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          attachment_mime: string | null;
          attachment_path: string | null;
          body: string | null;
          client_message_id: string;
          conversation_id: string;
          created_at: string;
          id: string;
          sender_id: string | null;
        };
        Insert: {
          attachment_mime?: string | null;
          attachment_path?: string | null;
          body?: string | null;
          client_message_id: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          sender_id?: string | null;
        };
        Update: {
          attachment_mime?: string | null;
          attachment_path?: string | null;
          body?: string | null;
          client_message_id?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          sender_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_preferences: {
        Row: {
          job_updates: boolean;
          new_local_requests: boolean;
          new_message: boolean;
          new_proposal: boolean;
          proposal_updates: boolean;
          push_enabled: boolean;
          review_updates: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          job_updates?: boolean;
          new_local_requests?: boolean;
          new_message?: boolean;
          new_proposal?: boolean;
          proposal_updates?: boolean;
          push_enabled?: boolean;
          review_updates?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          job_updates?: boolean;
          new_local_requests?: boolean;
          new_message?: boolean;
          new_proposal?: boolean;
          proposal_updates?: boolean;
          push_enabled?: boolean;
          review_updates?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          data: Json;
          id: string;
          read_at: string | null;
          type: Database['public']['Enums']['notification_type'];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          data?: Json;
          id?: string;
          read_at?: string | null;
          type: Database['public']['Enums']['notification_type'];
          user_id: string;
        };
        Update: {
          created_at?: string;
          data?: Json;
          id?: string;
          read_at?: string | null;
          type?: Database['public']['Enums']['notification_type'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      portfolio_images: {
        Row: {
          created_at: string;
          id: string;
          item_id: string;
          sort_order: number;
          storage_path: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_id: string;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'portfolio_images_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'portfolio_items';
            referencedColumns: ['id'];
          },
        ];
      };
      portfolio_items: {
        Row: {
          artisan_id: string;
          category_id: string | null;
          created_at: string;
          description: string | null;
          done_on: string | null;
          id: string;
          sort_order: number;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          artisan_id: string;
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          done_on?: string | null;
          id?: string;
          sort_order?: number;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          artisan_id?: string;
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          done_on?: string | null;
          id?: string;
          sort_order?: number;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'portfolio_items_artisan_id_fkey';
            columns: ['artisan_id'];
            isOneToOne: false;
            referencedRelation: 'artisan_profiles';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'portfolio_items_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_private: {
        Row: {
          commune_id: number | null;
          created_at: string;
          locale: Database['public']['Enums']['locale_code'];
          phone: string | null;
          phone_verified_at: string | null;
          terms_accepted_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          commune_id?: number | null;
          created_at?: string;
          locale?: Database['public']['Enums']['locale_code'];
          phone?: string | null;
          phone_verified_at?: string | null;
          terms_accepted_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          commune_id?: number | null;
          created_at?: string;
          locale?: Database['public']['Enums']['locale_code'];
          phone?: string | null;
          phone_verified_at?: string | null;
          terms_accepted_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_private_commune_id_fkey';
            columns: ['commune_id'];
            isOneToOne: false;
            referencedRelation: 'communes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_private_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          first_name: string;
          id: string;
          last_name: string;
          status: Database['public']['Enums']['account_status'];
          suspended_at: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          first_name: string;
          id: string;
          last_name: string;
          status?: Database['public']['Enums']['account_status'];
          suspended_at?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          first_name?: string;
          id?: string;
          last_name?: string;
          status?: Database['public']['Enums']['account_status'];
          suspended_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      proposals: {
        Row: {
          amount: number;
          artisan_id: string;
          conditions: string | null;
          created_at: string;
          estimated_days: number;
          id: string;
          message: string;
          request_id: string;
          responded_at: string | null;
          status: Database['public']['Enums']['proposal_status'];
          updated_at: string;
          withdrawn_at: string | null;
        };
        Insert: {
          amount: number;
          artisan_id?: string;
          conditions?: string | null;
          created_at?: string;
          estimated_days: number;
          id?: string;
          message: string;
          request_id: string;
          responded_at?: string | null;
          status?: Database['public']['Enums']['proposal_status'];
          updated_at?: string;
          withdrawn_at?: string | null;
        };
        Update: {
          amount?: number;
          artisan_id?: string;
          conditions?: string | null;
          created_at?: string;
          estimated_days?: number;
          id?: string;
          message?: string;
          request_id?: string;
          responded_at?: string | null;
          status?: Database['public']['Enums']['proposal_status'];
          updated_at?: string;
          withdrawn_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'proposals_artisan_id_fkey';
            columns: ['artisan_id'];
            isOneToOne: false;
            referencedRelation: 'artisan_profiles';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'proposals_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      push_tokens: {
        Row: {
          created_at: string;
          id: string;
          last_seen_at: string;
          platform: string;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_seen_at?: string;
          platform: string;
          token: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_seen_at?: string;
          platform?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          details: string | null;
          handled_at: string | null;
          handled_by: string | null;
          id: string;
          reason_code: string;
          reporter_id: string | null;
          resolution_note: string | null;
          status: Database['public']['Enums']['report_status'];
          target_id: string;
          target_type: Database['public']['Enums']['report_target'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          details?: string | null;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          reason_code: string;
          reporter_id?: string | null;
          resolution_note?: string | null;
          status?: Database['public']['Enums']['report_status'];
          target_id: string;
          target_type: Database['public']['Enums']['report_target'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          reason_code?: string;
          reporter_id?: string | null;
          resolution_note?: string | null;
          status?: Database['public']['Enums']['report_status'];
          target_id?: string;
          target_type?: Database['public']['Enums']['report_target'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_handled_by_fkey';
            columns: ['handled_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      request_images: {
        Row: {
          created_at: string;
          id: string;
          request_id: string;
          sort_order: number;
          storage_path: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          request_id: string;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          request_id?: string;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'request_images_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      reviews: {
        Row: {
          artisan_id: string;
          artisan_replied_at: string | null;
          artisan_reply: string | null;
          author_id: string | null;
          comment: string | null;
          created_at: string;
          id: string;
          job_id: string;
          rating: number;
          status: Database['public']['Enums']['review_status'];
          updated_at: string;
        };
        Insert: {
          artisan_id: string;
          artisan_replied_at?: string | null;
          artisan_reply?: string | null;
          author_id?: string | null;
          comment?: string | null;
          created_at?: string;
          id?: string;
          job_id: string;
          rating: number;
          status?: Database['public']['Enums']['review_status'];
          updated_at?: string;
        };
        Update: {
          artisan_id?: string;
          artisan_replied_at?: string | null;
          artisan_reply?: string | null;
          author_id?: string | null;
          comment?: string | null;
          created_at?: string;
          id?: string;
          job_id?: string;
          rating?: number;
          status?: Database['public']['Enums']['review_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_artisan_id_fkey';
            columns: ['artisan_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: true;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      service_request_private: {
        Row: {
          address_details: string | null;
          created_at: string;
          location: unknown;
          request_id: string;
          updated_at: string;
        };
        Insert: {
          address_details?: string | null;
          created_at?: string;
          location?: unknown;
          request_id: string;
          updated_at?: string;
        };
        Update: {
          address_details?: string | null;
          created_at?: string;
          location?: unknown;
          request_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'service_request_private_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: true;
            referencedRelation: 'service_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      service_requests: {
        Row: {
          budget_amount: number | null;
          cancelled_at: string | null;
          category_id: string;
          client_id: string;
          commune_id: number;
          created_at: string;
          description: string;
          id: string;
          status: Database['public']['Enums']['service_request_status'];
          title: string;
          updated_at: string;
          urgency: Database['public']['Enums']['request_urgency'];
        };
        Insert: {
          budget_amount?: number | null;
          cancelled_at?: string | null;
          category_id: string;
          client_id?: string;
          commune_id: number;
          created_at?: string;
          description: string;
          id?: string;
          status?: Database['public']['Enums']['service_request_status'];
          title: string;
          updated_at?: string;
          urgency?: Database['public']['Enums']['request_urgency'];
        };
        Update: {
          budget_amount?: number | null;
          cancelled_at?: string | null;
          category_id?: string;
          client_id?: string;
          commune_id?: number;
          created_at?: string;
          description?: string;
          id?: string;
          status?: Database['public']['Enums']['service_request_status'];
          title?: string;
          updated_at?: string;
          urgency?: Database['public']['Enums']['request_urgency'];
        };
        Relationships: [
          {
            foreignKeyName: 'service_requests_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_requests_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_requests_commune_id_fkey';
            columns: ['commune_id'];
            isOneToOne: false;
            referencedRelation: 'communes';
            referencedColumns: ['id'];
          },
        ];
      };
      user_blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id?: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_blocks_blocked_id_fkey';
            columns: ['blocked_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_blocks_blocker_id_fkey';
            columns: ['blocker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          role: Database['public']['Enums']['business_role'];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          role: Database['public']['Enums']['business_role'];
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database['public']['Enums']['business_role'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_roles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      verification_requests: {
        Row: {
          artisan_id: string;
          created_at: string;
          document_paths: string[];
          id: string;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database['public']['Enums']['verification_request_status'];
        };
        Insert: {
          artisan_id?: string;
          created_at?: string;
          document_paths: string[];
          id?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['verification_request_status'];
        };
        Update: {
          artisan_id?: string;
          created_at?: string;
          document_paths?: string[];
          id?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['verification_request_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'verification_requests_artisan_id_fkey';
            columns: ['artisan_id'];
            isOneToOne: false;
            referencedRelation: 'artisan_profiles';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'verification_requests_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      wilayas: {
        Row: {
          centroid: unknown;
          code: string;
          created_at: string;
          id: number;
          is_active: boolean;
          name_ar: string;
          name_fr: string;
          updated_at: string;
        };
        Insert: {
          centroid?: unknown;
          code: string;
          created_at?: string;
          id: number;
          is_active?: boolean;
          name_ar: string;
          name_fr: string;
          updated_at?: string;
        };
        Update: {
          centroid?: unknown;
          code?: string;
          created_at?: string;
          id?: number;
          is_active?: boolean;
          name_ar?: string;
          name_fr?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      delete_my_account: { Args: never; Returns: undefined };
      get_my_professional_phone: { Args: never; Returns: string };
      reorder_my_portfolio: {
        Args: { p_item_ids: string[] };
        Returns: undefined;
      };
      start_conversation: {
        Args: { p_other_user_id: string; p_request_id?: string };
        Returns: string;
      };
    };
    Enums: {
      account_status: 'ACTIVE' | 'SUSPENDED';
      artisan_availability: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
      business_role: 'PARTICULIER' | 'ARTISAN';
      job_status: 'IN_PROGRESS' | 'COMPLETION_DECLARED' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED';
      locale_code: 'fr' | 'ar';
      notification_type:
        | 'NEW_PROPOSAL'
        | 'PROPOSAL_UPDATED'
        | 'PROPOSAL_ACCEPTED'
        | 'NEW_MESSAGE'
        | 'NEW_LOCAL_REQUEST'
        | 'JOB_COMPLETION_DECLARED'
        | 'JOB_COMPLETED'
        | 'REVIEW_REQUEST'
        | 'NEW_REVIEW'
        | 'VERIFICATION_RESULT'
        | 'SYSTEM';
      proposal_status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
      report_status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
      report_target:
        'USER' | 'ARTISAN_PROFILE' | 'SERVICE_REQUEST' | 'REVIEW' | 'MESSAGE' | 'CONVERSATION';
      request_urgency: 'LOW' | 'NORMAL' | 'URGENT';
      review_status: 'PUBLISHED' | 'HIDDEN';
      service_request_status:
        'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
      verification_request_status: 'PENDING' | 'APPROVED' | 'REJECTED';
      verification_status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      account_status: ['ACTIVE', 'SUSPENDED'],
      artisan_availability: ['AVAILABLE', 'BUSY', 'UNAVAILABLE'],
      business_role: ['PARTICULIER', 'ARTISAN'],
      job_status: ['IN_PROGRESS', 'COMPLETION_DECLARED', 'COMPLETED', 'DISPUTED', 'CANCELLED'],
      locale_code: ['fr', 'ar'],
      notification_type: [
        'NEW_PROPOSAL',
        'PROPOSAL_UPDATED',
        'PROPOSAL_ACCEPTED',
        'NEW_MESSAGE',
        'NEW_LOCAL_REQUEST',
        'JOB_COMPLETION_DECLARED',
        'JOB_COMPLETED',
        'REVIEW_REQUEST',
        'NEW_REVIEW',
        'VERIFICATION_RESULT',
        'SYSTEM',
      ],
      proposal_status: ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'],
      report_status: ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'],
      report_target: [
        'USER',
        'ARTISAN_PROFILE',
        'SERVICE_REQUEST',
        'REVIEW',
        'MESSAGE',
        'CONVERSATION',
      ],
      request_urgency: ['LOW', 'NORMAL', 'URGENT'],
      review_status: ['PUBLISHED', 'HIDDEN'],
      service_request_status: [
        'OPEN',
        'ASSIGNED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'DISPUTED',
      ],
      verification_request_status: ['PENDING', 'APPROVED', 'REJECTED'],
      verification_status: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'],
    },
  },
} as const;
