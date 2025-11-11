DO $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Insert only test@hintboard.app
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at,
        last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        extensions.uuid_generate_v4(),
        'authenticated',
        'authenticated',
        'test@hintboard.app',
        extensions.crypt('test', extensions.gen_salt('bf')),
        current_timestamp,
        current_timestamp,
        current_timestamp,
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Test User", "email":"test@hintboard.app"}'::jsonb,
        current_timestamp,
        current_timestamp,
        '',
        '',
        '',
        ''
    ) RETURNING id INTO user_uuid;

    -- Add identity for the user
    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
        extensions.uuid_generate_v4(),
        user_uuid,
        user_uuid,
        format('{"sub":"%s","email":"%s"}', user_uuid::text, 'test@hintboard.app')::jsonb,
        'email',
        current_timestamp,
        current_timestamp,
        current_timestamp
    );

    -- Store user_uuid for other seed files
    CREATE TEMP TABLE IF NOT EXISTS temp_users (id UUID);
    INSERT INTO temp_users (id) VALUES (user_uuid);

    -- Mark onboarding as done for this test user
    UPDATE public.user_preferences
    SET onboarding_completed = TRUE
    WHERE user_id = user_uuid;
END $$;
