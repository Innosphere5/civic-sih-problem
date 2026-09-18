-- =====================================================================
-- NATIONAL CIVIC GRIEVANCE PORTAL — ADMINISTRATIVE AUTH SCHEMA
-- Supabase PostgreSQL Schema & Seed Migration
-- Target Supabase Instance: https://dyqgbknwctzsxzhpcnng.supabase.co
-- =====================================================================

-- 1. Create Admins Table
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    designation TEXT NOT NULL,
    department TEXT NOT NULL,
    badge_number TEXT NOT NULL,
    avatar_initials TEXT NOT NULL,
    phone TEXT,
    node_id TEXT DEFAULT 'DL-CENTRAL-01',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index for high performance lookup by username
CREATE INDEX IF NOT EXISTS idx_admins_username ON public.admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 4. Policies for anon/authenticated roles
DROP POLICY IF EXISTS "Allow anon reading for authentication" ON public.admins;
CREATE POLICY "Allow anon reading for authentication"
    ON public.admins
    FOR SELECT
    TO anon, authenticated
    USING (is_active = TRUE);

DROP POLICY IF EXISTS "Allow updating last_login timestamp" ON public.admins;
CREATE POLICY "Allow updating last_login timestamp"
    ON public.admins
    FOR UPDATE
    TO anon, authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

-- 5. Insert / Update Admin Credentials
-- Account 1: Sohel
-- Username: sohel | Password: vxfaq@ | PBKDF2-SHA256
INSERT INTO public.admins (
    username,
    password_hash,
    salt,
    full_name,
    email,
    role,
    designation,
    department,
    badge_number,
    avatar_initials,
    phone,
    node_id,
    is_active
) VALUES (
    'sohel',
    '94b813c87c050853dda20c3c43b85ab70401752f7caac5e1155db9e16a74c3742cdec02d79f3171436a8da2a7ac2d78add24cac3510342f3dc4dcb4a66c306b6',
    'salt_sohel_2026_nic',
    'Sohel Khan, IAS',
    'sohel.khan@nic.in',
    'admin',
    'Senior Nodal Casework Officer',
    'Department of Administrative Reforms & Public Grievances',
    'GOV-DL-8821',
    'SK',
    '+91 98101 23456',
    'DL-CENTRAL-01',
    TRUE
)
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    salt = EXCLUDED.salt,
    full_name = EXCLUDED.full_name,
    designation = EXCLUDED.designation,
    department = EXCLUDED.department,
    badge_number = EXCLUDED.badge_number,
    avatar_initials = EXCLUDED.avatar_initials,
    updated_at = NOW();

-- Account 2: Shahzeb
-- Username: shahzeb | Password: ogpain | PBKDF2-SHA256
INSERT INTO public.admins (
    username,
    password_hash,
    salt,
    full_name,
    email,
    role,
    designation,
    department,
    badge_number,
    avatar_initials,
    phone,
    node_id,
    is_active
) VALUES (
    'shahzeb',
    'b3a68fd48920dfb69b9ec339a7590feb5e856bb7b547ec5d7df5f47625185aff38ab3f719425b5662267cd9729aedadf27620b3cd325273dd3c38983bacc9c18',
    'salt_shahzeb_2026_nic',
    'Shahzeb Ahmed, IAS',
    'shahzeb.ahmed@nic.in',
    'superadmin',
    'Chief Administrative Officer & Grievance Commissioner',
    'Cabinet Secretariat • Public Grievance Directorate',
    'GOV-HQ-9901',
    'SA',
    '+91 98102 34567',
    'DL-APEX-01',
    TRUE
)
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    salt = EXCLUDED.salt,
    full_name = EXCLUDED.full_name,
    designation = EXCLUDED.designation,
    department = EXCLUDED.department,
    badge_number = EXCLUDED.badge_number,
    avatar_initials = EXCLUDED.avatar_initials,
    updated_at = NOW();
