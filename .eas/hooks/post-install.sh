#!/usr/bin/env bash

# This hook runs after npm install and expo prebuild
# It verifies the Google Wallet dependencies are configured

set -e

# Verify private-sdk is accessible
if [ -d "private-sdk" ] && [ -f "private-sdk/com/google/android/gms/play-services-tapandpay/17.1.2/play-services-tapandpay-17.1.2.aar" ]; then
  echo "✅ Google Wallet library verified"
else
  echo "⚠️  Google Wallet library not found - digital wallet features will be unavailable"
fi

# Verify Android dependencies are configured
if [ -f "android/app/build.gradle" ]; then
  if grep -q "play-services-tapandpay" android/app/build.gradle; then
    echo "✅ Google Wallet dependencies configured"
  else
    echo "⚠️  Google Wallet dependencies not found in build.gradle"
  fi
fi

