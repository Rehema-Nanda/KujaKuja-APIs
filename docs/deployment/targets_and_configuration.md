# Deployment - Targets and Configuration

The application can be deployed to any of the following (cloud) environments:

* [Google App Engine](#google-app-engine) (Standard or Flexible Environment)
* [Google Kubernetes Engine](#google-kubernetes-engine)
* or, in theory, anywhere that you can host containers (eg: Amazon EKS / ECS)

Where we deploy will primarily depend on what level of control we want/need to have over the runtime and OS, the underlying infrastructure, and associated costs.

**Ideally we should deploy to the App Engine Standard Environment** as it's a fully managed, serverless platform that frees us from any infrastructure management.

However, the application has been designed to be able to run in a number of different environments to avoid any kind of dependence on, or lock-in to, a particular platform or
service.

For more information on Google App Engine see the relevant [section](#google-app-engine) below.

#### Database

The application depends on a PostgreSQL database, which we're hosting on [Google Cloud SQL](https://cloud.google.com/sql/). In theory,
however, it could be hosted anywhere.

You should review the [general database deployment documentation](./general_database.md), and you can find configuration specifics as they relate to the different target
environments in the relevant sections below.

## Google App Engine

There are two types of App Engine environment: standard and flexible. You should review
[this high-level comparison](https://cloud.google.com/appengine/docs/the-appengine-environments) and, more specifically,
[how this relates to Node.js applications](https://cloud.google.com/appengine/docs/nodejs/).

Historically we might have chosen the flexible environment because we needed a particular language extension or system library that is not available in the standard environment
sandbox. The [second generation runtime environment](https://cloud.google.com/appengine/docs/standard/appengine-generation) removes these limitations, making the flexible
environment a less likely choice.

The remainder of this section will deal only with the standard environment, however it should be a fairly straightforward process to switch to the flexible environment if
necessary (assuming no runtime or system image customizations are required, most of the changes should be in the `app.yaml` file).

### Standard Environment

#### Overview

First, read [An Overview of App Engine](https://cloud.google.com/appengine/docs/standard/nodejs/an-overview-of-app-engine).

Next, you should review the details of the [Node.js Runtime Environment](https://cloud.google.com/appengine/docs/standard/nodejs/runtime).

Also see the [Quickstart for Node.js in the App Engine Standard Environment](https://cloud.google.com/appengine/docs/standard/nodejs/quickstart) for a crash course. You will find
links to all other sections of the comprehensive documentation there too, including how-to guides, tutorials, reference material and more.

For step-by-step instructions on how to deploy to App Engine, see [How to deploy](./how_to.md).

#### Configuration

Most of the basic configuration of this application for the App Engine Standard Environment is contained in the first 10 or so commits to this repo. The primary files involved are:
`app.yaml`, `package.json` and `.gcloudignore`.

##### dispatch.yaml

Under the [current system architecture](../../README.md#overall-system-architecture), the API, dashboard and admin applications are deployed to the same App Engine application as
distinct [services](https://cloud.google.com/appengine/docs/standard/nodejs/configuration-files). After deploying these services individually, you may also need to (re)deploy the
`dispatch.yaml` [file](https://github.com/kujakuja/3.0_frontend/blob/master/dispatch.yaml) from the dashboard application.

This is done using the following gcloud command: `gcloud app deploy dispatch.yaml --project=<project_id>`

See [How Requests are Routed](https://cloud.google.com/appengine/docs/standard/nodejs/how-requests-are-routed) and especially
[Routing with a dispatch file](https://cloud.google.com/appengine/docs/standard/nodejs/how-requests-are-routed#routing_with_a_dispatch_file).

##### Database

If using Google Cloud SQL, you should review the general [Connecting from App Engine](https://cloud.google.com/sql/docs/postgres/connect-app-engine) documentation for PostgreSQL,
as well as that which relates specifically to the standard environment:
[Using Cloud SQL for PostgreSQL](https://cloud.google.com/appengine/docs/standard/nodejs/using-cloud-sql-postgres).

Note that:

* the database name, authentication details and instance connection name are hardcoded in `app.yaml`

## Google Kubernetes Engine

Deploying to GKE is significantly more complex than deploying to App Engine, and requires knowledge about containerization and Docker in addition to Kubernetes and GKE specifics.

We've tried to make a *very basic* deployment as uncomplicated as possible using NPM scripts and manifest files, the details of which you'll find below.

**NB:** This deployment configuration is not set up for autoscaling and will need additional work to make it production ready!

**NB:** As this is not our preferred deployment target this documentation, and the corresponding configuration files, are more likely to be out of date. Keep this in mind as you're
reading and review the other sections and documentation to make sure you're up to date.

#### Overview

First, read the [Kubernetes Engine Overview](https://cloud.google.com/kubernetes-engine/docs/concepts/kubernetes-engine-overview).

To deploy to GKE we need to "dockerize" the application. This was done according to the Node.js guide [here](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/).

You should review the [Quickstart for Container Registry](https://cloud.google.com/container-registry/docs/quickstart), unless you want to use a different registry.

Also see the [Kubernetes Engine Quickstart](https://cloud.google.com/kubernetes-engine/docs/quickstart) for a crash course. You will find links to all other sections of the
comprehensive documentation there too, including how-to guides, tutorials, reference material and more.

For step-by-step instructions on how to build a new Docker image and deploy it to GKE, see [How to deploy](./how_to.md).

#### Configuration

Most of the basic configuration of this application for Kubernetes Engine is contained in the first 10 or so commits to this repo. The primary files involved are:
`Dockerfile`, `package.json`, `kubernetes/*` and `.dockerignore`.

##### Cluster

`kubernetes/create_cluster.js` contains the '[gcloud container clusters create](https://cloud.google.com/sdk/gcloud/reference/container/clusters/create)' CLI command to create a
basic 2-node cluster with a 'machine-type' of 'g1-small'.

The corresponding NPM script is called 'kubernetes-create-cluster', and you would run it as follows: `npm run kubernetes-create-cluster -- --project=<project-id>`

(Learn more about [Cluster Architecture](https://cloud.google.com/kubernetes-engine/docs/concepts/cluster-architecture))

##### Deployment

`kubernetes/manifests/deployment_manifest.yaml` is used to create a Kubernetes Deployment object.

The corresponding NPM script is called 'kubernetes-create-deployment', and you would run it as follows: `npm run kubernetes-create-deployment`

(Learn more about [Deployments](https://cloud.google.com/kubernetes-engine/docs/concepts/deployment))

##### Service (exposing the Deployment/Application)

`kubernetes/manifests/service_manifest.yaml` is used to create a Kubernetes Service with a type of 'LoadBalancer'.

The corresponding NPM script is called 'kubernetes-expose-deployment', and you would run it as follows: `npm run kubernetes-expose-deployment`

(Learn more about [Services](https://cloud.google.com/kubernetes-engine/docs/concepts/service))

##### Database

If using Google Cloud SQL, you should review the [Connecting from Kubernetes Engine](https://cloud.google.com/sql/docs/postgres/connect-kubernetes-engine) documentation for
PostgreSQL.

Note that:

* the database name, authentication details and instance connection name are hardcoded in `kubernetes/manifests/deployment_manifest.yaml`
* some steps haven't been automated yet, particularly creation of the: service account, proxy user and secrets (you'll find instructions at the link above or in the
[How to deploy](./how_to.md#deploying-to-google-kubernetes-engine) document)
