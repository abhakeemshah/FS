#!/usr/bin/env bash
# Quick diagnostics for HOST (replace HOST with your domain)
HOST=${1:-HOST}

echo "Checking /api/status"
curl -i https://$HOST/api/status

echo "\nChecking GET /api/catalog-state"
curl -i https://$HOST/api/catalog-state

echo "\nChecking GET /api/ledger-state"
curl -i https://$HOST/api/ledger-state

echo "\nEmulate login POST (may return HTML if blocked)"
curl -i -X POST https://$HOST/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"x","role":"admin"}'

echo "\nIf your site requires a health token, run this instead (replace TOKEN):"

echo "curl -i -H \"X-Health-Check: TOKEN\" https://$HOST/api/status"
