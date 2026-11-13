# Droplet sync workflow

`.github/workflows/deploy.yml` runs after every push to `main` (including a merged pull request). It connects to the droplet as `mern`, fast-forwards `/home/mern/repo`, copies the protected server environment file with owner-only permissions, installs server dependencies, reloads the API with PM2, and checks `/api/ping` locally. It then installs the web dependencies and builds `web/dist`, which Nginx serves at `https://harmonyapp.us/`.

## GitHub Actions secrets

Add these repository secrets in **Settings → Secrets and variables → Actions**:

- `DEPLOY_SSH_KEY`: a dedicated private SSH key for the workflow.
- `DROPLET_KNOWN_HOSTS`: the trusted SSH host-key line for `164.90.134.165` from a workstation that has already verified the droplet's SSH fingerprint.

The workflow connects as `mern` to `164.90.134.165`; these are set in the workflow file.

## Add the workflow key to the droplet

Generate a dedicated key on a trusted workstation:

```bash
ssh-keygen -t ed25519 -C harmony-github-actions -f ~/.ssh/harmony-deploy -N ""
```

Save the contents of `~/.ssh/harmony-deploy` as the `DEPLOY_SSH_KEY` Actions secret. Add the public key from `~/.ssh/harmony-deploy.pub` to `/home/mern/.ssh/authorized_keys`, preserving its owner and restrictive permissions. Do not commit either key.

## Current scope

Nginx serves `/home/mern/repo/web/dist` for the website and proxies `/api/` to the API on port `4000`. The workflow builds the web app with `npm ci --legacy-peer-deps` because the current web lockfile includes TypeScript 7 while `typescript-eslint` declares support only through TypeScript 6. The mobile app is not deployed by this workflow.

The PM2 production configuration sets `MONGO_DB_NAME=harmony`. Mongoose uses that database name even if the connection string in the protected `.env` contains another database path. Local runs use the connection string's database unless `MONGO_DB_NAME` is set. The deployment workflow keeps the protected source `.env` readable by its owner and `harmony-env` group only.
