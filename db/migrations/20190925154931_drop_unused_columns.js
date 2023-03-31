exports.up = async (knex) => {
    await knex.schema.table('service_points', function (table) {
        table.dropColumns(
            'available',
            'is_binary_only',
            'capture_availability',
            'allow_starred_ideas',
            'last_availability_time',
            'photo_file_name',
            'photo_content_type',
            'photo_file_size',
            'photo_updated_at'
        );
    });

    await knex.schema.table('settlements', function (table) {
        table.dropColumns(
            'photo_file_name',
            'photo_content_type',
            'photo_file_size',
            'photo_updated_at'
        );
    });

    await knex.schema.table('service_types', function (table) {
        table.dropColumns(
            'photo_file_name',
            'photo_content_type',
            'photo_file_size',
            'photo_updated_at'
        );
    });
};

exports.down = async function (knex) {
    await knex.schema.table('service_points', function (table) {
        table.boolean('available').defaultTo(false);
        table.boolean('is_binary_only').notNullable().defaultTo(false);
        table.boolean('capture_availability').notNullable().defaultTo(true);
        table.boolean('allow_starred_ideas').defaultTo(false);
        table.timestamp('last_availability_time');
        table.specificType('photo_file_name', 'character varying');
        table.specificType('photo_content_type', 'character varying');
        table.integer('photo_file_size');
        table.timestamp('photo_updated_at');
    });

    await knex.schema.table('settlements', function (table) {
        table.specificType('photo_file_name', 'character varying');
        table.specificType('photo_content_type', 'character varying');
        table.integer('photo_file_size');
        table.timestamp('photo_updated_at');
    });

    await knex.schema.table('service_types', function (table) {
        table.specificType('photo_file_name', 'character varying');
        table.specificType('photo_content_type', 'character varying');
        table.integer('photo_file_size');
        table.timestamp('photo_updated_at');
    });
};
