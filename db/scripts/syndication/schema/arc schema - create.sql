DO $$
BEGIN
	IF EXISTS(
	    SELECT schema_name
	      FROM information_schema.schemata
	      WHERE schema_name = 'arc'
	  )
	THEN
	  DROP SCHEMA arc CASCADE;
	END IF;
END
$$;

CREATE SCHEMA arc AUTHORIZATION cloudsqlsuperuser;

-- Drop table

-- DROP TABLE arc.countries;

-- NOTE: don't copy over country data to public, map it instead

CREATE TABLE arc.countries (
	id bigserial NOT NULL,
	enabled bool NULL,
	"name" varchar NULL,
	iso_two_letter_code varchar NULL,
	geojson jsonb NULL,
	lat numeric(12,8) NOT NULL DEFAULT '0'::numeric,
	lng numeric(12,8) NOT NULL DEFAULT '0'::numeric,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT countries_pkey PRIMARY KEY (id)
);


-- Drop table

-- DROP TABLE arc.settlements;

CREATE TABLE arc.settlements (
	id bigserial NOT NULL,
	"name" varchar NULL,
	geojson jsonb NULL DEFAULT '{}'::jsonb,
	lat numeric(12,8) NULL,
	lng numeric(12,8) NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	country_id int8 NULL,
	CONSTRAINT settlements_pkey PRIMARY KEY (id)
);

ALTER TABLE arc.settlements ADD CONSTRAINT settlements_country_id_foreign FOREIGN KEY (country_id) REFERENCES arc.countries(id);

-- Drop table

-- DROP TABLE arc.service_types;

-- NOTE: don't copy over service type data to public, map it instead

CREATE TABLE arc.service_types (
	id bigserial NOT NULL,
	"name" varchar NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT service_types_pkey PRIMARY KEY (id)
);

-- Drop table

-- DROP TABLE arc.service_points;

CREATE TABLE arc.service_points (
	id bigserial NOT NULL,
	service_type_id int8 NULL,
	settlement_id int8 NULL,
	"name" varchar NULL,
	lat numeric(12,8) NULL,
	lng numeric(12,8) NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT service_points_pkey PRIMARY KEY (id)
);

ALTER TABLE arc.service_points ADD CONSTRAINT service_points_service_type_id_foreign FOREIGN KEY (service_type_id) REFERENCES arc.service_types(id);
ALTER TABLE arc.service_points ADD CONSTRAINT service_points_settlement_id_foreign FOREIGN KEY (settlement_id) REFERENCES arc.settlements(id);


-- Drop table

-- DROP TABLE arc.users;

CREATE TABLE arc.users (
	id bigserial NOT NULL,
	email varchar NOT NULL DEFAULT ''::character varying,
	encrypted_password varchar NOT NULL DEFAULT ''::character varying,
	reset_password_token varchar NULL,
	reset_password_sent_at timestamptz NULL,
	remember_created_at timestamptz NULL,
	sign_in_count int4 NOT NULL DEFAULT 0,
	current_sign_in_at timestamptz NULL,
	last_sign_in_at timestamptz NULL,
	current_sign_in_ip inet NULL,
	last_sign_in_ip inet NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_admin bool NOT NULL DEFAULT false,
	provider varchar NOT NULL DEFAULT 'email'::character varying,
	uid varchar NOT NULL DEFAULT ''::character varying,
	tokens json NULL,
	settlement_id int8 NULL,
	is_survey bool NOT NULL DEFAULT false,
	is_service_provider bool NULL DEFAULT false,
	CONSTRAINT users_pkey PRIMARY KEY (id)
);

ALTER TABLE arc.users ADD CONSTRAINT users_settlement_id_foreign FOREIGN KEY (settlement_id) REFERENCES arc.settlements(id);

-- Drop table

-- DROP TABLE arc.responses;

CREATE TABLE arc.responses (
	id bigserial NOT NULL,
	service_point_id int8 NULL,
	satisfied bool NULL,
	idea varchar NULL,
	lat numeric(12,8) NULL,
	lng numeric(12,8) NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	phase2_id int8 NULL,
	uploaded_at timestamptz NULL,
	unique_id varchar NULL,
	user_id int8 NULL,
	response_type varchar NOT NULL DEFAULT ''::character varying,
	is_starred bool NULL DEFAULT false,
	nlp_extract_adjectives_processed bool NULL DEFAULT false,
	idea_language varchar(128) NULL DEFAULT 'es'::character varying,
	idea_token_vector tsvector NULL,
	CONSTRAINT responses_pkey PRIMARY KEY (id),
	CONSTRAINT responses_unique_id_unique UNIQUE (unique_id)
);

ALTER TABLE arc.responses ADD CONSTRAINT responses_service_point_id_foreign FOREIGN KEY (service_point_id) REFERENCES arc.service_points(id);
ALTER TABLE arc.responses ADD CONSTRAINT responses_user_id_foreign FOREIGN KEY (user_id) REFERENCES arc.users(id);
