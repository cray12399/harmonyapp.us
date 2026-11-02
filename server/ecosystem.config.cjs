module.exports = {
  apps: [
    {
      name: "harmony-api",
      cwd: __dirname,
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: "4000",
      },
    },
  ],
};
