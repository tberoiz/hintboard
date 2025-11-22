-- =============================================
-- Subscription Plans Migration
-- Adds subscription plans and limits tracking
-- =============================================

BEGIN;

-- =============================================
-- Subscription plans reference table
-- =============================================
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE, -- 'starter', 'growth', 'pro', 'enterprise'
  display_name VARCHAR(50) NOT NULL,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),

  -- Board limits
  boards_limit INTEGER NOT NULL,

  -- Email subscribers limits
  email_subscribers_limit INTEGER NOT NULL,

  -- AI announcements limits (-1 for unlimited)
  ai_announcements_limit INTEGER NOT NULL,

  -- Feature flags
  custom_domain BOOLEAN DEFAULT FALSE,
  remove_branding BOOLEAN DEFAULT FALSE,
  linear_integration BOOLEAN DEFAULT FALSE,
  advanced_analytics BOOLEAN DEFAULT FALSE,
  api_access BOOLEAN DEFAULT FALSE,
  multiple_team_members BOOLEAN DEFAULT FALSE,
  sso_saml BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert plan definitions
INSERT INTO public.subscription_plans (name, display_name, price_monthly, price_yearly,
  boards_limit, email_subscribers_limit, ai_announcements_limit,
  custom_domain, remove_branding, linear_integration,
  advanced_analytics, api_access, multiple_team_members, sso_saml)
VALUES
  ('starter', 'Starter', 19.00, 15.00, 1, 100, 5, false, false, false, false, false, false, false),
  ('growth', 'Growth', 49.00, 39.00, 3, 500, 20, true, true, true, false, false, true, false),
  ('pro', 'Pro', 99.00, 79.00, 10, 2000, 50, true, true, true, true, true, true, false),
  ('enterprise', 'Enterprise', NULL, NULL, -1, -1, -1, true, true, true, true, true, true, true);

-- =============================================
-- Modify user_subscriptions table
-- =============================================

-- Add plan_id column to user_subscriptions
ALTER TABLE public.user_subscriptions
ADD COLUMN plan_id UUID REFERENCES public.subscription_plans(id);

-- Set default plan to 'starter' for all existing users
UPDATE public.user_subscriptions
SET plan_id = (SELECT id FROM public.subscription_plans WHERE name = 'starter')
WHERE plan_id IS NULL;

-- Make plan_id NOT NULL after setting defaults
ALTER TABLE public.user_subscriptions
ALTER COLUMN plan_id SET NOT NULL;

-- Add index for performance
CREATE INDEX user_subscriptions_plan_id_idx ON public.user_subscriptions(plan_id);

-- =============================================
-- Subscription limits tracker (per user)
-- =============================================
CREATE TABLE public.subscription_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Usage counters
  boards_used INTEGER DEFAULT 0 CHECK (boards_used >= 0),
  email_subscribers_used INTEGER DEFAULT 0 CHECK (email_subscribers_used >= 0),
  ai_announcements_used INTEGER DEFAULT 0 CHECK (ai_announcements_used >= 0),

  -- Metadata
  reset_at TIMESTAMPTZ DEFAULT NOW(), -- last reset date (for monthly limits)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX subscription_limits_user_id_idx ON public.subscription_limits(user_id);

-- =============================================
-- Helper function to get user's current plan limits
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_plan_limits(p_user_id UUID)
RETURNS TABLE (
  plan_name VARCHAR(50),
  boards_limit INTEGER,
  boards_used INTEGER,
  email_subscribers_limit INTEGER,
  email_subscribers_used INTEGER,
  ai_announcements_limit INTEGER,
  ai_announcements_used INTEGER,
  custom_domain BOOLEAN,
  remove_branding BOOLEAN,
  linear_integration BOOLEAN,
  advanced_analytics BOOLEAN,
  api_access BOOLEAN,
  multiple_team_members BOOLEAN,
  sso_saml BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.name,
    sp.boards_limit,
    COALESCE(sl.boards_used, 0),
    sp.email_subscribers_limit,
    COALESCE(sl.email_subscribers_used, 0),
    sp.ai_announcements_limit,
    COALESCE(sl.ai_announcements_used, 0),
    sp.custom_domain,
    sp.remove_branding,

    sp.linear_integration,
    sp.advanced_analytics,
    sp.api_access,
    sp.multiple_team_members,
    sp.sso_saml
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON sp.id = us.plan_id
  LEFT JOIN public.subscription_limits sl ON sl.user_id = us.user_id
  WHERE us.user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_plan_limits(UUID) TO authenticated;

-- =============================================
-- Function to check if user can perform action
-- =============================================
CREATE OR REPLACE FUNCTION public.can_user_perform_action(
  p_user_id UUID,
  p_action_type VARCHAR(50) -- 'create_board', 'add_subscriber', 'use_ai_announcement'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_used INTEGER;
BEGIN
  -- Get the relevant limit and usage
  CASE p_action_type
    WHEN 'create_board' THEN
      SELECT sp.boards_limit, COALESCE(sl.boards_used, 0)
      INTO v_limit, v_used
      FROM public.user_subscriptions us
      JOIN public.subscription_plans sp ON sp.id = us.plan_id
      LEFT JOIN public.subscription_limits sl ON sl.user_id = us.user_id
      WHERE us.user_id = p_user_id;

    WHEN 'add_subscriber' THEN
      SELECT sp.email_subscribers_limit, COALESCE(sl.email_subscribers_used, 0)
      INTO v_limit, v_used
      FROM public.user_subscriptions us
      JOIN public.subscription_plans sp ON sp.id = us.plan_id
      LEFT JOIN public.subscription_limits sl ON sl.user_id = us.user_id
      WHERE us.user_id = p_user_id;

    WHEN 'use_ai_announcement' THEN
      SELECT sp.ai_announcements_limit, COALESCE(sl.ai_announcements_used, 0)
      INTO v_limit, v_used
      FROM public.user_subscriptions us
      JOIN public.subscription_plans sp ON sp.id = us.plan_id
      LEFT JOIN public.subscription_limits sl ON sl.user_id = us.user_id
      WHERE us.user_id = p_user_id;

    ELSE
      RETURN FALSE;
  END CASE;

  -- -1 means unlimited
  IF v_limit = -1 THEN
    RETURN TRUE;
  END IF;

  -- Check if under limit
  RETURN v_used < v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_user_perform_action(UUID, VARCHAR) TO authenticated;

-- =============================================
-- Function to increment usage counter
-- =============================================
CREATE OR REPLACE FUNCTION public.increment_usage_counter(
  p_user_id UUID,
  p_counter_type VARCHAR(50) -- 'boards', 'email_subscribers', 'ai_announcements'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure the limits record exists
  INSERT INTO public.subscription_limits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Increment the appropriate counter
  CASE p_counter_type
    WHEN 'boards' THEN
      UPDATE public.subscription_limits
      SET boards_used = boards_used + 1,
          updated_at = NOW()
      WHERE user_id = p_user_id;

    WHEN 'email_subscribers' THEN
      UPDATE public.subscription_limits
      SET email_subscribers_used = email_subscribers_used + 1,
          updated_at = NOW()
      WHERE user_id = p_user_id;

    WHEN 'ai_announcements' THEN
      UPDATE public.subscription_limits
      SET ai_announcements_used = ai_announcements_used + 1,
          updated_at = NOW()
      WHERE user_id = p_user_id;
  END CASE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_usage_counter(UUID, VARCHAR) TO authenticated;

-- =============================================
-- Update handle_new_user function
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_starter_plan_id UUID;
BEGIN
  -- Get starter plan ID
  SELECT id INTO v_starter_plan_id
  FROM public.subscription_plans
  WHERE name = 'starter';

  -- Create user preferences
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);

  -- Create subscription with starter plan on trial
  INSERT INTO public.user_subscriptions (
    user_id,
    plan_id,
    status,
    trial_ends_at
  )
  VALUES (
    NEW.id,
    v_starter_plan_id,
    'trialing',
    NOW() + INTERVAL '7 days'
  );

  -- Initialize usage limits
  INSERT INTO public.subscription_limits (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$function$;

-- =============================================
-- Row Level Security for new tables
-- =============================================

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_limits ENABLE ROW LEVEL SECURITY;

-- Everyone can view plans (for pricing page, etc.)
CREATE POLICY "Anyone can view subscription plans"
ON public.subscription_plans
FOR SELECT
USING (true);

-- Users can only view their own limits
CREATE POLICY "Users can view their own limits"
ON public.subscription_limits
FOR SELECT
USING (user_id = auth.uid());

-- =============================================
-- Function to decrement usage counter
-- =============================================
CREATE OR REPLACE FUNCTION public.decrement_usage_counter(
  p_user_id UUID,
  p_counter_type VARCHAR(50) -- 'boards', 'email_subscribers', 'ai_announcements'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure the limits record exists
  INSERT INTO public.subscription_limits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Decrement the appropriate counter (never go below 0)
  CASE p_counter_type
    WHEN 'boards' THEN
      UPDATE public.subscription_limits
      SET boards_used = GREATEST(0, boards_used - 1),
          updated_at = NOW()
      WHERE user_id = p_user_id;

    WHEN 'email_subscribers' THEN
      UPDATE public.subscription_limits
      SET email_subscribers_used = GREATEST(0, email_subscribers_used - 1),
          updated_at = NOW()
      WHERE user_id = p_user_id;

    WHEN 'ai_announcements' THEN
      UPDATE public.subscription_limits
      SET ai_announcements_used = GREATEST(0, ai_announcements_used - 1),
          updated_at = NOW()
      WHERE user_id = p_user_id;
  END CASE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_usage_counter(UUID, VARCHAR) TO authenticated;

-- =============================================
-- Trigger to auto-sync boards usage
-- =============================================
CREATE OR REPLACE FUNCTION public.sync_boards_usage_on_org_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment counter
    PERFORM public.increment_usage_counter(NEW.owner_id, 'boards');
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement counter
    PERFORM public.decrement_usage_counter(OLD.owner_id, 'boards');
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_boards_usage_trigger ON public.organizations;

-- Create trigger on organizations table
CREATE TRIGGER sync_boards_usage_trigger
  AFTER INSERT OR DELETE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_boards_usage_on_org_change();

COMMIT;
