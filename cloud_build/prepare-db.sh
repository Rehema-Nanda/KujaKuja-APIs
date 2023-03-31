#!/bin/bash

# https://superuser.com/questions/270529/monitoring-a-file-until-a-string-is-found
# https://stackoverflow.com/questions/6454915/linux-block-until-a-string-is-matched-in-a-file-tail-grep-with-blocking

EXIT_CODE=0
CLOUD_SQL_INSTANCE_CONNECTION_NAME=$1
CLOUD_SQL_PROXY_PORT=$2

/cloud_sql_proxy -instances=${CLOUD_SQL_INSTANCE_CONNECTION_NAME}=tcp:${CLOUD_SQL_PROXY_PORT} >/tmp/cloud_sql_proxy.log 2>&1 &
PROXY_PID=$!

# wait until cloud_sql_proxy is ready
if timeout 10 grep -q "Ready for new connections" <(tail -f -n0 /tmp/cloud_sql_proxy.log); then
    npm install && npm run prepare-db
    EXIT_CODE=$?
else
    EXIT_CODE=$?
    echo "cloud_sql_proxy wasn't ready after 10s, aborting..."
fi

echo "cloud_sql_proxy output:"
cat /tmp/cloud_sql_proxy.log

echo "Killing cloud_sql_proxy..."
kill $PROXY_PID

echo "Done"

exit $EXIT_CODE
