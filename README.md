# Smart-Proctor

Smart-Proctor is an AI-assisted online assessment platform focused on identity assurance and exam integrity.

The project currently includes:
- `client/`: React + TypeScript + Vite frontend (signup/login flows, onboarding with face capture)
- `auth/`: Node.js + Express + TypeScript authentication service (JWT, MongoDB, NATS event publishing)
- `infra/`: Kubernetes manifests (Auth API, MongoDB, NATS Streaming, ingress)
- `skaffold.yaml`: Local Kubernetes development workflow for continuous build/deploy

## Architecture Overview

- Frontend (`client`) serves the user-facing UI.
- Auth service (`auth`) handles signup/signin, password hashing, JWT session issuance, and publishes `UserCreated` events to NATS.
- MongoDB persists user data.
- NATS Streaming supports event-driven integration with other services.
- Kubernetes manifests in `infra/k8s` define deployments/services/ingress.

## Prerequisites

Install the following tools:
- Node.js 20+ and npm
- Docker
- Kubernetes cluster (Minikube, Docker Desktop K8s, or similar)
- `kubectl`
- `skaffold`
- `ingress-nginx` controller in your local cluster

## Project Structure

```text
Smart-Proctor/
  auth/               # Auth microservice (Express + TS + Mongo + NATS)
  client/             # Frontend (React + Vite + Chakra UI)
  infra/k8s/          # K8s manifests
  skaffold.yaml       # Skaffold config for iterative K8s dev
```

## 1) Run Frontend Only (client)

```bash
cd client
npm install
npm run dev
```

Default dev server: `http://localhost:5173`

## 2) Run Auth Service Only (without Kubernetes)

Auth service requires MongoDB and NATS. You can run dependencies via Docker and then run auth locally.

### 2.1 Start dependencies (example)

```bash
# MongoDB

docker run -d --name smart-proctor-mongo -p 27017:27017 mongo:5.0.19

# NATS Streaming

docker run -d --name smart-proctor-nats -p 4222:4222 -p 8222:8222 \
  nats-streaming:0.17.0 -p 4222 -m 8222 -hbi 5s -hbt 5s -hbf 2 -SD -cid smart-proctor-nats
```

### 2.2 Start auth service

```bash
cd auth
npm install

export JWT_SECRET=replace_me
export MONGO_URI=mongodb://127.0.0.1:27017/auth
export NATS_CLIENT_ID=auth-local
export NATS_URL=http://127.0.0.1:4222
export NATS_CLUSTER_ID=smart-proctor-nats

npm run dev
```

Auth API base: `http://localhost:3000`

## 3) Run Full Stack with Skaffold + Kubernetes

Skaffold file currently builds/deploys the auth service and applies manifests from `infra/k8s/*`.

### 3.1 Create required Kubernetes secrets

```bash
kubectl create secret generic auth-secret --from-literal=JWT_SECRET=replace_me
kubectl create secret generic auth-mongo-secret --from-literal=MONGO_URI=mongodb://auth-mongo-srv:27017/auth
```

### 3.2 Start Skaffold dev loop

```bash
skaffold dev
```

Skaffold behavior:
- Builds image: `abbadanmusa/smart-proctor-auth`
- Deploys all manifests under `infra/k8s/*`
- Syncs changes from `auth/src/**/*.ts` into the running container

### 3.3 Ingress host mapping

Current ingress uses host `smartproctor.dev`.
Add this to `/etc/hosts`:

```text
127.0.0.1 smartproctor.dev
```

Then access API routes like:
- `http://smartproctor.dev/api/users/signup`

## Useful Commands

```bash
# Frontend build
cd client && npm run build

# Auth build
cd auth && npm run build

# Auth tests
cd auth && npm run test:ci

# Stop skaffold
# Ctrl+C in the skaffold terminal
```

## Notes

- Some auth tests use `mongodb-memory-server`; in restricted/sandboxed environments, port binding may fail.
- The `client-1/` directory is not part of the active app in this repo root workflow.
- Update image name/registry in `skaffold.yaml` if publishing from another Docker Hub or container registry account.

## Repository Description (suggested)

AI-driven smart proctoring platform with a React/Vite frontend, Node.js auth microservice, MongoDB persistence, NATS eventing, and Kubernetes/Skaffold local-dev workflow.
