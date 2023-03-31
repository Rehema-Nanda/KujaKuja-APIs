## Migrating the DB from Heroku to Google Cloud SQL

See [Importing Data into Cloud SQL](https://cloud.google.com/sql/docs/postgres/import-export/importing).

Note that the backups that are created by Heroku can't be imported through the GCP console. You will get the warning/error: "The input is a PostgreSQL custom-format dump. Use the
pg_restore command-line client to restore this dump to a database."

You need to connect to the server using the Cloud SQL Proxy and manually restore the dump using pg_restore or something like pgAdmin.

##### Update 2018-11-13

Since upgrading the Heroku DBs to the "Standard 0" plan and PostgreSQL 10 we can no longer restore the backups to Cloud SQL directly because Cloud SQL uses PostgreSQL 9.6, which
does not support `AS <type>` as a part of `CREATE SEQUENCE` statements.

Follow the steps below to restore a backup:

1. Create the database if it doesn't already exist:
   
   ```
   CREATE DATABASE kujakuja
       WITH 
       OWNER = postgres
       ENCODING = 'UTF8'
       CONNECTION LIMIT = -1;
   ```
   
   Otherwise, if it does already exist, you can forcibly close any open connections by running:
   `SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'kujakuja' AND pid <> pg_backend_pid();`
   
   Once the open connections have been closed you should be able to drop the database and re-create it as above.

2. Convert the binary dump to plain SQL first: `pg_restore -O -f "<path to output file>.sql" "<path to binary dump input file>"` *(the `-O` option prevents "commands to set
ownership of objects to match the original database" to be output)*

3. Edit the output SQL file to comment/remove:

   3.1 This line: `COMMENT ON EXTENSION "plpgsql" IS 'PL/pgSQL procedural language';`
   
   3.2 Any `AS <type>` within `CREATE SEQUENCE` statements
   
4. Restore the plain SQL dump using psql: `psql -p <Cloud SQL Proxy port> -U postgres -d kujakuja -f "<path to edited SQL file>.sql"`

5. The **only** errors you should expect to see are ones relating to the failure to create earthdistance indexes, as detailed
[here](./general_database.md#known-issue-error-when-trying-to-create-earthdistance-indexes-during-restore).

For interests/completeness sake, here is the `pg_restore` command we could otherwise have used:
`pg_restore -p <Cloud SQL Proxy port> -U postgres -d kujakuja -O "<path to binary dump input file>"`

## Connecting directly to the DB that's hosted on Heroku

While migrating iteratively to the new application we'll want to connect directly to the DB that's hosted on Heroku. This is easily achieved by updating the Knex connection config
object (in `src/config/db_config.js`) to add `host` and `ssl` keys. The `host` value should come from environment variables just like the other values, while `ssl` should simply be
set to `true`. For example:

```
const db_config = {
    client: 'pg',
    connection: {
        host: HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DATABASE,
        ssl: true
    }
};
```

You can get the database connection information and credentials from the Heroku dashboard. Navigate to the relevant application's PostgreSQL resource, select the Settings tab and
click 'View Credentials...' under 'Database Credentials'.

Note that Heroku says the following, which is a bit scary:

```
Please note that these credentials are not permanent.

Heroku rotates credentials periodically and updates applications where this database is attached.
```

In practice these credentials haven't changed in months. There isn't really any additional information on this. There is no way to get permanent credentials, no way to be notified
when they do change and thus no way to update external systems automatically. Keep this in mind.

Also note that the 'Hobby Basic' PostgreSQL plan on Heroku does not allow one to create additional users, so this connection has **full access** to the DB. There are other
restrictions too, which you can check on Heroku.
