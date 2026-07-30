-- Migration: Audit log table and RLS policies
CREATE TABLE IF NOT EXISTS public.audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name   TEXT NOT NULL DEFAULT 'Sistema',
    action      TEXT NOT NULL,
    module      TEXT NOT NULL,
    table_name  TEXT NOT NULL,
    record_id   TEXT,
    description TEXT NOT NULL,
    metadata    JSONB,
    created_at  TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select_admin" ON public.audit_log;
CREATE POLICY "audit_log_select_admin"
    ON public.audit_log FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'Admin'
    ));

DROP POLICY IF EXISTS "audit_log_insert_authenticated" ON public.audit_log;
CREATE POLICY "audit_log_insert_authenticated"
    ON public.audit_log FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
