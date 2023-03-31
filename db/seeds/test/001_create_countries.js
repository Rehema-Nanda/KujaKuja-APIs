
exports.seed = async function(knex) {
    // Deletes ALL existing entries
    // await knex('countries').del();

    // Inserts seed entries
    await knex('countries').insert([
        {
            id: 1,

            enabled: true,
            name: 'Uganda',
            iso_two_letter_code: 'UG',
            // geojson: ,
            lat: 1.05869300,
            lng: 32.36176500,
            // created_at: ,
            // updated_at:
        },
        {
            id: 2,

            enabled: true,
            name: 'Rwanda',
            iso_two_letter_code: 'RW',
            // geojson: ,
            lat: -1.96920900,
            lng: 30.10042400,
            // created_at: ,
            // updated_at:
        }
    ]);
};
