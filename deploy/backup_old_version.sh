#!/bin/bash

set -xe

export DATEPREFIX=$(date +%Y%m%d)

# backup backend
ssh ec2-user@mindswithwings.com "sudo systemctl stop api"
ssh ec2-user@mindswithwings.com "cd api && rm -rf node_modules"
ssh ec2-user@mindswithwings.com "tar -cjvf api.tar.bz2 api"
ssh ec2-user@mindswithwings.com "aws s3 cp ./api.tar.bz2 \"s3://lessonresources-6a27ce93/backups/website/api-${DATEPREFIX}.tar.bz2\""

# backup frontend
ssh ec2-user@mindswithwings.com "sudo systemctl stop site"
ssh ec2-user@mindswithwings.com "tar -cjvf app.tar.bz2 app"
ssh ec2-user@mindswithwings.com "aws s3 cp ./app.tar.bz2 \"s3://lessonresources-6a27ce93/backups/website/app-${DATEPREFIX}.tar.bz2\""

# delete made archives
ssh ec2-user@mindswithwings.com "rm app.tar.bz2 api.tar.bz2"

# start services again
ssh ec2-user@mindswithwings.com "sudo systemctl start site"
ssh ec2-user@mindswithwings.com "cd api && npm ci"
ssh ec2-user@mindswithwings.com "sudo systemctl start api"
