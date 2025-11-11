/**
 * API Endpoints ساده برای مدیریت درخواست‌های اکانت
 *
 * این API‌ها رو به سرور Express خودت اضافه کن
 */

const express = require('express');
const router = express.Router();

/**
 * POST /api/account-request
 * کاربر درخواست اضافه کردن اکانت می‌دهد
 */
router.post('/api/account-request', async (req, res) => {
  try {
    const { account_number, investor_password, broker_server } = req.body;

    // Validation
    if (!account_number || !investor_password || !broker_server) {
      return res.status(400).json({
        success: false,
        message: 'لطفاً تمام فیلدها را پر کنید'
      });
    }

    // فرض: شما یک سیستم احراز هویت دارید و req.user وجود دارد
    const userId = req.user?.id || req.session?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'لطفاً ابتدا وارد شوید'
      });
    }

    // چک کنیم این اکانت قبلاً درخواست نداده
    const [existing] = await req.db.query(
      'SELECT id FROM account_requests WHERE user_id = ? AND account_number = ? AND broker_server = ?',
      [userId, account_number, broker_server]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'این اکانت قبلاً درخواست شده است'
      });
    }

    // ذخیره درخواست
    await req.db.query(
      `INSERT INTO account_requests
       (user_id, account_number, investor_password, broker_server, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', NOW())`,
      [userId, account_number, investor_password, broker_server]
    );

    console.log(`✅ New account request from user ${userId}: ${account_number}`);

    res.json({
      success: true,
      message: 'درخواست شما ثبت شد! اکانت شما تا 24 ساعت آینده فعال می‌شود.'
    });

  } catch (error) {
    console.error('Error creating account request:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سرور'
    });
  }
});

/**
 * GET /api/my-account-requests
 * کاربر لیست درخواست‌های خودش را می‌بیند
 */
router.get('/api/my-account-requests', async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'لطفاً ابتدا وارد شوید'
      });
    }

    const [requests] = await req.db.query(
      `SELECT
        id,
        account_number,
        broker_server,
        status,
        created_at
       FROM account_requests
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      requests
    });

  } catch (error) {
    console.error('Error fetching account requests:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سرور'
    });
  }
});

/**
 * GET /admin/account-requests
 * شما (ادمین) لیست درخواست‌های pending را می‌بینید
 */
router.get('/admin/account-requests', async (req, res) => {
  try {
    // فرض: شما یک middleware برای چک کردن admin دارید
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی ندارید'
      });
    }

    const [requests] = await req.db.query(
      `SELECT
        r.id,
        r.account_number,
        r.investor_password,
        r.broker_server,
        r.status,
        r.created_at,
        u.id as user_id,
        u.name,
        u.email
       FROM account_requests r
       JOIN users u ON r.user_id = u.id
       WHERE r.status = 'pending'
       ORDER BY r.created_at ASC`
    );

    res.json({
      success: true,
      requests
    });

  } catch (error) {
    console.error('Error fetching admin requests:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سرور'
    });
  }
});

/**
 * POST /admin/account-requests/:id/approve
 * شما (ادمین) درخواست را تایید می‌کنید (بعد از اضافه کردن به MT5)
 */
router.post('/admin/account-requests/:id/approve', async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی ندارید'
      });
    }

    const requestId = req.params.id;

    // به‌روزرسانی وضعیت
    await req.db.query(
      'UPDATE account_requests SET status = ?, approved_at = NOW() WHERE id = ?',
      ['approved', requestId]
    );

    console.log(`✅ Account request ${requestId} approved`);

    res.json({
      success: true,
      message: 'درخواست تایید شد'
    });

  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سرور'
    });
  }
});

/**
 * POST /admin/account-requests/:id/reject
 * شما (ادمین) درخواست را رد می‌کنید
 */
router.post('/admin/account-requests/:id/reject', async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی ندارید'
      });
    }

    const requestId = req.params.id;
    const { reason } = req.body;

    // به‌روزرسانی وضعیت
    await req.db.query(
      'UPDATE account_requests SET status = ?, rejection_reason = ? WHERE id = ?',
      ['rejected', reason || 'اطلاعات نادرست', requestId]
    );

    console.log(`❌ Account request ${requestId} rejected`);

    res.json({
      success: true,
      message: 'درخواست رد شد'
    });

  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سرور'
    });
  }
});

/**
 * POST /api/trades/sync
 * EA تریدها را ارسال می‌کند
 */
router.post('/api/trades/sync', async (req, res) => {
  try {
    const {
      account_number,
      ticket,
      symbol,
      type,
      lots,
      open_time,
      open_price,
      stop_loss,
      take_profit,
      close_time,
      close_price,
      profit,
      commission,
      swap,
      magic_number,
      comment,
      action
    } = req.body;

    // Validation
    if (!account_number || !ticket || !symbol) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // پیدا کردن user_id از روی account_number
    const [account] = await req.db.query(
      `SELECT user_id FROM account_requests
       WHERE account_number = ? AND status = 'approved'
       LIMIT 1`,
      [account_number]
    );

    if (account.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found or not approved'
      });
    }

    const userId = account[0].user_id;

    // چک کنیم این ترید قبلاً ذخیره شده یا نه
    const [existing] = await req.db.query(
      'SELECT id FROM trades WHERE ticket = ?',
      [ticket]
    );

    if (existing.length > 0) {
      // Update
      await req.db.query(
        `UPDATE trades SET
          stop_loss = ?,
          take_profit = ?,
          close_time = ?,
          close_price = ?,
          profit = ?,
          commission = ?,
          swap = ?,
          last_action = ?,
          updated_at = NOW()
         WHERE ticket = ?`,
        [
          stop_loss,
          take_profit,
          close_time,
          close_price,
          profit,
          commission,
          swap,
          action,
          ticket
        ]
      );

      console.log(`✅ Trade ${ticket} updated`);
    } else {
      // Insert
      await req.db.query(
        `INSERT INTO trades
         (user_id, account_number, ticket, symbol, type, lots, open_time, open_price,
          stop_loss, take_profit, close_time, close_price, profit, commission, swap,
          magic_number, comment, last_action, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          account_number,
          ticket,
          symbol,
          type,
          lots,
          open_time,
          open_price,
          stop_loss,
          take_profit,
          close_time,
          close_price,
          profit,
          commission,
          swap,
          magic_number,
          comment,
          action
        ]
      );

      console.log(`✅ Trade ${ticket} created`);
    }

    res.json({
      success: true,
      message: 'Trade synced successfully'
    });

  } catch (error) {
    console.error('Error syncing trade:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
