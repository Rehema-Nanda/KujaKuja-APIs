gcloud sql export csv kujakuja-live-db gs://kujakuja-ofda-dev-syndication/ofda-live-responses.csv --database=kujakuja --project=kujakuja-ofda-live --query "SELECT id, service_point_id, satisfied, idea, lat, lng, created_at, updated_at, phase2_id, uploaded_at, unique_id, user_id, response_type, is_starred, nlp_extract_adjectives_processed from public.responses"