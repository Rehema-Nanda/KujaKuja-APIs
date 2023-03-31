
exports.seed = async function(knex) {
    // Deletes ALL existing entries
    // await knex('service_points').del();

    // Inserts seed entries
    await knex('service_points').insert([
        {
            id: 1,
            service_type_id: 1, // Water
            settlement_id: 1, // Nakivale Base Camp

            name: 'Talking Stick',
            lat: -0.81872200,
            lng: 30.93701000,
            // created_at: ,
            // updated_at:
        },
        {
            id: 2,
            service_type_id: 2, // Protection
            settlement_id: 1, // Nakivale Base Camp

            name: 'Reception Center',
            lat: -0.77388500,
            lng: 30.97575500,
            // created_at: ,
            // updated_at:
        },
        {
            id: 3,
            service_type_id: 3, // Healthcare
            settlement_id: 2, // Mahama Camp

            name: 'OPD - Mahama 1 Health Center',
            lat: -2.30525500,
            lng: 30.83789100,
            // created_at: ,
            // updated_at:
        },
        {
            id: 4,
            service_type_id: 4, // Nutrition
            settlement_id: 2, // Mahama Camp

            name: 'Door to Door - Nutrition - Mahama',
            lat: -2.30975300,
            lng: 30.84153000,
            // created_at: ,
            // updated_at:
        }
    ]);
};
