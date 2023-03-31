# This defines a custom build step for Google Cloud Build, it:
# - installs and configures PostgreSQL so that we can run integration tests
# - downloads cloud_sql_proxy so that we can run migrations and seeds on the 'real' Cloud SQL DB before deployment
# - adds shell scripts to perform both of the 'so that' actions above
# See https://cloud.google.com/cloud-build/docs/create-custom-build-steps

FROM ubuntu:18.04

LABEL maintainer="KujaKuja" \
      version="0.0.1" \
      registry.url="eu.gcr.io/kujakuja-dev/cloud-build-api"

# avoids prompts when installing packages, eg: tzdata
ENV DEBIAN_FRONTEND=noninteractive

# should match the SQL_PASSWORD environment variable that's defined in .env.test
# if we were building this Docker image with Cloud Build we could set this in cloudbuild.yaml (but there is no reason to rebuild this image every time a build runs)
ENV SQL_PASSWORD=password1

RUN apt update && apt install -y \
lsb-release \
curl \
ca-certificates \
gnupg \
sudo \
git \
wget \
&& echo "deb https://deb.nodesource.com/node_10.x $(lsb_release -cs) main" | tee -a /etc/apt/sources.list.d/nodesource.list \
&& echo "deb-src https://deb.nodesource.com/node_10.x $(lsb_release -cs) main" | tee -a /etc/apt/sources.list.d/nodesource.list \
&& curl https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add - \
&& echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | tee -a /etc/apt/sources.list.d/pgdg.list \
&& curl https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - \
&& curl https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add - \
&& echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list \
&& apt update && apt install -y --no-install-recommends \
nodejs \
postgresql-9.6 \
postgresql-contrib-9.6 \
yarn \
&& service postgresql start \
&& sudo -u postgres psql -c "ALTER USER postgres with encrypted password '$SQL_PASSWORD';" \
&& wget -nv https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy \
&& chmod +x cloud_sql_proxy \
# Cypress dependencies - https://docs.cypress.io/guides/guides/continuous-integration.html#Dependencies
&& apt install -y \
libgtk2.0-0 \
libgtk-3-0 \
libnotify-dev \
libgconf-2-4 \
libnss3 \
libxss1 \
libasound2 \
libxtst6 \
xauth \
xvfb

COPY *.sh ./
RUN chmod +x ./*.sh
