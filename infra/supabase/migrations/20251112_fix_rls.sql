DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;

CREATE POLICY "Users can view organizations they belong to or by slug"
ON public.organizations
FOR SELECT
USING (
    -- Allow if user is a member
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = organizations.id
        AND m.user_id = auth.uid()
    )
    OR
    -- Or allow anyone to view if accessing by slug (needed for middleware)
    slug IS NOT NULL
);
