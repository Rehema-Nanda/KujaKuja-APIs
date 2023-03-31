gcloud sql export csv kujakuja-live-db gs://kujakuja-arc-live-export/alight-live-responses.csv --database=kujakuja --project=kujakuja-arc-live --query "SELECT s.\"name\" as location_name, sp.\"name\" as service_point_name, st.\"name\" as service_type, satisfied, case when response_type = 'binary' or idea is null then 'Self-Swipe' else 'Survey' end as response_type, r.response_type as response_type_raw, case when satisfied then 1 else 0 end as satisfied_num, regexp_replace(idea, '[\n\r]+', ' ', 'g' ) AS idea, r.lat as response_lat, r.lng as response_lng, point(r.lng, r.lat) as response_point, 	concat(r.lat ,',',r.lng ) as lat_lon, r.created_at at time zone 'utc' as created_at_utc, r.uploaded_at at time zone 'utc' as uploaded_at_utc, tz.time_zone, r.created_at at time zone tz.time_zone as created_at_tz, r.uploaded_at at time zone tz.time_zone as uploaded_at_tz, unique_id, user_id, is_starred FROM public.responses r inner join public.service_points as sp on r.service_point_id = sp.id inner join public.settlements as s on sp.settlement_id = s.id INNER JOIN public.service_types st on sp.service_type_id = st.id inner join public.countries as c on c.id = s.country_id left join (VALUES('RW', 'Africa/Kigali'), ('SD', 'Africa/Khartoum'), ('UG', 'Africa/Kampala'), ('SO', 'Africa/Mogadishu')) AS tz (iso_two_letter_code, time_zone) on tz.iso_two_letter_code = c.iso_two_letter_code inner join public.users as u on r.user_id = u.id where r.created_at between '1 April 2010' and '1 April 2030';"