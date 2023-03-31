@echo off

set env_source=%1
set env_type=%2
set env_dest=%3

set "spaces=                                                                                      "
set source_env_display_str=%env_source% %env_type%%spaces%
set source_env_display_str=%source_env_display_str:~0,24%

set "spaces=                                                                                      "
set dest_env_display_str=%env_dest% %env_type%%spaces%
set dest_env_display_str=%dest_env_display_str:~0,22%

@chcp 65001>nul
@echo ╭───────────────────────────────────────────────────────────────┬────────────╮
@echo │ Kuja Kuja Data Syndication Export                             │  STARTING  │
@echo │ From: %source_env_display_str% to: %dest_env_display_str%     │            │
@echo ╰───────────────────────────────────────────────────────────────┴────────────╯ 
@echo.
@chcp 850>nul

set service_account_email=unset
For /F Tokens^=2 %%A In ('gcloud sql instances describe kujakuja-%env_type%-db --project=kujakuja-%env_source%-%env_type% --quiet 2^>Nul^|Find "serviceAccountEmailAddress"')Do set service_account_email=%%A
@echo Service account email for %env_source%-%env_type%:  %service_account_email%
if "%service_account_email%"=="unset" GOTO ERROR

@echo Set Write Permissions: Set gs://kujakuja-%env_dest%-%env_type%-syndication/ to be writeable by %env_source%-%env_type% service account
call gsutil acl ch -u %service_account_email%:W gs://kujakuja-%env_dest%-%env_type%-syndication/
@echo.

@echo Exporting countries...
call gcloud sql export csv kujakuja-%env_type%-db gs://kujakuja-%env_dest%-%env_type%-syndication/%env_source%-%env_type%-countries.csv --database=kujakuja --project=kujakuja-%env_source%-%env_type% --query "SELECT id, enabled, name, iso_two_letter_code, geojson, lat, lng, created_at, updated_at FROM public.countries;"
@echo.

@echo Exporting settlements
call gcloud sql export csv kujakuja-%env_type%-db gs://kujakuja-%env_dest%-%env_type%-syndication/%env_source%-%env_type%-settlements.csv --database=kujakuja --project=kujakuja-%env_source%-%env_type% --query "SELECT id, name, geojson, lat, lng, created_at, updated_at, country_id FROM public.settlements;"
@echo.

@echo Exporting service_types
call gcloud sql export csv kujakuja-%env_type%-db gs://kujakuja-%env_dest%-%env_type%-syndication/%env_source%-%env_type%-service_types.csv --database=kujakuja --project=kujakuja-%env_source%-%env_type% --query "SELECT id, name, created_at, updated_at FROM public.service_types;"
@echo.

@echo Exporting service_points
call gcloud sql export csv kujakuja-%env_type%-db gs://kujakuja-%env_dest%-%env_type%-syndication/%env_source%-%env_type%-service_points.csv --database=kujakuja --project=kujakuja-%env_source%-%env_type% --query "SELECT id, service_type_id, settlement_id, name, lat, lng, created_at, updated_at FROM public.service_points;"
@echo.

@echo Exporting users
call gcloud sql export csv kujakuja-%env_type%-db gs://kujakuja-%env_dest%-%env_type%-syndication/%env_source%-%env_type%-users.csv --database=kujakuja --project=kujakuja-%env_source%-%env_type% --query "SELECT id, email, encrypted_password, reset_password_token, reset_password_sent_at, remember_created_at, sign_in_count, current_sign_in_at, last_sign_in_at, current_sign_in_ip, last_sign_in_ip, created_at, updated_at, is_admin, provider, uid, tokens, settlement_id, is_survey, is_service_provider FROM public.users;"
@echo.

@echo Exporting responses...
call gcloud sql export csv kujakuja-%env_type%-db gs://kujakuja-%env_dest%-%env_type%-syndication/%env_source%-%env_type%-responses.csv --database=kujakuja --project=kujakuja-%env_source%-%env_type% --query "SELECT id, service_point_id, satisfied, idea, lat, lng, created_at, updated_at, phase2_id, uploaded_at, unique_id, user_id, response_type, is_starred, nlp_extract_adjectives_processed, idea_language, idea_token_vector FROM public.responses;"
@echo.

@echo Remove Write Permissions: Delete %env_source%-%env_type% service account permissions from gs://kujakuja-%env_dest%-%env_type%-syndication/ 
call gsutil acl ch -d %service_account_email% gs://kujakuja-%env_dest%-%env_type%-syndication/
@echo.

@chcp 65001>nul
@echo ╭───────────────────────────────────────────────────────────────┬────────────╮
@echo │ Kuja Kuja Data Syndication Export                             │            │
@echo │ From: %source_env_display_str% To: %dest_env_display_str%     │    DONE    │
@echo ╰───────────────────────────────────────────────────────────────┴────────────╯ 
@chcp 850>nul
GOTO :EOF

:ERROR
@chcp 65001>nul
@echo ╭───────────────────────────────────────────────────────────────┬────────────╮
@echo │ Kuja Kuja Data Syndication Export                             │   ERROR    │
@echo │ From: %source_env_display_str% To: %dest_env_display_str%     │            │
@echo ╰───────────────────────────────────────────────────────────────┴────────────╯
@echo Oops, something went wrong... 
@chcp 850>nul
