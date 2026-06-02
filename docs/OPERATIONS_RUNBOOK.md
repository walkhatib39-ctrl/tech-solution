# Tech-Solution Operations, Access, and Deployment Runbook

Last updated: 2026-06-02

This document is the operational handoff for agents working on Tech-Solution.

Purpose:

- centralize repo, VPS, SSH, Plesk, deployment, logs, database, and production verification details
- make it clear how an agent should use SSH access safely when implementing, deploying, seeding, and debugging
- keep all durable production changes reproducible from GitHub

## 1. Operating Rule for Agents

Expected workflow:

1. Understand the requested change from product context.
2. Inspect the local codebase first.
3. Use production SSH only when needed to verify logs, schema, deployment state, build state, or live behavior.
4. Make changes locally.
5. Validate locally.
6. Commit and push to GitHub `master` unless the owner requests another branch.
7. Deploy through Plesk Git or Plesk UI.
8. Run production verification.

Do not leave server-only code changes behind. Production must be reproducible from GitHub.

## 2. Local Repository

Local repo path:

```text
C:\Users\WALID DEV\apps walid\tech-solution-v2
```

GitHub repo:

```text
https://github.com/walkhatib39-ctrl/tech-solution
```

Working production branch:

```text
master
```

Local shell:

```text
PowerShell on Windows
```

Important local rules:

- commit and push meaningful changes after each significant request
- do not commit unrelated local files
- never commit `.env*`, SSH keys, database dumps, uploaded files, or production secrets
- `public/uploads/` is runtime content, not source code

## 3. Production Hosting

Production site:

```text
https://www.techsolution-group.com/
```

Internal projects app:

```text
https://www.techsolution-group.com/projects
```

VPS provider:

```text
OVH
```

VPS access:

```text
Host: 37.59.96.235
Hostname: vps-657d78f8.vps.ovh.net
IPv6: 2001:41d0:305:2100::ec5b
SSH user: debian
SSH port: 22
```

Plesk:

```text
Panel: https://37.59.96.235:8443
Domain: techsolution-group.com
Application root: /httpdocs
Production path: /var/www/vhosts/techsolution-group.com/httpdocs
Plesk subscription system user: techsolution-group.co_lufiimcupx
Node startup file: server.js
Node mode: production
```

Verified production facts from previous deployment work:

- `debian` has passwordless sudo
- production files are owned by `techsolution-group.co_lufiimcupx`
- Next.js runs through Plesk Node.js / Passenger
- `.env.production` exists in `/var/www/vhosts/techsolution-group.com/httpdocs`
- the app uses MySQL through `mysql2`

Verified on 2026-06-02:

- SSH key alias `techsolution-ovh` works from the local Codex machine
- `hostname` returns `vps-657d78f8`
- `whoami` returns `debian`
- `sudo -n true` succeeds
- Plesk Git repository name is `tech-solution`
- Plesk Git repository type is `pull`
- Plesk bare repository path is `/var/www/vhosts/techsolution-group.com/git/tech-solution`
- Plesk Node environment reports Node `v25.9.0` and npm `11.12.1` when commands run through `sudo -u techsolution-group.co_lufiimcupx bash -lc`
- running Node without the Plesk login environment may resolve to a different system Node version, so keep the `bash -lc` wrapper in production commands

## 4. SSH Access

Local SSH private key path:

```text
C:\Users\WALID DEV\.ssh\techsolution_ovh
```

Local SSH public key path:

```text
C:\Users\WALID DEV\.ssh\techsolution_ovh.pub
```

Local SSH config alias:

```sshconfig
Host techsolution-ovh
    HostName 37.59.96.235
    User debian
    IdentityFile ~/.ssh/techsolution_ovh
    IdentitiesOnly yes
```

Never paste the private key into chat or commit it.

### First-Time Authorization

The local key must be added once to `/home/debian/.ssh/authorized_keys` on the VPS.

Use one of the two methods below.

#### Method A: from local Windows PowerShell

Use this when the prompt looks like:

```text
PS C:\Users\WALID DEV>
```

Run this from local PowerShell, not from the VPS SSH shell:

```powershell
Get-Content "$env:USERPROFILE\.ssh\techsolution_ovh.pub" | ssh debian@37.59.96.235 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

This asks for the VPS password once.

If the prompt looks like this, you are already inside the VPS and this PowerShell command will not work:

```text
debian@vps-657d78f8:~$
```

The symptom is:

```text
-bash: Get-Content: command not found
```

That means the key was not installed.

#### Method B: if already connected to the VPS

Use this only when the prompt looks like:

```text
debian@vps-657d78f8:~$
```

From local Windows, first display the public key:

```powershell
Get-Content "$env:USERPROFILE\.ssh\techsolution_ovh.pub"
```

Then copy the single `ssh-ed25519 ... techsolution-ovh-codex` line and paste it into this VPS command by replacing `PASTE_PUBLIC_KEY_HERE`:

```bash
mkdir -p ~/.ssh && printf '%s\n' 'PASTE_PUBLIC_KEY_HERE' >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys
```

After authorization, test key-based access:

```powershell
ssh -o BatchMode=yes techsolution-ovh "hostname; whoami; pwd"
```

Expected output includes:

```text
vps-657d78f8
debian
/home/debian
```

Production project shell check:

```powershell
ssh techsolution-ovh "sudo bash -lc 'cd /var/www/vhosts/techsolution-group.com/httpdocs && pwd && ls -la package.json server.js'"
```

## 5. Production Logs

Plesk / web server logs:

```powershell
ssh techsolution-ovh "sudo tail -n 160 /var/www/vhosts/system/techsolution-group.com/logs/error_log 2>/dev/null; sudo tail -n 160 /var/www/vhosts/system/techsolution-group.com/logs/proxy_error_log 2>/dev/null"
```

Node/Passenger issues normally surface in Plesk logs. If a production page returns 500, inspect logs before guessing.

Rules:

- use the exact exception line, file, and stack frame to fix the issue
- do not paste sensitive request data, `.env` values, passwords, tokens, or private keys into chat
- do not run destructive commands without explicit owner approval

## 6. Database and Schema Verification

Production database:

```text
Database: techsolution
User: techsolution_user
Host: localhost
```

The password is stored only in production `.env.production`.

Check database connection without printing secrets:

```powershell
ssh techsolution-ovh "sudo -u techsolution-group.co_lufiimcupx bash -lc 'cd /var/www/vhosts/techsolution-group.com/httpdocs && set -a && . ./.env.production && set +a && node -e \"const mysql=require(\\\"mysql2/promise\\\"); mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD||\\\"\\\",database:process.env.DB_NAME}).then(async c=>{const [r]=await c.query(\\\"SELECT DATABASE() db, COUNT(*) projects FROM projects\\\"); console.log(r); await c.end();}).catch(e=>{console.error(e.message); process.exit(1);})\"'"
```

Useful tables:

- `project_users`
- `project_access`
- `projects`
- `task_sections`
- `tasks`
- `project_doc_folders`
- `project_doc_files`
- `project_tracking_fields`
- `project_updates`
- `project_interventions`

Rules:

- never invent columns
- verify production schema before schema-sensitive fixes
- never print `.env.production`
- do not run destructive SQL without explicit owner approval

## 7. Deployment Reality

Current hosting/deployment:

- Plesk
- Plesk Git is the intended deployment layer
- GitHub remains the source of truth
- SSH is used for deployment commands, builds, seeds, logs, database checks, and verification

Production path:

```text
/var/www/vhosts/techsolution-group.com/httpdocs
```

Important caveat:

```text
httpdocs may not be a Git worktree. Do not assume `git pull` inside httpdocs is the deployment method.
```

Plesk Git repository name shown in Plesk UI:

```text
tech-solution
```

Verify Plesk Git repositories:

```powershell
ssh techsolution-ovh "sudo /usr/sbin/plesk ext git --list -domain techsolution-group.com"
```

If the repository name differs from `tech-solution`, use the returned name in the commands below.

Check Plesk Git remote:

```powershell
ssh techsolution-ovh "sudo git --git-dir=/var/www/vhosts/techsolution-group.com/git/tech-solution config --get remote.origin.url"
```

Expected repo:

```text
https://walkhatib39-ctrl@github.com/walkhatib39-ctrl/tech-solution
```

The username in the HTTPS remote is how Plesk currently stores this public GitHub pull remote.

## 8. Standard Deployment Flow

After a local change is implemented and validated:

1. Commit and push local code to GitHub `master`.
2. Fetch latest GitHub commit into Plesk Git.
3. Verify fetched commit.
4. Deploy through Plesk Git.
5. Install dependencies if `package.json` or `package-lock.json` changed.
6. Build the Next.js app.
7. Restart the Plesk Node.js app.
8. Smoke test production.
9. Inspect logs if anything looks wrong.

Fetch:

```powershell
ssh techsolution-ovh "sudo /usr/sbin/plesk ext git --fetch -domain techsolution-group.com -name tech-solution"
```

Verify fetched commit:

```powershell
ssh techsolution-ovh "sudo /usr/sbin/plesk ext git --get-last-commit -domain techsolution-group.com -name tech-solution"
```

Deploy:

```powershell
ssh techsolution-ovh "sudo /usr/sbin/plesk ext git --deploy -domain techsolution-group.com -name tech-solution"
```

If Plesk CLI Git commands fail, use the Plesk UI:

1. Websites & Domains
2. techsolution-group.com
3. Git
4. Pull now
5. Deploy now

## 9. Standard Post-Deploy Commands

Run after Plesk has deployed the latest GitHub commit.

Install dependencies:

```powershell
ssh techsolution-ovh "sudo -u techsolution-group.co_lufiimcupx bash -lc 'cd /var/www/vhosts/techsolution-group.com/httpdocs && npm install'"
```

Build:

```powershell
ssh techsolution-ovh "sudo -u techsolution-group.co_lufiimcupx bash -lc 'cd /var/www/vhosts/techsolution-group.com/httpdocs && npm run build'"
```

Restart Passenger / Plesk Node.js app:

```powershell
ssh techsolution-ovh "sudo -u techsolution-group.co_lufiimcupx bash -lc 'mkdir -p /var/www/vhosts/techsolution-group.com/httpdocs/tmp && touch /var/www/vhosts/techsolution-group.com/httpdocs/tmp/restart.txt'"
```

Use Plesk UI `Restart App` if preferred.

## 10. Seeds

Current seed scripts:

```text
npm run seed:maison216
npm run seed:azur
```

Run Maison216 seed in production:

```powershell
ssh techsolution-ovh "sudo -u techsolution-group.co_lufiimcupx bash -lc 'cd /var/www/vhosts/techsolution-group.com/httpdocs && set -a && . ./.env.production && set +a && npm run seed:maison216'"
```

Run Azur Private Driver seed in production:

```powershell
ssh techsolution-ovh "sudo -u techsolution-group.co_lufiimcupx bash -lc 'cd /var/www/vhosts/techsolution-group.com/httpdocs && set -a && . ./.env.production && set +a && npm run seed:azur'"
```

If a seed script is missing in production, production code is stale. Deploy the latest GitHub commit first.

Verified seed state on 2026-06-02:

- `npm run seed:azur` exists after deploying commit `f8a3d59`
- running it in production completed for project `project-1e562d87-8d0c-492b-88a0-a59ebeb1390e`
- result: 23 sections ready, 44 tasks inserted, 0 tasks skipped
- database counts after seed: 23 sections, 44 tasks
- status split after seed: 24 `Terminé`, 3 `En cours`, 3 `Bloqué`, 14 `À faire`

## 11. Deployment Verification

HTTP smoke:

```powershell
ssh techsolution-ovh "curl -I -sS https://www.techsolution-group.com/ | head -n 20; echo ----; curl -I -sS https://www.techsolution-group.com/projects | head -n 20"
```

Expected:

- `/` returns `200`
- `/projects` returns `200`
- API without auth returns `401`

Protected API check:

```powershell
ssh techsolution-ovh "curl -i -sS https://www.techsolution-group.com/api/projects | head -n 30"
```

Expected unauthenticated response:

```text
HTTP/2 401
{"error":"Unauthorized"}
```

Check seed scripts exist after deployment:

```powershell
ssh techsolution-ovh "sudo -u techsolution-group.co_lufiimcupx bash -lc 'cd /var/www/vhosts/techsolution-group.com/httpdocs && node -e \"const p=require(\\\"./package.json\\\"); console.log(p.scripts)\"'"
```

Check project counts:

```powershell
ssh techsolution-ovh "sudo -u techsolution-group.co_lufiimcupx bash -lc 'cd /var/www/vhosts/techsolution-group.com/httpdocs && set -a && . ./.env.production && set +a && node -e \"const mysql=require(\\\"mysql2/promise\\\"); mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD||\\\"\\\",database:process.env.DB_NAME}).then(async c=>{const [r]=await c.query(\\\"SELECT name, (SELECT COUNT(*) FROM tasks WHERE tasks.project_id=projects.id) tasks FROM projects ORDER BY name\\\"); console.table(r); await c.end();})\"'"
```

Before deployment, if production has runtime uploads, make a non-destructive backup:

```powershell
ssh techsolution-ovh "sudo -u techsolution-group.co_lufiimcupx bash -lc 'cd /var/www/vhosts/techsolution-group.com/httpdocs && mkdir -p data/backups && if [ -d public/uploads ]; then tar -czf data/backups/uploads-before-deploy-$(date +%Y%m%d-%H%M%S).tgz public/uploads; fi'"
```

This was used on 2026-06-02 before deploying commit `f8a3d59`; production had 74 files under `public/uploads`, and the count remained 74 after deployment.

## 12. Production Safety Rules

Do:

- inspect logs before fixing production 500s
- verify production schema before writing schema-sensitive code
- run `npm install` when dependencies change
- run `npm run build` when Next.js, TypeScript, CSS, or package files change
- restart the Node app after build
- keep all durable changes in GitHub
- use `sudo -u techsolution-group.co_lufiimcupx` for commands inside `httpdocs`

Do not:

- paste secrets, private SSH keys, DB passwords, or `.env.production` contents into chat
- run destructive commands such as `rm -rf`, `git reset --hard`, or direct DB deletes without explicit approval
- edit production files as the only copy of a fix
- assume `httpdocs` is a Git worktree
- assume Plesk Git repository name without verifying when CLI commands fail

## 13. How to Remove Agent SSH Access Later

Remove the public key line from:

```text
/home/debian/.ssh/authorized_keys
```

Then test from local PowerShell that key-based access no longer works:

```powershell
ssh -o BatchMode=yes techsolution-ovh "echo SSH_OK"
```

Expected after removal:

```text
Permission denied
```
