# Syndication Scripts

These scripts are a working prototype of how we might move data between our environments a.k.a. Syndication / Federation / Hierarchy.

How to use them: 
 1. export data from the source env
    e.g.: run `.\dev\export_crc_dev_data.bat` from the Windows commandline
    the `*_env_data.bat` scripts are generic and parameterised
    the `dev` and `live` folders have scripts that call these with the right parameters

 2. re-create the target schema
 	e.g. run .\schema\CRC schema - create.sql in dbeaver
 	this deletes all data in the CRC schema, this is the plan

 3. import data to the destination db in the source schema
    e.g. run `.\dev\import_crc_dev_data.bat` from the Windows commandline

 4. copy data into the syndication target db
    e.g. run '.\schema\CRC schema -to- OFDA schema.sql' in dbeaver
    this copies data in with offset ids
