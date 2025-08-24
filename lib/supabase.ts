import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fihvdvlhftcxhlnocqiq.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpaHZkdmxoZnRjeGhsbm9jcWlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NzYyNzMsImV4cCI6MjA3MDI1MjI3M30.Av4RxV-0kZrSmbYqPYHQO9n7Ckq2t_kWxnHw2eFv2Zg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)