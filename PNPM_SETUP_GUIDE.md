# pnpm Workspace Setup Guide

This document explains the pnpm monorepo setup for the AceTrack project.

## 📦 What Was Set Up

### 1. Workspace Configuration

**File: `pnpm-workspace.yaml`**
Defines the workspace packages (api and frontend).

**File: `package.json` (root)**
Contains workspace-level scripts and configuration.

**File: `.npmrc`**
Configures pnpm behavior for the workspace.

### 2. Package Manager Configuration

Both `api/package.json` and `frontend/package.json` now have:
```json
{
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

This ensures everyone uses the same package manager version.

## 🚀 Quick Start

### Install Dependencies

From the root directory:
```bash
pnpm install
```

This will install dependencies for all workspace packages in one command.

### Development

Run both applications:
```bash
pnpm dev
```

Or run them individually:
```bash
pnpm dev:api       # API only (http://localhost:5000)
pnpm dev:frontend  # Frontend only (http://localhost:1234)
```

## 📝 Available Commands

### Root Level Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run both API and frontend in parallel |
| `pnpm dev:api` | Run only the API |
| `pnpm dev:frontend` | Run only the frontend |
| `pnpm build` | Build both applications |
| `pnpm build:api` | Build only the API |
| `pnpm build:frontend` | Build only the frontend |
| `pnpm start` | Start both applications in production |
| `pnpm start:api` | Start only the API in production |
| `pnpm start:frontend` | Start only the frontend in production |
| `pnpm lint` | Lint all workspaces |
| `pnpm lint:fix` | Fix linting issues in all workspaces |
| `pnpm format` | Format code in all workspaces |
| `pnpm typecheck` | Type check all TypeScript files |
| `pnpm test` | Run API tests |
| `pnpm test:watch` | Run API tests in watch mode |
| `pnpm clean` | Remove node_modules, dist, and .next |
| `pnpm clean:install` | Clean and reinstall everything |

### Workspace-Specific Commands

You can run commands in specific workspaces using the `--filter` flag:

```bash
# Install a package in the API
pnpm --filter acetrack-api add <package-name>

# Install a dev dependency in the frontend
pnpm --filter frontend add -D <package-name>

# Run a custom script in a workspace
pnpm --filter acetrack-api run <script-name>
```

## 🏗️ Workspace Structure

```
acetrack/
├── pnpm-workspace.yaml    # Workspace configuration
├── package.json           # Root workspace scripts
├── .npmrc                 # pnpm configuration
├── pnpm-lock.yaml         # Unified lockfile for all packages
├── node_modules/          # Shared dependencies
├── api/                   # Backend workspace
│   ├── package.json
│   └── src/
└── frontend/              # Frontend workspace
    ├── package.json
    └── src/
```

## 💡 Benefits of pnpm Workspaces

1. **Fast Installation**: pnpm uses a content-addressable filesystem to store packages once and hard-link them to node_modules.
2. **Disk Space Efficiency**: Shared dependencies are stored once, not duplicated across workspaces.
3. **Strict Mode**: Better dependency isolation prevents phantom dependencies.
4. **Unified Lockfile**: One lockfile for the entire monorepo ensures consistency.
5. **Simple Commands**: Run commands across all workspaces or target specific ones.

## 🔧 Advanced Usage

### Installing Dependencies

```bash
# Install in all workspaces
pnpm install

# Install in a specific workspace
pnpm --filter acetrack-api install

# Add a dependency to a specific workspace
pnpm --filter acetrack-api add express-session

# Add a dev dependency
pnpm --filter frontend add -D @types/jest

# Add a dependency to all workspaces
pnpm add -w lodash
```

### Running Scripts

```bash
# Run a script in all workspaces
pnpm -r <script-name>

# Run a script in a specific workspace
pnpm --filter acetrack-api <script-name>

# Run scripts in parallel
pnpm --parallel <script-name>

# Run scripts in parallel with output
pnpm --parallel --stream <script-name>
```

### Removing Dependencies

```bash
# Remove from a specific workspace
pnpm --filter acetrack-api remove <package-name>

# Remove from all workspaces
pnpm -r remove <package-name>
```

## 🐛 Troubleshooting

### Problem: "Cannot find module" errors

**Solution**: Run `pnpm install` from the root directory.

### Problem: Different versions across workspaces

**Solution**: Use the `pnpm-lock.yaml` to ensure consistent versions.

### Problem: Phantom dependencies

**Solution**: pnpm's strict mode prevents this by default. Make sure packages are explicitly listed in package.json.

### Problem: Cache issues

**Solution**: Clear the pnpm cache:
```bash
pnpm store prune
```

### Problem: Need to start fresh

**Solution**: Use the clean and reinstall command:
```bash
pnpm clean:install
```

## 📚 Further Reading

- [pnpm Documentation](https://pnpm.io/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [pnpm CLI](https://pnpm.io/cli/install)

## 🎯 Best Practices

1. **Always run `pnpm install` from the root** to maintain workspace integrity.
2. **Use `--filter` for workspace-specific operations** to avoid affecting other packages.
3. **Commit `pnpm-lock.yaml`** to version control for reproducible builds.
4. **Use workspace scripts** (from root package.json) for common operations.
5. **Keep pnpm version consistent** across the team using `packageManager` field.

## 📝 Notes

- The workspace uses pnpm v9.0.0 as specified in the `packageManager` field.
- Node.js >= 20.0.0 is required.
- Both applications can share dependencies when appropriate, reducing installation time and disk space.

