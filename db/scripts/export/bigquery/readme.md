bigquery export scripts

= files =
`extract_alight_responses_for_bigquery.bat`
creates a flattened csv for importing into bigquery and writes it to cloud storage

`upload_alight_responses_to_bigquery.bat`
uploads the file from cloud storage into bigquery

= process =
 1. extract all data
 2. upload (it will overwrite the table)
 3. check report and edit default end-date if necessary
 