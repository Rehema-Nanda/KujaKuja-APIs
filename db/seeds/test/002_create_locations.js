
exports.seed = async function(knex) {
    // Deletes ALL existing entries
    // await knex('settlements').del();

    // Inserts seed entries
    await knex('settlements').insert([
        {
            id: 1,
            country_id: 1, // Uganda

            name: 'Nakivale Base Camp',
            // geojson: ,
            lat: -0.78137800,
            lng: 30.93612700,
            // created_at: ,
            // updated_at:
        },
        {
            id: 2,
            country_id: 2, // Rwanda

            name: 'Mahama Camp',
            // geojson: ,
            lat: -2.30525500,
            lng: 30.83789100,
            // created_at: ,
            // updated_at:
        },
        {
            id: 3,
            country_id: 1, // Uganda

            name: 'Bidi Bidi Zone 5',
            // geojson: ,
            lat: 3.21918600,
            lng: 31.40524600,
            // created_at: ,
            // updated_at:
        }
    ]);
};
