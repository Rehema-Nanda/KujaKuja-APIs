FROM node:8

LABEL maintainer="KujaKuja" \
      version="0.0.1"

ENV WORK_DIR="/opt/kujakuja/kujakuja-3-api/"
WORKDIR $WORK_DIR

COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm install --only=production

# Bundle app source
COPY . .

EXPOSE 8080

CMD [ "npm", "start" ]
