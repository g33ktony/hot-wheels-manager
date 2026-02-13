#!/bin/bash
cd /Users/antonio/Documents/personal_projects/hot-wheels-manager/backend
npx tsx src/scripts/sync-to-mongo.ts
echo "SYNC_EXIT_CODE: $?"
