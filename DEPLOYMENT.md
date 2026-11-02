# Droplet sync workflow

`.github/workflows/deploy.yml` runs after every push to `main` (including a merged pull request). It connects to the droplet as `mern`, fast-forwards `/home/mern/repo`, and installs the server dependencies from the lockfile.

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

This workflow syncs the repository and installs API dependencies. The droplet currently serves its starter page; the API process and Nginx routing have not been switched to the Harmony API yet. Add a build and process-restart step after the app's runtime and Nginx routes are configured.
