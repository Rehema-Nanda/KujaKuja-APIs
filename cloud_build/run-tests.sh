#!/bin/bash

service postgresql start && npm install npm-force-resolutions && npm install && npm install && npm run test
