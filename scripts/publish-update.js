/* eslint-disable */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const messageIndex = args.indexOf('--message');
const channelIndex = args.indexOf('--channel');
const environmentIndex = args.indexOf('--environment');

const message = messageIndex !== -1 ? args[messageIndex + 1] : 'Update';
const channel = channelIndex !== -1 ? args[channelIndex + 1] : 'production';
const environment = environmentIndex !== -1 ? args[environmentIndex + 1] : 'production';

const appConfigPath = path.join(__dirname, '..', 'app.config.js');
const backupPath = path.join(__dirname, '..', 'app.config.backup.js');

try {
  const appConfigContent = fs.readFileSync(appConfigPath, 'utf8');
    fs.writeFileSync(backupPath, appConfigContent);
  console.log('✅ Backed up app.config.js');
  let modifiedContent = appConfigContent;
  if (modifiedContent.includes('extra: {')) {
    modifiedContent = modifiedContent.replace(
      /extra: \{/,
      `extra: {\n      message: ${JSON.stringify(message)},`
    );
  } else {
    modifiedContent = modifiedContent.replace(
      /expo: \{/,
      `expo: {\n    extra: {\n      message: ${JSON.stringify(message)},\n    },`
    );
  }

  fs.writeFileSync(appConfigPath, modifiedContent);
  console.log('✅ Added message to app.config.js extra section');
  console.log('\n🚀 Running eas update...\n');
  
  const easCommand = `npx eas-cli update --channel ${channel} --environment ${environment} --non-interactive --message "${message}"`;
  
  execSync(easCommand, { 
    stdio: 'inherit',
    env: { ...process.env }
  });

  console.log('\n✅ Update published successfully!');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, appConfigPath);
    fs.unlinkSync(backupPath);
  }
}

