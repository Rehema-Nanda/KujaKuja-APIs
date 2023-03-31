# Deployment - HowTo

Check that you have fulfilled the [Prerequisite Requirements](#prerequisite-requirements).

Then, the application can be deployed to either of the following Google Cloud Platform environments:

* [Google App Engine](#deploying-to-google-app-engine) (preferred)
* [Google Kubernetes Engine](#deploying-to-google-kubernetes-engine)

## Prerequisite Requirements

Is the [Google Cloud SDK](#google-cloud-sdk) installed and initialized?

If a suitable GCP project with a corresponding Cloud SQL instance ***doesn't*** already exist, you'll need to create them:

**NB:** These instructions have been superseded by the [KujaKuja Google Cloud Project Setup Tasks document](https://docs.google.com/document/d/1OJiK-ZY42lp9kiLH23jrVZ4PhZxatx1qjWyViQ-FZ5U/edit?usp=sharing).

1. ~~Ensure that you have the following IAM roles at the organization level: Project Creator, Billing Account Viewer, Billing Account User~~
2. ~~Create the project through the Cloud Console and set the billing account~~
3. ~~Enable App Engine: `gcloud app create --project=<project-id>`, choose region `europe-west1` when prompted~~
4. ~~Create the PostgreSQL Cloud SQL instance through the Cloud Console and give it the instance name: `kujakuja-db`. Make a note of the password that you set for the 'postgres'
user.~~
5. ~~Within the new Cloud SQL instance, create a new database and name it: `kujakuja`.~~
6. ~~Restore the database from a backup (see the [general database deployment documentation](./general_database.md#restoring-a-backup-to-an-instance-in-another-project))~~

### Google Cloud SDK

You need to have set up the [gcloud](https://cloud.google.com/sdk/gcloud/) command line utility.

gcloud is a part of the [Google Cloud SDK](https://cloud.google.com/sdk/docs/). You can find instructions on how to install and initialize the SDK
[here](https://cloud.google.com/sdk/docs/). There are also more detailed instructions available under the "How-to-Guides" section of the official documentation.

* When you are asked to set a default project you should set this to `kujakuja-dev`. This will prevent accidental deployments or configuration changes in the production
environment. (You can also explicitly unset the project in the core configuration so that you have to specify it every time using the `--project=<project_id>` argument. To do so,
use the following command: `gcloud config unset project`)
* When you are asked to set a default Google Compute Engine region and zone, you should set these to `europe-west1` and `europe-west1-b` respectively, as this is the region that we
 are deploying to (the zone is not relevant for App Engine deployments)

## Deploying to Google App Engine

1. Open a terminal and ensure that you are in the root of the application (where the `app.yaml` file is)
2. Run the following command: `npm run deploy -- --project=<project-id>` (this npm script is currently just a wrapper over the `gcloud app deploy` command, which you can also use
directly, for example: `gcloud app deploy --project=<project-id>`. The npm script may do something more exciting in the future.)

A version string will be generated automatically based on the current date & time, or you can specify it using the `--version=<version>` argument.

By default the new version will be promoted to receive all traffic. You can avoid this by adding the `--no-promote` argument.

For more information on the `gcloud app deploy` command, see `gcloud app deploy --help`.

##### A note on dispatch.yaml

Under the [current system architecture](../../README.md#overall-system-architecture), the API, dashboard and admin applications are deployed to the same App Engine application as
distinct [services](https://cloud.google.com/appengine/docs/standard/nodejs/configuration-files). After deploying these services individually, you may also need to (re)deploy the
`dispatch.yaml` [file](https://github.com/kujakuja/3.0_frontend/blob/master/dispatch.yaml) from the dashboard application.

See [deployment targets and configuration](./targets_and_configuration.md) for more information.

## Deploying to Google Kubernetes Engine

**NB:** As this is not our preferred deployment target this documentation, and the corresponding configuration files, are more likely to be out of date. Keep this in mind as you're
reading and review the other sections and documentation to make sure you're up to date.

1. Build the Docker image locally: `docker build -t kujakuja/api-server:<version> .` (`<version>` should match the version in `Dockerfile` and `package.json`)
2. Tag the Docker image with the registry name: `docker tag kujakuja/api-server:<version> eu.gcr.io/<project-id>/kujakuja/api-server:<version>`
3. Configure Docker to use the gcloud command-line tool as a credential helper: `gcloud auth configure-docker`
4. Push the image to Container Registry: `docker push eu.gcr.io/<project-id>/kujakuja/api-server:<version>`

5. Set up DB access (manual steps, some only apply if using Google Cloud SQL):  

    5.1. Enable the 'Cloud SQL Admin API' through the Cloud Console
    
    5.2. Create a service account: https://cloud.google.com/sql/docs/postgres/connect-kubernetes-engine#2_create_a_service_account
    (name/id: `kubernetes-cloud-sql-client`, role: `Cloud SQL Client`)
    
    5.3. Create the proxy user: `gcloud sql users create proxyuser host --instance=<instance-name> --password=<password> --project=<project-id>` (password and instance name from
    [Prerequisite Requirements](#prerequisite-requirements), pt. 4 above)
    
    5.4. Connect to the instance through Cloud SQL Proxy and grant privileges to the new user: `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO proxyuser`
    
    5.5. Get your instance **connection name**: `gcloud sql instances describe <instance-name> --project=<project-id>`
    
    5.6. Create your Secrets: https://cloud.google.com/sql/docs/postgres/connect-kubernetes-engine#5_create_your_secrets
    ```
    kubectl create secret generic cloudsql-instance-credentials --from-file=credentials.json=<service-account-private-key-file-path>
    kubectl create secret generic cloudsql-db-credentials --from-literal=username=proxyuser --from-literal=password=<password>
    ```
        
    5.7. Update your pod configuration file (`kubernetes/manifests/deployment_manifest.yaml`):
    
    5.7.1. Check that the Cloud SQL environment variables are being set correctly under `spec:template:spec:containers:<name>:env` (SQL_DATABASE should be a literal value, SQL_USER
    & SQL_PASSWORD should come from secrets)
    
    5.7.2. Update the instance connection name under `spec:template:spec:containers:cloudsql-proxy:command`, eg:
    ```
    ["/cloud_sql_proxy",
     "-instances=kujakuja-dev:europe-west1:kujakuja-db=tcp:5432",
     "-credential_file=/secrets/cloudsql/credentials.json"]
     ```
     
6. Update your pod configuration file (`kubernetes/manifests/deployment_manifest.yaml`):

    6.1. Update the Docker image tag/version under `spec:template:spec:containers:<name>:image`, eg: `eu.gcr.io/kujakuja-dev/kujakuja/api-server:0.0.1`

7. Enable the 'Kubernetes Engine API' through Cloud Console
8. Create the cluster: `npm run kubernetes-create-cluster -- --project=<project-id>`
9. Get authentication credentials for the cluster: `gcloud container clusters get-credentials <cluster-name> --project=<project-id> --zone=<zone>`
   - `<cluster-name>` and `<zone>` are defined in `kubernetes/create_cluster.js`
   - This command configures `kubectl` to use the cluster you created.
10. Create the deployment: `npm run kubernetes-create-deployment`
11. Expose the deployment: `npm run kubernetes-expose-deployment`
