# ☁️ AWS Auditor

> A gorgeous full-stack tool for auditing AWS account costs and cleaning up unused resources.

Scans across multiple regions, discovers both CloudFormation-managed and loose resources, shows cost breakdowns, caches results in SQLite, and handles dependency-aware deletion with dry-run safety.

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![Vite](https://img.shields.io/badge/Vite-6-646cff)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

- **💰 Cost Explorer** — last 30 days of spend grouped by service, cached to avoid repeat API calls
- **🏗️ CloudFormation** — discovers all active stacks and their managed resources
- **🔍 Resource Scanning** — 14 AWS services across 4 US regions with live SSE progress
- **🏷️ Managed vs. Loose** — tags each resource as CloudFormation-managed or unmanaged
- **🧠 Smart Deletion** — respects dependency order (terminate EC2 before deleting EBS, etc.)
- **🛡️ Dry-Run by Default** — previews the deletion plan without touching anything
- **💾 SQLite Cache** — scan results and costs persist across restarts, instant profile switching
- **🔄 Profile Switching** — switch AWS profiles and see cached data immediately
- **🌙 Dark Theme** — gorgeous dark UI built with Tailwind CSS v4

## 🚀 Quick Start

```bash
git clone https://github.com/youruser/aws-auditor.git
cd aws-auditor
npm install
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173). The Express API runs on port 3001 and Vite proxies `/api` requests automatically.

### 📋 Prerequisites

- **Node.js 18+**
- **AWS credentials** in `~/.aws/credentials` and/or `~/.aws/config`
- Profiles need permissions for: Cost Explorer, CloudFormation, EC2, RDS, ELB, Lambda, S3, STS, DynamoDB, CloudWatch, SNS, SQS, API Gateway

## 🌎 Regions Scanned

| Region | Location |
|--------|----------|
| `us-east-1` | N. Virginia |
| `us-east-2` | Ohio |
| `us-west-1` | N. California |
| `us-west-2` | Oregon |

## 🔎 Services Scanned

| Service | What's Found | Icon |
|---------|-------------|------|
| **EC2** | All non-terminated instances | 🖥️ |
| **RDS** | DB instances + Aurora clusters | 🗄️ |
| **ELB** | ALB, NLB, and Classic LBs | 🌐 |
| **EBS** | All volumes (flags unattached) | 💾 |
| **NAT Gateway** | All non-deleted gateways | 🔀 |
| **Elastic IP** | All allocations (flags unassociated) | 📍 |
| **Lambda** | All functions | ⚡ |
| **S3** | Buckets in target regions | 📦 |
| **DynamoDB** | All tables with throughput info | 📊 |
| **VPC** | VPCs, subnets, security groups, IGWs, route tables | 🔗 |
| **CloudWatch** | Log groups + metric alarms | 📈 |
| **SNS** | All topics with subscription counts | 🔔 |
| **SQS** | All queues with message counts | 💬 |
| **API Gateway** | REST APIs + HTTP/WebSocket APIs | 🔌 |
| **CloudFormation** | Active stacks + all child resources | 📐 |

## 🏗️ Architecture

```
aws-auditor/
├── shared/           Shared TypeScript types
├── server/           Express API + AWS SDK v3
│   └── src/
│       ├── routes/          REST + SSE endpoints
│       ├── aws/
│       │   ├── credentials   Profile parser (~/.aws/credentials + config)
│       │   ├── clients       SDK client factory (cached per profile+region)
│       │   ├── cost-explorer  Cost Explorer queries
│       │   ├── cloudformation Stack discovery
│       │   └── scanners/     Per-service scanners (14 services)
│       ├── db/              SQLite cache (better-sqlite3)
│       ├── deletion/
│       │   ├── dependency-graph   Topological sort for safe deletion order
│       │   ├── executor           Runs deletions with SSE progress
│       │   └── strategies/        Per-service deletion logic (14 strategies)
│       └── sse/              Server-Sent Events helper
│
└── client/           React + Vite + Tailwind v4
    └── src/
        ├── stores/          Zustand (profile, cost, scan, deletion, log)
        ├── hooks/           useScan, useDeletion (SSE consumers)
        ├── components/
        │   ├── dashboard/   Cost chart, scan summary cards
        │   ├── resources/   Filterable table, detail panel
        │   ├── deletion/    Queue, preview, live progress
        │   └── logs/        Activity feed
        └── pages/           Dashboard, Resources, Deletion, Logs
```

## 📡 API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/profiles` | GET | List AWS profiles from credentials/config |
| `/api/costs?profile=X` | GET | Cost breakdown (cached, `?refresh=true` to force) |
| `/api/scan?profile=X` | GET | SSE stream — scans all services/regions |
| `/api/resources?profile=X` | GET | Cached scan results (filterable) |
| `/api/delete` | POST | Start deletion job, returns `{ jobId }` |
| `/api/delete/:jobId` | GET | SSE stream — deletion progress |

## ⚡ Deletion Ordering

Resources are deleted in dependency order to avoid failures:

```
Priority 0  →  CloudFormation stacks (CF handles internal order)
Priority 1  →  EC2, NAT Gateways, Load Balancers, RDS
Priority 2  →  Lambda, DynamoDB, SNS, SQS, API Gateway, CloudWatch alarms
Priority 3  →  EBS volumes, Elastic IPs, CloudWatch log groups
Priority 4  →  Subnets, Route Tables, Internet Gateways, Security Groups
Priority 5  →  S3 buckets (emptied first)
Priority 6  →  VPCs (after all dependent resources)
```

Within each priority tier, deletions run in parallel (up to 3 concurrent).

## 🛡️ Safety

- **Dry-run ON by default** — shows the full plan without executing
- **Confirmation dialog** — requires typing `delete` to proceed
- **Dependency validation** — warns about attached EBS volumes, missing dependencies
- **S3 warnings** — explicitly warns that bucket contents will be destroyed
- **RDS warnings** — notes that deletion skips the final snapshot
- **DynamoDB warnings** — warns about permanent data loss
- **VPC warnings** — warns about dependent resource cleanup
- **Default SG protection** — blocks deletion of default security groups

## 💾 Caching

Scan results and cost data are cached in SQLite (`~/.aws-auditor/cache.db`):

- **Instant profile switching** — switch profiles and see previously scanned data immediately
- **Persistent across restarts** — no need to re-scan after server restart
- **Costs cached** — avoids repeat Cost Explorer API calls (use `?refresh=true` to force)
- **Auto-warm** — SQLite results are loaded into memory on first access

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Server** | Express 5, AWS SDK v3, better-sqlite3, tsx |
| **Client** | React 19, Vite 6, Tailwind CSS 4, Zustand 5 |
| **Icons** | Lucide React |
| **Routing** | React Router 7 |
| **Monorepo** | npm workspaces |

## 📜 Scripts

```bash
npm run dev        # Start both server (3001) and client (5173) in dev mode
npm run build      # Build both for production
```

## 🔧 Adding More Services

Each scanner is a standalone module. To add a new service:

1. Create `server/src/aws/scanners/yourservice.ts` exporting a scan function
2. Add a client factory in `server/src/aws/clients.ts`
3. Register it in `server/src/aws/scanners/index.ts` scanner map
4. Add a deletion strategy in `server/src/deletion/strategies/`
5. Add priority to `server/src/deletion/dependency-graph.ts`
6. Add the service type to `shared/types.ts` and `server/src/config.ts`
7. Add icon + color in `client/src/components/shared/ServiceIcon.tsx` and `client/src/index.css`

## 🔒 Security

- **No secrets in the codebase** — reads AWS credentials from `~/.aws/credentials` at runtime
- **No .env required** — all configuration comes from AWS credential files
- **SQLite cache** contains only resource metadata and cost data (no credentials)
- The `.gitignore` excludes all `.db`, `.sqlite`, and `.env` files

## 📄 License

MIT
