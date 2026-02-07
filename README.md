# AWS Auditor

A full-stack tool for auditing AWS account costs and cleaning up unused resources. Scans across multiple regions, discovers both CloudFormation-managed and loose resources, shows cost breakdowns, and handles dependency-aware deletion with dry-run safety.

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![Vite](https://img.shields.io/badge/Vite-6-646cff)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8)

---

## What it does

```
~/.aws/credentials ──> AWS Auditor ──> Cost breakdown by service
                                   ──> CloudFormation stack discovery
                                   ──> Loose resource detection
                                   ──> Dependency-aware deletion
```

- **Cost Explorer** — pulls last 30 days of spend grouped by service
- **CloudFormation** — discovers all active stacks and their managed resources
- **Resource scanning** — finds EC2, RDS, ELB, EBS, NAT Gateways, Elastic IPs, Lambda, and S3 across 4 regions
- **Managed vs. loose** — tags each resource as CloudFormation-managed or unmanaged
- **Smart deletion** — respects dependency order (terminate EC2 before deleting EBS, delete NAT before releasing EIP, etc.)
- **Dry-run by default** — previews the deletion plan without touching anything

## Quick start

```bash
npm install
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173). The Express API runs on port 3001 and Vite proxies `/api` requests to it automatically.

### Prerequisites

- Node.js 18+
- AWS credentials configured in `~/.aws/credentials`
- Profiles need permissions for Cost Explorer, CloudFormation, EC2, RDS, ELB, Lambda, S3, and STS

## Regions scanned

| Region | Location |
|--------|----------|
| `us-east-1` | N. Virginia |
| `us-east-2` | Ohio |
| `us-west-1` | N. California |
| `us-west-2` | Oregon |

## Architecture

```
aws-auditor/
├── shared/          Shared TypeScript types
├── server/          Express API + AWS SDK v3
│   └── src/
│       ├── routes/          REST + SSE endpoints
│       ├── aws/
│       │   ├── credentials   Profile parser (~/.aws/credentials)
│       │   ├── clients       SDK client factory (cached per profile+region)
│       │   ├── cost-explorer  Cost Explorer queries
│       │   ├── cloudformation Stack discovery
│       │   └── scanners/     Per-service scanners (ec2, rds, elb, ebs, nat, eip, lambda, s3)
│       ├── deletion/
│       │   ├── dependency-graph   Topological sort for safe deletion order
│       │   ├── executor           Runs deletions with SSE progress streaming
│       │   └── strategies/        Per-service deletion logic
│       └── sse/              Server-Sent Events helper
│
└── client/          React + Vite + Tailwind v4
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

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/profiles` | GET | List AWS profiles from credentials file |
| `/api/costs?profile=X` | GET | Cost breakdown (last 30 days) |
| `/api/scan?profile=X` | GET | SSE stream — scans all services/regions |
| `/api/resources?profile=X` | GET | Cached scan results (filterable) |
| `/api/delete` | POST | Start deletion job, returns `{ jobId }` |
| `/api/delete/:jobId` | GET | SSE stream — deletion progress |

### SSE events during scan

```
phase          → cloudformation/services started/completed
stack_found    → individual CF stack discovered
scanning       → service+region scan starting
service_complete → service+region scan finished with count
scan_complete  → all done with totals
```

### SSE events during deletion

```
plan           → ordered steps with dependency info + warnings
dry_run_complete → preview finished (no resources touched)
deleting       → resource deletion in progress
deleted        → resource successfully deleted
delete_failed  → resource deletion failed with error
complete       → all done with success/failure counts
```

## Resource discovery

| Service | What's found | Key fields |
|---------|-------------|------------|
| EC2 | All non-terminated instances | Instance type, IPs, VPC, AZ, tags |
| RDS | DB instances + Aurora clusters | Engine, class, storage, endpoints |
| ELB | ALB, NLB, and Classic LBs | Type, scheme, DNS, AZs |
| EBS | All volumes (flags unattached) | Size, type, IOPS, attachment |
| NAT Gateway | All non-deleted gateways | VPC, subnet, public IP, EIP |
| Elastic IP | All allocations (flags unassociated) | Public IP, association status |
| Lambda | All functions | Runtime, memory, code size, last modified |
| S3 | Buckets in target regions | Creation date, region |
| CloudFormation | Active stacks + all child resources | Stack status, resource count, dates |

## Deletion ordering

Resources are deleted in dependency order to avoid failures:

```
Priority 0  →  CloudFormation stacks (deleted as units, CF handles internal order)
Priority 1  →  EC2 instances, NAT Gateways, Load Balancers, RDS
Priority 2  →  Lambda functions
Priority 3  →  EBS volumes (after EC2), Elastic IPs (after NAT)
Priority 4  →  S3 buckets (emptied first, then deleted)
```

Within each priority tier, deletions run in parallel (up to 3 concurrent).

### Safety

- **Dry-run is on by default** — the UI shows the full plan without executing
- **Confirmation dialog** — requires typing `delete` to proceed
- **Dependency validation** — warns if you're deleting an EBS volume attached to an instance that isn't in the queue
- **S3 warnings** — explicitly warns that bucket contents will be destroyed
- **RDS warnings** — notes that deletion skips the final snapshot

## Stack

**Server:** Express 5, AWS SDK v3, tsx (dev), TypeScript

**Client:** React 19, Vite 6, Tailwind CSS 4, Zustand 5, Lucide React, React Router 7

**Monorepo:** npm workspaces — `shared`, `server`, `client`

## Scripts

```bash
npm run dev        # Start both server and client in dev mode
npm run build      # Build both for production
```

## Adding more services

Each scanner is a standalone module in `server/src/aws/scanners/`. To add a new service:

1. Create `server/src/aws/scanners/yourservice.ts` exporting a `scanYourService(profile, region)` function
2. Add a client factory in `server/src/aws/clients.ts`
3. Register it in `server/src/aws/scanners/index.ts` scanner map
4. Add a deletion strategy in `server/src/deletion/strategies/`
5. Add priority to `server/src/deletion/dependency-graph.ts`
6. Add the service to `server/src/config.ts` `SCANNABLE_SERVICES`

## License

Personal use.
