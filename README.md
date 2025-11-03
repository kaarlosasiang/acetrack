# AceTrack - Attendance Management System

A modern attendance management system built with Node.js, Express, MongoDB, and Next.js.

## Project Structure

This is a monorepo managed with pnpm workspaces:

```
acetrack/
├── api/          # Backend API (Node.js + Express + MongoDB)
└── frontend/     # Frontend App (Next.js + React)
```

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- MongoDB (for local development)

## Installation

### Install pnpm (if not already installed)

```bash
npm install -g pnpm@9
```

### Install Dependencies

From the root directory:

```bash
pnpm install
```

This will install dependencies for all workspaces (api and frontend).

## Development

### Run both apps simultaneously

```bash
pnpm dev
```

### Run individual apps

```bash
# API only
pnpm dev:api

# Frontend only
pnpm dev:frontend
```

The API will run on `http://localhost:5000` and the frontend on `http://localhost:1234`.

## Building

### Build all apps

```bash
pnpm build
```

### Build individual apps

```bash
# API only
pnpm build:api

# Frontend only
pnpm build:frontend
```

## Production

### Start all apps

```bash
pnpm start
```

### Start individual apps

```bash
# API only
pnpm start:api

# Frontend only
pnpm start:frontend
```

## Other Commands

### Linting

```bash
# Lint all workspaces
pnpm lint

# Fix linting issues
pnpm lint:fix
```

### Formatting

```bash
pnpm format
```

### Type Checking

```bash
pnpm typecheck
```

### Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Clean

```bash
# Remove node_modules, dist, and .next from all workspaces
pnpm clean

# Clean and reinstall
pnpm clean:install
```

## Workspace Commands

You can also run commands in specific workspaces:

```bash
# Run any command in the api workspace
pnpm --filter acetrack-api <command>

# Run any command in the frontend workspace
pnpm --filter frontend <command>

# Example: Install a package in the api workspace
pnpm --filter acetrack-api add express-session

# Example: Install a dev dependency in the frontend workspace
pnpm --filter frontend add -D @types/node
```

## Environment Variables

Make sure to set up your environment variables:

- **API**: Create `api/.env` (see API documentation)
- **Frontend**: Create `frontend/.env.local` (see Frontend documentation)

## License

MIT
# Use pnpm for package management
auto-install-peers=true
shamefully-hoist=false
strict-peer-dependencies=false

# Enable shared workspace lockfile
shared-workspace-lockfile=true

# Save exact versions
save-exact=false

# Node linker
node-linker=isolated

