DROP POLICY "Authenticated org members can insert ideas" ON public.ideas;

CREATE POLICY "Authenticated org members can insert ideas"
ON public.ideas
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = ideas.organization_id
        AND m.user_id = auth.uid()
    )
    AND (
        -- Regular users can only create ideas for themselves
        (
            EXISTS (
                SELECT 1 FROM public.memberships m
                WHERE m.organization_id = ideas.organization_id
                AND m.user_id = auth.uid()
                AND m.role NOT IN ('admin', 'moderator')
            )
            AND user_id = auth.uid()
        )
        OR
        -- Admins/moderators can create ideas for any user
        (
            EXISTS (
                SELECT 1 FROM public.memberships m
                WHERE m.organization_id = ideas.organization_id
                AND m.user_id = auth.uid()
                AND m.role IN ('admin', 'moderator')
            )
        )
    )
);
