# News RAG API

Industry-standard backend implementing a Retrieval Augmented Generation (RAG) API over news content using Node.js, Express, Qdrant, Redis, PostgreSQL, BullMQ, Hugging Face embeddings, and Google Gemini.

This README is structured to satisfy the requested deliverables and evaluation criteria (architecture, Docker, API docs, demo guidance, and RAG quality notes).

## Quickstart (Docker)

1. Create your environment file:

macOS/Linux: `cp .env.example .env`

Windows (PowerShell): `Copy-Item .env.example .env`

1. Edit `.env` and set `HF_API_KEY` + `GOOGLE_API_KEY`.
1. Start the full stack:

```bash
docker-compose up --build
```

API will be on `http://localhost:3000`.

## Key Features

- RAG chat endpoint grounded on ingested news.
- Asynchronous ingestion via BullMQ so the API stays responsive.
- Vector search with Qdrant (cosine distance, size 384).
- Short-term chat memory in Redis; long-term logs in Postgres.
- Input validation with Joi and global rate limiting.
- Containerized with Docker Compose for one-command bring-up.
- Postman collection included for quick API testing.

## Architecture

```mermaid
graph TD
  Client[Client / Postman]

  subgraph "News RAG API - Node.js + Express"
    Server[src/server.js]
    App[src/app.js]
    Router[src/routes/index.js]
    IngestCtrl[src/controllers/ingestController.js]
    ChatCtrl[src/controllers/chatController.js]
    HistoryCtrl[src/controllers/historyController.js]
    Queue[BullMQ Queue: ingest-news]
    Worker[BullMQ Worker in-process]
  end

  Redis[Redis]
  Qdrant[Qdrant Vector DB]
  Postgres[PostgreSQL]
  HF[Hugging Face Router Embeddings]
  Gemini[Google Gemini LLM]

  Server --> App
  App --> Router
  App --> Redis
  App --> Postgres
  App --> Qdrant

  Client --> Router
  Router --> IngestCtrl
  Router --> ChatCtrl
  Router --> HistoryCtrl

  IngestCtrl --> Queue
  Queue --> Redis
  Worker --> Redis
  Worker --> HF
  Worker --> Qdrant

  ChatCtrl --> HF
  ChatCtrl --> Qdrant
  ChatCtrl --> Redis
  ChatCtrl --> Gemini
  ChatCtrl --> Postgres

  HistoryCtrl --> Postgres
  HistoryCtrl --> Redis
```

## Visual Flow By Sequence Diagram

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'background': '#0d1117',
    'primaryColor': '#0d1117',
    'secondaryColor': '#161b22',
    'tertiaryColor': '#161b22',
    'primaryTextColor': '#e6edf3',
    'secondaryTextColor': '#e6edf3',
    'tertiaryTextColor': '#e6edf3',
    'lineColor': '#30363d',
    'signalColor': '#e6edf3',
    'signalTextColor': '#e6edf3',
    'actorBkg': '#0d1117',
    'actorBorder': '#30363d',
    'actorTextColor': '#e6edf3',
    'activationBkgColor': '#161b22',
    'activationBorderColor': '#30363d',
    'noteBkgColor': '#161b22',
    'noteTextColor': '#e6edf3',
    'noteBorderColor': '#30363d'
  }
}}%%
sequenceDiagram
  participant Client
  participant API as Express API
  participant Redis as Redis (Queue + Cache)
  participant Worker as BullMQ Worker
  participant HF as HuggingFace Embeddings
  participant Qdrant as Qdrant Vector DB
  participant Gemini as Google Gemini LLM
  participant PG as Postgres DB

  rect rgb(13,17,23)
  Note over API: Startup
  API->>API: initServices()
  API->>PG: connectDB() + ensure interactions table
  API->>Redis: connectRedis()
  API->>Qdrant: initCollection(news, size=384, cosine)
  end

  rect rgb(22,27,34)
  Note over Client,API: Ingestion Request
  Client->>API: POST /api/ingest { data[] }
  API->>API: validateRequest(schemas.ingest)
  API->>Redis: enqueue ingest-job
  API-->>Client: 202 Accepted (job queued)

  Note over Worker: Background Processing
  Worker->>Redis: receive ingest-job
  Worker->>Worker: processIngestion(data)
  loop for each article
    Worker->>HF: getEmbedding(content)
    HF-->>Worker: 384-d vector
  end
  Worker->>Qdrant: upsertPoints(points)
  Worker-->>Worker: job completed
  end

  rect rgb(22,27,34)
  Note over Client,API: Chat Request
  Client->>API: POST /api/chat { session_id, query }
  API->>API: validateRequest(schemas.chat)
  API->>HF: getEmbedding(query)
  HF-->>API: query vector
  API->>Qdrant: searchPoints(vector, k=3)
  Qdrant-->>API: top matches (payload.text)
  API->>Redis: lRange(session_id, 0, 4)
  Redis-->>API: last 5 messages
  API->>Gemini: generateAnswer(context + history, query)
  Gemini-->>API: answer text
  API->>PG: INSERT interaction
  API->>Redis: lPush + lTrim (update history)
  API-->>Client: { answer, sources, sessionId }
  end

  rect rgb(13,17,23)
  Note over Client,API: History Endpoints
  Client->>API: GET /api/history/:sessionId
  API->>PG: SELECT interactions
  PG-->>API: rows
  API-->>Client: history list

  Client->>API: DELETE /api/history/:sessionId
  API->>Redis: del(sessionId)
  API->>PG: DELETE interactions
  API-->>Client: { message: "History cleared" }
  end
```

## Tech Stack

- **Backend**: Node.js + Express
- **Vector DB**: Qdrant (cosine, 384-d)
- **LLM**: Google Gemini
- **Database**: PostgreSQL (interaction logs)
- **Cache/Queue**: Redis (BullMQ + chat memory)
- **Embeddings**: Hugging Face (BAAI/bge-small-en-v1.5 via router)

## Prerequisites

- Docker & Docker Compose
- Google Gemini API Key
- HuggingFace API Key

## Deliverables Checklist

- **Public repo**: Clean modular structure (controllers, services, middleware, db, queues, workers).
- **README**: Local + Docker run instructions, endpoints, and demo steps.
- **Docker**: `docker-compose.yml` starts API + Redis + Postgres + Qdrant in one command.
- **API docs**: Postman collection `postman_collection.json` included (import into Postman). Swagger UI not included.
- **Demo video**: ≤5 min showing Docker start, ingest/chat, Gemini responses, and Postgres `interactions` logs.
- **Live deploy (optional)**: Notes included below (Render/Railway/AWS).

## Environment Variables

See `.env.example`:

```env
PORT=3000
DATABASE_URL=postgres://postgres:postgres@postgres:5432/news_rag
REDIS_URL=redis://redis:6379
QDRANT_URL=http://qdrant:6333
HF_API_KEY=your_huggingface_api_key_here
GOOGLE_API_KEY=your_gemini_api_key_here
```

When running the API on your laptop (not inside Docker Compose), use `localhost` hostnames for Postgres/Redis/Qdrant (see Option B).

## Setup & Running

### Why you saw `ENOTFOUND redis`

You ran `npm run dev` (Node runs on your laptop), but your `.env` used Docker service hostnames like `redis` and `postgres`.

- `REDIS_URL=redis://redis:6379` works **only inside Docker Compose network** (Docker DNS resolves `redis`).
- On your laptop, there is no hostname called `redis`, so Node throws: `getaddrinfo ENOTFOUND redis`.

For local runs, use `localhost` in URLs.

### Option A (Recommended): Run everything with Docker Compose

1. Create `.env` from `.env.example` and set your API keys:

```env
PORT=3000
DATABASE_URL=postgres://postgres:postgres@postgres:5432/news_rag
REDIS_URL=redis://redis:6379
QDRANT_URL=http://qdrant:6333
HF_API_KEY=your_huggingface_api_key_here
GOOGLE_API_KEY=your_gemini_api_key_here
```

1. Start the full stack (API + Postgres + Redis + Qdrant):

```bash
docker-compose up --build
```

Alternative (detached):

```bash
npm run docker:up
```

Services:

- API: `http://localhost:3000`
- Qdrant: `http://localhost:6333`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

Stop:

```bash
docker-compose down
```

### Option B: Run API locally, run Postgres/Redis/Qdrant in Docker (Best for local development)

1. Start only dependencies:

```bash
docker-compose up -d postgres redis qdrant
```

1. Update your `.env` to use **localhost**:

```env
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/news_rag
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333
HF_API_KEY=your_huggingface_api_key_here
GOOGLE_API_KEY=your_gemini_api_key_here
```

1. Run the API:

```bash
npm install
npm run dev
```

Stop dependencies:

```bash
docker-compose down
```

### Option C: Run everything locally (no Docker)

1. Install and run services locally:

- Postgres (create DB `news_rag`)
- Redis
- Qdrant

1. Set `.env` to localhost URLs (same as Option B)

1. Run:

```bash
npm install
npm run dev
```

## API Docs

- Postman collection: `postman_collection.json` (import into Postman → **File → Import**)
- Swagger UI: not included (Postman collection is the canonical API documentation for this project)

## RAG Implementation Notes

- **Embeddings**: Hugging Face Inference Router using `BAAI/bge-small-en-v1.5` (384-d vectors).
- **Vector DB**: Qdrant collection `news` configured for cosine similarity (size 384).
- **Retrieval**: top-$k=3$ nearest neighbors for each chat query.
- **Prompting**: Gemini receives (a) the last 5 messages from Redis and (b) retrieved news snippets; if insufficient context, it is instructed to answer: “I don't have enough information.”
- **Tradeoffs (kept simple intentionally)**: one vector per article (no chunking); you can improve recall by chunking long articles before embedding.

## API Endpoints

### 1. Ingest News

- **URL**: `POST /api/ingest`
- **Description**: Enqueues an ingestion job (BullMQ). If `data` is omitted or empty, the worker falls back to `mock-data/news.json`.
- **Body** (optional):

  ```json
  {
    "data": [
      { "title": "Bitcoin hits $50k", "content": "...", "source": "CryptoNews" }
    ]
  }
  ```

  Returns `202 Accepted` when job is queued.

Notes:

- The BullMQ worker is created in-process in this repo (single `api` container). Conceptually it is a background worker; it can be split into a separate worker process/container if desired.

### 2. Chat

- **URL**: `POST /api/chat`
- **Body**:

  ```json
  {
    "session_id": "user123",
    "query": "What is the news about SpaceX?"
  }
  ```

- **Response**:

  ```json
  {
    "answer": "SpaceX successfully launched...",
    "sources": [ ... ],
    "sessionId": "user123"
  }
  ```

### 3. History (Fetch)

- **URL**: `GET /api/history/:sessionId`
- **Description**: Retrieve chat history/logs.

### 4. History (Delete)

- **URL**: `DELETE /api/history/:sessionId`
- **Description**: Clear Redis history and delete Postgres logs for the session.

## Project Structure

- `src/controllers`: API logic (ingest/chat/history)
- `src/services`: External integrations (Qdrant, Gemini, Redis, Embeddings)
- `src/db`: Database setup and connection pool
- `src/queues` & `src/workers`: BullMQ queue + background ingestion worker
- `src/middleware`: Joi validation and rate limiting setup
- `mock-data`: Sample news file
- `workflow`: HLD/LLD/Architecture/Process/Call Graph docs

## Troubleshooting

- **Mermaid diagram fails to render**: ensure your Markdown viewer supports Mermaid.
- **Qdrant not ready**: check `QDRANT_URL`; API retries init.
- **Postgres connection**: verify `DATABASE_URL`; containers healthy; API retries 5 times.
- **Redis issues**: if API runs locally, use `REDIS_URL=redis://localhost:6379`; if API runs in Docker Compose, the service name `redis` is correct.
- **Embedding/LLM errors**: verify `HF_API_KEY` and `GOOGLE_API_KEY` and outbound network access.
