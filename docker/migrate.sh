#!/bin/sh
set -eu

npx prisma migrate deploy
npx prisma db seed
