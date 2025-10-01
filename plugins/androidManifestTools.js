const { withAndroidManifest } = require('@expo/config-plugins');

const withAndroidManifestTools = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    
    // Find the application element
    const application = androidManifest.manifest.application[0];
    
    // Add tools:replace for supportsRtl to resolve conflict with Beacon library
    if (application.$) {
      // If tools:replace already exists, add supportsRtl to it
      if (application.$['tools:replace']) {
        const existingReplace = application.$['tools:replace'];
        if (!existingReplace.includes('android:supportsRtl')) {
          application.$['tools:replace'] = existingReplace + ',android:supportsRtl';
        }
      } else {
        application.$['tools:replace'] = 'android:supportsRtl';
      }
    } else {
      application.$ = { 'tools:replace': 'android:supportsRtl' };
    }
    
    // Ensure the tools namespace is declared in the manifest element
    const manifest = androidManifest.manifest;
    if (manifest.$) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    } else {
      manifest.$ = { 'xmlns:tools': 'http://schemas.android.com/tools' };
    }
    
    console.log('✅ AndroidManifest tools:replace configured for supportsRtl');
    
    return config;
  });
};

module.exports = withAndroidManifestTools;