#!/bin/bash
# Use this script to set the Vercel environment variable directly
# This avoids copy-paste issues

B64_VALUE=$(cat service-account.json | base64 | tr -d '\n')

echo "Setting GOOGLE_APPLICATION_CREDENTIALS_BASE64 in Vercel..."
vercel env add GOOGLE_APPLICATION_CREDENTIALS_BASE64 production <<< "$B64_VALUE"

echo ""
echo "Done! Now redeploy with: vercel --prod"
