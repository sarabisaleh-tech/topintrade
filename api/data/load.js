// Vercel API Route: Load User Data
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://opgjirekwlgtgatvhwj.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZ2ppcmVrd2xndGdhdHZod2oiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczMTQyMzI3MCwiZXhwIjoyMDQ2OTk5MjcwfQ.6aelrzQIiAwVT_fHSNxgpPr4q5M4-6GZx8-xSUDKyFg';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    });

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Load user data
    const { data, error } = await supabase
      .from('user_data')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const defaultData = {
      backtests: [],
      journals: [],
      folders: [],
      currentBacktest: 0,
      currentJournal: 0,
      savedTags: [],
      pinnedTags: [],
      trackingSessions: [],
      todayAccumulatedTime: 0,
      todayAccumulatedDate: '',
      tradeFormDefaults: {}
    };

    if (!data) {
      return res.status(200).json({ data: defaultData });
    }

    const mappedData = {
      backtests: data.backtests || [],
      journals: data.journals || [],
      folders: data.folders || [],
      currentBacktest: data.current_backtest || 0,
      currentJournal: data.current_journal || 0,
      savedTags: data.saved_tags || [],
      pinnedTags: data.pinned_tags || [],
      trackingSessions: data.tracking_sessions || [],
      todayAccumulatedTime: data.today_accumulated_time || 0,
      todayAccumulatedDate: data.today_accumulated_date || '',
      tradeFormDefaults: data.trade_form_defaults || {},
      lastUpdated: data.updated_at
    };

    return res.status(200).json({ data: mappedData });
  } catch (error) {
    console.error('Load data error:', error);
    return res.status(500).json({ error: error.message });
  }
}
