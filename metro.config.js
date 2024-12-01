const path = require('path');

module.exports = {
  transformer: {
    // Optional: add other transformer configurations if needed
  },
  server: {
    // Enable polling to reduce the number of open file watchers
    watch: {
      usePolling: true,  // Use polling instead of native file system events
      interval: 100,     // Adjust interval for polling
      useFsEvents: false // Disable FS events if causing issues
    },
  },
  resolver: {
    // Exclude node_modules from being watched by Metro
    blacklistRE: /node_modules/,
  },
  watchFolders: [
    // Optionally specify which folders to watch (you can add custom folders here if needed)
    path.resolve(__dirname, 'src') // Example: only watch 'src' folder
  ],
};
