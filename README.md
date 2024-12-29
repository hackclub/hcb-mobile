<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/banner-dark.png">
  <img src="assets/banner-light.png">
</picture>

### _HCB but smaller!_

</div>
 
## Setup

HCB Mobile connects to HCB throught the v4 API.
You can either connect to the production HCB instance, or a local development instance.

### Production HCB

Set your `.env` to include the following variables:

```
EXPO_PUBLIC_API_BASE=https://hcb.hackclub.com/api/v4
EXPO_PUBLIC_CLIENT_ID=yt8JHmPDmmYYLUmoEiGtocYwg5fSOGCrcIY3G-vkMRs
EXPO_PUBLIC_STRIPE_API_KEY=pk_live_UAjIP1Kss29XZ6tW0MFWkjUQ
```

### Development HCB

Go into the Rails console on your development server (`bin/rails c`), and run the following:

```
app = Doorkeeper::Application.create(name: "mobile", redirect_uri: "hcb://", scopes: ["read", "write"], confidential: false)
```

Then, set your `.env` to include the following variables:

```
EXPO_PUBLIC_API_BASE=http://<host>/api/v4
EXPO_PUBLIC_CLIENT_ID=<uid field from the Doorkeeper app>
```

## Building on iOS

1. Install Xcode/Node.js
2. `npm install`
3. `npm run ios` - builds and runs the app in a simulator
   - Run with the `-- --device` flag to get a device selector, e.g. to run on a physical iPhone
   - Bonus task: fry an egg on your Mac while this runs

## Building on Android

1. Install Android Studio & Node.js
2. Setup a new AVD in Android Studio with api >= 34
3. Install & set your `JAVA_HOME` to a Java 17 SDK
4. `npm install`
5. `npm run android` - builds and runs the app in a simulator
   - Run with the `-- --device` flag to get a device selector, e.g. to run on a physical Android phone
   - Bonus task: painfully watch Gradle attempt to work
