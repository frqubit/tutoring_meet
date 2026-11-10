#!/bin/bash

set -eu

export DATEPREFIX=$(date +%Y%m%d)

systemctl stop site
systemctl stop api
aws s3 cp /home/ec2-user/api/db.sql "s3://lessonresources-6a27ce93/backups/sql/${DATEPREFIX}.sql"
systemctl start api
systemctl start site
