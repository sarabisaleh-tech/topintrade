// Vercel API Route: Save User Data
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://opgjirekwlgtgatvhwj.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZ2ppcmVrd2xndGdhdHZod2oiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczMTQyMzI3MCwiZXhwIjoyMDQ2OTk5MjcwfQ.6aelrzQIiAwVT_fHSNxgpPr4q5M4-6GZx8-xSUDKyFg';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
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

    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid data' });
    }

    // Map camelCase to snake_case
    const dbData = {};
    if (updates.backtests !== undefined) dbData.backtests = updates.backtests;
    if (updates.journals !== undefined) dbData.journals = updates.journals;
    if (updates.folders !== undefined) dbData.folders = updates.folders;
    if (updates.currentBacktest !== undefined) dbData.current_backtest = updates.currentBacktest;
    if (updates.currentJournal !== undefined) dbData.current_journal = updates.currentJournal;
    if (updates.savedTags !== undefined) dbData.saved_tags = updates.savedTags;
    if (updates.pinnedTags !== undefined) dbData.pinned_tags = updates.pinnedTags;
    if (updates.trackingSessions !== undefined) dbData.tracking_sessions = updates.trackingSessions;
    if (updates.todayAccumulatedTime !== undefined) dbData.today_accumulated_time = updates.todayAccumulatedTime;
    if (updates.todayAccumulatedDate !== undefined) dbData.today_accumulated_date = updates.todayAccumulatedDate;
    if (updates.isTrackingTime !== undefined) dbData.is_tracking_time = updates.isTrackingTime;
    if (updates.trackingStartTime !== undefined) dbData.tracking_start_time = updates.trackingStartTime;
    if (updates.tradeFormDefaults !== undefined) dbData.trade_form_defaults = updates.tradeFormDefaults;

    // Upsert data
    const { data, error } = await supabase
      .from('user_data')
      .upsert({
        user_id: user.id,
        ...dbData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Save data error:', error);
    return res.status(500).json({ error: error.message });
  }
}
