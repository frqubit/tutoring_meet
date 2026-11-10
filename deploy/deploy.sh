#!/bin/bash

set -xe

GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
cd "$GIT_ROOT"

scp ec2-user@mindswithwings.com:/home/ec2-user/api/db.sql project/db/db.sql
./project/db/reload_live_db.sh
scp project/db/db.sql ec2-user@mindswithwings.com:/home/ec2-user/api/db.sql

./deploy/upload-backend.sh
./deploy/upload-website.sh
