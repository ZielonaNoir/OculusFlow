-- ==========================================
-- OculusFlow Initial Schema
-- Sets up Profiles, Credits, and RLS
-- ==========================================

-- 1. Create Profiles Table (Linked to auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create User Credits & Subscriptions Table
CREATE TABLE public.user_credits (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  credit_balance INT DEFAULT 0 NOT NULL,
  is_pro BOOLEAN DEFAULT FALSE NOT NULL,
  pro_expires_at TIMESTAMPTZ,
  stripe_customer_id TEXT, -- To link Stripe webhooks later
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- 4. Set up RLS Policies (Users can only read/update their own data)
CREATE POLICY "Users can view their own profile." 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile." 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can view their own credits." 
  ON public.user_credits FOR SELECT 
  USING (auth.uid() = user_id);

-- Only service role (backend) should update credits, so we do not create an UPDATE policy for users.

-- 5. Trigger: Automatically create profile and credits on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  
  -- Insert into user_credits with default 0 credits/free tier
  INSERT INTO public.user_credits (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Done!
