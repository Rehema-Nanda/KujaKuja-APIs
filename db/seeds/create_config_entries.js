
exports.seed = async function(knex) {
    // Deletes ALL existing entries
    // await knex('config').del();

    // Inserts seed entries
    await knex.raw(`
        INSERT INTO public.config (key, config)
        VALUES (\'site_header\', \'{"favicon_url": null, "logo_url": null, "title_text": null, "highlight_colour": null}\')
        ON CONFLICT DO NOTHING
        `
    );
};
