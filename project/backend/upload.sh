#!/bin/bash

set -xe

pnpm build
ssh ec2-user@tutoring.frqubit.net "rm -rf /home/ec2-user/api/dist"
scp -r dist ec2-user@tutoring.frqubit.net:/home/ec2-user/api/dist
ssh ec2-user@tutoring.frqubit.net "sudo systemctl restart api"
