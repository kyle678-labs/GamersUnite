#!/bin/sh
set -e

echo "Syncing database schema..."
npx prisma db push --skip-generate

# Seed only when the games table is empty. The seed prunes games that are not
# in its list, so re-running it on every boot would delete anything imported
# later (e.g. via import:igdb). Re-seed manually with:
#   kubectl exec deploy/gamersunite -- npx tsx prisma/seed.ts
GAMES=$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.game.count().then(c=>{console.log(c);process.exit(0)}).catch(()=>{console.log('err');process.exit(1)})")
if [ "$GAMES" = "0" ]; then
  echo "Empty database - seeding..."
  npx tsx prisma/seed.ts
else
  echo "Database has $GAMES games - skipping seed."
fi

exec npx next start -p 3000
