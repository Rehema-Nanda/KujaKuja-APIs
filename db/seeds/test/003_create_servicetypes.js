
exports.seed = async function(knex) {
    // Deletes ALL existing entries
    // await knex('service_types').del();

    // Inserts seed entries
    await knex('service_types').insert([
        {
            id: 1,

            name: 'Water',
            // created_at: ,
            // updated_at:
        },
        {
            id: 2,

            name: 'Protection',
            // created_at: ,
            // updated_at:
        },
        {
            id: 3,

            name: 'Healthcare',
            // created_at: ,
            // updated_at:
        },
        {
            id: 4,

            name: 'Nutrition',
            // created_at: ,
            // updated_at:
        }
    ]);
};
