@set offset_start = 2000000000
@set offset_end = 3000000000
@set schema_name = crc
@set email_suffix = '.adra'
@set partner_prefix = 'ADRA '

SELECT sp.id + :offset_start, service_type_id, src_id, target_service_type_id, sst.name as source_service_type_name, pst.name as public_service_type_name, settlement_id + :offset_start, concat(:partner_prefix,sp."name")
FROM :schema_name.service_points sp
left join (VALUES('Healthcare', 1, 3),('Community Pulse',2,7),('Water',3,1),('Mental Health',4,3)) AS adra_sp_map (service_type_name, src_id, target_service_type_id)
on sp.service_type_id=adra_sp_map.src_id
left join adra.service_types sst
on adra_sp_map.src_id = sst.id
left join public.service_types pst
on adra_sp_map.target_service_type_id = pst.id

@set offset_start = 1000000000
@set offset_end = 2000000000
@set schema_name = crc
@set email_suffix = '.crc'
@set partner_prefix = 'CRC '

SELECT sp.id + :offset_start, service_type_id, src_id, target_service_type_id, sst.name as source_service_type_name, pst.name as public_service_type_name, settlement_id + :offset_start, concat(:partner_prefix,sp."name")
FROM :schema_name.service_points sp
left join (VALUES('Nutrition', 1, 6),('Healthcare',2,3),('Farmacia',3,3),('Sala de espera',4,3)) AS crc_sp_map (service_type_name, src_id, target_service_type_id)
on sp.service_type_id=crc_sp_map.src_id
left join crc.service_types sst
on crc_sp_map.src_id = sst.id
left join public.service_types pst
on crc_sp_map.target_service_type_id = pst.id


@set offset_start = 3000000000
@set offset_end = 4000000000
@set schema_name = nrc
@set email_suffix = '.nrc'
@set partner_prefix = 'NRC '

SELECT sp.id + :offset_start, service_type_id, src_id, target_service_type_id, sst.name as source_service_type_name, pst.name as public_service_type_name, settlement_id + :offset_start, concat(:partner_prefix,sp."name")
FROM :schema_name.service_points sp
left join (VALUES('Cash Transfer', 3, 9),('Legal Advice',4,10)) AS nrc_sp_map (service_type_name, src_id, target_service_type_id)
on sp.service_type_id=nrc_sp_map.src_id
left join nrc.service_types sst
on nrc_sp_map.src_id = sst.id
left join public.service_types pst
on nrc_sp_map.target_service_type_id = pst.id
