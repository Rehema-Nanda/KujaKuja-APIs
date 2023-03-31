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
@echo │ Kuja Kuja Data Syndication Import                             │  STARTING  │
@echo │ From: %source_env_display_str% To: %dest_env_display_str%     │            │
@echo ╰───────────────────────────────────────────────────────────────┴────────────╯
@echo Note: this requires the %env_source% schema in the kujakuja-%env_type%-db in the kujakuja-%env_dest%-%env_type% project to be empty.
@echo.
@chcp 850>nul

call gcloud services enable sqladmin.googleapis.com --project=kujakuja-%env_dest%-%env_type%
set service_account_email=unset
@echo Set Read Permissions: Set %env_source% %env_type% files to have access from %env_dest%-%env_type% service account
For /F Tokens^=2 %%A In ('gcloud sql instances describe kujakuja-%env_type%-db --project=kujakuja-%env_dest%-%env_type% --quiet 2^>Nul^|Find "serviceAccountEmailAddress"')Do set service_account_email=%%A
if "%service_account_email%"=="unset" GOTO ERROR

@echo Service account email for %env_dest%-%env_type%:  %service_account_email%

for %%x in (countries settlements service_types service_points users responses) do call gsutil acl ch -u  %service_account_email%:R gs://kujakuja-%env_dest%-%env_type%-syndication/%env_source%-%env_type%-%%x.csv

@echo.
@echo ACCESS GRANTED :D
@echo.

@echo Starting import...
@echo.
for %%x in (countries settlements service_types service_points users responses) do call gcloud sql import csv kujakuja-%env_type%-db gs://kujakuja-%env_dest%-%env_type%-syndication/%env_source%-%env_type%-%%x.csv --database=kujakuja --project=kujakuja-%env_dest%-%env_type% --table=%env_source%.%%x --quiet

@echo Remove Read Permissions: Delete %env_dest%-%env_type% service account permissions from %env_source% %env_type% files 
call gsutil acl ch -d %service_account_email% gs://kujakuja-%env_dest%-%env_type%-syndication/


@chcp 65001>nul
@echo ╭───────────────────────────────────────────────────────────────┬────────────╮
@echo │ Kuja Kuja Data Syndication Import                             │            │
@echo │ From: %source_env_display_str% To: %dest_env_display_str%     │    DONE    │
@echo ╰───────────────────────────────────────────────────────────────┴────────────╯ 
@chcp 850>nul
GOTO :EOF

:ERROR
@chcp 65001>nul
@echo ╭───────────────────────────────────────────────────────────────┬────────────╮
@echo │ Kuja Kuja Data Syndication Import                             │  ERROR     │
@echo │ From: %source_env_display_str% To: %dest_env_display_str%     │            │
@echo ╰───────────────────────────────────────────────────────────────┴────────────╯
@echo Oops, something went wrong... 
@chcp 850>nul
