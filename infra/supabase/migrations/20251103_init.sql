-- =============================================
-- Complete Database Schema
-- Description: User management, organizations, ideas, comments, announcements, and files
-- =============================================

BEGIN;

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE subscription_status AS ENUM (
    'trialing',
    'active',
    'canceled',
    'past_due'
);

CREATE TYPE activity_type AS ENUM (
    'idea_created',
    'idea_updated',
    'idea_deleted',
    'idea_status_changed',
    'idea_marked_bug',
    'idea_unmarked_bug',
    'idea_archived',
    'idea_unarchived',
    'idea_pinned',
    'idea_unpinned',
    'idea_made_private',
    'idea_made_public',
    'comment_added',
    'comment_updated',
    'comment_deleted',
    'vote_added',
    'vote_removed',
    'topic_added',
    'topic_removed',
    'attachment_added',
    'attachment_deleted'
);

-- =============================================
-- STORAGE BUCKETS
-- =============================================

-- Avatars bucket (5MB limit, public access)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('avatars', 'avatars', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- TABLES
-- =============================================

-- User Subscriptions
CREATE TABLE user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    status subscription_status DEFAULT 'trialing',
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX user_subscriptions_user_id_idx ON user_subscriptions(user_id);
CREATE INDEX user_subscriptions_stripe_subscription_id_idx ON user_subscriptions(stripe_subscription_id);

-- User Preferences
CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT,
    logo_url TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_organizations_slug_lower ON organizations (LOWER(slug));

COMMENT ON COLUMN public.organizations.logo_url IS 'Public URL of the organization logo stored in organization bucket';

-- Memberships
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'viewer', 'guest')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_memberships_user_org ON memberships(user_id, organization_id);

-- Idea Statuses
CREATE TABLE public.idea_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ideas
CREATE TABLE public.ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status_id UUID REFERENCES public.idea_statuses(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_private BOOLEAN NOT NULL DEFAULT false,
    is_bug BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    is_unprioritized BOOLEAN NOT NULL DEFAULT false,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ideas_org_id ON public.ideas(organization_id);
CREATE INDEX idx_ideas_user_id ON public.ideas(user_id);
CREATE INDEX idx_ideas_is_private ON public.ideas(is_private);
CREATE INDEX idx_ideas_is_bug ON public.ideas(is_bug);
CREATE INDEX idx_ideas_is_archived ON public.ideas(is_archived);
CREATE INDEX idx_ideas_is_unprioritized ON public.ideas(is_unprioritized);
CREATE INDEX idx_ideas_is_pinned ON public.ideas(is_pinned);

-- Idea Votes
CREATE TABLE public.idea_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    value INTEGER NOT NULL DEFAULT 1 CHECK (value >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (idea_id, user_id)
);

CREATE INDEX idx_idea_votes_idea_id ON public.idea_votes(idea_id);
CREATE INDEX idx_idea_votes_user_id ON public.idea_votes(user_id);

-- User Idea Topics
CREATE TABLE public.user_idea_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_user_idea_topics_org_name_lower ON public.user_idea_topics (organization_id, LOWER(name));

-- Idea Topic Map
CREATE TABLE public.idea_topic_map (
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.user_idea_topics(id) ON DELETE CASCADE,
    PRIMARY KEY (idea_id, topic_id)
);

-- Idea Comments
CREATE TABLE public.idea_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.idea_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_url TEXT,
    is_private BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_idea_comments_idea_id ON public.idea_comments(idea_id);
CREATE INDEX idx_idea_comments_user_id ON public.idea_comments(user_id);
CREATE INDEX idx_idea_comments_parent_id ON public.idea_comments(parent_id);

-- Comment Reactions
CREATE TABLE public.comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.idea_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(comment_id, user_id, emoji)
);

CREATE INDEX idx_comment_reactions_comment_id ON public.comment_reactions(comment_id);
CREATE INDEX idx_comment_reactions_user_id ON public.comment_reactions(user_id);

-- Attachments
CREATE TABLE public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.idea_comments(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT attachment_target_check CHECK (
        (idea_id IS NOT NULL AND comment_id IS NULL) OR
        (idea_id IS NULL AND comment_id IS NOT NULL)
    )
);

CREATE INDEX idx_attachments_idea_id ON public.attachments(idea_id);
CREATE INDEX idx_attachments_comment_id ON public.attachments(comment_id);
CREATE INDEX idx_attachments_organization_id ON public.attachments(organization_id);
CREATE INDEX idx_attachments_uploaded_by ON public.attachments(uploaded_by);

-- Activity Log
CREATE TABLE public.idea_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type activity_type NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_idea_activities_idea_id ON public.idea_activities(idea_id);
CREATE INDEX idx_idea_activities_user_id ON public.idea_activities(user_id);
CREATE INDEX idx_idea_activities_created_at ON public.idea_activities(created_at DESC);
CREATE INDEX idx_idea_activities_type ON public.idea_activities(activity_type);

-- Announcement Categories
CREATE TABLE public.announcement_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_announcement_categories_org_name_lower ON public.announcement_categories (organization_id, LOWER(name));
CREATE INDEX idx_announcement_categories_org_id ON public.announcement_categories(organization_id);

-- Announcements
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    view_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_org_id ON public.announcements(organization_id);
CREATE INDEX idx_announcements_user_id ON public.announcements(user_id);
CREATE INDEX idx_announcements_status ON public.announcements(status);
CREATE INDEX idx_announcements_published_at ON public.announcements(published_at);

-- Announcement Category Map
CREATE TABLE public.announcement_category_map (
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.announcement_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (announcement_id, category_id)
);

CREATE INDEX idx_announcement_category_map_announcement ON public.announcement_category_map(announcement_id);
CREATE INDEX idx_announcement_category_map_category ON public.announcement_category_map(category_id);

-- Announcement Reactions
CREATE TABLE public.announcement_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL DEFAULT '👍',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(announcement_id, user_id)
);

CREATE INDEX idx_announcement_reactions_announcement ON public.announcement_reactions(announcement_id);
CREATE INDEX idx_announcement_reactions_user ON public.announcement_reactions(user_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_idea_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_topic_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_category_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- User Subscriptions Policies
-- =============================================
CREATE POLICY user_select_own_subscriptions ON user_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_update_own_subscriptions ON user_subscriptions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY user_delete_own_subscriptions ON user_subscriptions FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- User Preferences Policies
-- =============================================
CREATE POLICY "Users can view their own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Organizations Policies (Service Role Only for Creation)
-- =============================================
CREATE POLICY "Users can view organizations they belong to"
ON public.organizations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = organizations.id
        AND m.user_id = auth.uid()
    )
);

CREATE POLICY "Service role can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Organization admins can update"
ON public.organizations
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = organizations.id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = organizations.id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
);

CREATE POLICY "Organization admins can delete"
ON public.organizations
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = organizations.id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
);

-- =============================================
-- Memberships Policies (Admins and Service Role Only)
-- =============================================
CREATE POLICY "Users can view memberships in their organizations"
ON public.memberships
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = memberships.organization_id
        AND m.user_id = auth.uid()
    )
);

CREATE POLICY "Admins and service role can create memberships"
ON public.memberships
FOR INSERT
WITH CHECK (
    auth.jwt()->>'role' = 'service_role'
    OR EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = memberships.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
);

CREATE POLICY "Admins can update memberships"
ON public.memberships
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = memberships.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = memberships.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
);

CREATE POLICY "Admins can delete memberships"
ON public.memberships
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = memberships.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
);

-- =============================================
-- Idea Statuses Policies (Admins Only)
-- =============================================
CREATE POLICY "Users can view statuses in their organization"
ON public.idea_statuses
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = idea_statuses.organization_id
        AND m.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can create statuses"
ON public.idea_statuses
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = idea_statuses.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
);

CREATE POLICY "Admins can update statuses"
ON public.idea_statuses
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = idea_statuses.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = idea_statuses.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
);

CREATE POLICY "Admins can delete statuses"
ON public.idea_statuses
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = idea_statuses.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
);

-- =============================================
-- User Idea Topics Policies (Admins Only)
-- =============================================
CREATE POLICY "Users can view topics in their organization"
ON public.user_idea_topics
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = user_idea_topics.organization_id
        AND m.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can create topics"
ON public.user_idea_topics
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = user_idea_topics.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
);

CREATE POLICY "Admins can update topics"
ON public.user_idea_topics
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = user_idea_topics.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = user_idea_topics.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
);

CREATE POLICY "Admins can delete topics"
ON public.user_idea_topics
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = user_idea_topics.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
);

-- =============================================
-- Idea Topic Map Policies (Admins and Moderators)
-- =============================================
CREATE POLICY "Users can view topic mappings"
ON public.idea_topic_map
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.ideas i
        JOIN public.memberships m ON m.organization_id = i.organization_id
        WHERE i.id = idea_topic_map.idea_id
        AND m.user_id = auth.uid()
    )
);

CREATE POLICY "Admins and moderators can create topic mappings"
ON public.idea_topic_map
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.ideas i
        JOIN public.memberships m ON m.organization_id = i.organization_id
        WHERE i.id = idea_topic_map.idea_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'moderator')
    )
);

CREATE POLICY "Admins and moderators can delete topic mappings"
ON public.idea_topic_map
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.ideas i
        JOIN public.memberships m ON m.organization_id = i.organization_id
        WHERE i.id = idea_topic_map.idea_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'moderator')
    )
);

-- =============================================
-- Ideas Policies
-- =============================================
CREATE POLICY "Users can view non-private ideas or their own ideas"
ON public.ideas
FOR SELECT
USING (
    is_private = false
    OR auth.uid() = user_id
    OR EXISTS (
        SELECT 1
        FROM public.memberships m
        WHERE m.organization_id = ideas.organization_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'moderator')
    )
);

CREATE POLICY "Authenticated org members can insert ideas"
ON public.ideas
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.organization_id = ideas.organization_id
        AND m.user_id = auth.uid()
    )
);

CREATE POLICY "Users and org admins/moderators can update ideas"
ON public.ideas
FOR UPDATE
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1
        FROM public.memberships m
        WHERE m.organization_id = ideas.organization_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'moderator')
    )
)
WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1
        FROM public.memberships m
        WHERE m.organization_id = ideas.organization_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'moderator')
    )
);

CREATE POLICY "Users and org admins/moderators can delete ideas"
ON public.ideas
FOR DELETE
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1
        FROM public.memberships m
        WHERE m.organization_id = ideas.organization_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'moderator')
    )
);

-- =============================================
-- Idea Votes Policies
-- =============================================
CREATE POLICY "All users can view votes" ON public.idea_votes FOR SELECT USING (true);
CREATE POLICY "All users can cast votes" ON public.idea_votes FOR INSERT WITH CHECK ((auth.role() = 'authenticated' OR auth.role() = 'anon') AND auth.uid() IS NOT NULL AND user_id = auth.uid() AND value >= 0);
CREATE POLICY "Users can update their own votes" ON public.idea_votes FOR UPDATE USING ((auth.role() = 'authenticated' OR auth.role() = 'anon') AND auth.uid() = user_id) WITH CHECK (value >= 0);
CREATE POLICY "Users can delete their own votes" ON public.idea_votes FOR DELETE USING ((auth.role() = 'authenticated' OR auth.role() = 'anon') AND auth.uid() = user_id);

-- =============================================
-- Idea Comments Policies (Respecting Privacy)
-- =============================================
CREATE POLICY "Users can view comments on accessible ideas"
ON public.idea_comments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.ideas i
        WHERE i.id = idea_comments.idea_id
        AND (
            i.is_private = false
            OR i.user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.memberships m
                WHERE m.organization_id = i.organization_id
                AND m.user_id = auth.uid()
                AND m.role IN ('admin', 'moderator')
            )
        )
    )
);

CREATE POLICY "Authenticated users can create comments"
ON public.idea_comments
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
    AND user_id = auth.uid()
);

CREATE POLICY "Users can update their own comments" ON public.idea_comments FOR UPDATE USING (user_id = auth.uid());

-- Create new delete policy that allows users to delete own comments, and admins/moderators to delete any
CREATE POLICY "Users and admins can delete comments"
ON public.idea_comments
FOR DELETE
USING (
    -- User can delete their own comment
    user_id = auth.uid()
    OR
    -- Admin/moderator can delete any comment in their organization
    EXISTS (
        SELECT 1
        FROM public.ideas i
        JOIN public.memberships m ON m.organization_id = i.organization_id
        WHERE i.id = idea_comments.idea_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'moderator')
    )
);
-- =============================================
-- Comment Reactions Policies
-- =============================================
CREATE POLICY "All users can view reactions" ON public.comment_reactions FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "All users can add reactions" ON public.comment_reactions FOR INSERT WITH CHECK ((auth.role() = 'authenticated' OR auth.role() = 'anon') AND auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "Users can delete their own reactions" ON public.comment_reactions FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- Attachments Policies
-- =============================================
CREATE POLICY "Users can view attachments they have access to" ON public.attachments FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
        (idea_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.ideas i WHERE i.id = attachments.idea_id AND (i.is_private = false OR i.user_id = auth.uid())))
        OR
        (comment_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.idea_comments ic JOIN public.ideas i ON i.id = ic.idea_id WHERE ic.id = attachments.comment_id AND (i.is_private = false OR i.user_id = auth.uid())))
    )
);
CREATE POLICY "All users can upload attachments" ON public.attachments FOR INSERT WITH CHECK ((auth.role() = 'authenticated' OR auth.role() = 'anon') AND auth.uid() IS NOT NULL AND uploaded_by = auth.uid());
CREATE POLICY "Users can delete their own attachments" ON public.attachments FOR DELETE USING (uploaded_by = auth.uid());

-- =============================================
-- Activity Log Policies (Non-Guest Members Only)
-- =============================================
CREATE POLICY "Users can view activities for ideas they can access"
ON public.idea_activities
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.ideas i
        WHERE i.id = idea_activities.idea_id
        AND (
            i.is_private = false
            OR i.user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.memberships m
                WHERE m.organization_id = i.organization_id
                AND m.user_id = auth.uid()
                AND m.role IN ('admin', 'moderator')
            )
        )
    )
);

CREATE POLICY "Non-guest members can insert activities"
ON public.idea_activities
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.ideas i
        JOIN public.memberships m ON m.organization_id = i.organization_id
        WHERE i.id = idea_activities.idea_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'moderator', 'viewer')
    )
);

-- =============================================
-- Announcement Categories Policies
-- =============================================
CREATE POLICY "Users can view categories in their organization" ON public.announcement_categories FOR SELECT USING (EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = announcement_categories.organization_id AND m.user_id = auth.uid()));
CREATE POLICY "Organization admins can manage categories" ON public.announcement_categories FOR ALL USING (EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = announcement_categories.organization_id AND m.user_id = auth.uid() AND m.role IN ('admin')));

-- =============================================
-- Announcements Policies
-- =============================================
CREATE POLICY "Users can view published announcements in their organization" ON public.announcements FOR SELECT USING ((status = 'published' OR user_id = auth.uid()) AND EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = announcements.organization_id AND m.user_id = auth.uid()));
CREATE POLICY "Organization members can create announcements" ON public.announcements FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = announcements.organization_id AND m.user_id = auth.uid()));
CREATE POLICY "Users can update their own announcements" ON public.announcements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own announcements" ON public.announcements FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- Announcement Category Map Policies
-- =============================================
CREATE POLICY "Users can view category mappings in their organization" ON public.announcement_category_map FOR SELECT USING (EXISTS (SELECT 1 FROM public.announcements a JOIN public.memberships m ON m.organization_id = a.organization_id WHERE a.id = announcement_category_map.announcement_id AND m.user_id = auth.uid()));
CREATE POLICY "Users can manage category mappings for their announcements" ON public.announcement_category_map FOR ALL USING (EXISTS (SELECT 1 FROM public.announcements a WHERE a.id = announcement_category_map.announcement_id AND a.user_id = auth.uid()));

-- =============================================
-- Announcement Reactions Policies
-- =============================================
CREATE POLICY "All users can view announcement reactions" ON public.announcement_reactions FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "All users can add announcement reactions" ON public.announcement_reactions FOR INSERT WITH CHECK ((auth.role() = 'authenticated' OR auth.role() = 'anon') AND auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "Users can delete their own reactions" ON public.announcement_reactions FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- STORAGE POLICIES
-- =============================================

-- Avatar Storage Policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "All users can upload their own avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (auth.role() = 'authenticated' OR auth.role() = 'anon') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "All users can update their own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND (auth.role() = 'authenticated' OR auth.role() = 'anon') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "All users can delete their own avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND (auth.role() = 'authenticated' OR auth.role() = 'anon') AND (storage.foldername(name))[1] = auth.uid()::text);

-- Organization Storage Policies
CREATE POLICY "Public read access to org assets" ON storage.objects FOR SELECT USING (bucket_id LIKE 'org-%');
CREATE POLICY "All users can upload to organization buckets" ON storage.objects FOR INSERT WITH CHECK (bucket_id LIKE 'org-%' AND (auth.role() = 'authenticated' OR auth.role() = 'anon') AND auth.uid() IS NOT NULL);
CREATE POLICY "All users can view organization files" ON storage.objects FOR SELECT USING (bucket_id LIKE 'org-%');
CREATE POLICY "All users can delete their own uploads" ON storage.objects FOR DELETE USING (bucket_id LIKE 'org-%' AND (auth.role() = 'authenticated' OR auth.role() = 'anon') AND (storage.foldername(name))[2] = auth.uid()::text);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Lowercase organization fields
CREATE OR REPLACE FUNCTION organizations_lowercase_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.name := LOWER(NEW.name);
    IF NEW.slug IS NOT NULL THEN
        NEW.slug := LOWER(NEW.slug);
    END IF;
    RETURN NEW;
END;
$function$;

-- Handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.user_preferences (user_id) VALUES (NEW.id);
    INSERT INTO public.user_subscriptions (user_id, status, trial_ends_at)
    VALUES (NEW.id, 'trialing', NOW() + INTERVAL '7 days');
    RETURN NEW;
END;
$function$;

-- Check user access
CREATE OR REPLACE FUNCTION public.user_has_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    subscription RECORD;
BEGIN
    SELECT * INTO subscription FROM user_subscriptions WHERE user_id = p_user_id;
    IF subscription IS NULL THEN RETURN FALSE; END IF;
    RETURN subscription.status IN ('active', 'trialing') AND (subscription.trial_ends_at IS NULL OR subscription.trial_ends_at > NOW());
END;
$function$;

-- Create organization bucket
CREATE OR REPLACE FUNCTION public.create_organization_bucket(p_org_id UUID, p_org_slug TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_bucket_name TEXT;
BEGIN
    v_bucket_name := 'org-' || p_org_slug;
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (v_bucket_name, v_bucket_name, true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])
    ON CONFLICT (id) DO NOTHING;
    RETURN v_bucket_name;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_organization_bucket(UUID, TEXT) TO authenticated;

-- Seed organization onboarding data
CREATE OR REPLACE FUNCTION public.seed_organization_onboarding(p_org_id UUID, p_owner_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_status_under_consideration UUID;
    v_status_planned UUID;
    v_status_in_development UUID;
    v_status_shipped UUID;
    v_topic_welcome UUID;
    v_topic_improvement UUID;
    v_topic_integrations UUID;
    v_topic_styling UUID;
    v_topic_misc UUID;
    v_topic_bug_report UUID;
    v_topic_deal_breaker UUID;
    v_idea_1 UUID;
    v_idea_2 UUID;
    v_idea_3 UUID;
BEGIN
    INSERT INTO public.idea_statuses (organization_id, name, color, sort_order) VALUES (p_org_id, 'Under consideration', '#f59e0b', 0) RETURNING id INTO v_status_under_consideration;
    INSERT INTO public.idea_statuses (organization_id, name, color, sort_order) VALUES (p_org_id, 'Planned', '#3b82f6', 1) RETURNING id INTO v_status_planned;
    INSERT INTO public.idea_statuses (organization_id, name, color, sort_order) VALUES (p_org_id, 'In Development', '#8b5cf6', 2) RETURNING id INTO v_status_in_development;
    INSERT INTO public.idea_statuses (organization_id, name, color, sort_order) VALUES (p_org_id, 'Shipped', '#10b981', 3) RETURNING id INTO v_status_shipped;

    INSERT INTO public.user_idea_topics (organization_id, name) VALUES (p_org_id, 'Welcome 👋') RETURNING id INTO v_topic_welcome;
    INSERT INTO public.user_idea_topics (organization_id, name) VALUES (p_org_id, 'Improvement 🔥') RETURNING id INTO v_topic_improvement;
    INSERT INTO public.user_idea_topics (organization_id, name) VALUES (p_org_id, 'Integrations 🔗') RETURNING id INTO v_topic_integrations;
    INSERT INTO public.user_idea_topics (organization_id, name) VALUES (p_org_id, 'Styling 🎨') RETURNING id INTO v_topic_styling;
    INSERT INTO public.user_idea_topics (organization_id, name) VALUES (p_org_id, 'Misc 💡') RETURNING id INTO v_topic_misc;
    INSERT INTO public.user_idea_topics (organization_id, name) VALUES (p_org_id, 'Bug Report 🔧') RETURNING id INTO v_topic_bug_report;
    INSERT INTO public.user_idea_topics (organization_id, name) VALUES (p_org_id, 'Deal Breaker 💔') RETURNING id INTO v_topic_deal_breaker;

    INSERT INTO public.ideas (organization_id, user_id, status_id, title, description, is_private, is_bug, is_archived, is_unprioritized, is_pinned)
    VALUES (p_org_id, p_owner_id, v_status_under_consideration, '[Start here] Welcome to Hintt 🚀', 'Welcome to Hintt, your new Feedback, Roadmap and Announcements tool. Read through a few of these cards and get acquainted with the interface. Start by taking a look at each of the pages in the navigation.

**This is an example idea card** - you can delete it anytime. Ideas can be submitted by anyone in your team, and they''ll appear here for review and discussion.

Try interacting with this card:
- Vote on it by clicking the number on the left
- Leave a comment below
- Add it to different topics or change its status

When you''re ready, click "Submit an Idea" in the top right to create your first real idea!', false, false, false, false, true)
    RETURNING id INTO v_idea_1;
    INSERT INTO public.idea_topic_map (idea_id, topic_id) VALUES (v_idea_1, v_topic_welcome);

    INSERT INTO public.ideas (organization_id, user_id, status_id, title, description, is_private, is_bug, is_archived, is_unprioritized, is_pinned)
    VALUES (p_org_id, p_owner_id, v_status_planned, '[Example Idea] More colour options', 'It would be great if we could add more colours to our app rather than the standard options. Perhaps a colour picker, like the one in the screenshot? [This is an Example Idea Card]

**Features we could include:**
- Custom color picker
- Preset color palettes
- Save favorite colors
- Theme customization

This would give users more flexibility in personalizing their workspace!', false, false, false, false, false)
    RETURNING id INTO v_idea_2;
    INSERT INTO public.idea_topic_map (idea_id, topic_id) VALUES (v_idea_2, v_topic_improvement), (v_idea_2, v_topic_styling);

    INSERT INTO public.ideas (organization_id, user_id, status_id, title, description, is_private, is_bug, is_archived, is_unprioritized, is_pinned)
    VALUES (p_org_id, p_owner_id, NULL, '[Read Me] We''ve created a few example ideas for you', 'You''ll see that we have create a bunch of demo ideas for you.... Have a play with them, vote on them, comment on them, and when you''re ready, delete them!

**What you can do with ideas:**
- Organize them by status (Under consideration, Planned, In Development, Shipped)
- Categorize them with topics
- Mark important ones as pinned
- Archive old ones
- Flag bugs with the bug report option

**Getting started with Hintt:**
1. Customize your statuses in the admin panel
2. Create topics that match your workflow
3. Invite your team members
4. Start collecting feedback!

Feel free to explore all the features and make this space your own. Once you''re comfortable, you can delete these example ideas and start fresh with your real feedback.', false, false, false, false, false)
    RETURNING id INTO v_idea_3;
    INSERT INTO public.idea_topic_map (idea_id, topic_id) VALUES (v_idea_3, v_topic_welcome);

    INSERT INTO public.idea_votes (idea_id, user_id, value) VALUES (v_idea_1, p_owner_id, 1), (v_idea_2, p_owner_id, 1);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.seed_organization_onboarding(UUID, UUID) TO authenticated;

-- Handle new organization creation
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_bucket_name TEXT;
BEGIN
    v_bucket_name := public.create_organization_bucket(NEW.id, NEW.slug);
    PERFORM public.seed_organization_onboarding(NEW.id, NEW.owner_id);
    RETURN NEW;
END;
$function$;

-- Get workspace users
CREATE OR REPLACE FUNCTION public.get_workspace_users(p_org_id UUID)
RETURNS TABLE (user_id UUID, email TEXT, full_name TEXT, avatar_url TEXT, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT u.id AS user_id, u.email::TEXT, COALESCE(u.raw_user_meta_data->>'full_name', '')::TEXT AS full_name, COALESCE(u.raw_user_meta_data->>'avatar_url', '')::TEXT AS avatar_url, m.role::TEXT
    FROM memberships m JOIN auth.users u ON u.id = m.user_id
    WHERE m.organization_id = p_org_id
    ORDER BY m.role DESC, full_name ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_workspace_users(UUID) TO authenticated;

-- Get ideas with user info
CREATE OR REPLACE FUNCTION public.get_ideas_with_user_info(
    p_org_id UUID,
    p_status_id UUID DEFAULT NULL,
    p_topic_id UUID DEFAULT NULL,
    p_is_archived BOOLEAN DEFAULT NULL,
    p_is_bug BOOLEAN DEFAULT NULL,
    p_is_private BOOLEAN DEFAULT NULL,
    p_is_unprioritized BOOLEAN DEFAULT NULL,
    p_no_status BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    idea_id UUID, title TEXT, description TEXT, is_private BOOLEAN, is_bug BOOLEAN, is_archived BOOLEAN, is_unprioritized BOOLEAN, is_pinned BOOLEAN,
    created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, created_by UUID, creator_email TEXT, creator_name TEXT, creator_avatar TEXT, creator_organization TEXT,
    vote_count INTEGER, my_vote BOOLEAN, status_id UUID, status_name TEXT, status_color TEXT, status_sort_order INT, topics JSONB, comment_count BIGINT, attachments JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT i.id AS idea_id, i.title, i.description, i.is_private, i.is_bug, i.is_archived, i.is_unprioritized, i.is_pinned, i.created_at, i.updated_at,
        i.user_id AS created_by, u.email::TEXT AS creator_email, COALESCE(u.raw_user_meta_data->>'full_name', '')::TEXT AS creator_name,
        COALESCE(u.raw_user_meta_data->>'avatar_url', '')::TEXT AS creator_avatar, o.name::TEXT AS creator_organization,
        (SELECT COUNT(*)::INTEGER FROM public.idea_votes iv WHERE iv.idea_id = i.id) AS vote_count,
        EXISTS (SELECT 1 FROM public.idea_votes iv2 WHERE iv2.idea_id = i.id AND iv2.user_id = auth.uid()) AS my_vote,
        s.id AS status_id, s.name AS status_name, s.color AS status_color, s.sort_order AS status_sort_order,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name)) FROM public.idea_topic_map itm JOIN public.user_idea_topics t ON t.id = itm.topic_id WHERE itm.idea_id = i.id), '[]'::jsonb) AS topics,
        (SELECT COUNT(*) FROM public.idea_comments ic WHERE ic.idea_id = i.id) AS comment_count,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'file_name', a.file_name, 'file_path', a.file_path, 'file_size', a.file_size, 'file_type', a.file_type, 'uploaded_by', a.uploaded_by, 'created_at', a.created_at)) FROM public.attachments a WHERE a.idea_id = i.id), '[]'::jsonb) AS attachments
    FROM public.ideas i
    LEFT JOIN auth.users u ON u.id = i.user_id
    LEFT JOIN public.organizations o ON o.id = i.organization_id
    LEFT JOIN public.idea_statuses s ON s.id = i.status_id
    WHERE i.organization_id = p_org_id
        AND (p_status_id IS NULL OR i.status_id = p_status_id)
        AND (p_topic_id IS NULL OR EXISTS (SELECT 1 FROM public.idea_topic_map itm2 WHERE itm2.idea_id = i.id AND itm2.topic_id = p_topic_id))
        AND (p_is_archived IS NULL OR i.is_archived = p_is_archived)
        AND (p_is_bug IS NULL OR i.is_bug = p_is_bug)
        AND (p_is_private IS NULL OR i.is_private = p_is_private)
        AND (p_is_unprioritized IS NULL OR i.is_unprioritized = p_is_unprioritized)
        AND (p_no_status IS NULL OR (p_no_status = true AND i.status_id IS NULL))
    ORDER BY i.is_pinned DESC NULLS LAST, i.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_ideas_with_user_info(UUID, UUID, UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- Get idea comments
CREATE OR REPLACE FUNCTION public.get_idea_comments(p_idea_id UUID)
RETURNS TABLE (
    id UUID, idea_id UUID, user_id UUID, parent_id UUID, content TEXT, media_url TEXT, is_private BOOLEAN,
    created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, user_email TEXT, user_name TEXT, user_avatar TEXT, reactions JSONB, reply_count BIGINT, attachments JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT c.id, c.idea_id, c.user_id, c.parent_id, c.content, c.media_url, c.is_private, c.created_at, c.updated_at,
        u.email::TEXT AS user_email, COALESCE(u.raw_user_meta_data->>'full_name', '')::TEXT AS user_name, COALESCE(u.raw_user_meta_data->>'avatar_url', '')::TEXT AS user_avatar,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('emoji', r.emoji, 'user_id', r.user_id, 'created_at', r.created_at)) FROM public.comment_reactions r WHERE r.comment_id = c.id), '[]'::jsonb) AS reactions,
        (SELECT COUNT(*) FROM public.idea_comments replies WHERE replies.parent_id = c.id) AS reply_count,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'file_name', a.file_name, 'file_path', a.file_path, 'file_size', a.file_size, 'file_type', a.file_type, 'uploaded_by', a.uploaded_by, 'created_at', a.created_at)) FROM public.attachments a WHERE a.comment_id = c.id), '[]'::jsonb) AS attachments
    FROM public.idea_comments c
    LEFT JOIN auth.users u ON u.id = c.user_id
    WHERE c.idea_id = p_idea_id
    ORDER BY c.created_at ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_idea_comments(UUID) TO authenticated;

-- Get topics with counts
CREATE OR REPLACE FUNCTION public.get_topics_with_counts(p_org_id UUID)
RETURNS TABLE (id UUID, name TEXT, idea_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT t.id, t.name, COUNT(DISTINCT itm.idea_id) AS idea_count
    FROM public.user_idea_topics t
    LEFT JOIN public.idea_topic_map itm ON itm.topic_id = t.id
    LEFT JOIN public.ideas i ON i.id = itm.idea_id
    WHERE t.organization_id = p_org_id AND (i.id IS NULL OR i.organization_id = p_org_id)
    GROUP BY t.id, t.name
    ORDER BY t.name ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_topics_with_counts(UUID) TO authenticated;

-- Get statuses with counts
CREATE OR REPLACE FUNCTION public.get_statuses_with_counts(p_org_id UUID)
RETURNS TABLE (id UUID, name TEXT, color TEXT, sort_order INT, idea_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT s.id, s.name, s.color, s.sort_order, COUNT(i.id) AS idea_count
    FROM public.idea_statuses s
    LEFT JOIN public.ideas i ON i.status_id = s.id AND i.organization_id = p_org_id
    WHERE s.organization_id = p_org_id
    GROUP BY s.id, s.name, s.color, s.sort_order
    ORDER BY s.sort_order ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_statuses_with_counts(UUID) TO authenticated;

-- Log idea activity
CREATE OR REPLACE FUNCTION public.log_idea_activity(p_idea_id UUID, p_user_id UUID, p_activity_type activity_type, p_metadata JSONB DEFAULT '{}'::jsonb)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO public.idea_activities (idea_id, user_id, activity_type, metadata)
    VALUES (p_idea_id, p_user_id, p_activity_type, p_metadata)
    RETURNING id INTO v_activity_id;
    RETURN v_activity_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.log_idea_activity(UUID, UUID, activity_type, JSONB) TO authenticated;

-- Get idea activities
CREATE OR REPLACE FUNCTION public.get_idea_activities(p_idea_id UUID)
RETURNS TABLE (id UUID, activity_type activity_type, metadata JSONB, created_at TIMESTAMPTZ, user_id UUID, user_email TEXT, user_name TEXT, user_avatar TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT a.id, a.activity_type, a.metadata, a.created_at, a.user_id,
        u.email::TEXT AS user_email, COALESCE(u.raw_user_meta_data->>'full_name', '')::TEXT AS user_name, COALESCE(u.raw_user_meta_data->>'avatar_url', '')::TEXT AS user_avatar
    FROM public.idea_activities a
    LEFT JOIN auth.users u ON u.id = a.user_id
    WHERE a.idea_id = p_idea_id
    ORDER BY a.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_idea_activities(UUID) TO authenticated;

-- Get announcements with details
CREATE OR REPLACE FUNCTION public.get_announcements_with_details(p_org_id UUID, p_status TEXT DEFAULT NULL, p_category_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID, title TEXT, content JSONB, status TEXT, published_at TIMESTAMPTZ, is_pinned BOOLEAN, view_count INT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
    user_id UUID, user_email TEXT, user_name TEXT, user_avatar TEXT, categories JSONB, reaction_count INT, my_reaction TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT a.id, a.title, a.content, a.status, a.published_at, a.is_pinned, a.view_count, a.created_at, a.updated_at, a.user_id,
        u.email::TEXT AS user_email, COALESCE(u.raw_user_meta_data->>'full_name', '')::TEXT AS user_name, COALESCE(u.raw_user_meta_data->>'avatar_url', '')::TEXT AS user_avatar,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'color', c.color)) FROM public.announcement_category_map acm JOIN public.announcement_categories c ON c.id = acm.category_id WHERE acm.announcement_id = a.id), '[]'::jsonb) AS categories,
        (SELECT COUNT(*)::INT FROM public.announcement_reactions ar WHERE ar.announcement_id = a.id) AS reaction_count,
        (SELECT emoji::TEXT FROM public.announcement_reactions ar2 WHERE ar2.announcement_id = a.id AND ar2.user_id = auth.uid()) AS my_reaction
    FROM public.announcements a
    LEFT JOIN auth.users u ON u.id = a.user_id
    WHERE a.organization_id = p_org_id
        AND (p_status IS NULL OR a.status = p_status)
        AND (p_category_id IS NULL OR EXISTS (SELECT 1 FROM public.announcement_category_map acm2 WHERE acm2.announcement_id = a.id AND acm2.category_id = p_category_id))
    ORDER BY a.is_pinned DESC, a.published_at DESC NULLS LAST, a.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_announcements_with_details(UUID, TEXT, UUID) TO authenticated;

-- Get announcement categories with counts
CREATE OR REPLACE FUNCTION public.get_announcement_categories_with_counts(p_org_id UUID)
RETURNS TABLE (id UUID, name TEXT, color TEXT, sort_order INT, announcement_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT c.id, c.name, c.color, c.sort_order, COUNT(DISTINCT acm.announcement_id) AS announcement_count
    FROM public.announcement_categories c
    LEFT JOIN public.announcement_category_map acm ON acm.category_id = c.id
    LEFT JOIN public.announcements a ON a.id = acm.announcement_id AND a.organization_id = p_org_id AND a.status = 'published'
    WHERE c.organization_id = p_org_id
    GROUP BY c.id, c.name, c.color, c.sort_order
    ORDER BY c.sort_order ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_announcement_categories_with_counts(UUID) TO authenticated;

-- Increment announcement views
CREATE OR REPLACE FUNCTION public.increment_announcement_views(p_announcement_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    UPDATE public.announcements SET view_count = view_count + 1 WHERE id = p_announcement_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.increment_announcement_views(UUID) TO authenticated;

-- =============================================
-- TRIGGERS
-- =============================================

-- Lowercase organization fields trigger
CREATE TRIGGER trg_organizations_lowercase_fields
BEFORE INSERT OR UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION organizations_lowercase_fields();

-- New user creation trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- New organization creation trigger
CREATE TRIGGER trg_create_organization_bucket
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization();

-- Update announcement timestamp trigger
CREATE OR REPLACE FUNCTION public.update_announcement_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.update_announcement_timestamp();

-- Log idea changes trigger
CREATE OR REPLACE FUNCTION public.log_idea_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_old_status_name TEXT;
    v_new_status_name TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
            SELECT name INTO v_old_status_name FROM public.idea_statuses WHERE id = OLD.status_id;
            SELECT name INTO v_new_status_name FROM public.idea_statuses WHERE id = NEW.status_id;
            PERFORM public.log_idea_activity(NEW.id, auth.uid(), 'idea_status_changed'::activity_type, jsonb_build_object('old_status', v_old_status_name, 'new_status', v_new_status_name, 'old_status_id', OLD.status_id, 'new_status_id', NEW.status_id));
        END IF;

        IF OLD.is_bug != NEW.is_bug THEN
            PERFORM public.log_idea_activity(NEW.id, auth.uid(), CASE WHEN NEW.is_bug THEN 'idea_marked_bug'::activity_type ELSE 'idea_unmarked_bug'::activity_type END, '{}'::jsonb);
        END IF;

        IF OLD.is_archived != NEW.is_archived THEN
            PERFORM public.log_idea_activity(NEW.id, auth.uid(), CASE WHEN NEW.is_archived THEN 'idea_archived'::activity_type ELSE 'idea_unarchived'::activity_type END, '{}'::jsonb);
        END IF;

        IF OLD.is_pinned != NEW.is_pinned THEN
            PERFORM public.log_idea_activity(NEW.id, auth.uid(), CASE WHEN NEW.is_pinned THEN 'idea_pinned'::activity_type ELSE 'idea_unpinned'::activity_type END, '{}'::jsonb);
        END IF;

        IF OLD.is_private != NEW.is_private THEN
            PERFORM public.log_idea_activity(NEW.id, auth.uid(), CASE WHEN NEW.is_private THEN 'idea_made_private'::activity_type ELSE 'idea_made_public'::activity_type END, '{}'::jsonb);
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_log_idea_changes
AFTER UPDATE ON public.ideas
FOR EACH ROW EXECUTE FUNCTION public.log_idea_changes();

-- Log topic activity trigger
CREATE OR REPLACE FUNCTION public.log_topic_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_topic_name TEXT;
    v_idea_created_at TIMESTAMPTZ;
    v_now TIMESTAMPTZ;
BEGIN
    SELECT created_at INTO v_idea_created_at FROM public.ideas WHERE id = COALESCE(NEW.idea_id, OLD.idea_id);
    IF v_idea_created_at IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

    v_now := NOW();
    IF (v_now - v_idea_created_at) < INTERVAL '5 seconds' THEN RETURN COALESCE(NEW, OLD); END IF;

    SELECT name INTO v_topic_name FROM public.user_idea_topics WHERE id = COALESCE(NEW.topic_id, OLD.topic_id);

    IF TG_OP = 'INSERT' THEN
        BEGIN
            PERFORM public.log_idea_activity(NEW.idea_id, auth.uid(), 'topic_added'::activity_type, jsonb_build_object('topic_id', NEW.topic_id, 'topic_name', v_topic_name));
        EXCEPTION WHEN foreign_key_violation THEN NULL; END;
    ELSIF TG_OP = 'DELETE' THEN
        BEGIN
            PERFORM public.log_idea_activity(OLD.idea_id, auth.uid(), 'topic_removed'::activity_type, jsonb_build_object('topic_id', OLD.topic_id, 'topic_name', v_topic_name));
        EXCEPTION WHEN foreign_key_violation THEN NULL; END;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE TRIGGER trg_log_topic_activity
AFTER INSERT OR DELETE ON public.idea_topic_map
FOR EACH ROW EXECUTE FUNCTION public.log_topic_activity();

-- Log attachment activity trigger
CREATE OR REPLACE FUNCTION public.log_attachment_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_idea_created_at TIMESTAMPTZ;
    v_now TIMESTAMPTZ;
BEGIN
    IF TG_OP = 'INSERT' AND NEW.comment_id IS NOT NULL THEN RETURN NEW; END IF;
    IF TG_OP = 'DELETE' AND OLD.comment_id IS NOT NULL THEN RETURN OLD; END IF;

    IF NEW.idea_id IS NOT NULL OR OLD.idea_id IS NOT NULL THEN
        SELECT created_at INTO v_idea_created_at FROM public.ideas WHERE id = COALESCE(NEW.idea_id, OLD.idea_id);
        IF v_idea_created_at IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

        v_now := NOW();
        IF (v_now - v_idea_created_at) < INTERVAL '5 seconds' THEN RETURN COALESCE(NEW, OLD); END IF;
    END IF;

    IF TG_OP = 'INSERT' AND NEW.idea_id IS NOT NULL THEN
        BEGIN
            PERFORM public.log_idea_activity(NEW.idea_id, NEW.uploaded_by, 'attachment_added'::activity_type, jsonb_build_object('file_name', NEW.file_name, 'file_type', NEW.file_type, 'attachment_id', NEW.id));
        EXCEPTION WHEN foreign_key_violation THEN NULL; END;
    ELSIF TG_OP = 'DELETE' AND OLD.idea_id IS NOT NULL THEN
        BEGIN
            PERFORM public.log_idea_activity(OLD.idea_id, OLD.uploaded_by, 'attachment_deleted'::activity_type, jsonb_build_object('file_name', OLD.file_name, 'attachment_id', OLD.id));
        EXCEPTION WHEN foreign_key_violation THEN NULL; END;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE TRIGGER trg_log_attachment_activity
AFTER INSERT OR DELETE ON public.attachments
FOR EACH ROW EXECUTE FUNCTION public.log_attachment_activity();

-- =============================================
-- REALTIME SUBSCRIPTIONS
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.idea_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.idea_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_reactions;

-- =============================================
-- CREATE BUCKETS FOR EXISTING ORGANIZATIONS
-- =============================================

DO $block$
DECLARE
    org RECORD;
BEGIN
    FOR org IN SELECT id, slug FROM public.organizations WHERE slug IS NOT NULL LOOP
        PERFORM public.create_organization_bucket(org.id, org.slug);
    END LOOP;
END $block$;

COMMIT;

-- =============================================
-- Fix Infinite Recursion in Memberships Policies
-- =============================================

BEGIN;

-- =============================================
-- Remove problematic memberships policies
-- =============================================

DROP POLICY IF EXISTS "Users can view memberships in their organizations" ON public.memberships;
DROP POLICY IF EXISTS "Admins and service role can create memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON public.memberships;

-- =============================================
-- Create helper function to avoid recursion
-- =============================================

CREATE OR REPLACE FUNCTION public.user_is_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.memberships
        WHERE organization_id = p_org_id
        AND user_id = p_user_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_is_org_member(UUID, UUID) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.user_is_org_admin(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.memberships
        WHERE organization_id = p_org_id
        AND user_id = p_user_id
        AND role = 'admin'
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_is_org_admin(UUID, UUID) TO authenticated, anon;

-- =============================================
-- Create new non-recursive memberships policies
-- =============================================

CREATE POLICY "Users can view memberships in their organizations"
ON public.memberships
FOR SELECT
USING (
    -- Users can see their own membership
    user_id = auth.uid()
    OR
    -- Users can see other memberships in orgs where they are members
    public.user_is_org_member(organization_id, auth.uid())
);

CREATE POLICY "Admins and service role can create memberships"
ON public.memberships
FOR INSERT
WITH CHECK (
    auth.jwt()->>'role' = 'service_role'
    OR public.user_is_org_admin(organization_id, auth.uid())
);

CREATE POLICY "Admins can update memberships"
ON public.memberships
FOR UPDATE
USING (
    public.user_is_org_admin(organization_id, auth.uid())
)
WITH CHECK (
    public.user_is_org_admin(organization_id, auth.uid())
);

CREATE POLICY "Admins can delete memberships"
ON public.memberships
FOR DELETE
USING (
    public.user_is_org_admin(organization_id, auth.uid())
);

COMMIT;
