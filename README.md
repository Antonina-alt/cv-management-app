# CV App — Resume Management Platform

A web-based recruitment platform. Recruiters define **positions**—customizable resume templates—using a reusable **attribute library**. Candidates maintain their profiles, while a resume for a specific position is **generated automatically** from the candidate’s profile and project data.

Three key features:

1. **Attribute Library** — structured fields that are defined once and reused.
2. **Positions** — resume templates with access rules and project filters.
3. **Automatic Resume Generation** — resume content is assembled from the candidate’s attributes and projects instead of being stored as a separate copy.

## Tech Stack

| Layer        | Technologies                                       |
| ------------ | -------------------------------------------------- |
| Client       | React 19, Vite, Bootstrap                          |
| Server       | Node.js (ESM), Express 5, Prisma 7 ORM             |
| Database     | PostgreSQL                                         |
| File Storage | Azure Blob Storage (Azurite for local development) |

## Repository Structure

```text
client/            React SPA (Vite)
server/            Express API + Prisma
  prisma/          schema.prisma + migrations
  routes/          HTTP routes
  lib/prisma.js    centralized database access
docker-compose.yml PostgreSQL + Azurite
```

## Environment Requirements

The following tools must be available in the command line environment:

| Tool                               | Version               | Verification Command                  | Purpose                                     |
| ---------------------------------- | --------------------- | ------------------------------------- | ------------------------------------------- |
| **Node.js**                        | ≥ 20.19 (LTS)         | `node -v`                             | Server (Express/Prisma) and client (Vite)   |
| **npm**                            | Included with Node.js | `npm -v`                              | Installing dependencies and running scripts |
| **Docker** + **Docker Compose v2** | Any recent version    | `docker -v`, `docker compose version` | Infrastructure: PostgreSQL + Azurite        |
| **Git**                            | Any recent version    | `git --version`                       | Version control                             |

Optional tools that may be useful for manual verification:

* `psql` or Prisma Studio (`npx prisma studio`) — inspect the database without a separate GUI client.
* `az` (Azure CLI) — inspect blobs stored in Azurite (`az storage blob list ...`).

Node.js can be installed directly from [nodejs.org](https://nodejs.org) or through a version manager such as nvm, Volta, or fnm. The important requirement is that `node` and `npm` are available in the `PATH` of a regular terminal, not only inside the IDE.

## Environment Verification

Before starting, verify that all required tools are installed and available in `PATH`:

```bash
node -v              # >= v20.19
npm -v
git --version
docker -v
docker compose version
```

All commands should run without returning a `command not found` error.

You can also verify that the Docker daemon is running, rather than merely installed:

```bash
docker info > /dev/null && echo "Docker daemon OK"
```

## Quick Start — Local Development

The application—the client and server—is run **locally without Docker**. Docker is used only for the infrastructure components: PostgreSQL and Azurite.

```bash
# 1. Start the infrastructure
docker compose up -d

# 2. Configure environment variables
cp .env.example server/.env        # fill in the required values

# 3. Start the server
cd server
npm install
npx prisma migrate dev
npx prisma generate
npm run dev                         # http://localhost:5050
curl http://localhost:5050/api/health   # {"status":"ok"}

# 4. Start the client in another terminal
cd client
npm install
npm run dev                         # http://localhost:5173
```

> The default value of `PORT` is `5050`. To use a different port, update it in `server/.env`.
