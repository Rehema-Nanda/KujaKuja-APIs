-- Example adding table to schema

-- Table: note: this is a generic table across all env->env mappings 

CREATE TABLE ${envName}.service_type_map (
	source_env varchar NULL,
	source_service_type_id int8 NULL,
	source_service_type_name varchar NULL,
	target_env varchar NULL,
	target_service_type_id int8 NULL,
	target_service_type_name varchar NULL
);

-- Data: note if the table always has data for all mappings, then it may be easier.

-- Auto-generated SQL script #202005281806
INSERT INTO ${envName}.service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
	VALUES ('crc',1,'Nutrition','ofda',6,'Nutrition');
INSERT INTO ${envName}.service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
	VALUES ('crc',2,'Healthcare','ofda',3,'Healthcare');
INSERT INTO ${envName}.service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
	VALUES ('crc',3,'Farmacia','ofda',3,'Healthcare');
INSERT INTO ${envName}.service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
	VALUES ('crc',4,'Sala de espera','ofda',3,'Healthcare');
INSERT INTO ${envName}.service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
	VALUES ('nrc',3,'Cash Transfer','ofda',9,'Cash Transfer');
INSERT INTO ${envName}.service_type_map (source_env,source_service_type_id,source_service_type_name,target_env,target_service_type_id,target_service_type_name)
	VALUES ('nrc',4,'Legal Advice','ofda',10,'Legal Advice');


-- Then we can change the select in the insert as in the following examples:

@set offset_start = 3000000000
@set offset_end = 4000000000
@set schema_name = nrc
@set email_suffix = '.nrc'
@set partner_prefix = 'NRC '

SELECT id + :offset_start, target_service_type_id, settlement_id + :offset_start, concat(:partner_prefix,"name"), lat, lng, created_at, updated_at
FROM :schema_name.service_points sp
left join :schema_name.service_type_map sp_map
on sp_map.source_env = 'nrc' and sp.service_type_id=sp_map.source_service_type_id;

@set offset_start = 1000000000
@set offset_end = 2000000000
@set schema_name = crc
@set email_suffix = '.crc'
@set partner_prefix = 'CRC '

SELECT id + :offset_start, target_service_type_id, settlement_id + :offset_start, concat(:partner_prefix,"name"), lat, lng, created_at, updated_at
FROM :schema_name.service_points sp
left join crc.service_type_map sp_map
on sp_map.source_env = 'crc' and sp.service_type_id=sp_map.source_service_type_id;