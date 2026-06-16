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
    "NODE_ENV": "production",
    "DATABASE_URL": "libsql://fsdb-fscom.aws-ap-northeast-1.turso.io",
    "TURSO_AUTH_TOKEN": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODE2MjIzNzAsImlkIjoiMDE5ZWNmODctNzIwMS03ODcyLTgwY2UtODY3YzYxZjIwZGFmIiwicmlkIjoiZWIxZDg2YTAtZDc0MS00NDczLWI0NWBeZjMzM2JhNTA5MDIyIn0.T2_ZLL9d-xYg5ktNFJPs-EFuAA2jOc9XCZxVLNtWKdLBHgBgIh-4JRyM_22hbJQsX1zMCNEt1MEaKbOeaTAqDg"
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
  "max_restarts": 10
}
