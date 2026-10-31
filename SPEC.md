# Paperwise — Product Specification v1.0

> "Chat with your documents. Instantly."

> This document describes v1.0. What has changed since is summarised in [section 16](#16-changes-since-v10).

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [User Personas](#2-user-personas)
3. [Site Architecture](#3-site-architecture)
4. [Design System](#4-design-system)
5. [Page Specifications](#5-page-specifications)
   - 5.1 Landing Page
   - 5.2 Pricing Page
   - 5.3 Auth Pages (Login, Signup, Forgot Password, Reset Password, Magic Link)
   - 5.4 Onboarding Flow
   - 5.5 Dashboard (Main App)
   - 5.6 Settings (Profile, Password, Billing)
   - 5.7 Error Pages (404, 500)
   - 5.8 Legal Pages (Privacy, Terms)
6. [Data Models](#6-data-models)
7. [API Contract](#7-api-contract)
8. [Email Templates](#8-email-templates)
9. [Component Library](#9-component-library)
10. [Tech Stack](#10-tech-stack)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Environment Variables](#12-environment-variables)
13. [Tier Limits & Business Logic](#13-tier-limits--business-logic)
14. [Future Roadmap (v2)](#14-future-roadmap-v2)

---

## 1. Product Vision

**Paperwise** is a SaaS product that lets individuals and teams upload documents and have a natural language conversation with them — powered by vector search and large language models.

Unlike generic chatbots, Paperwise is grounded in your actual documents. Every answer includes cited sources pulled directly from your uploaded files. Users interact through a familiar chat interface (like Claude or ChatGPT) but the AI only answers from what you give it.

### Core Value Propositions
- **No hallucination** — answers are grounded in your documents, not training data
- **Source transparency** — every response shows exactly which document and passage it came from
- **Conversation memory** — multi-turn chat means you can follow up naturally
- **Document privacy** — your documents stay in your account, never shared

### Target Market
- Researchers reading academic papers or reports
- Lawyers reviewing contracts and case files
- HR teams fielding policy questions
- Founders understanding investor documents
- Students studying from textbooks and notes
- Anyone drowning in PDFs

---

## 2. User Personas

### Persona A — "The Researcher" (Sarah, 32)
PhD student. Uploads 10-20 papers per project. Needs to find specific claims, compare findings across papers, and generate summaries. Values speed and source accuracy.

### Persona B — "The Professional" (Marcus, 41)
Corporate lawyer. Uploads contracts, NDAs, and legal briefs. Needs to find specific clauses, compare document versions, and get plain-English explanations of legal language.

### Persona C — "The Founder" (Priya, 27)
Early-stage startup founder. Uploads pitch decks, term sheets, competitor research, and investor updates. Needs quick answers without reading 80-page documents.

---

## 3. Site Architecture

### Route Map

```
paperwise.ai/
│
├── /                              Public landing page
├── /pricing                       Pricing & plans
├── /privacy                       Privacy policy
├── /terms                         Terms of service
│
├── /login                         Email/password + Google OAuth + magic link
├── /signup                        New account creation
├── /forgot-password               Request password reset email
├── /reset-password?token=         Reset with emailed token
├── /magic-link/sent               "Check your inbox" confirmation screen
├── /auth/google/callback          OAuth redirect handler (handled server-side)
│
├── /onboarding                    3-step first-time user wizard
│
├── /dashboard                     Main chat application
│
└── /settings
    ├── /settings/profile          Name, avatar
    ├── /settings/password         Change password
    └── /settings/billing          Plan, usage, upgrade CTA
```

### Navigation Rules
- `/dashboard` and `/settings/*` require authentication → redirect to `/login` if unauthenticated
- `/login` and `/signup` redirect to `/dashboard` if already authenticated
- After signup → redirect to `/onboarding` (only first time, tracked via `onboarding_completed` flag on user)
- After login → redirect to `/dashboard`
- After onboarding completion → redirect to `/dashboard`

---

## 4. Design System

### Color Tokens

```css
/* Background layers */
--color-bg-base:        #09090b;   /* zinc-950 — page background */
--color-bg-surface:     #18181b;   /* zinc-900 — cards, sidebar panels */
--color-bg-elevated:    #27272a;   /* zinc-800 — hover states, popovers */
--color-bg-overlay:     #3f3f46;   /* zinc-700 — active states */

/* Borders */
--color-border:         rgba(255,255,255,0.07);
--color-border-focus:   rgba(99,102,241,0.5);  /* indigo on focus */

/* Brand / Accent */
--color-accent:         #6366f1;   /* indigo-500 */
--color-accent-hover:   #4f46e5;   /* indigo-600 */
--color-accent-muted:   rgba(99,102,241,0.15);
--color-accent-glow:    rgba(99,102,241,0.08);

/* Text */
--color-text-high:      #fafafa;   /* zinc-50  — headings */
--color-text-mid:       #a1a1aa;   /* zinc-400 — body */
--color-text-low:       #71717a;   /* zinc-500 — muted / labels */
--color-text-xlow:      #52525b;   /* zinc-600 — placeholders */

/* Semantic */
--color-success:        #10b981;   /* emerald-500 */
--color-success-muted:  rgba(16,185,129,0.12);
--color-warning:        #f59e0b;   /* amber-500 */
--color-warning-muted:  rgba(245,158,11,0.12);
--color-danger:         #ef4444;   /* red-500 */
--color-danger-muted:   rgba(239,68,68,0.12);
```

### Typography

Font: **Inter** (already loaded via next/font)

```
Display:   48px / 52px  weight-700  tracking-tight  — hero headlines
H1:        36px / 40px  weight-600  tracking-tight  — page titles
H2:        24px / 32px  weight-600  tracking-tight  — section headings
H3:        18px / 28px  weight-600                  — card headings
Body LG:   16px / 24px  weight-400                  — primary body text
Body SM:   14px / 20px  weight-400                  — secondary text
Caption:   12px / 16px  weight-400                  — labels, meta
Micro:     11px / 16px  weight-500  tracking-wide   — badges, tags (uppercase)
```

### Spacing Scale
```
4px / 8px / 12px / 16px / 20px / 24px / 32px / 40px / 48px / 64px / 80px / 96px
```

### Border Radius
```
sm:   6px   — buttons, inputs, small chips
md:   8px   — dropdowns, popovers
lg:   12px  — cards, panels
xl:   16px  — modals, large cards
full: 9999px — pills, avatars
```

### Shadows
```
sm:  0 1px 2px rgba(0,0,0,0.3)
md:  0 4px 12px rgba(0,0,0,0.4)
lg:  0 8px 32px rgba(0,0,0,0.5)
glow: 0 0 20px rgba(99,102,241,0.2)   — accent glow on focused inputs
```

### Animations
```
duration-fast:   150ms  ease-out  — hover states
duration-base:   200ms  ease-out  — panel transitions, modals
duration-slow:   300ms  ease-out  — sidebar open/close
duration-spring: 400ms  cubic-bezier(0.34,1.56,0.64,1)  — panel slide-in
```

### Breakpoints
```
sm:  640px
md:  768px
lg:  1024px
xl:  1280px
2xl: 1536px
```

---

## 5. Page Specifications

---

### 5.1 Landing Page `/`

#### Layout
Full-width marketing page. Navbar + Hero + How It Works + Features + Pricing Teaser + CTA + Footer.

#### Navbar
- Left: Paperwise logo (wordmark + icon)
- Right: `Pricing` link · `Log in` link · `Start for free` button (accent)
- Sticky on scroll with backdrop blur + border-bottom

#### Hero Section
- Headline: **"Your documents, finally answerable."**
- Subheadline: "Upload any PDF, Word doc, or text file and ask questions in plain English. Get cited answers in seconds — not hours of ctrl+F."
- CTAs: `[Start for free — it's free]` (primary) · `[See a demo ↓]` (ghost)
- Visual: Animated mockup of the chat UI — user sends a question, AI response streams in with source badges `[1]` `[2]`
- Trust signal below CTAs: "No credit card required · 5 documents free · Setup in 60 seconds"

#### How It Works Section
Three steps, horizontal on desktop, vertical on mobile:
1. **Upload** — "Drop your PDFs, Word docs, or text files. We index them instantly."
2. **Ask** — "Chat naturally. Ask anything — summaries, comparisons, specific facts."
3. **Get answers** — "AI responds with cited sources pulled directly from your documents."

Each step has an icon, a number badge, and a short description.

#### Features Grid
Six feature cards (2×3 on desktop, 1 col on mobile):
1. **AI-powered answers** — Mistral LLM, grounded in your docs
2. **Source citations** — Every answer links back to the exact passage
3. **Multi-turn conversations** — Follow-up naturally, AI remembers context
4. **Multi-document search** — Ask across all your docs at once, or filter by one
5. **Conversation history** — All your past chats saved and searchable
6. **Secure & private** — Your documents are never used to train models

#### Pricing Teaser
Two-column card: Free vs Pro. Link to `/pricing` for details.

#### Final CTA Banner
Large centered section:
- Headline: "Ready to stop ctrl+F-ing?"
- Button: `[Create your free account →]`

#### Footer
- Logo + tagline
- Links: Product (Pricing) · Company (Privacy, Terms) · Contact (email)
- Copyright

---

### 5.2 Pricing Page `/pricing`

#### Layout
Centered, max-width 900px. Navbar + toggle (Monthly/Yearly) + plan cards + FAQ + CTA.

#### Plans

**Free**
- Price: $0/month
- Documents: 5
- Queries: 20 per day
- File size: 10 MB per file
- File types: PDF, TXT, MD
- Conversation history: 7 days
- Support: Community
- CTA: `[Get started free]`

**Pro** *(Coming Soon)*
- Price: $12/month (or $9/month billed yearly)
- Documents: Unlimited
- Queries: Unlimited
- File size: 50 MB per file
- File types: PDF, DOCX, TXT, MD
- Conversation history: Forever
- Support: Priority email
- CTA: `[Join waitlist]` — triggers modal to collect email

#### FAQ
5–6 common questions:
- "What file types are supported?"
- "Is my data private?"
- "Can I cancel anytime?"
- "How is the AI trained?"
- "What happens when I hit my free limit?"
- "Do you offer student or nonprofit discounts?"

---

### 5.3 Auth Pages

#### `/login` — Sign In

**Layout**: Split screen — left panel (visual) + right panel (form card).

**Left panel** (hidden on mobile):
- Dark gradient background
- Paperwise logo centered
- Tagline: "Chat with your documents."
- Floating animated document cards with subtle parallax
- Customer quote: *"Paperwise cut my research time in half."* — Sarah K., PhD Student

**Right panel**:
```
Sign in to Paperwise

[Continue with Google]          ← OAuth button, Google logo
──────── or ────────
Email  [________________]
Password [_______________] [👁]
                        Forgot password?
[Sign in →]

──────── or ────────
[Send me a magic link]          ← passwordless option

Don't have an account? Sign up
```

**Validation**:
- Empty email → "Email is required"
- Invalid email format → "Enter a valid email address"
- Empty password → "Password is required"
- Wrong credentials (from API) → "Incorrect email or password"
- Loading state on button during submit (spinner, button disabled)

---

#### `/signup` — Create Account

Same split-screen layout as login.

```
Create your account

[Continue with Google]
──────── or ────────
Full name  [________________]
Email      [________________]
Password   [_______________] [👁]
           At least 8 characters

[Create account →]

Already have an account? Sign in
```

**Validation**:
- Full name: required, min 2 chars
- Email: required, valid format
- Password: required, min 8 chars, show strength indicator
- Duplicate email (from API) → "An account with this email already exists"

After success → redirect to `/onboarding`

---

#### `/forgot-password` — Request Reset

```
Reset your password

Enter your email and we'll send you
a link to reset your password.

Email  [________________]

[Send reset link →]

← Back to sign in
```

Always shows success message (even if email not found, for security):
> "If an account exists for that email, you'll receive a reset link shortly."

---

#### `/reset-password?token=...` — Set New Password

```
Set a new password

New password      [_______________] [👁]
Confirm password  [_______________] [👁]

[Update password →]
```

**Validation**:
- Passwords must match
- Min 8 chars
- Invalid/expired token → error state with link back to `/forgot-password`
- On success → redirect to `/login` with success toast

---

#### `/magic-link/sent` — Check Your Inbox

```
Check your email ✉

We sent a sign-in link to
john@example.com

Click the link in that email to sign in.
The link expires in 15 minutes.

Didn't get it? [Resend]

← Back to sign in
```

---

### 5.4 Onboarding Flow `/onboarding`

3-step wizard. Progress bar at top showing Step 1 / 2 / 3.
User cannot skip — each step must be completed to advance. Can go back.

#### Step 1 — Welcome
```
┌─────────────────────────────────────────┐
│  ●●○○○  Step 1 of 3                     │
│                                         │
│  Welcome to Paperwise, Sarah 👋         │
│                                         │
│  You're 3 steps away from chatting      │
│  with your first document.              │
│                                         │
│  Here's how it works:                   │
│  📄 Upload  →  💬 Ask  →  ✅ Get answers│
│                                         │
│  [Let's go →]                           │
└─────────────────────────────────────────┘
```

#### Step 2 — Upload Your First Document
```
┌─────────────────────────────────────────┐
│  ●●●○○  Step 2 of 3                     │
│                                         │
│  Upload your first document             │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │   📄  Drop a file here          │    │
│  │       or click to browse        │    │
│  │                                 │    │
│  │   PDF · DOCX · TXT · MD         │    │
│  │   Max 10 MB                     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [← Back]             [Continue →]      │
└─────────────────────────────────────────┘
```
Continue only activates after a file is uploaded.
Shows file name + size + green checkmark after successful upload.

#### Step 3 — Ask Your First Question
```
┌─────────────────────────────────────────┐
│  ●●●●●  Step 3 of 3                     │
│                                         │
│  Now ask something about it!            │
│                                         │
│  Suggestions:                           │
│  [What is this document about?]         │
│  [Summarize the key points]             │
│  [What are the main conclusions?]       │
│                                         │
│  Or type your own:                      │
│  [_________________________________]    │
│                                ([Ask]) │
│                                         │
│  [← Back]                              │
└─────────────────────────────────────────┘
```
After asking → shows a preview of the AI answer streaming in.
Then button: `[Open Paperwise →]` → redirect to `/dashboard` with that conversation open.

Backend: On completion, set `onboarding_completed = true` on user record.

---

### 5.5 Dashboard `/dashboard`

#### Overall Layout

Three-column layout on desktop. Responsive collapsing on smaller screens.

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌─────────────┐  ┌──────────────────────────────┐  ┌────────────┐  │
│  │ LEFT        │  │ CHAT AREA                     │  │ RIGHT      │  │
│  │ SIDEBAR     │  │ (flex-1, min-width 0)          │  │ PANEL      │  │
│  │ 260px fixed │  │                               │  │ 320px      │  │
│  │             │  │                               │  │ slide-in   │  │
│  └─────────────┘  └──────────────────────────────┘  └────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

On `lg` screens (1024px+): All three columns visible.
On `md` screens (768px–1023px): Left sidebar collapsed to icon rail. Right panel hidden, accessible via button.
On `sm` screens (<768px): Full-screen chat. Bottom tab bar for navigation.

---

#### Left Sidebar (260px)

**Top section**
- Paperwise logo + wordmark
- `[+ New chat]` button — full width, accent color

**Conversations list**
- Grouped by recency:
  - Today
  - Yesterday
  - Last 7 days
  - Older
- Each item: conversation title (truncated to 1 line) + timestamp
- Hover state: shows `[⋯]` menu → Rename, Delete
- Active conversation: highlighted with accent left border
- Empty state: "No conversations yet. Start one above."

**Search** (below New Chat button):
- Input: "Search conversations…"
- Filters conversation list in real-time (client-side on loaded conversations)

**Bottom section** (pinned to bottom)
- Divider line
- User avatar (initials) + name + email (truncated)
- Settings icon → `/settings/profile`
- Logout button → calls `POST /auth/logout`, clears cookies, redirects to `/login`

---

#### Chat Area

**Empty / Welcome State** (no conversation selected, or new conversation):
```
┌──────────────────────────────────────────────────┐
│                                                  │
│                  ◉ Paperwise                     │
│         Chat with your documents                 │
│                                                  │
│    ┌─────────────────────────────────────────┐   │
│    │  3 documents in your library  📄         │   │
│    └─────────────────────────────────────────┘   │
│                                                  │
│    Try asking:                                   │
│    ┌──────────────┐ ┌──────────────┐             │
│    │ Summarize    │ │ What are the │             │
│    │ my Q3 report │ │ action items?│             │
│    └──────────────┘ └──────────────┘             │
│    ┌──────────────┐ ┌──────────────┐             │
│    │ Compare docs │ │ Find the     │             │
│    │ A and B      │ │ key risks    │             │
│    └──────────────┘ └──────────────┘             │
│                                                  │
│    ┌──────────────────────────────────────────┐  │
│    │ Ask anything about your documents...     │  │
│    │                                      [↑] │  │
│    │ 📎 All docs ▾                            │  │
│    └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

Clicking a suggestion chip prefills the input.

If library is empty, welcome state shows instead:
```
No documents yet.
Upload your first document to start chatting.
[Upload a document →]
```

---

**Active Conversation — Chat Thread**

Scrollable thread. Messages appear from top, newest at bottom.
Auto-scroll to bottom on new message.

**User message bubble**:
```
                              ┌──────────────────────┐
                              │ What is the main      │
                              │ finding of the Q3     │
                              │ report?               │
                              └──────────────────────┘
                                                 You · 2:34pm
```
- Right-aligned
- Background: `--color-accent-muted`
- Border: `1px solid var(--color-accent) / 0.2`
- Max-width: 80% of chat area
- Rounded corners, bottom-right is sharper

**AI response card**:
```
◉  Paperwise                              2:34pm
─────────────────────────────────────────────────
Based on your documents [1][2], the main finding
of the Q3 report is that revenue grew by **23%**
year-over-year, driven primarily by:

- Enterprise customer acquisition (+40%)
- Expansion of the EMEA region
- Reduction in churn from 8% to 5%

The report notes that this growth is expected to
**continue into Q4**, though risks include supply
chain disruptions [3].

─────────────────────────────────────────────────
Related: [What drove enterprise growth?]  [Q4 projections?]

[📋 Copy]  [↺ Regenerate]  [👍]  [👎]
```

- Full width of chat area
- Background: `--color-bg-surface`
- `[1]` `[2]` `[3]` are clickable → highlight the corresponding source in the right panel
- Answer text is **fully rendered markdown**: bold, italics, lists, code blocks, tables
- Related questions are clickable chips → prefill input
- Streaming state: show blinking cursor `▋` at end of current token
- Loading state (before meta arrives): animated skeleton card

**Loading skeleton** (while waiting for first response):
```
◉  Paperwise
─────────────────────────────────────────────────
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░
```
Animated pulse effect.

---

**Input Bar** (fixed to bottom of chat area):

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   Ask anything about your documents...                       │
│                                                              │
│   📎 All docs ▾                                         [↑]  │
└──────────────────────────────────────────────────────────────┘
```

- Auto-resize `<textarea>` (min 1 line, max 6 lines before scrolling)
- `Enter` = submit, `Shift+Enter` = new line
- `[↑]` send button — disabled and shows spinner while AI is responding
- `📎 All docs ▾` — dropdown to filter which doc(s) to search:
  - Option: "All documents" (default)
  - One option per uploaded document (name + file type icon)
  - Multi-select checkboxes
- Attach file icon — opens file picker → uploads to library, then uses that doc as filter

---

#### Right Panel (320px, slides in)

Triggered by: AI response arriving, or user clicks `[Sources]` button in header area.

**Sources Tab**

Header row: `[Sources (3)]  [Library]`

Numbered source cards matching `[1]` `[2]` references in the answer:
```
┌────────────────────────────────────────┐
│ [1]  📄 Q3-report.pdf                  │
│      Page 4, Section 2.1               │
│      "Revenue grew by 23% year-over-   │
│       year in Q3, exceeding analyst    │
│       expectations of..."              │
│      [View full chunk ▾]               │
└────────────────────────────────────────┘
```

Clicking `[1]` in the AI response highlights (glows) the matching card.
`[View full chunk]` expands to show the full retrieved text.

---

**Library Tab**

```
Library  ·  3 documents                [↑ Upload]

┌──────────────────────────────────────────────┐
│  📄  Q3-report.pdf          2.4 MB   [🗑]    │
│  📄  onboarding-guide.docx  890 KB   [🗑]    │
│  📄  product-roadmap.md     45 KB    [🗑]    │
└──────────────────────────────────────────────┘

                              [🗑 Clear all]
```

- Individual delete `[🗑]` → confirmation popover → calls `DELETE /library/{id}`
- Clear all → confirmation dialog → calls `DELETE /library/clear`
- Upload button → file picker → shows upload progress bar inline

---

### 5.6 Settings Pages

Common layout for all settings pages:
- Left nav: `Profile` · `Password` · `Billing`
- Right: content panel
- Breadcrumb: `Settings > Profile`

---

#### `/settings/profile`

```
Profile

Avatar
┌────┐
│ JD │  ← Initials-based avatar (auto-generated from name initials)
└────┘

Full name   [John Doe                ]
Email       john@example.com  (read-only, with badge: "Verified")

[Save changes]

──────────────────────────────────
Danger Zone

Deleting your account permanently removes all your documents,
conversations, and data. This cannot be undone.

[Delete my account]  ← opens confirmation dialog requiring typing "DELETE"
```

---

#### `/settings/password`

```
Password

Current password   [_______________] [👁]
New password       [_______________] [👁]
Confirm new        [_______________] [👁]

Password strength: [████░░] Moderate

[Update password]

──────────────────────────────────
Signed in with Google? You can set a password to
also enable email login.  [Set a password]
```

---

#### `/settings/billing`

```
Plan & Billing

Current plan
┌───────────────────────────────────────────────────────┐
│  Free                                                 │
│  $0/month                                             │
└───────────────────────────────────────────────────────┘

Usage this month
  Documents     ████░░░░░░  3 of 5 used
  Queries today ████████░░  16 of 20 used
  Storage       █░░░░░░░░░  3.3 MB of 50 MB

──────────────────────────────────
Upgrade to Pro

┌───────────────────────────────────────────────────────┐
│  ⚡ Pro — $12/month                                   │
│                                                       │
│  ✓ Unlimited documents                                │
│  ✓ Unlimited queries                                  │
│  ✓ 50 MB per file                                     │
│  ✓ DOCX support                                       │
│  ✓ Conversation history forever                       │
│  ✓ Priority support                                   │
│                                                       │
│  [Join Pro waitlist]         Coming soon              │
└───────────────────────────────────────────────────────┘
```

"Join Pro waitlist" → modal → email input → stores email in `waitlist` table.

---

### 5.7 Error Pages

#### 404 — Not Found
```
404

The page you're looking for doesn't exist.
It may have been moved or deleted.

[← Go home]
```
Paperwise logo visible. On-theme dark background.

#### 500 — Server Error
```
500

Something went wrong on our end.
We've been notified and are looking into it.

[← Go home]  [Try again]
```

---

### 5.8 Legal Pages

#### `/privacy` — Privacy Policy
Standard privacy policy covering:
- What data is collected (email, documents, queries)
- How data is stored (Supabase, S3)
- How data is used (only to power your queries, never for model training)
- Retention policy
- User rights (delete account → deletes all data)
- Contact email

#### `/terms` — Terms of Service
Standard ToS covering:
- Acceptable use
- Free tier limits
- Prohibited content
- Account termination
- Limitation of liability

---

## 6. Data Models

### users
```sql
id                  SERIAL PRIMARY KEY
email               VARCHAR(255) UNIQUE NOT NULL
full_name           VARCHAR(255) NOT NULL
hashed_password     VARCHAR(255)           -- null if OAuth-only account
avatar_initials     VARCHAR(4)             -- auto-generated from full_name
plan                VARCHAR(20) DEFAULT 'free'   -- 'free' | 'pro'
onboarding_completed BOOLEAN DEFAULT FALSE
created_at          TIMESTAMP DEFAULT NOW()
updated_at          TIMESTAMP DEFAULT NOW()
```

### oauth_accounts
```sql
id                  SERIAL PRIMARY KEY
user_id             INTEGER REFERENCES users(id) ON DELETE CASCADE
provider            VARCHAR(50) NOT NULL    -- 'google'
provider_user_id    VARCHAR(255) NOT NULL
access_token        TEXT
refresh_token       TEXT
created_at          TIMESTAMP DEFAULT NOW()
UNIQUE(provider, provider_user_id)
```

### magic_tokens
```sql
id                  SERIAL PRIMARY KEY
email               VARCHAR(255) NOT NULL
token_hash          VARCHAR(255) NOT NULL UNIQUE
expires_at          TIMESTAMP NOT NULL
used_at             TIMESTAMP
created_at          TIMESTAMP DEFAULT NOW()
```

### reset_tokens
```sql
id                  SERIAL PRIMARY KEY
user_id             INTEGER REFERENCES users(id) ON DELETE CASCADE
token_hash          VARCHAR(255) NOT NULL UNIQUE
expires_at          TIMESTAMP NOT NULL
used_at             TIMESTAMP
created_at          TIMESTAMP DEFAULT NOW()
```

### conversations
```sql
id                  SERIAL PRIMARY KEY
user_id             INTEGER REFERENCES users(id) ON DELETE CASCADE
title               VARCHAR(255) NOT NULL DEFAULT 'New conversation'
created_at          TIMESTAMP DEFAULT NOW()
updated_at          TIMESTAMP DEFAULT NOW()
```

### messages
```sql
id                  SERIAL PRIMARY KEY
conversation_id     INTEGER REFERENCES conversations(id) ON DELETE CASCADE
role                VARCHAR(20) NOT NULL   -- 'user' | 'assistant'
content             TEXT NOT NULL
meta                JSONB                  -- { description, badges, snippets, sources } for assistant messages
created_at          TIMESTAMP DEFAULT NOW()
```

### libraries (existing, rename concept to documents)
```sql
id                  SERIAL PRIMARY KEY
user_id             INTEGER REFERENCES users(id) ON DELETE CASCADE
name                VARCHAR(255) NOT NULL
size                INTEGER NOT NULL       -- bytes
type                VARCHAR(20) NOT NULL   -- 'pdf' | 'docx' | 'txt' | 'md'
path                TEXT NOT NULL          -- S3 key
extracted_text      TEXT
created_at          TIMESTAMP DEFAULT NOW()
```

### library_chunks (existing)
```sql
id                  SERIAL PRIMARY KEY
library_id          INTEGER REFERENCES libraries(id) ON DELETE CASCADE
chunk_index         INTEGER NOT NULL
chunk_text          TEXT NOT NULL
embedding           vector(384)
```

### waitlist
```sql
id                  SERIAL PRIMARY KEY
email               VARCHAR(255) UNIQUE NOT NULL
created_at          TIMESTAMP DEFAULT NOW()
```

---

## 7. API Contract

Base URL: `/api/v1`

All authenticated routes require a valid `paperwise_access_token` cookie.
All responses follow: `{ data: ..., error: null }` on success, `{ data: null, error: { message, code } }` on failure.

---

### Auth

#### `POST /auth/signup`
```json
Request:  { "email": "...", "password": "...", "full_name": "..." }
Response: { "user": { "id", "email", "full_name", "plan" } }
Side effects: sets paperwise_access_token + paperwise_refresh_token cookies, sends welcome email
```

#### `POST /auth/login`
```
Request:  application/x-www-form-urlencoded  username=...&password=...
Response: { "user": { "id", "email", "full_name", "plan" } }
Side effects: sets paperwise_access_token + paperwise_refresh_token cookies
```

#### `POST /auth/logout`
```
Response: { "message": "Logged out" }
Side effects: clears cookies
```

#### `POST /auth/refresh`
```
Response: { "message": "Token refreshed" }
Side effects: rotates paperwise_access_token cookie
```

#### `GET /auth/google`
```
Response: 302 redirect to Google OAuth consent screen
```

#### `GET /auth/google/callback?code=...&state=...`
```
Response: 302 redirect to /dashboard (or /onboarding if new user)
Side effects: creates or finds user, sets cookies
```

#### `POST /auth/magic-link`
```json
Request:  { "email": "..." }
Response: { "message": "If an account exists, a link has been sent." }
Side effects: sends magic link email (token expires in 15 min)
```

#### `GET /auth/magic-link/verify?token=...`
```
Response: 302 redirect to /dashboard
Side effects: sets cookies, marks token as used
```

#### `POST /auth/forgot-password`
```json
Request:  { "email": "..." }
Response: { "message": "If an account exists, a reset link has been sent." }
Side effects: sends password reset email (token expires in 1 hour)
```

#### `POST /auth/reset-password`
```json
Request:  { "token": "...", "new_password": "..." }
Response: { "message": "Password updated successfully" }
Side effects: marks token as used, updates hashed_password
```

#### `GET /auth/me`
```json
Response: {
  "id": 1,
  "email": "john@example.com",
  "full_name": "John Doe",
  "plan": "free",
  "avatar_initials": "JD",
  "onboarding_completed": true
}
```

---

### Users

#### `PATCH /users/me`
```json
Request:  { "full_name": "Jane Doe" }
Response: { "id", "email", "full_name", "avatar_initials" }
```

#### `PATCH /users/me/password`
```json
Request:  { "current_password": "...", "new_password": "..." }
Response: { "message": "Password updated" }
```

#### `DELETE /users/me`
```json
Request:  { "confirmation": "DELETE" }
Response: { "message": "Account deleted" }
Side effects: deletes all user data (docs, chunks, conversations, messages)
```

#### `GET /users/me/usage`
```json
Response: {
  "documents": { "used": 3, "limit": 5 },
  "queries_today": { "used": 16, "limit": 20 },
  "storage_bytes": { "used": 3456789, "limit": 52428800 }
}
```

---

### Conversations

#### `POST /conversations`
```json
Request:  { "title": "New conversation" }  -- optional, auto-titled from first message
Response: { "id": 1, "title": "New conversation", "created_at": "..." }
```

#### `GET /conversations`
```json
Response: [
  { "id": 1, "title": "Q3 report analysis", "updated_at": "...", "message_count": 6 },
  ...
]
```

#### `PATCH /conversations/{id}`
```json
Request:  { "title": "Renamed title" }
Response: { "id", "title", "updated_at" }
```

#### `DELETE /conversations/{id}`
```json
Response: { "message": "Conversation deleted" }
```

#### `GET /conversations/{id}/messages`
```json
Response: [
  { "id": 1, "role": "user", "content": "What is...", "created_at": "..." },
  { "id": 2, "role": "assistant", "content": "Based on...", "meta": {...}, "created_at": "..." },
  ...
]
```

#### `POST /conversations/{id}/ask`
```json
Request:  {
  "question": "What is the main finding?",
  "filters": { "doc_id": null },   -- null = all docs
  "top_k": 5
}
Response: text/event-stream (SSE)
  data: {"meta": {"description": "...", "badges": [...], "snippets": [...], "sources": [...]}}
  data: {"token": "Based"}
  data: {"token": " on"}
  ...
  data: [DONE]
  -- on error:
  event: error
  data: {"message": "Failed to generate response"}
```

Side effects: saves user message + assistant message to DB after stream completes.
Auto-titles the conversation from first user message if title is still "New conversation".

---

### Library

#### `GET /library`
```json
Response: {
  "count": 3,
  "total_size_bytes": 3456789,
  "sections": [
    { "id": 1, "name": "Q3-report.pdf", "type": "pdf", "size": 2400000, "created_at": "..." },
    ...
  ]
}
```

#### `POST /library/upload`
```
Request:  multipart/form-data  files=[...]
Response: { "uploaded": [{ "id", "name", "type", "size" }, ...], "errors": [...] }
```

#### `DELETE /library/{id}`
```json
Response: { "message": "Document deleted" }
Side effects: deletes S3 file + DB record + all chunks
```

#### `DELETE /library/clear`
```json
Response: { "message": "Library cleared" }
Side effects: deletes all user's S3 files + DB records + chunks
```

---

### Misc

#### `POST /waitlist`
```json
Request:  { "email": "..." }
Response: { "message": "You're on the list!" }
```

#### `GET /health`
```json
Response: { "status": "ok", "version": "1.0.0" }
```

---

## 8. Email Templates

All emails are HTML-formatted with Paperwise branding. Sent via SMTP (configured via env vars). Plain-text fallback included.

### Template Shared Elements
- Header: Paperwise logo + brand color
- Footer: "© 2025 Paperwise · Privacy · Terms · Unsubscribe"
- Max width: 600px, centered
- Dark background (`#09090b`) matching app theme

### 8.1 Welcome Email
**Trigger**: User signs up (any method)
**Subject**: "Welcome to Paperwise 👋"
**Body**:
- Greeting with first name
- "You're all set. Here's how to get started:"
  1. Upload a document
  2. Ask a question
  3. Get cited answers
- Primary CTA button: `[Open Paperwise →]`
- "You're on the Free plan: 5 documents, 20 queries/day."

### 8.2 Magic Link Email
**Trigger**: `POST /auth/magic-link`
**Subject**: "Your Paperwise sign-in link"
**Body**:
- "Click the button below to sign in to Paperwise."
- Primary CTA: `[Sign in to Paperwise →]`
- "This link expires in 15 minutes and can only be used once."
- "If you didn't request this, you can safely ignore this email."

### 8.3 Password Reset Email
**Trigger**: `POST /auth/forgot-password`
**Subject**: "Reset your Paperwise password"
**Body**:
- "We received a request to reset the password for your account."
- Primary CTA: `[Reset my password →]`
- "This link expires in 1 hour."
- "If you didn't request a password reset, you can safely ignore this email."

---

## 9. Component Library

All components built with Tailwind CSS using the design tokens defined in section 4.

### Base Components

#### Button
Variants: `primary` | `secondary` | `ghost` | `danger`
Sizes: `sm` | `md` | `lg`
States: default · hover · active · disabled · loading (spinner)

#### Input
Types: `text` | `email` | `password`
States: default · focus (accent ring glow) · error (red ring + error message below) · disabled
Optional: left icon, right icon/button, helper text

#### Textarea
Auto-resize variant for chat input.
Same states as Input.

#### Badge
Variants: `default` | `success` | `warning` | `danger` | `accent`
Sizes: `sm` | `md`

#### Avatar
Displays initials on colored background.
Sizes: `sm` (24px) | `md` (32px) | `lg` (40px) | `xl` (64px)
Color: derived from name hash (consistent per user)

#### Skeleton
Animated pulse placeholder.
Variants: `text` | `card` | `avatar` | `button`

#### Spinner
Sizes: `sm` | `md` | `lg`
Color: inherits from context or explicit prop

#### Toast
Variants: `success` | `error` | `warning` | `info`
Auto-dismiss after 4 seconds.
Stacks from bottom-right corner.

#### Dropdown
Trigger + floating panel.
Keyboard navigation (arrow keys, Enter, Escape).

#### Tabs
Variants: `underline` | `pill`

#### Dialog / Modal
Overlay + centered card.
Closes on Escape or click-outside.
Focus trap while open.

#### Tooltip
Appears on hover after 300ms delay.
Positions: `top` | `bottom` | `left` | `right`

### Layout Components

#### AppShell
Wraps the full dashboard. Manages sidebar open/close state. Handles mobile responsive behavior.

#### LeftSidebar
Collapsible. Contains logo, new chat button, conversation list, user section.

#### ChatArea
Scrollable message thread + fixed input bar at bottom.

#### RightPanel
Slide-in panel. Tabs: Sources | Library.

#### MobileNav
Bottom tab bar on small screens: Chat · Library · Settings

### Feature Components

#### ConversationList
Groups conversations by date. Each item: title + timestamp + context menu.

#### ChatThread
Renders array of messages. Auto-scrolls on new message. Handles empty state.

#### UserMessage
Right-aligned bubble. Shows message text + timestamp.

#### AIMessage
Full-width card. Renders markdown. Shows source badges `[1]`. Action bar. Related chips.

#### StreamingCursor
Blinking `▋` appended to end of streaming text.

#### MarkdownRenderer
Wraps `react-markdown` with custom renderers for:
- Code blocks → syntax highlighted with copy button
- Inline code → styled monospace
- Links → external link icon, open in new tab
- Tables → horizontally scrollable

#### SourceBadge
Clickable `[1]` inline element. Highlights corresponding source card on click.

#### QueryBar
Auto-resize textarea + send button + doc filter dropdown + attach button.

#### DocFilterDropdown
Multi-select. Lists all user documents. "All documents" default option.

#### SourceCard
Numbered card with doc name, page/section, snippet. Expandable.

#### DocCard
Library item. Doc icon by type + name + size + delete button.

#### UploadZone
Drag-and-drop target with click-to-browse fallback. Shows progress bar during upload.

#### PromptChip
Clickable suggestion chip. Prefills QueryBar on click.

#### UsageBar
Progress bar showing used/limit for a resource.

#### SplitAuthLayout
Left animated panel + right form panel. Used on login/signup/forgot-password.

#### StepWizard
Progress bar + step content. Used in onboarding.

---

## 10. Tech Stack

### Frontend
```
Framework:    Next.js 15 (App Router)
UI Library:   React 19
Styling:      Tailwind CSS 4
Language:     TypeScript
HTTP:         Axios (with cookie-based auth interceptors)
SSE:          @microsoft/fetch-event-source
Markdown:     react-markdown + rehype-highlight + remark-gfm
Icons:        lucide-react
Fonts:        Inter (next/font/google)
```

### Backend
```
Framework:    FastAPI
Language:     Python 3.11+
Database:     PostgreSQL + pgvector (via SQLAlchemy)
Auth:         JWT (python-jose) + OAuth (authlib)
Email:        smtplib (standard library)
AI:           Provider adapter — Gemini API or Hugging Face Inference API
  Embeddings: sentence-transformers/all-MiniLM-L6-v2 (384-dim)
  LLM:        meta-llama/Llama-3.1-8B-Instruct
Storage:      AWS S3-compatible (Supabase Storage, boto3)
Migrations:   Alembic
Server:       Uvicorn
Env:          python-dotenv
Testing:      pytest + pytest-asyncio (153 unit tests, backend/tests/)
```

### Infrastructure
```
Database:     Supabase (managed PostgreSQL)
Storage:      Supabase Storage (S3-compatible)
Deployment:   Docker Compose (local) → any VPS or PaaS
```

### New Python Dependencies
```
authlib          -- Google OAuth
certifi          -- SSL fix (macOS)
```

### New npm Dependencies
```
react-markdown          -- Markdown rendering
rehype-highlight        -- Syntax highlighting
remark-gfm              -- GitHub-flavored markdown (tables, strikethrough)
react-textarea-autosize -- Auto-growing textarea
```

---

## 11. Deployment Architecture

### docker-compose.yml (local development)
```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    env_file: ./backend/.env
    depends_on: [db]

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    env_file: ./frontend/.env

  db:                              # local dev only; production uses Supabase
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: paperwise
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

volumes:
  pgdata:
```

### Production Notes
- Backend → any Python-capable PaaS (Railway, Render, Fly.io) or VPS
- Frontend → Vercel (zero-config Next.js) or same VPS
- Database → Supabase (already used)
- Storage → Supabase Storage (already used)
- Set `ENV=production` in backend to enforce secret validation

---

## 12. Environment Variables

### Backend `.env`

```bash
# App
ENV=development                    # 'development' | 'production'

# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET_KEY=                    # required in production, min 32 chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback

# SMTP (for magic link + password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_NAME=Paperwise
SMTP_FROM_EMAIL=noreply@paperwise.chaturved-sumanth-lakkaraju.com

# Hugging Face
HF_API_KEY=
HF_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
HF_CHAT_MODEL=meta-llama/Llama-3.1-8B-Instruct

# S3 / Supabase Storage
S3_ENDPOINT=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_ACCESS_KEY=
S3_LIBRARY_BUCKET=library

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# Text Processing
TEXT_CHUNK_SIZE=500
TEXT_CHUNK_OVERLAP=50
```

### Frontend `.env`

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000/api
NEXT_PUBLIC_APP_NAME=Paperwise
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 13. Tier Limits & Business Logic

### Free Tier
```python
MAX_DOCUMENTS     = 5
MAX_QUERIES_DAY   = 20
MAX_FILE_SIZE_MB  = 10
ALLOWED_TYPES     = ['pdf', 'txt', 'md']
HISTORY_DAYS      = 7
```

### Pro Tier
```python
MAX_DOCUMENTS     = None   # unlimited
MAX_QUERIES_DAY   = None   # unlimited
MAX_FILE_SIZE_MB  = 50
ALLOWED_TYPES     = ['pdf', 'docx', 'txt', 'md']
HISTORY_DAYS      = None   # forever
```

### Enforcement Points
- **Upload**: check document count + file size + file type before processing
- **Ask**: check daily query count (rolling 24h window, not calendar day)
- **History**: queries on conversations older than 7 days return 402 for free users with upgrade prompt
- All limit violations return `HTTP 402 Payment Required` with `{ "error": { "code": "LIMIT_EXCEEDED", "limit": "documents", "upgrade_url": "/settings/billing" } }`

---

## 14. Future Roadmap (v2)

These features are deliberately out of scope for v1 but planned:

| Feature | Notes |
|---|---|
| Stripe billing | Live payment processing for Pro tier |
| Team workspaces | Share document libraries across a team |
| Document folders | Organize library into folders/collections |
| Chat export | Download conversation as PDF or Markdown (an answer can already be exported as Markdown or Word; see section 16) |
| Document annotations | Highlight and comment on source passages |
| API access | Let Pro users query Paperwise programmatically |
| Slack integration | Ask questions from Slack |
| Chrome extension | Upload the current webpage as a document |
| Mobile app | React Native wrapper |
| Self-hosted | Docker image for enterprise on-prem |

---

## 15. Implementation Notes

---

### 15.1 Backend Bug Fixes (existing code)

These are fixes to the existing codebase required before new features are layered on top. None are product features — all are correctness/stability issues.

| File | Issue | Fix |
|---|---|---|
| `src/main.py` | `allow_origins=["*"]` hardcoded | Read `ALLOWED_ORIGINS` env var, split on comma, use as origins list |
| `src/repositories/library_repository.py` | `List`, `Session`, `Library`, `LibraryChunk` imported twice (lines 1–2 duplicate lines 6–9) | Remove the first four import lines, keep the SQLAlchemy ones |
| `src/integrations/storage.py` | `put_object` and `delete_object` calls have no error handling | Wrap in try/except `botocore.exceptions.ClientError`, raise `HTTPException(502)` |
| `src/api/v1/query.py` | SSE stream ends with `data: [DONE]` even on LLM failure | Catch exceptions in `streamer()`, yield `event: error\ndata: {...}\n\n` before returning |
| `src/utils/text_utils.py` | Unsupported file extension returns `""` silently | Raise `HTTPException(400, "Unsupported file type: .xyz")` |
| `requirements.txt` | `certifi` used in `integrations/ai/huggingface.py` but not listed | Add `certifi` |

---

### 15.2 Alembic Migration Plan

All schema changes must be applied via Alembic migrations in this order (dependency order matters):

**Migration 1 — Alter `users` table**
```sql
ALTER TABLE users ADD COLUMN avatar_initials VARCHAR(4);
ALTER TABLE users ADD COLUMN plan VARCHAR(20) NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
-- Make hashed_password nullable (OAuth users won't have one)
ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;
```

**Migration 2 — New auth tables**
```sql
CREATE TABLE oauth_accounts ( ... );   -- see Section 6 for full schema
CREATE TABLE magic_tokens ( ... );
CREATE TABLE reset_tokens ( ... );
```

**Migration 3 — Conversations + Messages**
```sql
CREATE TABLE conversations ( ... );
CREATE TABLE messages ( ... );
```

**Migration 4 — Waitlist**
```sql
CREATE TABLE waitlist ( ... );
```

Run order: `alembic upgrade head` applies all in sequence.
Each migration should be reversible (`downgrade` defined).

---

### 15.3 Endpoint Deprecation & Replacement

The existing `/api/v1/query/ask` endpoint is **replaced** by `/api/v1/conversations/{id}/ask`.

| Old | New | Notes |
|---|---|---|
| `POST /api/v1/query/ask` | `POST /api/v1/conversations/{id}/ask` | Removed entirely. New endpoint saves messages to DB, passes prior messages as context to LLM, auto-titles conversation. |
| `recent_queries` table | `messages` table | `recent_queries` is no longer written to. Table stays in DB but is unused. A future migration can drop it. |

The frontend `sseApi` call in `Workspace.tsx` must be updated to call the new endpoint path. The old `query.py` router file can be deleted.

Multi-turn context: before calling the LLM, fetch the last N messages from the conversation (default N=10) and prepend them to the prompt as `[INST]user[/INST]assistant` pairs in Mistral format.

---

### 15.4 Design Prototype Pages

Three static prototype pages exist at the following routes for design reference. They use mock data only — no API calls. Do not delete them during the rebuild; they serve as the visual target.

| Route | File | Purpose |
|---|---|---|
| `/prototype` | `src/app/prototype/page.tsx` | Landing page design reference |
| `/prototype/login` | `src/app/prototype/login/page.tsx` | Auth page design reference |
| `/prototype/dashboard` | `src/app/prototype/dashboard/page.tsx` | Dashboard/chat design reference |

When building the real pages, match the visual design of these prototypes exactly. The prototypes define: color usage, component spacing, animation style, layout proportions, and interaction patterns.

These pages can be removed before final production deployment.

---

### 15.5 Package Installation

All packages below must be installed before any implementation begins.

#### Frontend (`npm install`)

| Package | Purpose |
|---|---|
| `react-markdown` | Render LLM markdown output in chat |
| `remark-gfm` | GitHub Flavored Markdown (tables, strikethrough) |
| `rehype-highlight` | Code block syntax highlighting |
| `react-hook-form` | Form state management (login, signup, settings, onboarding) |
| `zod` | Schema validation — paired with react-hook-form via `@hookform/resolvers` |
| `@hookform/resolvers` | Bridge between react-hook-form and zod |
| `react-textarea-autosize` | Auto-growing chat input textarea |
| `sonner` | Toast notification system |
| `@radix-ui/react-dialog` | Accessible modal/dialog primitive |
| `@radix-ui/react-tabs` | Accessible tabs (Sources/Library panel, Settings) |
| `@radix-ui/react-dropdown-menu` | Accessible ⋯ menus in conversation list + header |
| `js-cookie` | Read/write JWT access token cookie from client |

**Dev dependencies:**
| Package | Purpose |
|---|---|
| `@types/js-cookie` | TypeScript types for js-cookie |

**Install commands:**
```bash
cd frontend
npm install react-markdown remark-gfm rehype-highlight react-hook-form zod @hookform/resolvers react-textarea-autosize sonner @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-dropdown-menu js-cookie
npm install -D @types/js-cookie
```

#### Backend (`pip install`)

| Package | Purpose |
|---|---|
| `authlib` | Google OAuth2 client (PKCE flow) |
| `httpx` | Async HTTP client required by authlib |
| `jinja2` | HTML email template rendering |
| `certifi` | SSL certificate bundle — fixes HuggingFace TLS on some hosts |
| `slowapi` | Rate limiting middleware for FastAPI |
| `limits` | Required by slowapi |
| `itsdangerous` | Signed tokens for magic links and password reset |

**Add to `requirements.txt`:**
```
authlib
httpx
jinja2
certifi
slowapi
limits
itsdangerous
```

**Install command:**
```bash
cd backend
pip install authlib httpx jinja2 certifi slowapi limits itsdangerous
```

---

## 16. Session State

This section tracks the current implementation state so a new session can resume without re-deriving context.

### 16.1 What Exists

**Frontend** — all 20 pages built and browser-verified. Build passes clean (`npm run build`).

| Page | Status |
|---|---|
| `/` — Landing page | ✅ Done |
| `/login` | ✅ Done |
| `/signup` | ✅ Done |
| `/forgot-password` | ✅ Done |
| `/reset-password` | ✅ Done |
| `/magic-link/sent` | ✅ Done |
| `/onboarding` | ✅ Done |
| `/dashboard` | ✅ Done — full SSE streaming, 3-col layout |
| `/settings/profile` | ✅ Done |
| `/settings/password` | ✅ Done |
| `/settings/billing` | ✅ Done |
| `/pricing` | ✅ Done |
| `/privacy` | ✅ Done |
| `/terms` | ✅ Done |
| `not-found.tsx` (404) | ✅ Done |
| `error.tsx` (500) | ✅ Done |
| `middleware.ts` | ✅ Done — protects `/dashboard`, `/settings/*`; redirects authed users away from `/login`/`/signup` |
| Prototype pages (`/prototype/*`) | ✅ Preserved |

**Frontend support files:**
- `src/lib/types.ts` — all TypeScript interfaces
- `src/lib/paperwise-api.ts` — all API functions
- `src/context/AuthContext.tsx` — AuthProvider + useAuth()
- `src/app/layout.tsx` — wraps AuthProvider + Toaster

**Backend** — all code written and running against a real database.

| Item | Status |
|---|---|
| All models (12 tables, incl. `query_usage_log`, `message_feedback`, `recent_query`) | ✅ Written |
| Alembic migrations 0001–0007 (plus 2 auto-named merge/feature revisions) | ✅ Written and applied |
| All API routes (auth, users, conversations, library, analytics, misc) | ✅ Written |
| All services (auth, user, library, conversation, tier, waitlist) | ✅ Written |
| All repositories | ✅ Written |
| `requirements.txt` updated | ✅ Done |
| Backend packages installed | ✅ Done |

**Remaining (infra/ops):**

| Item | Status |
|---|---|
| `alembic upgrade head` | ✅ Done |
| README.md | ✅ Written |
| Docker / docker-compose (backend, frontend, nginx reverse proxy) | ✅ Written |
| `.env.example` | ✅ Done (backend + frontend) |
| Tier limit enforcement (§13) | ✅ Done |
| TLS for the Docker/nginx setup | ✅ Done — Let's Encrypt via a `certbot` container, auto-renewing every 12h; production deploy runs on AWS EC2 behind `paperwise.chaturved-sumanth-lakkaraju.com` |

### 16.2 Resuming a Session

The product and infra are both in place. To run locally:
1. Set up `.env` with real credentials (DB, Supabase, HuggingFace, SMTP, Google OAuth) — or `docker compose up --build` if you'd rather run it containerized
2. Run `alembic upgrade head` to apply all migrations (the backend Docker image does this automatically on boot)
3. Start backend: `uvicorn src.main:app --reload --port 8000`
4. Start frontend: `npm run dev` (runs on port 3000)

### 16.3 Environment

- Dev server: `http://localhost:3000`
- `pyright-langserver` installed globally via `npm install -g pyright`
- Backend runs on `http://localhost:8000`
- Dockerized stack (all three containers behind nginx) runs on `http://localhost` (port 80)

### 16.4 Active Plugins

| Plugin | Status |
|---|---|
| `typescript-lsp` | ✅ Active |
| `pyright-lsp` | ✅ Active (`pyright-langserver` installed globally) |
| `playwright` | ✅ Active |
| `context7` | ✅ Active |
| `logfire` | ✅ Active |
| `commit-commands` | ✅ Active |
| `feature-dev` | ✅ Active |
| `security-guidance` | ✅ Active |
| `frontend-design` | ✅ Active |
| `superpowers` | ✅ Active |

### 16.5 Working Style

- User preference: work autonomously and figure things out as you go — do not over-ask before acting
- Reference the prototype pages as the visual target when building real pages
- Do not delete prototype pages until final production deployment

---

*Spec version 1.3 — Paperwise*
*Last updated: 2026-05-18*

---

## 16. Changes since v1.0

The sections above still describe the original design. These are the differences.

### 16.1 Product

| Area | What changed |
|---|---|
| Answers | Every answer cites passages as `[n]` with the page, and the source viewer opens the PDF at that page with the passage highlighted. Only the sources an answer actually cites are kept. |
| Scanned PDFs | Pages with no text layer are read with Tesseract OCR, and their sources are marked "read from a scan". |
| Chat | Edit any question, retry an answer, switch versions with a `1/2` switcher, and continue from any answer in a new chat. Suggested follow-up questions appear after an answer, and a sources panel sits beside the chat on wide screens. |
| Library | Per-document and multi-document questions, contract-focused prompts, and a Key dates list per document with an Add to calendar (.ics) download. |
| Export | An answer can be exported as Markdown or as a Word document. |
| Accounts | Sign-up says at the email step when an account already exists. |
| Marketing | Solutions pages, a Request a demo flow, legal pages, and a pricing waitlist. |

### 16.2 Data model

| Table | Change |
|---|---|
| `messages` | `parent_id` (self reference, cascade). Messages form a tree, so an edited question or a retried answer is a sibling of the one it replaces. |
| `conversations` | `active_leaf_id` (set null): the last message of the visible path. |
| `library_chunks` | `page_number`, and `scanned` for text read with OCR. |
| `libraries` | `status`, `error_message`, `status_updated_at`, `content_hash` (unique per user), and `key_dates` (JSON, the dates found in the document). |
| `demo_requests` | New table for the Request a demo form. |

Migrations `0007` to `0013` add these. `0012` backfills a straight line of messages for every existing conversation.

### 16.3 API additions

All under `/api/v1`.

| Method and path | Purpose |
|---|---|
| `POST /conversations/{id}/ask` | Now also takes `edit_of` (store the question beside that one) or `retry_of` (answer that answer's question again), never both. |
| `GET /conversations/{id}/messages` | Returns the visible path, each message with `version`, `versions` and `sibling_ids`. |
| `POST /conversations/{id}/versions` | Switch to another version of a turn. Body: `{ "message_id": n }`. |
| `POST /conversations/{id}/branch` | Copy the path up to a message into a new conversation. The copy keeps the original's date, so branching cannot extend Free plan history. |
| `POST /conversations/{id}/follow-ups` | Up to three suggested next questions. Not charged to the daily limit. |
| `POST /conversations/{id}/messages/{message_id}/export` | The answer, its question and its sources as a Word file. |
| `POST /library/{id}/key-dates` | Dates and deadlines in a document, each with its quoted sentence and page. Only dates whose quote is in the document are kept, and a date whose year the quote does not state is flagged `year_assumed`. |
| `POST /auth/email-exists` | Whether an email already has an account, for the sign-up email step. Limited per address and per email. |
| `POST /auth/methods` | Whether to ask for a password. Limited per address and per email; answers neutrally once the per-email limit is spent. |

### 16.4 Platform

The frontend now runs on Next.js 16 and Node 24 (LTS). Next.js 16 renames `middleware.ts` to `proxy.ts`, so the route protection described in section 15 lives in `frontend/src/proxy.ts`.

### 16.5 Still planned

Pro checkout (Pro is a waitlist for now), tabular review across documents, comparing two documents, a clause and risk check, sharing a read-only link, Google Drive import, folders and named projects, and team workspaces. The Gemini free tier allows only 20 chat requests a day, so a paid plan is needed before launch.
