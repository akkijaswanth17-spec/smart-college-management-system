// PM2 process config — keeps the backend (and its cron reminder scheduler)
// running permanently, restarting it automatically if it ever crashes or
// the server reboots. Start with: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "smart-college-backend",
      script: "dist/server.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
