# Smart-Proctor

Smart-Proctor is an AI-assisted online assessment platform focused on identity assurance, role-based exam workflows, and proctoring-aware online exams.

## What Is In This Repo

The project currently contains three active applications plus Kubernetes infrastructure:

- `client/`: React + TypeScript + Vite frontend with separate student, lecturer, and admin dashboard flows
- `auth/`: Node.js + Express + TypeScript authentication service with MongoDB persistence and JWT cookie sessions
- `exam/`: Node.js + Express + TypeScript exam service for courses, exam creation, exam sessions, submissions, and proctoring events
- `infra/k8s/`: Kubernetes manifests for the services, MongoDB instances, NATS Streaming, and ingress
- `skaffold.yaml`: local Kubernetes dev workflow for build, deploy, and file sync

## Current Product Areas

### Frontend

The client currently includes:

- signup and login flows
- face registration during onboarding
- role-based dashboards for `student`, `lecturer`, and `admin`
- student pages for courses, exams, results, settings, profile face ID, and live exam sessions
- lecturer pages for creating exams, reviewing exams, monitoring sessions, reports, and student management
- admin pages for overview, users, institutions, logs, analytics, and settings

### Auth Service

The auth service is responsible for:

- user signup, signin, signout, and current-user lookup
- password hashing
- JWT session cookie issuance
- MongoDB user storage
- publishing user-created events to NATS

Primary routes:

- `POST /api/users/signup`
- `POST /api/users/signin`
- `POST /api/users/signout`
- `GET /api/users/currentuser`

### Exam Service

The exam service is responsible for:

- course creation and course registration
- exam creation and listing
- optional generated-question workflows
- exam session start and retrieval
- exam submission and exam expiration
- proctoring event reporting and review

Primary routes:

- `POST /api/exams`
- `GET /api/exams`
- `POST /api/exams/:examId/start`
- `GET /api/exams/:examId/session`
- `POST /api/exams/:examId/submit`
- `POST /api/exams/:examId/expire`
- `GET /api/exams/courses`
- `POST /api/exams/courses`
- `POST /api/exams/courses/:courseId/register`
- `POST /api/exams/generate-questions`
- `POST /api/exams/proctoring/events`
- `GET /api/exams/proctoring/events`

## Architecture Overview

- The frontend runs as the main user-facing application.
- `auth` and `exam` are independent Express services.
- Each backend service uses its own MongoDB database.
- NATS Streaming is used for service-to-service eventing.
- Kubernetes ingress routes `/api/users/*` to auth, `/api/exams/*` to exam, and the rest to the frontend.

## Project Structure

```text
Smart-Proctor/
  auth/               # Auth microservice (Express + TS + Mongo + NATS)
  client/             # Frontend (React + Vite + Chakra UI)
  exam/               # Exam microservice (courses, exams, sessions, proctoring)
  infra/k8s/          # Kubernetes manifests
  skaffold.yaml       # Skaffold config for iterative K8s development
```

## Prerequisites

Install the following:

- Node.js 20+ and npm
- Docker
- Kubernetes cluster such as Minikube or Docker Desktop Kubernetes
- `kubectl`
- `skaffold`
- `ingress-nginx` in your cluster

## Run The Frontend Only

```bash
cd client
npm install
npm run dev
```

Default dev server: `http://localhost:5173`

Optional frontend environment variables:

- `VITE_PROXY_TARGET`: Vite proxy target, defaults to `http://localhost:3000`
- `VITE_AUTH_API_BASE_URL`: overrides auth API base URL
- `VITE_EXAM_API_BASE_URL`: overrides exam API base URL

## Run Backend Services Locally Without Kubernetes

Both backend services require MongoDB, NATS Streaming, and a shared `JWT_SECRET`.

### 1. Start shared dependencies

```bash
docker run -d --name smart-proctor-nats -p 4222:4222 -p 8222:8222 \
  nats-streaming:0.17.0 -p 4222 -m 8222 -hbi 5s -hbt 5s -hbf 2 -SD -cid smart-proctor-nats
```

### 2. Start the auth service

```bash
cd auth
npm install

export JWT_SECRET=replace_me
export MONGO_URI='mongodb+srv://<username>:<password>@abbadanmusa.sahh1ix.mongodb.net/?appName=abbaDanmusa'
export MONGO_DB_NAME=auth
export NATS_CLIENT_ID=auth-local
export NATS_URL=http://127.0.0.1:4222
export NATS_CLUSTER_ID=smart-proctor-nats

npm run dev
```

Auth API base: `http://localhost:3000`

### 3. Start the exam service

```bash
cd exam
npm install

export JWT_SECRET=replace_me
export MONGO_URI='mongodb+srv://<username>:<password>@abbadanmusa.sahh1ix.mongodb.net/?appName=abbaDanmusa'
export MONGO_DB_NAME=exam
export NATS_CLIENT_ID=exam-local
export NATS_URL=http://127.0.0.1:4222
export NATS_CLUSTER_ID=smart-proctor-nats
export PORT=3001

npm run dev
```

Exam API base: `http://localhost:3001`

## Run The Full Stack With Skaffold And Kubernetes

Skaffold currently builds and deploys:

- `abbadanmusa/smart-proctor-auth`
- `abbadanmusa/smart-proctor-exam`
- `abbadanmusa/smart-proctor-client`

### 1. Create required Kubernetes secrets

```bash
kubectl create secret generic auth-secret --from-literal=JWT_SECRET=replace_me
kubectl create secret generic auth-mongo-secret --from-literal=MONGO_URI='mongodb+srv://<username>:<password>@abbadanmusa.sahh1ix.mongodb.net/?appName=abbaDanmusa'
kubectl create secret generic exam-mongo-secret --from-literal=MONGO_URI='mongodb+srv://<username>:<password>@abbadanmusa.sahh1ix.mongodb.net/?appName=abbaDanmusa'
```

If they already exist and you want to recreate them:

```bash
kubectl delete secret auth-secret auth-mongo-secret exam-mongo-secret --ignore-not-found
kubectl create secret generic auth-secret --from-literal=JWT_SECRET=replace_me
kubectl create secret generic auth-mongo-secret --from-literal=MONGO_URI='mongodb+srv://<username>:<password>@abbadanmusa.sahh1ix.mongodb.net/?appName=abbaDanmusa'
kubectl create secret generic exam-mongo-secret --from-literal=MONGO_URI='mongodb+srv://<username>:<password>@abbadanmusa.sahh1ix.mongodb.net/?appName=abbaDanmusa'
```

### 2. Start the Skaffold dev loop

```bash
skaffold dev
```

Current Skaffold behavior:

- builds auth, exam, and client images
- deploys all manifests in `infra/k8s/*`
- syncs `auth/src/**/*.ts` and `exam/src/**/*.ts` into running containers during development

### 3. Configure ingress host mapping

Current ingress uses host `smartproctor.dev`.

Add this to `/etc/hosts`:

```text
127.0.0.1 smartproctor.dev
```

Then access:

- frontend: `http://smartproctor.dev`
- auth routes: `http://smartproctor.dev/api/users/signup`
- exam routes: `http://smartproctor.dev/api/exams`

## Useful Commands

```bash
# Frontend
cd client && npm run build
cd client && npm run lint

# Auth service
cd auth && npm run build
cd auth && npm run test:ci

# Exam service
cd exam && npm run build
cd exam && npm run test:ci
```

## Notes

- Auth listens on port `3000`; exam listens on port `3001` by default.
- Both backend services expect the same `JWT_SECRET`.
- Both backend services can share the same Atlas `MONGO_URI`; `MONGO_DB_NAME` keeps their data separated by service name.
- Some tests use `mongodb-memory-server`; restricted environments may block required process or port operations.
- `dist/` folders are committed in the repo, so service source and built output both exist.
- If you publish images from a different registry account, update `skaffold.yaml` and the Kubernetes manifests accordingly.

## Suggested Repository Description

AI-driven smart proctoring platform with a React/Vite frontend, Node.js auth and exam microservices, MongoDB persistence, NATS eventing, and Kubernetes/Skaffold local development.
