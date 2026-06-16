{
  "name": "fs-communication",
  "script": "npm run start",
  "instances": 1,
  "exec_mode": "fork",
  "error_file": "logs/pm2-error.log",
  "out_file": "logs/pm2-out.log",
  "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
  "merge_logs": true,
  "env": {
    "NODE_ENV": "production"
  },
  "watch": false,
  "ignore_watch": [
    "node_modules",
    "logs",
    "dist",
    ".next"
  ],
  "max_memory_restart": "1G",
  "autorestart": true,
  "max_restarts": 10,
  "min_uptime": "60s",
  "listen_timeout": 5000,
  "kill_timeout": 5000
}
