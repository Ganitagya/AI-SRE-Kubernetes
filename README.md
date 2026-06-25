# AI Kubernetes Troubleshooting Agent

An **on-demand** AI-powered system for diagnosing Kubernetes cluster issues.

## Architecture

```
Frontend (Next.js)
    ↓
FastAPI Backend (Orchestrator)
    ↓
Kubernetes Investigation Layer
    ↓
AI Reasoning (OpenRouter via InsForge)
    ↓
Root Cause + Suggested Fix
```

## Quick Start

```bash
# Start everything
docker compose up --build

# Frontend → http://localhost:3000
# Backend  → http://localhost:8000
# API Docs → http://localhost:8000/docs
```

## Project Structure

```
ai-sre-kubernetes/
├── backend/
│   ├── main.py              # FastAPI entrypoint
│   ├── core/config.py       # Settings / env
│   ├── api/health.py        # GET /health
│   ├── kubernetes/          # K8s investigation layer (placeholder)
│   ├── ai/                  # LLM reasoning layer (placeholder)
│   ├── services/            # Orchestration services (placeholder)
│   └── models/              # Pydantic schemas
├── frontend/
│   ├── app/                 # Next.js App Router
│   ├── components/          # React components
│   ├── services/api.ts      # Axios API client
│   ├── hooks/               # React Query hooks
│   └── types/               # TypeScript types
├── docker-compose.yml
└── README.md
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_MODEL` | LLM model to use |
| `KUBECONFIG_PATH` | Path to kubeconfig |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL |

## Development (without Docker)

```bash
# Backend (requires uv – https://docs.astral.sh/uv/)
cd backend
uv sync
uv run uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## Running against Local Clusters (vcluster, minikube, kind)

If you are running the project via **Docker Compose** and trying to connect to a cluster running locally on your machine (like vcluster, minikube, or kind), your local `kubectl` port-forward must be configured to accept external connections from Docker.

By default, local port-forwards only bind to `127.0.0.1`. You must append `--address 0.0.0.0` when opening the tunnel.

**Example for vcluster:**
```bash
vcluster connect my-vcluster --address 0.0.0.0
```

**Example for standard kubectl:**
```bash
kubectl port-forward svc/my-service 8443:8443 --address 0.0.0.0
```

*Note: You do not need to modify your `~/.kube/config`. The Docker backend automatically translates `localhost` to `host.docker.internal` in memory so it can reach your host machine.*
