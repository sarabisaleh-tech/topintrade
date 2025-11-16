-- =====================================================
-- جداول مورد نیاز برای مایگریشن به Supabase
-- =====================================================

-- 1️⃣ جدول user_data: ذخیره تمام دیتای کاربر
CREATE TABLE IF NOT EXISTS public.user_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- داده‌های اصلی
  backtests JSONB DEFAULT '[]'::jsonb,
  journals JSONB DEFAULT '[]'::jsonb,
  folders JSONB DEFAULT '[]'::jsonb,

  -- ایندکس‌های فعلی
  current_backtest INTEGER DEFAULT 0,
  current_journal INTEGER DEFAULT 0,

  -- تگ‌ها
  saved_tags JSONB DEFAULT '[]'::jsonb,
  pinned_tags JSONB DEFAULT '[]'::jsonb,

  -- tracking sessions
  tracking_sessions JSONB DEFAULT '[]'::jsonb,
  today_accumulated_time INTEGER DEFAULT 0,
  today_accumulated_date TEXT DEFAULT '',
  is_tracking_time BOOLEAN DEFAULT FALSE,
  tracking_start_time BIGINT,

  -- تنظیمات فرم trade
  trade_form_defaults JSONB DEFAULT '{}'::jsonb,

  -- timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- یونیک برای هر کاربر
  CONSTRAINT unique_user_data UNIQUE (user_id)
);

-- Index برای جستجوی سریع
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON public.user_data(user_id);

-- RLS Policies برای user_data
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- هر کاربر فقط دیتای خودش را می‌بیند
CREATE POLICY "Users can view own data" ON public.user_data
  FOR SELECT USING (auth.uid() = user_id);

-- هر کاربر فقط دیتای خودش را insert می‌کند
CREATE POLICY "Users can insert own data" ON public.user_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- هر کاربر فقط دیتای خودش را update می‌کند
CREATE POLICY "Users can update own data" ON public.user_data
  FOR UPDATE USING (auth.uid() = user_id);

-- هر کاربر فقط دیتای خودش را delete می‌کند
CREATE POLICY "Users can delete own data" ON public.user_data
  FOR DELETE USING (auth.uid() = user_id);


-- =====================================================
-- 2️⃣ جدول shared_backtests: برای اشتراک‌گذاری backtest
-- =====================================================
CREATE TABLE IF NOT EXISTS public.shared_backtests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backtests JSONB NOT NULL,
  current_backtest INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Index برای جستجوی سریع
CREATE INDEX IF NOT EXISTS idx_shared_backtests_created ON public.shared_backtests(created_at);

-- RLS برای shared_backtests: همه می‌توانند بخوانند (برای share link)
ALTER TABLE public.shared_backtests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shared backtests" ON public.shared_backtests
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create shared backtests" ON public.shared_backtests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- =====================================================
-- 3️⃣ جدول shared_journals: برای اشتراک‌گذاری journal
-- =====================================================
CREATE TABLE IF NOT EXISTS public.shared_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index برای جستجوی سریع
CREATE INDEX IF NOT EXISTS idx_shared_journals_created ON public.shared_journals(created_at);

-- RLS برای shared_journals: همه می‌توانند بخوانند
ALTER TABLE public.shared_journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shared journals" ON public.shared_journals
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create shared journals" ON public.shared_journals
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- =====================================================
-- 4️⃣ Function برای auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger برای user_data
CREATE TRIGGER update_user_data_updated_at
  BEFORE UPDATE ON public.user_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 5️⃣ Function برای پاک کردن shared backtests/journals قدیمی (optional)
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_old_shares()
RETURNS void AS $$
BEGIN
  -- پاک کردن backtests بیش از 30 روز
  DELETE FROM public.shared_backtests
  WHERE created_at < NOW() - INTERVAL '30 days';

  -- پاک کردن journals بیش از 30 روز
  DELETE FROM public.shared_journals
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- می‌توانید این را به صورت cron job اجرا کنید
-- یا به صورت دستی هر چند وقت یکبار
