// Supabase Journal Trades Management
import { supabase } from './supabase.js';

// ======================
// بارگذاری Journal Trades کاربر
// ======================
export async function loadJournalTrades(userId) {
  if (!userId) {
    console.error('❌ userId الزامی است');
    return [];
  }

  try {
    console.log('🔄 Loading journal trades for user:', userId);

    const { data, error } = await supabase
      .from('journal_trades')
      .select('*')
      .eq('user_id', userId)
      .order('trade_date', { ascending: false })
      .order('trade_time', { ascending: false });

    if (error) throw error;

    console.log(`✅ Loaded ${data.length} journal trades`);

    // Map database fields to frontend format
    return data.map(trade => ({
      id: trade.id,
      userId: trade.user_id,
      date: trade.trade_date,
      time: trade.trade_time,
      symbol: trade.symbol,
      position: trade.position,
      initialBalance: trade.initial_balance,
      stopLossSize: trade.stop_loss_size,
      stopLossSizeType: trade.stop_loss_size_type,
      risk: trade.risk,
      rrRatio: trade.rr_ratio,
      result: trade.result,
      pnl: trade.pnl,
      pnlMode: trade.pnl_mode,
      emotionalState: trade.emotional_state,
      tradeNotes: trade.trade_notes,
      chartInputType: trade.chart_input_type,
      chartOpenLink: trade.chart_open_link,
      chartCloseLink: trade.chart_close_link,
      chartScreenshots: trade.chart_screenshots || [],
      confirmationImages: trade.confirmation_images || [],
      tags: trade.tags || []
    }));

  } catch (error) {
    console.error('❌ Error loading journal trades:', error);
    return [];
  }
}

// ======================
// اضافه کردن Trade جدید
// ======================
export async function addJournalTrade(userId, tradeData) {
  if (!userId) {
    throw new Error('userId الزامی است');
  }

  try {
    console.log('🔄 Adding new journal trade...');

    const { data, error } = await supabase
      .from('journal_trades')
      .insert({
        user_id: userId,
        trade_date: tradeData.date,
        trade_time: tradeData.time,
        symbol: tradeData.symbol,
        position: tradeData.position,
        initial_balance: tradeData.initialBalance,
        stop_loss_size: tradeData.stopLossSize,
        stop_loss_size_type: tradeData.stopLossSizeType,
        risk: tradeData.risk,
        rr_ratio: tradeData.rrRatio,
        result: tradeData.result,
        pnl: tradeData.pnl,
        pnl_mode: tradeData.pnlMode,
        emotional_state: tradeData.emotionalState,
        trade_notes: tradeData.tradeNotes,
        chart_input_type: tradeData.chartInputType,
        chart_open_link: tradeData.chartOpenLink,
        chart_close_link: tradeData.chartCloseLink,
        chart_screenshots: tradeData.chartScreenshots || [],
        confirmation_images: tradeData.confirmationImages || [],
        tags: tradeData.tags || []
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Journal trade added successfully');

    // Return mapped data
    return {
      id: data.id,
      userId: data.user_id,
      date: data.trade_date,
      time: data.trade_time,
      symbol: data.symbol,
      position: data.position,
      initialBalance: data.initial_balance,
      stopLossSize: data.stop_loss_size,
      stopLossSizeType: data.stop_loss_size_type,
      risk: data.risk,
      rrRatio: data.rr_ratio,
      result: data.result,
      pnl: data.pnl,
      pnlMode: data.pnl_mode,
      emotionalState: data.emotional_state,
      tradeNotes: data.trade_notes,
      chartInputType: data.chart_input_type,
      chartOpenLink: data.chart_open_link,
      chartCloseLink: data.chart_close_link,
      chartScreenshots: data.chart_screenshots || [],
      confirmationImages: data.confirmation_images || [],
      tags: data.tags || []
    };

  } catch (error) {
    console.error('❌ Error adding journal trade:', error);
    throw error;
  }
}

// ======================
// به‌روزرسانی Trade موجود
// ======================
export async function updateJournalTrade(tradeId, tradeData) {
  if (!tradeId) {
    throw new Error('tradeId الزامی است');
  }

  try {
    console.log('🔄 Updating journal trade:', tradeId);

    const { data, error } = await supabase
      .from('journal_trades')
      .update({
        trade_date: tradeData.date,
        trade_time: tradeData.time,
        symbol: tradeData.symbol,
        position: tradeData.position,
        initial_balance: tradeData.initialBalance,
        stop_loss_size: tradeData.stopLossSize,
        stop_loss_size_type: tradeData.stopLossSizeType,
        risk: tradeData.risk,
        rr_ratio: tradeData.rrRatio,
        result: tradeData.result,
        pnl: tradeData.pnl,
        pnl_mode: tradeData.pnlMode,
        emotional_state: tradeData.emotionalState,
        trade_notes: tradeData.tradeNotes,
        chart_input_type: tradeData.chartInputType,
        chart_open_link: tradeData.chartOpenLink,
        chart_close_link: tradeData.chartCloseLink,
        chart_screenshots: tradeData.chartScreenshots || [],
        confirmation_images: tradeData.confirmationImages || [],
        tags: tradeData.tags || []
      })
      .eq('id', tradeId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Journal trade updated successfully');

    // Return mapped data
    return {
      id: data.id,
      userId: data.user_id,
      date: data.trade_date,
      time: data.trade_time,
      symbol: data.symbol,
      position: data.position,
      initialBalance: data.initial_balance,
      stopLossSize: data.stop_loss_size,
      stopLossSizeType: data.stop_loss_size_type,
      risk: data.risk,
      rrRatio: data.rr_ratio,
      result: data.result,
      pnl: data.pnl,
      pnlMode: data.pnl_mode,
      emotionalState: data.emotional_state,
      tradeNotes: data.trade_notes,
      chartInputType: data.chart_input_type,
      chartOpenLink: data.chart_open_link,
      chartCloseLink: data.chart_close_link,
      chartScreenshots: data.chart_screenshots || [],
      confirmationImages: data.confirmation_images || [],
      tags: data.tags || []
    };

  } catch (error) {
    console.error('❌ Error updating journal trade:', error);
    throw error;
  }
}

// ======================
// حذف Trade
// ======================
export async function deleteJournalTrade(tradeId) {
  if (!tradeId) {
    throw new Error('tradeId الزامی است');
  }

  try {
    console.log('🔄 Deleting journal trade:', tradeId);

    const { error } = await supabase
      .from('journal_trades')
      .delete()
      .eq('id', tradeId);

    if (error) throw error;

    console.log('✅ Journal trade deleted successfully');

  } catch (error) {
    console.error('❌ Error deleting journal trade:', error);
    throw error;
  }
}

// ======================
// Real-time Listener برای Journal Trades
// ======================
export function listenToJournalTrades(userId, callback) {
  if (!userId || !callback) {
    console.error('❌ userId و callback الزامی است');
    return null;
  }

  const subscription = supabase
    .channel(`journal-trades-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'journal_trades',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('🔔 Journal trade updated');
        callback(payload);
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}
