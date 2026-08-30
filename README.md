# Valax Scrub BBS and Trade

> **Official Subproject**: [https://bbs-and-trade.valaxscrub.shop](https://bbs-and-trade.valaxscrub.shop)  
> Dedicated community forum, digital script marketplace, dual-ledger non-financial Utility Credit system, and administrative control panel for the Valax Scrub ecosystem.

---

## 🌟 Key Architecture & Compliance Highlights

1. **Zero User Media Upload Policy**:
   - The platform strictly prohibits storing or serving user-uploaded binary files, attachments, or media.
   - All marketplace deliveries are strictly verified external **GitHub Release** download URLs, open-source repositories, and official documentation links.

2. **Valax Utility Credit Dual-Ledger Engine**:
   - Valax Credits are strictly defined as **non-financial utility credits** for platform digital assets and services (no dividends, securities, cashouts, or financial promises).
   - Immutable double-entry accounting engine (`wallet_accounts` balance tracking + `wallet_ledger` immutable journal log) with idempotency key enforcement.

3. **Discord-Only Authentication & RBAC**:
   - Session authentication exclusively powered by Discord OAuth 2.0 (Arctic SDK).
   - HttpOnly SameSite cookie security (`valax_session_token`) with server-side session revocation.
   - Role-Based Access Control (`user`, `moderator`, `admin`) with real-time audit logging.

4. **Vercel Free Plan Optimization**:
   - Built on Next.js 14 App Router, TypeScript, Tailwind CSS, GSAP animation wrappers, and Turso LibSQL HTTP Serverless pipeline.

---

## 📂 Project Structure

```
├── src/
│   ├── app/
│   │   ├── (admin)/admin/           # Admin panel (Stats, Users, Moderation, Ledger, Settings)
│   │   ├── (auth)/login/            # Discord OAuth login page
│   │   ├── (community)/bbs/         # BBS Boards, Threads, Composer, Replies
│   │   ├── (marketplace)/market/    # Digital Assets Market, Detail, Publish Form
│   │   ├── (user)/                  # User Profile, Inventory, and Utility Credit Wallet
│   │   ├── api/                     # Serverless API routes (BBS, Market, PayPal, Admin, Health)
│   │   ├── layout.tsx               # Root layout with SaaS navigation & footer
│   │   └── page.tsx                 # Portal landing homepage
│   ├── components/
│   │   ├── animations/              # GSAP FadeIn & StaggerList wrappers
│   │   ├── layout/                  # Navbar, Sidebar, Footer components
│   │   └── markdown/                # Sanitized Markdown renderer with syntax highlighting
│   ├── db/
│   │   ├── schema.ts                # Drizzle ORM schema for 14 relational tables
│   │   ├── index.ts                 # Turso LibSQL client instance
│   │   ├── migrate.ts               # Database DDL migration runner
│   │   └── seed.ts                  # Initial boards & system settings seeder
│   └── lib/
│       ├── auth.ts                  # Discord OAuth client & session manager
│       ├── ledger.ts                # Dual-ledger transactional credit mutation engine
│       ├── paypal.ts                # PayPal REST order creation & capture client
│       ├── rate-limit.ts            # Sliding window endpoint rate limiter
│       ├── rbac.ts                  # Admin & Moderator role verification guards
│       └── url-sanitizer.ts         # Strict GitHub Release & external URL validator
├── drizzle.config.ts                # Drizzle configuration
├── next.config.mjs                  # Next.js security headers & image domain config
└── tailwind.config.ts               # SaaS dark theme Tailwind configuration
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

### 3. Initialize & Seed Database
```bash
npx tsx src/db/migrate.ts
npx tsx src/db/seed.ts
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
```

---

## 📄 License & Compliance Notice
This repository contains the BBS & Trade subproject for Valax Scrub. Distributed under private license for Valax Scrub operations.