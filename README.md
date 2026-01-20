# github-repo-sync

CLI tool to sync GitHub repo settings, secrets, and rulesets across personal repositories.

## Why?

Organizations have org-level secrets and rulesets that apply to all repos. Personal accounts need to set these up per-repo. This tool lets you define your standard config once and sync it across all your repos.

## Setup

```bash
# Clone the repo
git clone https://github.com/spencerbeggs/github-repo-sync.git
cd github-repo-sync

# Install dependencies
pnpm install

# Copy example files
cp .env.example .env
cp config.example.json config.json

# Edit with your values
vim .env
vim config.json
```

## Configuration

### `.env`

Contains your GitHub token and secret values:

```bash
# GitHub PAT with repo, admin:org scopes
GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# Secrets to sync
APP_ID=123456
APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
CLAUDE_REVIEW_PAT=ghp_xxxxxxxxxxxx
CUSTOM_REGISTRIES="//npm.pkg.github.com/:_authToken=${NPM_TOKEN}"
NPM_TOKEN=npm_xxxxxxxxxxxx
```

### `config.json`

Defines repos, settings, and rulesets:

```json
{
  "owner": "spencerbeggs",
  "repos": [
    "repo-1",
    "repo-2"
  ],
  "secrets": [
    "APP_ID",
    "NPM_TOKEN"
  ],
  "settings": {
    "has_wiki": false,
    "allow_squash_merge": true,
    "delete_branch_on_merge": true
  },
  "rulesets": [...]
}
```

See `config.example.json` for a complete example with all settings.

## Usage

```bash
# Dry run - see what would change
pnpm sync -- --dry-run

# Sync all repos
pnpm sync

# Sync a specific repo
pnpm sync -- --repo my-repo

# Use a different config file
pnpm sync -- --config production.json

# List repos that would be synced
pnpm dev list
```

## What Gets Synced

### Secrets
- Encrypted and stored as GitHub Actions secrets
- Values come from `.env` file

### Settings
- Template repo, wiki, issues, projects, discussions
- Merge strategies (squash, rebase, merge commit)
- Branch protection behaviors
- Auto-delete head branches

### Rulesets
- Branch protection rules
- Required status checks
- Pull request requirements

## GitHub Token Scopes

Your PAT needs these scopes:
- `repo` - Full control of private repositories
- `admin:repo_hook` - For rulesets (if using)

## License

MIT
