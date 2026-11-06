#/bin/bash

set -eu

if [ -f db.sql ]; then
    mv db.sql db.sql.temp
fi

if [ -f start.sql ]; then
    rm start.sql
fi

pnpm start

mv db.sql blank.sql
mv db.sql.temp db.sql
