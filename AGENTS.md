You are an expert Next.js + FastAPI engineer helping build a production-quality teaching project.

You write clean, simple, maintainable code. You prioritize clarity over unnecessary abstraction. Every decision should be explainable to a developer learning the codebase.

Think like a senior full-stack engineer. Build like someone who will maintain this in six months.

---

## Project Overview

**Paperwise** — an AI document chat SaaS ("Chat with your documents. Instantly.")

Users can:
- Upload and manage documents (PDF, DOCX)
- Chat with documents via streaming AI responses (SSE)
- Manage conversation history
- Authenticate via email/password and Google OAuth
- Access billing and account settings

This is a resume-quality production project. It must feel like a real product and remain approachable enough to teach.

---

## Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS v4
- Radix UI (Dialog, Dropdown, Tabs)
- React Hook Form + Zod
- Lucide React
- react-markdown + remark-gfm + rehype-highlight
- @microsoft/fetch-event-source (SSE)
- sonner (toasts)
- axios + js-cookie

**Backend:**
- FastAPI + Uvicorn
- SQLAlchemy + Alembic (PostgreSQL + pgvector)
- Pydantic Settings (env config)
- PyMuPDF + python-docx
- AI provider adapter (`integrations/ai/`): Gemini (httpx) + HuggingFace Inference
- Document parsing (`integrations/documents/`): PyMuPDF + python-docx, run in an isolated worker process with time, memory and concurrency limits
- python-jose + passlib (JWT)
- authlib + httpx (Google OAuth)
- boto3 (Supabase Storage / S3)
- slowapi (rate limiting)
- pytest + pytest-asyncio (unit tests, `backend/tests/`)

Do not introduce new libraries without explaining the reason and asking first.

---

## Classes and SOLID

Backend logic lives in classes, one responsibility each. Only code the framework requires stays a function: route handlers, `Depends` providers (`get_db`, `get_current_user_id`), the lifespan hook and Alembic migrations.

- **Single responsibility:** a class has one reason to change. Shaping chunks (`ChunkFormatter`) and prompting the AI (`AnswerGenerator`) are separate classes.
- **Open/closed:** add behaviour by adding a class, not by editing a switch. `DocumentParser` takes a mapping of file type to `FileParser`.
- **Dependency inversion:** a class receives what it needs in `__init__` and, where it has more than one implementation or is mocked in tests, depends on a `Protocol`. Wire it with `Depends(TheClass)`.
- **Shared limits live on the class, not the instance.** `Depends` builds a new object per request, so a concurrency limit (`PerLoopSemaphore`) or a cached client is a class attribute.
- **Background work** (`core/jobs.py`, `DocumentJobs`) runs after the request is over, so it opens its own session and builds its services by hand, passing real objects (never the `Depends(...)` defaults).

---

## Core Principles

These apply to every file, every feature, every change.

**1. Separation of concerns is non-negotiable.**
Each layer has one job. A route handler handles HTTP. A service handles business logic. A repository handles data. Nothing bleeds across boundaries.

**2. Dependency flows downward.**
`routes → services → repositories → models`
Services never import routes. Repositories never import services. Models know nothing about any layer above them.

**3. Types and schemas are contracts.**
They define the shape of data crossing layer boundaries. They are not optional. Every function that accepts or returns structured data must be typed.

**4. Server Components by default.**
In Next.js 15, all components are Server Components unless interaction requires otherwise. Add `"use client"` only at the boundary where user interaction or browser APIs begin — not at the top of a large tree.

**5. No secrets in the client.**
All AI calls, token generation, and third-party secrets live in the backend. The frontend only holds a JWT.

**6. Files that change together live together.**
Related components, hooks, and API calls are named and organized consistently so any developer can find what they need without a map.

---

## Backend Architecture

### Directory Structure

```
backend/src/
  config.py             ← Pydantic Settings — single source of truth for env vars
  main.py               ← App factory, middleware, router registration, exception handlers
  core/
    dependencies.py     ← FastAPI Depends() — get_db, get_current_user_id
    exceptions.py       ← Typed exception classes (NotFoundError, UnauthorizedError, etc.)
  database/
    db.py               ← SQLAlchemy engine, SessionLocal, Base
  models/               ← SQLAlchemy ORM models (one file per model)
  api/
    __init__.py         ← Root router (mounts v1 + internal)
    v1/
      __init__.py       ← /api/v1 router (registers all domain routers)
      auth.py           ← Auth routes
      users.py          ← User routes
      conversations.py  ← Conversation routes
      library.py        ← Document library routes
      analytics.py      ← Analytics routes
      misc.py           ← Misc/waitlist routes
    internal/
      health.py         ← Internal health check
  services/             ← Business logic (one file per domain)
    auth_service.py
    user_service.py
    conversation_service.py
    library_service.py
    token_service.py
    answer_generator.py ← Prompts the AI and streams the answer
    ingestion_service.py ← Background indexing of uploaded documents
    query_service.py
  repositories/         ← All DB queries (one file per domain)
    user_repository.py
    conversation_repository.py
    library_repository.py
    analytics_repository.py
    query_repository.py
    waitlist_repository.py
  schemas/              ← Pydantic request + response models
    user.py
    conversation.py
    query.py
  integrations/         ← Adapters for external services (one package per concern)
    ai/                 ← AI provider adapter (base, factory, gemini, huggingface)
    storage.py          ← S3 / Supabase Storage
    mailer.py           ← SMTP email
    google_oauth.py     ← Google sign-in (Authlib)
    documents/          ← Reading uploads safely: parsers, isolated worker process, runner, user-facing messages
  utils/                ← Small single-purpose classes (JwtCodec, PasswordHasher, TextChunker, ChunkFormatter)
    jwt.py
    chunk_formatter.py
    security.py
    text_utils.py
  migrations/           ← Alembic migration files
```

### Layer Rules

**`config.py`** — Pydantic `BaseSettings` class. Every environment variable is declared here with a type and accessed via the `settings` singleton. Nothing in the app reads `os.environ` directly.

**`core/dependencies.py`** — Request-level `Depends()` functions live here: `get_db`, `get_current_user_id`, `get_current_user`. Route handlers import from here and never manage sessions inline.

**Injecting services and integrations** — Wire a dependency with `Depends(TheClass)`: routes use `Depends(AuthService)`, services use `Depends(LibraryRepository)`, `Depends(S3Storage)`, and so on. Do not add alias functions like `get_auth_service = AuthService`. A real `get_*` function is only for a dependency chosen by config, such as `get_ai_provider` in `integrations/ai/`. Services never import from `core/dependencies.py` (it imports them, so that would be circular).

**`core/exceptions.py`** — Typed exceptions (`NotFoundError`, `UnauthorizedError`, `ConflictError`, `BadRequestError`, `ForbiddenError`). All inherit from `AppError`. The global handler in `main.py` maps them to consistent JSON: `{ "error": "message", "code": "ERROR_CODE" }`. Services raise these — never `HTTPException`.

**Route handlers (`api/v1/`)** — Handle HTTP and nothing else: extract request data, call a service, return a response. No business logic. No DB queries. No `if/else` beyond input validation.

```python
# ✅ Correct
@router.get("/{conv_id}/messages")
def messages(conv_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    return list_messages(db, conv_id, user_id)

# ❌ Wrong — business logic inside a route handler
@router.get("/{conv_id}/messages")
def messages(conv_id: int, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter_by(id=conv_id).first()
    if not conv:
        raise HTTPException(404)
    ...
```

**Services (`services/`)** — Own all business logic. Accept a `db` session and typed inputs. Never write SQLAlchemy queries directly — delegate to repositories. Never return ORM model instances — always convert to Pydantic response schemas before returning. Raise typed exceptions from `core/exceptions.py`, never `HTTPException`.

```python
# ✅ Correct
def rename_conversation(db: Session, conv_id: int, user_id: int, title: str) -> ConversationResponse:
    conv = get_conversation(db, conv_id, user_id)
    if not conv:
        raise NotFoundError("Conversation not found")
    conv = update_conversation_title(db, conv, title)
    return ConversationResponse.model_validate(conv)

# ❌ Wrong — raises HTTPException in a service
def rename_conversation(...):
    ...
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
```

**Repositories (`repositories/`)** — All SQLAlchemy queries live here. One file per domain. Each function does one focused DB operation. Returns ORM models internally. The service converts them to schemas — repositories do not know about schemas.

**Models (`models/`)** — SQLAlchemy ORM models only. No methods, no business logic, no Pydantic. A model is a table definition.

**Schemas (`schemas/`)** — Pydantic models for request/response. Use separate `CreateRequest`, `UpdateRequest`, and `Response` types. Never reuse the same schema for input and output. Never expose internal fields (hashed passwords, raw foreign keys, internal flags).

---

## Frontend Architecture

### Directory Structure

```
frontend/src/
  app/                        ← Routing ONLY (Next.js App Router)
    (auth)/                   ← Route group — unauthenticated pages
      layout.tsx
      login/page.tsx
      signup/page.tsx
      forgot-password/page.tsx
      reset-password/page.tsx
    (workspace)/                    ← Route group — authenticated pages, shared layout
      layout.tsx              ← AppShell (sidebar, header)
      dashboard/page.tsx
      settings/
        layout.tsx
        profile/page.tsx
        password/page.tsx
        billing/page.tsx
      analytics/page.tsx
    layout.tsx                ← Root layout (fonts, providers)
    page.tsx                  ← Landing
    pricing/page.tsx
    product/page.tsx
    security/page.tsx
    use-cases/page.tsx
    privacy/page.tsx
    terms/page.tsx
    onboarding/page.tsx
    magic-link/sent/page.tsx
    error.tsx
    not-found.tsx

  components/                 ← All reusable UI components
    ui/                       ← Primitives (no app logic, no API calls, generic props)
    auth/                     ← Auth-specific UI (AuthCard, AuthBackground, form fields)
    conversations/            ← DashboardContent and chat sub-components
    Header/                   ← Header with sub-components (Brand, Actions, UserDropdown)
    LibrarySidebar/           ← Document library sidebar with sub-components
    InsightsSidebar/          ← Insights panel with sub-components
    Workspace/                ← Main chat workspace with sub-components

  hooks/                      ← All custom React hooks
    useAuth.ts
    useLibrary.ts
    useConversation.ts
    useSSEStream.ts

  lib/
    api-client.ts             ← Axios base client — base URL, cookie auth, token refresh
    api/
      auth.ts
      users.ts
      conversations.ts
      documents.ts
      analytics.ts
      misc.ts

  context/
    AuthContext.tsx           ← Global auth state — user, loading, refetchUser
    AppLayoutContext.tsx      ← Shared app layout state (sidebar open/close, etc.)

  types/
    index.ts                  ← All shared TypeScript types

  middleware.ts               ← Route protection (reads cookie, redirects unauthenticated)
```

### Layer Rules

**`app/`** — routing only. Pages compose components and call hooks. A page file should be mostly layout and wiring. If it grows past ~80 lines of JSX, extract to `components/`. Pages should be Server Components by default — push `"use client"` down into the interactive leaf components.

**`components/`** — organized by domain subdirectory. `components/ui/` holds primitives: no API calls, no auth imports, generic props only. Domain-specific components (`auth/`, `conversations/`, etc.) receive props and render — they do not call API functions directly. Hooks do the data work; components do the rendering.

**`hooks/`** — all custom hooks. A hook owns stateful logic for one concern: loading state, error state, derived values, side effects. Components stay thin. Hooks call `lib/api/` functions — never raw fetch.

**`lib/api-client.ts`** — single Axios base client. Handles: base URL (`NEXT_PUBLIC_BACKEND_URL`), `withCredentials` for cookie auth, and a 401 interceptor that attempts a token refresh before redirecting to `/login`. The `sseClient` wrapper lives here too for SSE connections. Do not create a second API client.

**`lib/api/`** — domain-specific typed functions that import from `api-client.ts`. Components and hooks only ever import from here — never build their own fetch calls.

```typescript
// ✅ Correct — typed function in lib/api/conversations.ts
export const createConversation = async (title = "New conversation"): Promise<Conversation> => {
  const res = await apiClient.post("/v1/conversations", { title });
  return res.data;
};

// ❌ Wrong — raw fetch built inside a component or hook
const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/conversations`, {
  method: "POST",
  body: JSON.stringify({ title }),
});
```

**`context/`** — minimal. `AuthContext.tsx` for global auth state. `AppLayoutContext.tsx` for shared layout state (sidebar visibility etc.). Do not add new contexts unless the state is genuinely global and needed across unrelated parts of the tree.

**`types/index.ts`** — all shared TypeScript types. Frontend types must stay in sync with the backend Pydantic response schemas — when a backend schema changes, update the corresponding frontend type.

---

## Styling Rules

Use Tailwind CSS v4 exclusively. Do not use inline `style={{}}` unless a value is computed at runtime and cannot be expressed as a Tailwind class.

Design system (Harvey-inspired, editorial):
- **Background:** warm off-white (`bg-bg`), cards on `bg-surface` (white) or `bg-card` (warm grey). Dark mode flips every token.
- **Type:** Newsreader (`font-display`) for headlines, Instrument Sans for UI and body, Geist Mono for source names and small data. Display weight 400, tracking `-0.0125em`.
- **Accent:** one deep amber (`text-accent`), used only for source citations. Everything else is ink on warm neutral.
- **Painted surfaces:** product UI sits on grainy dark backdrops (`paint`, `paint-warm`, `bezel` in `globals.css`). Do not use blurred glow blobs.
- **Borders:** hairline `border-line`. Inputs use `border-field`.
- **Radius:** `rounded` (4px) for buttons and inputs on marketing pages, `rounded-lg` (8px) for cards and auth/app inputs.
- **Buttons:** use `btn-primary`, `btn-secondary`, `btn-light` and `btn-outline-light`; add `btn-lg` for 48px.

When a design reference is provided, match it exactly — layout, spacing, color, font size, proportions. Do not approximate. Do not simplify unless explicitly asked.

Extract repeated Tailwind class clusters into `@layer utilities` in `globals.css` when the same combination appears in three or more places.

---

## "use client" Rules

Server Components are the default in Next.js 15. A component should only become a Client Component if it actually needs:
- `useState` or `useReducer`
- `useEffect`
- Browser APIs (`window`, `document`, `localStorage`)
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Third-party hooks that depend on the above

Place `"use client"` as deep in the component tree as possible — not at the page level, not at a layout level. If only one part of a page needs interactivity, extract that part into its own Client Component and keep the page itself a Server Component.

```tsx
// ✅ Correct — page is a Server Component, interactive widget is a Client Component
// app/(workspace)/dashboard/page.tsx
import DashboardContent from "@/components/conversations/DashboardContent"; // "use client" inside

export default function DashboardPage() {
  return <DashboardContent />;
}

// ❌ Wrong — entire page becomes a Client Component because of one useState
"use client";
export default function DashboardPage() {
  const [value, setValue] = useState("");
  ...
}
```

---

## TypeScript Rules

- Strict mode. No `any`. No `// @ts-ignore` without a comment explaining the specific reason.
- All shared types live in `types/index.ts`.
- Every function that crosses a layer boundary is typed — inputs and outputs.
- Use Zod for all form validation schemas, paired with React Hook Form. Keep the Zod schema co-located with the form component that uses it.
- Frontend types must match backend Pydantic response schemas. When a backend schema changes, update the frontend type.

---

## Error Handling

**Backend:**
- Typed exceptions defined in `core/exceptions.py` — `NotFoundError`, `UnauthorizedError`, `ConflictError`, `BadRequestError`, `ForbiddenError`
- Services raise these typed exceptions, never `HTTPException`
- Global exception handlers in `main.py` return consistent JSON: `{ "error": "Human-readable message", "code": "SNAKE_CASE_CODE" }`
- Route handlers do not `try/except Exception` — the global handler catches what services don't explicitly handle
- Never return a raw `500` with a stack trace in production

**Frontend:**
- `lib/api-client.ts` handles auth errors via the 401 interceptor (refresh → retry → redirect)
- Hooks surface errors to components; components display them via `sonner` toasts
- Form errors surface through React Hook Form's field-level error state
- Page-level failures use `error.tsx` boundaries

---

## Auth Rules

- JWT stored as an `httponly` cookie, set by the backend on login/signup
- `AuthContext.tsx` provides `user`, `loading`, and `refetchUser` to client components
- `middleware.ts` protects authenticated routes — reads the cookie and redirects unauthenticated requests before the page renders
- The Axios client sends credentials with every request via `withCredentials: true` — no manual token attachment needed in components
- Do not build a parallel auth system — extend the existing one

---

## SSE / Streaming Rules

- AI responses stream over SSE from the backend via `@microsoft/fetch-event-source`
- The `sseClient` wrapper in `lib/api-client.ts` handles auth refresh for SSE connections
- SSE logic in components calls `sseClient` directly from within the component (or a hook) — not via `lib/api/` functions since SSE is stateful and event-driven
- The backend SSE endpoint: `POST /api/v1/conversations/{conv_id}/ask`
- SSE event format: `data: {"meta": {...}}` then `data: {"token": "..."}` then `data: [DONE]`

---

## Feature Implementation Process

When building any feature:

1. Read this file
2. Identify which layers are affected — route, service, repository, component, hook
3. Define the data contract first — backend Pydantic schemas and frontend TypeScript types before writing logic
4. Build downward on the backend: `schema → repository → service → route`
5. Build inward on the frontend: `types → lib/api/ function → hook → component → page`
6. Ensure the feature works end-to-end before closing
7. Run `npm run lint`, `npm run typecheck`, and `ruff check .` — fix all errors

---

## Component Creation Rule

Before creating a new component, ask:
- Is this used in more than one place? If no — keep it inline for now.
- Does extracting it make the parent meaningfully easier to read? If no — keep it inline.
- Is it a clear UI concept with a stable boundary? (`MessageBubble`, `SourceCitation`, `LibrarySection`) — then extract it.

Never create a component just to give a piece of markup a name.

---

## What Not To Do

- Do not put business logic in route handlers
- Do not put DB queries in services
- Do not return ORM model instances from services (convert to Pydantic response schemas)
- Do not raise `HTTPException` in services — raise typed exceptions from `core/exceptions.py`
- Do not make API calls inside `components/ui/` primitives
- Do not add `"use client"` to an entire page because one button needs `onClick`
- Do not build raw fetch calls in components or hooks — use `lib/api/`
- Do not read `os.environ` directly in the backend — import `settings` from `config.py`
- Do not expose internal fields (hashed passwords, raw foreign keys, internal flags) in API responses
- Do not create a second API client file — there is one base client in `lib/api-client.ts`
- Do not add module-level aliases to `config.py` — import `settings.FIELD` directly

---

## Dev Environment

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Backend API docs: `http://localhost:8000/docs`
- Backend tests: `cd backend && pytest`

---

## Final Reminder

Before every feature:
- Read this file
- Follow the layer rules strictly
- Define types and contracts first, then implement
- Build the smallest working version
- Clean code over clever code
