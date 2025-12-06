export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            Term: {
                Row: {
                    id: number
                    name: string
                    aliases: string[] | null
                    created_at: string
                }
                Insert: {
                    id?: number
                    name: string
                    aliases?: string[] | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    name?: string
                    aliases?: string[] | null
                    created_at?: string
                }
            }
            Translation: {
                Row: {
                    id: number
                    term_id: number
                    text: string
                    is_preferred: boolean | null
                    usage: string | null
                    created_at: string
                }
                Insert: {
                    id?: number
                    term_id: number
                    text: string
                    is_preferred?: boolean | null
                    usage?: string | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    term_id?: number
                    text?: string
                    is_preferred?: boolean | null
                    usage?: string | null
                    created_at?: string
                }
            }
        }
    }
}
