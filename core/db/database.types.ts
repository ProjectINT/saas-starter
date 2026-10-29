
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "account_invitations": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"account_id": string,"created_at": string,"declined_at": string | null,"email": string,"expires_at": string,"id": string,"invited_by": string | null,"revoked_at": string | null,"revoked_by": string | null,"role": Database["public"]['Enums']["account_role"],"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"account_id": string,"created_at"?: string,"declined_at"?: string | null,"email": string,"expires_at": string,"id"?: string,"invited_by"?: string | null,"revoked_at"?: string | null,"revoked_by"?: string | null,"role": Database["public"]['Enums']["account_role"],"token_hash": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"account_id"?: string,"created_at"?: string,"declined_at"?: string | null,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"revoked_at"?: string | null,"revoked_by"?: string | null,"role"?: Database["public"]['Enums']["account_role"],"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "account_invitations_accepted_by_fkey"
      columns: ["accepted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "account_invitations_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "account_invitations_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "account_invitations_revoked_by_fkey"
      columns: ["revoked_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"account_members": {
                  Row: {
                    "account_id": string,"created_at": string,"invited_by": string | null,"role": Database["public"]['Enums']["account_role"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id": string,"created_at"?: string,"invited_by"?: string | null,"role"?: Database["public"]['Enums']["account_role"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "account_id"?: string,"created_at"?: string,"invited_by"?: string | null,"role"?: Database["public"]['Enums']["account_role"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "account_members_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "account_members_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "account_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"accounts": {
                  Row: {
                    "created_at": string,"deactivated_at": string | null,"id": string,"logo_path": string | null,"name": string,"owner_id": string,"slug": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deactivated_at"?: string | null,"id"?: string,"logo_path"?: string | null,"name": string,"owner_id": string,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"deactivated_at"?: string | null,"id"?: string,"logo_path"?: string | null,"name"?: string,"owner_id"?: string,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "accounts_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"created_at": string,"email": string | null,"first_name": string | null,"id": string,"last_name": string | null,"locale": string | null,"timezone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"created_at"?: string,"email"?: string | null,"first_name"?: string | null,"id": string,"last_name"?: string | null,"locale"?: string | null,"timezone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "avatar_path"?: string | null,"created_at"?: string,"email"?: string | null,"first_name"?: string | null,"id"?: string,"last_name"?: string | null,"locale"?: string | null,"timezone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"role_permissions": {
                  Row: {
                    "permission": string,"role": Database["public"]['Enums']["account_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "permission": string,"role": Database["public"]['Enums']["account_role"]
                  }
                  Update: {
                    "permission"?: string,"role"?: Database["public"]['Enums']["account_role"]
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invitation":
{ Args: { "p_invitation_id": string }; Returns: {
              "created_at": string,
"deactivated_at": string | null,
"id": string,
"logo_path": string | null,
"name": string,
"owner_id": string,
"slug": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "accounts"
        isOneToOne: true
        isSetofReturn: false
      } },
"change_member_role":
{ Args: { "p_account_id": string,"p_role": Database["public"]['Enums']["account_role"],"p_user_id": string }; Returns: undefined
                           },
"create_account":
{ Args: { "p_name": string,"p_slug": string }; Returns: {
              "created_at": string,
"deactivated_at": string | null,
"id": string,
"logo_path": string | null,
"name": string,
"owner_id": string,
"slug": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "accounts"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_invitation":
{ Args: { "p_account_id": string,"p_email": string,"p_role": Database["public"]['Enums']["account_role"] }; Returns: string
                           },
"decline_invitation":
{ Args: { "p_invitation_id": string }; Returns: undefined
                           },
"delete_account":
{ Args: { "p_account_id": string }; Returns: undefined
                           },
"get_invitation":
{ Args: { "p_token": string }; Returns: {
              "account_name": string,"email": string,"expires_at": string,"id": string,"inviter_name": string,"role": Database["public"]['Enums']["account_role"],"status": string
            }[]
                           },
"leave_account":
{ Args: { "p_account_id": string }; Returns: undefined
                           },
"list_my_invitations":
{ Args: Record<PropertyKey, never>; Returns: {
              "account_name": string,"expires_at": string,"id": string,"inviter_name": string,"role": Database["public"]['Enums']["account_role"]
            }[]
                           },
"remove_member":
{ Args: { "p_account_id": string,"p_user_id": string }; Returns: undefined
                           },
"revoke_invitation":
{ Args: { "p_invitation_id": string }; Returns: undefined
                           },
"transfer_ownership":
{ Args: { "p_account_id": string,"p_new_owner_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "account_role": "owner"|"admin"|"member"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "account_role": ["owner", "admin", "member"]
          }
        }
} as const
