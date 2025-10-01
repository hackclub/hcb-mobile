const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo plugin to configure Google Play Services Tap and Pay private SDK
 * Following Google's official documentation for Android Push Provisioning API integration
 * https://developers.google.com/wallet/generic/android/push-provisioning
 */
function withPrivateSDK(config) {
  console.log('🔧 Running usePrivateSDK plugin...');
  
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const privateSDKPath = path.join(projectRoot, 'private-sdk');
      const androidPath = path.join(projectRoot, 'android');
      const rootBuildGradlePath = path.join(androidPath, 'build.gradle');
      const appBuildGradlePath = path.join(androidPath, 'app', 'build.gradle');

      console.log('📁 Project root:', projectRoot);
      console.log('📦 Private SDK source:', privateSDKPath);
      console.log('🏗️  Android path:', androidPath);

      // Check if private-sdk directory exists
      if (!fs.existsSync(privateSDKPath)) {
        console.warn('⚠️  Private SDK directory not found at:', privateSDKPath);
        return config;
      }

      try {
        // Step 1: Configure root build.gradle to include local Maven repository
        await configureRootBuildGradle(rootBuildGradlePath, privateSDKPath, projectRoot);
        
        // Step 2: Configure app build.gradle with required dependencies
        await verifyAppBuildGradle(appBuildGradlePath);

      } catch (error) {
        console.error('❌ Error in usePrivateSDK plugin:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
      }

      return config;
    },
  ]);
}

/**
 * Configure root build.gradle to include local Maven repository for private SDK
 * Following Google's documentation: Add maven { url "file:/path/to/your/repo/m2repository/" }
 */
async function configureRootBuildGradle(buildGradlePath, privateSDKPath, projectRoot) {
  console.log('📝 Configuring root build.gradle...');
  
  if (!fs.existsSync(buildGradlePath)) {
    console.error('❌ Root build.gradle not found at:', buildGradlePath);
    return;
  }

  let buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');
  
  // Convert to relative path for better portability
  const relativePath = path.relative(path.dirname(buildGradlePath), privateSDKPath);
  const mavenRepoLine = `    maven { url "file://${relativePath}/" } // Google Play Services Tap and Pay private SDK (m2repository format)`;
  
  // Check if the maven repository is already configured
  if (buildGradleContent.includes('// Google Play Services Tap and Pay private SDK')) {
    console.log('✅ Maven repository already configured in root build.gradle');
    return;
  }

  // Find the allprojects repositories block and add our maven repo
  const repositoriesRegex = /(allprojects\s*\{[\s\S]*?repositories\s*\{[\s\S]*?)(google\(\)[\s\S]*?)(mavenCentral\(\))/;
  
  if (repositoriesRegex.test(buildGradleContent)) {
    buildGradleContent = buildGradleContent.replace(
      repositoriesRegex,
      `$1$2$3\n${mavenRepoLine}`
    );
    
    fs.writeFileSync(buildGradlePath, buildGradleContent);
    console.log('✅ Added private SDK Maven repository to root build.gradle');
  } else {
    console.warn('⚠️  Could not find repositories block in root build.gradle');
  }
}

/**
 * Configure app build.gradle with required dependencies for Push Provisioning
 * Adds both Google Play Services Tap and Pay and Stripe Android Issuing Push Provisioning
 */
async function verifyAppBuildGradle(buildGradlePath) {
  console.log('📝 Configuring app build.gradle dependencies...');
  
  if (!fs.existsSync(buildGradlePath)) {
    console.error('❌ App build.gradle not found at:', buildGradlePath);
    return;
  }

  let buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');
  let hasChanges = false;
  
  // Dependencies to add
  const requiredDependencies = [
    {
      dependency: "implementation 'com.google.android.gms:play-services-tapandpay:17.1.2' // Google Play Services Tap and Pay for Push Provisioning",
      check: 'play-services-tapandpay',
      name: 'Google Play Services Tap and Pay'
    },
    {
      dependency: "implementation 'com.stripe:stripe-android-issuing-push-provisioning:1.1.0' // Stripe Android Issuing Push Provisioning",
      check: 'stripe-android-issuing-push-provisioning',
      name: 'Stripe Android Issuing Push Provisioning'
    }
  ];

  // Find the dependencies block and locate the best insertion point
  const dependenciesRegex = /(dependencies\s*\{[\s\S]*?)(\}(?:\s*$|\s*\n))/;
  
  if (!dependenciesRegex.test(buildGradleContent)) {
    console.error('❌ Could not find dependencies block in app build.gradle');
    return;
  }

  // Look for the end of the hermes/jsc conditional block to place dependencies after it
  const hermesBlockRegex = /(if \(hermesEnabled\.toBoolean\(\)\) \{[\s\S]*?\} else \{[\s\S]*?\}\s*)(\})/;
  
  // Check if dependencies already exist
  const existingDependencies = requiredDependencies.filter(dep => buildGradleContent.includes(dep.check));
  const missingDependencies = requiredDependencies.filter(dep => !buildGradleContent.includes(dep.check));
  
  if (existingDependencies.length > 0) {
    console.log(`✅ Found existing dependencies: ${existingDependencies.map(d => d.name).join(', ')}`);
  }
  
  if (missingDependencies.length > 0) {
    console.log(`➕ Adding missing dependencies: ${missingDependencies.map(d => d.name).join(', ')}`);
    
    // Remove any existing dependencies that might be in wrong locations
    for (const dep of requiredDependencies) {
      const wrongLocationRegex = new RegExp(`\\s*${dep.dependency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g');
      buildGradleContent = buildGradleContent.replace(wrongLocationRegex, '');
    }
    
    // Add all missing dependencies in the correct location - after hermes block
    const dependenciesToAdd = missingDependencies.map(dep => `    ${dep.dependency}`).join('\n');
    
    if (hermesBlockRegex.test(buildGradleContent)) {
      buildGradleContent = buildGradleContent.replace(
        hermesBlockRegex,
        `$1\n    // Google Pay Push Provisioning dependencies\n${dependenciesToAdd}\n$2`
      );
    } else {
      // Fallback to end of dependencies block
      buildGradleContent = buildGradleContent.replace(
        dependenciesRegex,
        `$1    // Google Pay Push Provisioning dependencies\n${dependenciesToAdd}\n$2`
      );
    }
    hasChanges = true;
  } else {
    // Even if dependencies exist, check if they're in the wrong location and move them
    console.log('🔍 Checking dependency placement...');
    
    // Check if dependencies are in conditional blocks (wrong location)
    const wrongLocationPattern = /(if\s*\([^)]+\)\s*\{[\s\S]*?)(implementation\s+['"][^'"]*['"][\s\S]*?)(\}[\s\S]*?)(\})/;
    
    if (wrongLocationPattern.test(buildGradleContent)) {
      console.log('⚠️  Found dependencies in wrong location, moving them...');
      
      // Remove from wrong locations
      for (const dep of requiredDependencies) {
        const wrongLocationRegex = new RegExp(`\\s*${dep.dependency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g');
        buildGradleContent = buildGradleContent.replace(wrongLocationRegex, '');
      }
      
      // Add in correct location
      const dependenciesToAdd = requiredDependencies.map(dep => `    ${dep.dependency}`).join('\n');
      
      if (hermesBlockRegex.test(buildGradleContent)) {
        buildGradleContent = buildGradleContent.replace(
          hermesBlockRegex,
          `$1\n    // Google Pay Push Provisioning dependencies\n${dependenciesToAdd}\n$2`
        );
      } else {
        buildGradleContent = buildGradleContent.replace(
          dependenciesRegex,
          `$1    // Google Pay Push Provisioning dependencies\n${dependenciesToAdd}\n$2`
        );
      }
      hasChanges = true;
    }
  }

  // Write changes if any were made
  if (hasChanges) {
    fs.writeFileSync(buildGradlePath, buildGradleContent);
    console.log('✅ Updated app build.gradle with Push Provisioning dependencies');
  } else {
    console.log('✅ All required dependencies are already configured');
  }
}

module.exports = withPrivateSDK;