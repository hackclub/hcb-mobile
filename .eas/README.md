# EAS Build Configuration

This directory contains EAS build hooks for the HCB mobile app.

## Private Submodule Access

The app uses a private submodule (`private-sdk`) containing Google Play Services Tap and Pay libraries required for Google Wallet integration.

### Setup Instructions

#### 1. Create a GitHub Personal Access Token

1. Go to [GitHub Personal Access Tokens](https://github.com/settings/tokens/new)
2. Name it: `EAS Build - HCB Private SDK`
3. Select the `repo` scope (full control of private repositories)
4. Generate token and **copy it**

**For fine-grained tokens**: Make sure to grant access to the `hackclub/hcb-private-sdk` repository with `Contents: Read` permission.

#### 2. Add the Token to EAS

```bash
eas env:create --name GITHUB_TOKEN --value "your_github_token_here" --visibility sensitive
```

Select all environments (development, preview, production) when prompted.

#### 3. Build

```bash
eas build --platform android --profile preview
```

The build will automatically:

1. Configure git authentication using the token
2. Clone the private submodule
3. Include the Google Wallet dependencies

## How it Works

### Pre-Build Hook (`.eas/hooks/pre-build.sh`)

Runs before `npm install` and:

1. Configures git to use the `GITHUB_TOKEN` for GitHub authentication
2. Cleans up any incomplete submodule state from the build tarball
3. Initializes and clones the `private-sdk` submodule
4. Verifies the Google Wallet library files are present

### Post-Build Hook (`.eas/hooks/post-install.sh`)

Runs after `expo prebuild` and:

1. Verifies the private SDK is still accessible
2. Confirms Google Wallet dependencies are configured in Android build files

### Build Configuration (`eas.json`)

All build profiles set `EXPO_USE_SUBMODULES=1` to enable submodule support.

## Troubleshooting

### Build fails with "GITHUB_TOKEN not set"

Add the token as an EAS secret (see Setup Instructions above).

### Build fails with "Google Wallet library NOT found"

The token may not have access to the private repository. Verify:

1. Token has `repo` scope
2. For fine-grained tokens: repository access is explicitly granted
3. Token hasn't expired

### Google Wallet button not appearing in the app

1. Verify the build succeeded with "✅ Google Wallet library verified"
2. Get your app's SHA-256 certificate fingerprint:
   ```bash
   keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA256
   ```
3. Register it in the [Google Pay Business Console](https://pay.google.com/business/console)
