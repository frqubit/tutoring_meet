#!/bin/bash

set -xe

GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
cd "$GIT_ROOT/project/backend"

NODE_ENV=production pnpm build
ssh ec2-user@mindswithwings.com "rm -rf /home/ec2-user/api/dist"
scp -r dist ec2-user@mindswithwings.com:/home/ec2-user/api/dist
scp package.json ec2-user@mindswithwings.com:/home/ec2-user/api/package.json
pnpx @pnpm/make-dedicated-lockfile
scp pnpm-lock.yaml ec2-user@mindswithwings.com:/home/ec2-user/api/pnpm-lock.yaml
scp .env.cognito-prod ec2-user@mindswithwings.com:/home/ec2-user/api/.env.cognito
ssh ec2-user@mindswithwings.com "cd api && pnpm i --dangerously-allow-all-builds"
ssh ec2-user@mindswithwings.com "sudo systemctl restart api"
