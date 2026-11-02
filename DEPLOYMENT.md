# Droplet sync workflow

`.github/workflows/deploy.yml` runs after every push to `main` (including a merged pull request). It connects to the droplet as `mern`, fast-forwards `/home/mern/repo`, copies the protected server environment file with owner-only permissions, installs dependencies from the lockfile, reloads the API with PM2, and checks `/api/ping` locally.

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

The droplet's existing Nginx configuration sends web traffic to port `3000` and does not yet route `/api` to the API on port `4000`. Before the API is reachable through `https://harmonyapp.us/api`, add this location block inside the HTTPS `server` block in `/etc/nginx/sites-available/harmonyapp.us`, before its existing `location /`:

```nginx
    location ^~ /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
```

Then run `sudo nginx -t` and `sudo systemctl reload nginx`. After that one-time Nginx change, merged API updates will be reloaded by PM2 and checked by the workflow. Web and mobile apps are not built or deployed by this workflow yet.
