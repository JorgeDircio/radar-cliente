-- Solo local. Debe coincidir con WORKER_SECRET de .env.local.
select vault.create_secret('http://host.docker.internal:3000/api/worker', 'worker_url');
select vault.create_secret('local-dev-worker-secret-change-me', 'worker_secret');
