
exports.up = async function(knex) {
    // countries (change types, set defaults)
    await knex.schema.raw(`
        ALTER TABLE public.countries
        ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.countries
        ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP
        `
    );

    // settlements (change types, set defaults for created_at & updated_at)
    await knex.schema.raw(`
        ALTER TABLE public.settlements
        ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.settlements
        ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.settlements
        ALTER COLUMN photo_updated_at TYPE timestamp with time zone USING photo_updated_at AT TIME ZONE 'UTC'
        `
    );

    // featured_ideas (change types, set defaults)
    await knex.schema.raw(`
        ALTER TABLE public.featured_ideas
        ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.featured_ideas
        ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP
        `
    );

    // users (change types, set defaults for created_at & updated_at)
    await knex.schema.raw(`
        ALTER TABLE public.users
        ALTER COLUMN reset_password_sent_at TYPE timestamp with time zone USING reset_password_sent_at AT TIME ZONE 'UTC'
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.users
        ALTER COLUMN remember_created_at TYPE timestamp with time zone USING remember_created_at AT TIME ZONE 'UTC'
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.users
        ALTER COLUMN current_sign_in_at TYPE timestamp with time zone USING current_sign_in_at AT TIME ZONE 'UTC'
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.users
        ALTER COLUMN last_sign_in_at TYPE timestamp with time zone USING last_sign_in_at AT TIME ZONE 'UTC'
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.users
        ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.users
        ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP
        `
    );

    // responses (change types, set defaults for created_at & updated_at)
    await knex.schema.raw(`
        ALTER TABLE public.responses
        ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.responses
        ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.responses
        ALTER COLUMN uploaded_at TYPE timestamp with time zone USING uploaded_at AT TIME ZONE 'UTC'
        `
    );

    // service_point_availabilities (change types, set default for created_at, drop default for uploaded_at, add not nullable constraint for availability_time)
    await knex.schema.raw(`
        ALTER TABLE public.service_point_availabilities
        ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.service_point_availabilities
        ALTER COLUMN uploaded_at TYPE timestamp with time zone USING uploaded_at AT TIME ZONE 'UTC',
        ALTER COLUMN uploaded_at DROP DEFAULT
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.service_point_availabilities
        ALTER COLUMN availability_time TYPE timestamp with time zone USING availability_time AT TIME ZONE 'UTC',
        ALTER COLUMN availability_time SET NOT NULL
        `
    );

    // service_points (change types, set defaults for created_at & updated_at, drop default for last_availability_time)
    await knex.schema.raw(`
        ALTER TABLE public.service_points
        ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.service_points
        ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.service_points
        ALTER COLUMN photo_updated_at TYPE timestamp with time zone USING photo_updated_at AT TIME ZONE 'UTC'
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.service_points
        ALTER COLUMN last_availability_time TYPE timestamp with time zone USING last_availability_time AT TIME ZONE 'UTC',
        ALTER COLUMN last_availability_time DROP DEFAULT
        `
    );

    // service_types (change types, set defaults for created_at & updated_at)
    await knex.schema.raw(`
        ALTER TABLE public.service_types
        ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.service_types
        ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.service_types
        ALTER COLUMN photo_updated_at TYPE timestamp with time zone USING photo_updated_at AT TIME ZONE 'UTC'
        `
    );
};

exports.down = async function(knex) {
    // countries (change types, drop defaults)
    await knex.schema.raw(`
        ALTER TABLE public.countries
        ALTER COLUMN created_at TYPE timestamp without time zone USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN created_at DROP DEFAULT
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.countries
        ALTER COLUMN updated_at TYPE timestamp without time zone USING updated_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at DROP DEFAULT
        `
    );

    // settlements (change types, drop defaults for created_at & updated_at)
    await knex.schema.raw(`
        ALTER TABLE public.settlements
        ALTER COLUMN created_at TYPE timestamp without time zone USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN created_at DROP DEFAULT
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.settlements
        ALTER COLUMN updated_at TYPE timestamp without time zone USING updated_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at DROP DEFAULT
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.settlements
        ALTER COLUMN photo_updated_at TYPE timestamp without time zone USING photo_updated_at AT TIME ZONE 'UTC'
        `
    );

    // featured_ideas (change types, drop defaults)
    await knex.schema.raw(`
        ALTER TABLE public.featured_ideas
        ALTER COLUMN created_at TYPE timestamp without time zone USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN created_at DROP DEFAULT
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.featured_ideas
        ALTER COLUMN updated_at TYPE timestamp without time zone USING updated_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at DROP DEFAULT
        `
    );

    // users (change types, drop defaults for created_at & updated_at)
    await knex.schema.raw(`
        ALTER TABLE public.users
        ALTER COLUMN reset_password_sent_at TYPE timestamp without time zone USING reset_password_sent_at AT TIME ZONE 'UTC'
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.users
        ALTER COLUMN remember_created_at TYPE timestamp without time zone USING remember_created_at AT TIME ZONE 'UTC'
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.users
        ALTER COLUMN current_sign_in_at TYPE timestamp without time zone USING current_sign_in_at AT TIME ZONE 'UTC'
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.users
        ALTER COLUMN last_sign_in_at TYPE timestamp without time zone USING last_sign_in_at AT TIME ZONE 'UTC'
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.users
        ALTER COLUMN created_at TYPE timestamp without time zone USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN created_at DROP DEFAULT
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.users
        ALTER COLUMN updated_at TYPE timestamp without time zone USING updated_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at DROP DEFAULT
        `
    );

    // responses (change types, drop defaults for created_at & updated_at)
    await knex.schema.raw(`
        ALTER TABLE public.responses
        ALTER COLUMN created_at TYPE timestamp without time zone USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN created_at DROP DEFAULT
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.responses
        ALTER COLUMN updated_at TYPE timestamp without time zone USING updated_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at DROP DEFAULT
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.responses
        ALTER COLUMN uploaded_at TYPE timestamp without time zone USING uploaded_at AT TIME ZONE 'UTC'
        `
    );

    // service_point_availabilities (change types, drop default for created_at, set default for uploaded_at, drop not nullable constraint for availability_time)
    await knex.schema.raw(`
        ALTER TABLE public.service_point_availabilities
        ALTER COLUMN created_at TYPE timestamp without time zone USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN created_at DROP DEFAULT
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.service_point_availabilities
        ALTER COLUMN uploaded_at TYPE timestamp without time zone USING uploaded_at AT TIME ZONE 'UTC',
        ALTER COLUMN uploaded_at SET DEFAULT CURRENT_TIMESTAMP
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.service_point_availabilities
        ALTER COLUMN availability_time TYPE timestamp without time zone USING availability_time AT TIME ZONE 'UTC',
        ALTER COLUMN availability_time DROP NOT NULL
        `
    );

    // service_points (change types, drop defaults for created_at & updated_at, set default for last_availability_time)
    await knex.schema.raw(`
        ALTER TABLE public.service_points
        ALTER COLUMN created_at TYPE timestamp without time zone USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN created_at DROP DEFAULT
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.service_points
        ALTER COLUMN updated_at TYPE timestamp without time zone USING updated_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at DROP DEFAULT
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.service_points
        ALTER COLUMN photo_updated_at TYPE timestamp without time zone USING photo_updated_at AT TIME ZONE 'UTC'
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.service_points
        ALTER COLUMN last_availability_time TYPE timestamp without time zone USING last_availability_time AT TIME ZONE 'UTC',
        ALTER COLUMN last_availability_time SET DEFAULT CURRENT_TIMESTAMP
        `
    );

    // service_types (change types, drop defaults for created_at & updated_at)
    await knex.schema.raw(`
        ALTER TABLE public.service_types
        ALTER COLUMN created_at TYPE timestamp without time zone USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN created_at DROP DEFAULT
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.service_types
        ALTER COLUMN updated_at TYPE timestamp without time zone USING updated_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at DROP DEFAULT
        `
    );
    await knex.schema.raw(`
        ALTER TABLE public.service_types
        ALTER COLUMN photo_updated_at TYPE timestamp without time zone USING photo_updated_at AT TIME ZONE 'UTC'
        `
    );
};
