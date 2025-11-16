// Supabase Configuration
import { createClient } from '@supabase/supabase-js'

// Supabase URL و anon key از dashboard
const supabaseUrl = 'https://opgjirekwlgtgatvhwj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZ2ppcmVrd2xndGdhdHZod2oiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczMTQyMzI3MCwiZXhwIjoyMDQ2OTk5MjcwfQ.6aelrzQIiAwVT_fHSNxgpPr4q5M4-6GZx8-xSUDKyFg'

// ساخت Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase
