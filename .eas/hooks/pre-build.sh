#!/usr/bin/env bash

# This hook runs before the build starts
# It configures git to use the GitHub token for private submodules

set -e

echo "🔐 Configuring git authentication for private submodules..."

if [ -z "$GITHUB_TOKEN" ]; then
  echo "⚠️  WARNING: GITHUB_TOKEN not set. Private submodules will not be accessible."
  exit 0
fi

# Configure git to use the token for GitHub authentication
git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"

# Clean up any existing submodule state from tarball
if [ -d "private-sdk" ] && [ ! -d "private-sdk/.git" ]; then
  rm -rf private-sdk
fi

if [ -d ".git/modules/private-sdk" ]; then
  rm -rf .git/modules/private-sdk
fi

if [ -f ".git/config" ]; then
  git config --remove-section submodule.private-sdk 2>/dev/null || true
fi

# Initialize and update submodules
echo "📦 Initializing submodules..."
git submodule init
git submodule update --init --recursive --quiet

# Fallback to direct clone if submodule update failed
if [ ! -d "private-sdk/.git" ]; then
  echo "⚠️  Submodule update failed, trying direct clone..."
  rm -rf private-sdk
  
  if git clone --quiet https://github.com/hackclub/hcb-private-sdk.git private-sdk; then
    EXPECTED_COMMIT=$(git ls-tree HEAD private-sdk | awk '{print $3}')
    if [ -n "$EXPECTED_COMMIT" ]; then
      cd private-sdk
      git checkout --quiet $EXPECTED_COMMIT
      cd ..
    fi
    echo "✅ Cloned private-sdk successfully"
  else
    echo "❌ Failed to clone private-sdk"
    exit 1
  fi
fi

# Verify the library files exist
if [ -f "private-sdk/com/google/android/gms/play-services-tapandpay/17.1.2/play-services-tapandpay-17.1.2.aar" ]; then
  echo "✅ Google Wallet library found"
else
  echo "❌ Google Wallet library NOT found"
  exit 1
fi
