@set offset_start = 1000000000
@set offset_end = 2000000000
@set schema_name = ofda
@set email_suffix = '.ofda'
@set partner_prefix = 'OFDA '

delete from public.responses where id > :offset_start and id < :offset_end; 
delete from public.users where id > :offset_start and id < :offset_end;
delete from public.service_points where id > :offset_start and id < :offset_end;
--delete from public.service_types where id > :offset_start and id < :offset_end;
delete from public.settlements where id > :offset_start and id < :offset_end; 
-- delete from public.countries where id > :offset_start and id < :offset_end; 

INSERT INTO public.settlements
(id, "name", geojson, lat, lng, created_at, updated_at, country_id)
SELECT id + :offset_start, concat(:partner_prefix, "name"), geojson, lat, lng, created_at, updated_at, country_id
FROM :schema_name.settlements WHERE id < 1000000000;

INSERT INTO public.users
(id, email, encrypted_password, reset_password_token, reset_password_sent_at, remember_created_at, sign_in_count, current_sign_in_at, last_sign_in_at, current_sign_in_ip, last_sign_in_ip, created_at, updated_at, is_admin, provider, uid, tokens, settlement_id, is_survey, is_service_provider)
SELECT 
u.id + :offset_start, concat(email,:email_suffix), 'syndicated user, not allowed to login', reset_password_token, reset_password_sent_at, remember_created_at, sign_in_count, current_sign_in_at, last_sign_in_at, current_sign_in_ip, last_sign_in_ip, created_at, updated_at, is_admin, provider, concat(uid,:email_suffix), tokens, settlement_id + :offset_start, is_survey, is_service_provider
FROM :schema_name.users u WHERE id < 1000000000;

INSERT INTO public.service_points
(id, service_type_id, settlement_id, "name", lat, lng, created_at, updated_at)
SELECT id + :offset_start, target_service_type_id, settlement_id + :offset_start, concat(:partner_prefix,"name"), lat, lng, created_at, updated_at
FROM :schema_name.service_points sp
left join (VALUES('Healthcare',3,2),('Nutrition', 6, 1),('Community Pulse',7,5),('Cash Transfer',9,6),('Legal Advice',10,7)) AS ofda_crc_sp_map (service_type_name, src_id, target_service_type_id)
on sp.service_type_id=ofda_crc_sp_map.src_id WHERE id < 1000000000;

INSERT INTO public.responses
(id, service_point_id, satisfied, idea, lat, lng, created_at, updated_at, phase2_id, uploaded_at, unique_id, user_id, response_type, is_starred, nlp_extract_adjectives_processed, idea_language, idea_token_vector)
SELECT id + :offset_start, service_point_id + :offset_start, satisfied, idea, lat, lng, created_at, updated_at, phase2_id, uploaded_at, concat(unique_id,'CRC'), user_id + :offset_start, response_type, is_starred, nlp_extract_adjectives_processed, idea_language, idea_token_vector
FROM :schema_name.responses WHERE id < 1000000000;


