#!/bin/bash

set -xe

GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
cd "$GIT_ROOT/project/website"

pnpm build
ssh ec2-user@mindswithwings.com "rm -rf /home/ec2-user/app/build"
scp -r build ec2-user@mindswithwings.com:/home/ec2-user/app/build
scp package.json ec2-user@mindswithwings.com:/home/ec2-user/app/build/package.json
pnpx @pnpm/make-dedicated-lockfile
scp pnpm-lock.yaml ec2-user@mindswithwings.com:/home/ec2-user/app/build/pnpm-lock.yaml
ssh ec2-user@mindswithwings.com "cd app/build && pnpm approve --all"
ssh ec2-user@mindswithwings.com "cd app/build && pnpm i --dangerously-allow-all-builds"
ssh ec2-user@mindswithwings.com "sudo systemctl restart site"
