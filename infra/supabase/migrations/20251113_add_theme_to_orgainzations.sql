-- Migration: Add theme column to organizations table
-- File: supabase/migrations/YYYYMMDDHHMMSS_add_theme_to_organizations.sql

-- Add theme column with default value
ALTER TABLE organizations
ADD COLUMN theme TEXT NOT NULL DEFAULT 'light'
CHECK (theme IN ('light', 'dark', 'solarized'));

-- Add index for faster theme lookups (optional but recommended)
CREATE INDEX idx_organizations_theme ON organizations(theme);

-- Update existing organizations to have the default theme
UPDATE organizations
SET theme = 'light'
WHERE theme IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN organizations.theme IS 'Theme preference for the organization workspace (light, dark, solarized)';
