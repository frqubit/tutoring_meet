#!/bin/bash

set -xe

export DATEPREFIX="20260620"

# restore backend
ssh ec2-user@mindswithwings.com "sudo systemctl stop api"
ssh ec2-user@mindswithwings.com "aws s3 cp \"s3://lessonresources-6a27ce93/backups/website/api-${DATEPREFIX}.tar.bz2\" ./api.tar.bz2"
ssh ec2-user@mindswithwings.com "rm -rf api && tar -xjvf api.tar.bz2"
ssh ec2-user@mindswithwings.com "cd api && npm i"

# restore frontend
ssh ec2-user@mindswithwings.com "sudo systemctl stop site"
ssh ec2-user@mindswithwings.com "aws s3 cp \"s3://lessonresources-6a27ce93/backups/website/app-${DATEPREFIX}.tar.bz2\" ./app.tar.bz2"
ssh ec2-user@mindswithwings.com "rm -rf app && tar -xjvf app.tar.bz2"

# restore sql db
ssh ec2-user@mindswithwings.com "aws s3 cp \"s3://lessonresources-6a27ce93/backups/sql/${DATEPREFIX}.sql\" /home/ec2-user/api/db.sql"

# start services again
ssh ec2-user@mindswithwings.com "sudo systemctl start site"
ssh ec2-user@mindswithwings.com "sudo systemctl start api"
