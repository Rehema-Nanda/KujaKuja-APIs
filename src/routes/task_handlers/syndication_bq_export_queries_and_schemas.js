const getExportQueryForBigQuery = (withTags) => {
    return `
        SELECT
            c.name AS country_name,
            s.name AS location_name,
            sp.name AS service_point_name,
            st.name AS service_type,
            satisfied,
            CASE
                WHEN response_type = 'binary' OR idea IS NULL THEN 'Self-Swipe'
                ELSE 'Survey'
            END AS response_type,
            r.response_type AS response_type_raw,
            CASE
                WHEN satisfied THEN 1
                ELSE 0
            END AS satisfied_num,
            regexp_replace(idea, '[\n\r]+', ' ', 'g') AS idea,
            r.lat AS response_lat,
            r.lng AS response_lng,
            point(r.lng, r.lat) AS response_point,
            concat(r.lat, ',', r.lng) AS lat_lon,
            r.created_at AT TIME ZONE 'UTC' AS created_at_utc,
            r.uploaded_at AT TIME ZONE 'UTC' AS uploaded_at_utc,
            tz.time_zone,
            r.created_at AT TIME ZONE tz.time_zone AS created_at_tz,
            r.uploaded_at AT TIME ZONE tz.time_zone AS uploaded_at_tz,
            unique_id,
            user_id,
            is_starred
            ${withTags ? ", t.name as tag" : ""}
        FROM public.responses AS r
        INNER JOIN public.service_points AS sp ON r.service_point_id = sp.id
        INNER JOIN public.settlements AS s ON sp.settlement_id = s.id
        INNER JOIN public.service_types AS st ON sp.service_type_id = st.id
        INNER JOIN public.countries AS c ON c.id = s.country_id
        ${withTags ? "LEFT JOIN public.tags AS t ON t.response_id = r.id" : ""}
        LEFT JOIN (
            VALUES ('RW', 'Africa/Kigali'), ('SD', 'Africa/Khartoum'), ('UG', 'Africa/Kampala'),
                   ('SO', 'Africa/Mogadishu'), ('CO','America/Bogota')
        ) AS tz (iso_two_letter_code, time_zone) ON tz.iso_two_letter_code = c.iso_two_letter_code
        INNER JOIN public.users AS u ON r.user_id = u.id
        WHERE r.created_at BETWEEN '1 April 2010' AND '1 April 2030'
    `;
};

const getTableSchemaForBigQuery = (withTags) => {
    const tableSchema = [
        { name: "country_name", type: "STRING" },
        { name: "location_name", type: "STRING" },
        { name: "service_point_name", type: "STRING" },
        { name: "service_type", type: "STRING" },
        { name: "satisfied", type: "BOOLEAN" },
        { name: "response_type", type: "STRING" },
        { name: "response_type_raw", type: "STRING" },
        { name: "satisfied_num", type: "INTEGER" },
        { name: "idea", type: "STRING" },
        { name: "response_lat", type: "FLOAT" },
        { name: "response_lng", type: "FLOAT" },
        { name: "response_point", type: "STRING" },
        { name: "lat_lon", type: "STRING" },
        { name: "created_at_utc", type: "TIMESTAMP" },
        { name: "uploaded_at_utc", type: "TIMESTAMP" },
        { name: "time_zone", type: "STRING" },
        { name: "created_at_tz", type: "TIMESTAMP" },
        { name: "uploaded_at_tz", type: "TIMESTAMP" },
        { name: "unique_id", type: "STRING" },
        { name: "user_id", type: "INTEGER" },
        { name: "is_starred", type: "BOOLEAN" },
    ];

    if (withTags) {
        tableSchema.push({ name: "tags", type: "STRING" });
    }

    return tableSchema;
};

module.exports = {
    getExportQueryForBigQuery,
    getTableSchemaForBigQuery,
};
