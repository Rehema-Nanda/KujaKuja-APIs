exports.tables = [
    {
        name: "countries",
        query: "SELECT id, enabled, name, iso_two_letter_code, geojson, lat, lng, created_at, updated_at FROM public.countries where id < 1000000000;",
        next: "settlements",
    },
    {
        name: "settlements",
        query: "SELECT id, name, geojson, lat, lng, created_at, updated_at, country_id FROM public.settlements where id < 1000000000;",
        next: "service_types",
    },
    {
        name: "service_types",
        query: "SELECT id, name, created_at, updated_at FROM public.service_types where id < 1000000000;",
        next: "service_points",
    },
    {
        name: "service_points",
        query: "SELECT id, service_type_id, settlement_id, name, lat, lng, created_at, updated_at FROM public.service_points where id < 1000000000;",
        next: "users",
    },
    {
        name: "users",
        query: "SELECT id, email, encrypted_password, reset_password_token, reset_password_sent_at, remember_created_at, sign_in_count, current_sign_in_at, last_sign_in_at, current_sign_in_ip, last_sign_in_ip, created_at, updated_at, is_admin, provider, uid, tokens, settlement_id, is_survey, is_service_provider FROM public.users where id < 1000000000;",
        next: "responses",
    },
    {
        name: "responses",
        query: "SELECT id, service_point_id, satisfied, idea, lat, lng, created_at, updated_at, phase2_id, uploaded_at, unique_id, user_id, response_type, is_starred, nlp_extract_adjectives_processed, idea_language, idea_token_vector FROM public.responses where id < 1000000000;",
        next: "",
    },
];
