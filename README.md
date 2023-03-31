# Project Jupiter API Server (or KujaKuja 3.0 - API)

This repository is hosting the back-end / API server code that is serving data to the public front-end (dashboard application), the admin panel, and the survey application.

## Overall System Architecture

The KujaKuja system is comprised of the following major components:

* The [Dashboard Application](https://github.com/kujakuja/3.0_frontend) (public front-end, React)
* The [Survey Application](https://github.com/kujakuja/3.0_survey_application) (mobile survey front-end, React Native / Android)
* The [API Application](https://github.com/kujakuja/3.0_api) (back-end, Node.js)
* The [Admin Application](https://github.com/kujakuja/3.0_admin) (admin front-end, React)
* The Database Server (PostgreSQL, hosted on Google Cloud SQL)

For a quick overview of the current architecture see [this diagram](./docs/deployment/kujakuja-systems-architecture-2019-10.png) (last updated: Oct 2019).
For detailed information see [deployment targets and configuration](./docs/deployment/targets_and_configuration.md).

## Technical Specifications

The API server will use the following software/libraries : 

* Node.js => [https://nodejs.org](https://nodejs.org)
* Express framework => [https://expressjs.com](https://expressjs.com)
* Knex.js query builder =>[https://knexjs.org](https://knexjs.org)
* Objection.js => [https://vincit.github.io/objection.js/](https://vincit.github.io/objection.js/)

The Node.js stack will be the base of our server. It is known to handle RESTful API requests very well. 

We will use the Express framework to handle the routing, parsing, etc ... of all the requests the dashboard, admin and survey apps will throw at the Node.js server. 

All the communication between the Node.js server and the database server (PostgreSQL) will be handled by Knex.js, a connection handler and query builder, and Objection.js, an ORM
that will allow us to perform simple CRUD operations and validate data against models. 

## Former API Endpoints

The former Rails API server was hosting several API endpoints. 

You can find a listing of them, alphabetically or by type, on the [Former API endpoints page](docs/old_api/old_api_endpoints.md).

Those API endpoints used [this DB schema](docs/old_api/old_KujaKuja_DB_Schema.png).

## Current API Endpoints

This is a placeholder for a listing of the current endpoints.

## API Authentication

Authentication is mandatory for all routes on the API server. 
The basic principle is to send a 1st request (POST) with login/password to get a token (JSON Web Token). This token has to be specified in the headers of all subsequent requests. 

Below is the authentication process: 

* POST request to `/api/v3/auth/login` with the following settings:
  * Headers
    * Content-Type : application/json
  * POST data as JSON
    * email: user email address
    * password: user password in clear text
    * for example: {"email":"website@kujakuja.com","password":"website_pass"}
* The API will respond with a JSON object containing a token
* All subsequent requests have to be sent with the following header:
  * Authorization: "Bearer \<token>"
* The token has a lifetime of 1 hour
* You can renew the token by doing a GET request to `/api/v3/auth/refresh`
  * Header => Authorization: "Bearer \<token>"
  * Response => { "token": "<new token valid for 1 hour>" }

## Deployment

* [Targets and configuration](./docs/deployment/targets_and_configuration.md)
* [Database](./docs/deployment/general_database.md)
* [How to deploy](./docs/deployment/how_to.md)

## Using PubSub for Data Aggregation

KujaKuja uses Google's [Cloud Pub/Sub](https://cloud.google.com/pubsub/docs/overview) to asynchronously collect and collate statistics of all its global operations.

To centralise implementation of this functionality we use a single Pub/Sub topic (named **data-aggregation**) which is hosted by the Google Cloud project for the kujakuja.com site
(project ID **kujakuja-dev** or **kujakuja-prod**). All client sites then publish data to this topic via their respective API service.

When deploying the API service (this repo) to a new Google Cloud project for the first time, please ensure that the following steps are completed:

1. Get the email address of the "App Engine default service account" (typically <project-number>@appspot.gserviceaccount.com) from the **IAM & admin section** of the
[Google Cloud Console](https://console.cloud.google.com/) for the new Google Cloud project.
2. Add the service account from step 1 to **IAM & admin** for the **kujakuja-dev** and/or **kujakuja-prod** project(s) and assign the role **Pub/Sub Publisher** to it. This will
allow the particular client site with the identity of the service account to publish statistics to the shared Pub/Sub topic.
3. Ensure that the environment variables of the API service (this repo) are set up to publish to the correct topic within the **kujakuja-dev** or **kujakuja-prod** project. (Hint:
search for "DATA_AGGREGATION_PUB_SUB_TOPIC")
