#!/bin/bash

set -eu

ssh ec2-user@mindswithwings.com "sqlite3 api/db.sql \".backup 'backup.db'\""
scp ec2-user@mindswithwings.com:/home/ec2-user/backup.db db.sql
ssh ec2-user@mindswithwings.com "rm backup.db"
