
exports.seed = async function(knex) {
    // Deletes ALL existing entries
    // await knex('users').del();

    let password = '$2a$10$dHQSfrC9ZOrzeQjt20tT5.IDXKZRB.mqeGXvdW/tSXGXDXyHsbNc2'; // the password is: testpassword

    // Inserts seed entries
    await knex('users').insert([
        {
            uid: 'adminuser@kujakuja.com',
            email: 'adminuser@kujakuja.com',
            encrypted_password: password,
            // created_at: ,
            // updated_at: ,
            is_admin: true,
            is_survey: false,
            is_service_provider: false,
            settlement_id: 1
        },
        {
            uid: 'surveyuser@kujakuja.com',
            email: 'surveyuser@kujakuja.com',
            encrypted_password: password,
            // created_at: ,
            // updated_at: ,
            is_admin: false,
            is_survey: true,
            is_service_provider: false,
            settlement_id: 2
        },
        {
            uid: 'nonprivuser@kujakuja.com',
            email: 'nonprivuser@kujakuja.com',
            encrypted_password: password,
            // created_at: ,
            // updated_at: ,
            is_admin: false,
            is_survey: false,
            is_service_provider: false,
            settlement_id: 3
        },
        {
            uid: 'serviceprovideruser@kujakuja.com',
            email: 'serviceprovideruser@kujakuja.com',
            encrypted_password: password,
            // created_at: ,
            // updated_at: ,
            is_admin: false,
            is_survey: false,
            is_service_provider: true,
            settlement_id: 3
        }
    ]);
};
