-- countries
SELECT id, enabled, name, iso_two_letter_code, geojson, lat, lng, created_at, updated_at FROM public.countries;
-- settlements
SELECT id, name, geojson, lat, lng, created_at, updated_at, country_id FROM public.settlements;
-- service_types
SELECT id, name, created_at, updated_at FROM public.service_types;
-- service_points
SELECT id, service_type_id, settlement_id, name, lat, lng, created_at, updated_at FROM public.service_points;
-- users
SELECT id, email, encrypted_password, reset_password_token, reset_password_sent_at, remember_created_at, sign_in_count, current_sign_in_at, last_sign_in_at, current_sign_in_ip, last_sign_in_ip, created_at, updated_at, is_admin, provider, uid, tokens, settlement_id, is_survey, is_service_provider FROM public.users;
-- responses
SELECT id, service_point_id, satisfied, idea, lat, lng, created_at, updated_at, phase2_id, uploaded_at, unique_id, user_id, response_type, is_starred, nlp_extract_adjectives_processed from public.responses;