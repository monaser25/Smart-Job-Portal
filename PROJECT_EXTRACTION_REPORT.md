# Smart Job Portal — Project Extraction Report

> Factual extraction from the codebase only. Where the code does not establish a fact, the value is marked **UNKNOWN** with a note on what is needed. Every important claim cites the supporting file or folder.
>
> Repository root analyzed: `FinalProject-main/` (backend = Laravel, frontend = React/Vite, Ai = FastAPI).

---

## 1. Project Name

**Smart Job Portal**

- Title declared in `README.md` ("# Smart Job Portal") and `Ai/README.md` ("# Smart Job Portal AI Service").
- Frontend package identifier is `smartjob` (`frontend/package.json` → `"name": "smartjob"`).
- MySQL database name is `smart_job` (`README.md` Quick Start; SQL dump `smart_job.sql`).
- Backend Laravel app uses the default skeleton name `laravel/laravel` (`backend/composer.json`), so the product name comes from the README/frontend, not the composer package.

---

## 2. Project Overview

Smart Job Portal is an AI-assisted recruitment web platform that connects **job seekers**, **companies/recruiters**, and a **system administrator**. Job seekers upload a CV (PDF/DOCX), which an AI microservice parses into structured data (name, contact, skills, education, experience); the system then recommends active jobs ranked by a skill-matching score, supports one-click applications, and—on rejection—returns a "missing skills" gap analysis by email. Companies post jobs with required skills, then view applicants automatically ranked by match score in a Smart ATS, change applicant status, and message candidates. An admin oversees users and jobs with platform statistics and moderation (ban/verify users, delete jobs). The system is built as three cooperating services: a Laravel 12 REST API (`backend/`), a React 19 + Vite single-page app (`frontend/`), and a FastAPI Python AI engine (`Ai/`), backed by MySQL. The UI is bilingual (English/Arabic) with full RTL support. (Synthesized from `README.md`, `docs/system requirements analysis.txt`, `backend/routes/api.php`, `Ai/main.py`, `frontend/src/routeConfig.jsx`.)

---

## 3. Problem Statement (inferred)

Inferred from `docs/system requirements analysis.txt` (User Requirements section) and the implemented features:

- Job seekers waste time on **manual resume data entry** and repetitive application forms (UR-02.1, UR-02.3).
- Traditional keyword search produces **low-relevance job matches**; seekers want recommendations that understand their actual skills (UR-02.2).
- Rejected candidates receive **generic rejections** with no actionable reason, preventing self-improvement (UR-02.5).
- Recruiters are overwhelmed by **high volumes of unqualified applicants** and need automated ranking to surface the best candidates (UR-03.3).
- Recruiters need to **notify rejected candidates professionally and automatically**, without manual effort (UR-03.5).
- Administrators need **oversight and moderation** tools (UR-04).

The platform addresses these via automated CV parsing, skill-based matching/recommendation, a ranked ATS, and automated gap-analysis rejection emails.

---

## 4. Main Objectives

Derived from implemented modules (`backend/app/`, `Ai/`, `frontend/src/pages/`) and `docs/system requirements analysis.txt`:

1. Automate CV ingestion: extract structured data and skills from uploaded resumes (`Ai/models/cv_parser.py`, `Ai/models/skill_extractor.py`, `backend/app/Jobs/ParseCVJob.php`).
2. Provide skill-based job recommendations ranked by a matching score (`backend/app/Http/Controllers/Job/JobRecommendationController.php`, `backend/app/Services/MatchingService.php`).
3. Enable fast, one-click applications with an automatically computed match score (`backend/app/Http/Controllers/Application/ApplicationController.php@store`).
4. Give recruiters a Smart ATS that auto-ranks applicants by match score (`backend/app/Http/Controllers/Company/ATSController.php`).
5. Deliver transparent rejection feedback via gap analysis (missing skills) and automated email (`backend/app/Services/GapAnalyzerService.php`, `backend/app/Jobs/SendRejectionEmailJob.php`).
6. Provide administration/moderation and platform analytics (`backend/app/Http/Controllers/Admin/AdminController.php`).
7. Support bilingual (EN/AR) access with RTL (`frontend/src/i18n/index.js`, `frontend/src/locales/en.json`, `frontend/src/locales/ar.json`, `backend/app/Http/Middleware/SetLocale.php`, `backend/app/Traits/HasLocalizedFields.php`).

---

## 5. Target Users / Actors

Three roles are enforced by the `role` enum on `users` and by route middleware:

- **Job Seeker** (`job_seeker`) — uploads CV, gets recommendations, applies, tracks applications, messages companies (`backend/routes/api.php` → `role:job_seeker` group; `frontend/src/pages/jobSeeker/`).
- **Company / Recruiter** (`company`) — manages company profile, posts jobs, reviews ranked applicants, changes statuses, messages seekers (`backend/routes/api.php` → `role:company` group; `frontend/src/pages/company/`).
- **Admin** (`admin`) — views stats, manages users (ban/verify), manages/deletes jobs (`backend/routes/api.php` → `role:admin` group; `frontend/src/pages/admin/`).

Role values defined in `backend/database/migrations/0001_01_01_000000_create_users_table.php` (`enum('role', ['job_seeker','company','admin'])`). An additional implicit actor is the **AI Engine** (internal microservice) and the **Email Service** (per `docs/SD-01` and `docs/SD-05`).

---

## 6. Main Features grouped by user role

### Public / Unauthenticated (`backend/app/Http/Controllers/Public/`, `frontend/src/pages/public/`)
- Browse public job listings and job details (`PublicJobController`).
- Browse companies and public company profiles (`PublicCompanyController`).
- View skills list, home, about, contact, FAQ, salaries, privacy, terms pages (`frontend/src/pages/public/`).
- Register, login, verify email, forgot/reset password (`backend/app/Http/Controllers/Auth/`).

### Job Seeker (`role:job_seeker` in `backend/routes/api.php`; `frontend/src/pages/jobSeeker/`)
- Upload CV (throttled) and poll parse status; view/edit parsed CV data (`CVController`).
- Manage profile, avatar, cover, settings; verify password (`ProfileController`).
- Add/remove personal skills (`SkillController@addToSeeker/removeFromSeeker`).
- Get recommended jobs (requires CV uploaded) (`JobRecommendationController`).
- Save/unsave jobs (`SavedJobController`).
- Apply to jobs (one-click; requires CV), list/show/withdraw applications, view rejection feedback (`ApplicationController`).
- Messaging and notifications (`MessageController`, `NotificationController`).

### Company / Recruiter (`role:company`; `frontend/src/pages/company/`)
- Company dashboard with stats, recent applicants, top jobs (`CompanyDashboardController`).
- Manage company profile, logo, settings (`CompanyProfileController`).
- CRUD job posts and toggle active state (`CompanyJobController`).
- Smart ATS: view applicants for a job or across all jobs, auto-ranked by AI score; search/filter/sort; view applicant profile; download applicant CV (`ATSController`).
- Change applicant status (applied → under_review/shortlisted/rejected/approved) (`ApplicationController@updateStatus`).
- Messaging and notifications (`MessageController`, `NotificationController`).

### Admin (`role:admin`; `frontend/src/pages/admin/`)
- Platform statistics (users, jobs, applications, banned counts) (`AdminController@stats`).
- List/show users with filters; ban/unban; verify users (`AdminController`).
- List jobs (including trashed); permanently delete jobs (`AdminController@jobs/forceDeleteJob`).
- Update own settings; password verification (`AdminController@updateSettings/verifyPassword`).

---

## 7. Functional Requirements

The repository contains an explicit, authored requirements document at `docs/system requirements analysis.txt` and `docs/System Requirements Analysis.pdf`. The following are confirmed as **implemented** in code (requirement IDs map to that document):

- **FR-IAM-01/02/03/04** Registration with role selection, validation, secure login with role redirect, password recovery — `backend/app/Http/Controllers/Auth/AuthController.php`, `PasswordResetController.php`, `backend/app/Http/Requests/Auth/RegisterRequest.php`, `LoginRequest.php`.
- **FR-AI-01** CV parsing pipeline (text extraction + NLP, skill/experience/education/contact extraction) — `Ai/models/cv_parser.py`, `Ai/main.py@/parse-cv`.
- **FR-AI-02** Structured JSON storage linked to profile — `cv_parsed_data` table; `backend/app/Jobs/ParseCVJob.php`, `backend/app/Models/CvParsedData.php`.
- **FR-AI-03** Matching score (% based on required vs. candidate skills) — `Ai/models/matcher.py@compute_skill_gap`, `Ai/main.py@/match-skills`, `backend/app/Services/MatchingService.php`.
- **FR-AI-04** Gap analysis (missing skills) on rejection — `backend/app/Services/GapAnalyzerService.php`.
- **FR-JS-01** CV-upload gating of features — middleware `cv.uploaded` (`backend/app/Http/Middleware/EnsureCVUploaded.php`) on recommended-jobs and apply routes.
- **FR-JS-02** View/edit extracted data — `CVController@getParsed/updateParsed`.
- **FR-JS-03** Recommended jobs sorted by score — `JobRecommendationController`.
- **FR-JS-04** Search & filtering — `frontend/src/utils/jobFilters.js`, `PublicJobController/JobController` index (query params).
- **FR-JS-05** Application tracking with status — `applications.status` enum; `ApplicationController@index`.
- **FR-CO-01** Company profile management — `CompanyProfileController`.
- **FR-CO-02** Detailed job posting with required skills — `CompanyJobController@store`, `backend/app/Http/Requests/Job/StoreJobRequest.php`, `job_required_skills` table.
- **FR-CO-03** Smart ATS auto-ranked by score — `ATSController@index/applicants` + `MatchingService@rankApplications`.
- **FR-CO-04** Status change via quick actions — `ApplicationController@updateStatus`, `backend/app/Http/Requests/Application/UpdateStatusRequest.php`.
- **FR-CO-05** Automated personalized rejection email with missing skills — `backend/app/Jobs/SendRejectionEmailJob.php`, `backend/app/Mail/RejectionEmail.php`.
- **Admin** stats/moderation — `AdminController`.

Additional implemented features **beyond** the requirements doc: saved jobs (`SavedJobController`), in-app messaging (`MessageController`, `messages` table), in-app notifications (`NotificationController`, `notifications` table), job view tracking (`job_post_views` table, `JobController@recordView`), approved-status flow with approval email (`SendApprovedEmailJob`).

---

## 8. Non-Functional Requirements

Authored NFRs are in `docs/system requirements analysis.txt` (section 3.3). Status against code:

- **NFR-02.1 Password hashing** — implemented: `User` casts `password => 'hashed'` (`backend/app/Models/User.php`); bcrypt is Laravel default.
- **NFR-02.4 Input validation / injection & XSS protection** — implemented via Laravel FormRequests, Eloquent (parameter binding), and CV magic-byte validation (`Ai/main.py@_validate_magic`); CV upload uses `mimetypes` validation (`backend/app/Http/Controllers/CV/CVController.php`).
- **NFR-02.3 File privacy / RBAC on CVs** — implemented: CVs stored on private `local` disk with random UUID filenames; download restricted to the owning company (`ATSController@downloadCV`).
- **NFR-01.1 CV parsing ≤ 20s for ~2MB** — partially supported by design (async queue, AI timeout 30s in `AiService`); actual timing **UNKNOWN** (no benchmark in repo).
- **NFR-01.3 100 concurrent users** / **NFR-04.1 99% uptime** / **NFR-04.2 daily backups** — **UNKNOWN** (no load tests, SLA config, or backup scripts found).
- **NFR-02.2 HTTPS everywhere** — **UNKNOWN in repo**: local URLs are HTTP `127.0.0.1` (`README.md`); production TLS config not present.
- **NFR-03.1 Responsive design** — supported via Tailwind CSS (`frontend/tailwind.config.js`); not separately verified here.
- **NFR-03.3 Friendly error messages** — supported: localized API error envelopes (`backend/bootstrap/app.php` exception handlers, `backend/resources/lang`/`lang` messages).

What is needed to confirm the UNKNOWNs: performance/load test results, production deployment/TLS configuration, and a backup policy.

---

## 9. Tech Stack

### Frontend (`frontend/package.json`)
- React 19 (`react`, `react-dom` `^19.2.5`), Vite 8 (`vite ^8.0.10`, `@vitejs/plugin-react`).
- Tailwind CSS 3 (`tailwindcss ^3.4.19`) + `tailwindcss-rtl` for RTL; PostCSS, Autoprefixer.
- Routing: `react-router-dom ^7.15.1` (`frontend/src/routeConfig.jsx`, `frontend/src/App.jsx`).
- HTTP: `axios ^1.16.0` (`frontend/src/api/axios.js`) plus a native-fetch client (`frontend/src/api/httpClient.js`).
- i18n: `i18next`, `react-i18next`, `i18next-browser-languagedetector` (`frontend/src/i18n/index.js`).
- Animation: `framer-motion ^12.39.0` (`frontend/src/motion/`).
- Lint: ESLint 10 (`frontend/eslint.config.js`).

### Backend (`backend/composer.json`)
- PHP `^8.2`, Laravel Framework `^12.0`.
- Laravel Sanctum `^4.3` (SPA cookie auth), Laravel Tinker.
- Queues via database driver; Mail; Events/Listeners.
- Dev/test: PHPUnit `^11.5`, Mockery, FakerPHP, Pint, Pail, Collision, Sail.

### Database
- MySQL (database `smart_job`; `README.md`, `smart_job.sql`). Default local stack is XAMPP/MySQL.
- Schema via Laravel migrations (`backend/database/migrations/`). A SQLite file is touched by composer's `post-create-project-cmd` but the documented runtime DB is MySQL.

### Authentication
- Laravel Sanctum, **stateful SPA cookie/session** auth (`backend/bootstrap/app.php` → `$middleware->statefulApi()`; `frontend/src/api/httpClient.js@ensureCsrfCookie` calls `/sanctum/csrf-cookie`).
- Email verification via custom `email_verification_tokens` table (`AuthController@verifyEmail`, `AuthService`).
- Password reset via `password_reset_tokens` (`PasswordResetController`).
- `personal_access_tokens` table exists (Sanctum token guard available) but the SPA path uses cookies.
- Role-based access via custom `role` middleware (`backend/app/Http/Middleware/RoleMiddleware.php`); ban enforcement (`BanCheck.php`); verified-email enforcement (`EnsureEmailVerified.php`).
- Throttling on auth and CV upload (`throttle:auth`, `throttle:cv_upload` in `backend/routes/api.php`).

### APIs / Integrations
- **Internal AI microservice** over HTTP with `X-API-Key` header (`backend/app/Services/AiService.php` → `config/ai.php` `AI_ENGINE_URL`, `AI_ENGINE_KEY`; `Ai/main.py` API-key auth).
- **Email providers** configurable (SMTP and `config/services.php` entries for Postmark, SES, Resend). Active mailer is env-driven — provider in use is **UNKNOWN** (depends on `.env`, which is gitignored).
- **Slack notifications** config block present (`backend/config/services.php`) but no Slack-sending code found → likely unused/scaffold.
- **LinkedIn public guest API scraping** implemented in `Ai/models/linkedin_api.py` (requests + BeautifulSoup) — **NOT wired into any FastAPI endpoint** in `Ai/main.py`; appears to be an unused/standalone module.

### AI / ML / Chatbot
- FastAPI service (`Ai/main.py`) exposing `/health`, `/parse-cv`, `/match-skills`.
- NLP: spaCy `en_core_web_sm` for NER (person/location) (`Ai/models/cv_parser.py`).
- Document parsing: PyPDF2, python-docx (`Ai/requirements.txt`).
- Matching/semantic: scikit-learn (cosine similarity), sentence-transformers (`all-MiniLM-L6-v2` bi-encoder + optional cross-encoder) in `Ai/models/embedder.py` and `Ai/models/matcher.py`. **Note:** the two-stage semantic `compute_matches` and `EmbeddingEngine` are implemented but **not invoked by the exposed endpoints**; the live `/match-skills` endpoint uses keyword/substring skill-gap matching (`matcher.compute_skill_gap`).
- pandas/numpy for vocabulary building.
- **No conversational chatbot** is present.

### Deployment
- CI: GitHub Actions (`.github/workflows/ci.yml`) — MySQL 8 service, PHP 8.2 backend job (composer install, migrate, PHPUnit). Frontend/AI CI steps **UNKNOWN beyond what is in the file** (only first ~50 lines reviewed; confirm full file).
- Local orchestration: Windows `.cmd` shortcuts (`setup.cmd`, `start.cmd`, `migrate.cmd`, `import-db.cmd`, `check.cmd`) and PowerShell scripts (`scripts/*.ps1`).
- **Production hosting/deployment configuration: UNKNOWN** (no Dockerfile, no cloud/Nginx/Apache vhost configs found in tracked files). Needed: target host, web server, TLS, process manager.

---

## 10. System Architecture

### Explanation
The system is a **three-tier, multi-service architecture**:

1. **Client (SPA):** React 19 + Vite app (`frontend/`). Talks to the backend REST API at `http://127.0.0.1:8000/api` using cookies (Sanctum SPA auth) and CSRF tokens (`frontend/src/api/axios.js`, `httpClient.js`). Role-based client routing gates pages (`frontend/src/routes/ProtectedRoute.jsx`, `RoleRoute.jsx`, `routeConfig.jsx`).
2. **API server (Laravel):** REST API (`backend/routes/api.php`) with controllers → services → Eloquent models → MySQL. Cross-cutting concerns via middleware (auth, role, verified, ban, locale) and a consistent JSON envelope (`backend/app/Traits/ApiResponse.php`, `backend/bootstrap/app.php`). Long-running work (CV parsing, score refinement, emails) is pushed to a **queue** (`backend/app/Jobs/`), processed by a worker (`php artisan queue:listen --queue=cv-parsing,default`).
3. **AI engine (FastAPI):** Stateless Python microservice (`Ai/main.py`) the Laravel server calls over HTTP with an API key. It parses CVs and computes skill gaps/scores; Laravel persists the results.

Data flow for the core "CV → skills → match" loop: Frontend uploads CV → Laravel stores file + dispatches `ParseCVJob` → job calls AI `/parse-cv` → parsed JSON + skills saved → recommendations/applications computed via `MatchingService` (local weighted score, with AI `/match-skills` refinement asynchronously). Confirmed by `CVController`, `ParseCVJob`, `MatchingService`, `RefineApplicationScoreJob`.

Resilience pattern: matching has a **local fallback** so the app works if the AI service is down (`MatchingService@calculateScore` catches exceptions and calls `calculateLocalScore`).

### Important folders/files

Backend (`backend/`):
- `routes/api.php` — all API endpoints and middleware grouping (single source of truth for the API surface).
- `bootstrap/app.php` — middleware aliases, stateful API, global exception → JSON handlers.
- `app/Http/Controllers/` — grouped by domain: `Auth/`, `CV/`, `Job/`, `Application/`, `Company/`, `Admin/`, `Public/`, `Seeker/`, `Skill/`, plus `MessageController`, `NotificationController`.
- `app/Services/` — `AiService` (HTTP client to AI), `CVParsingService`, `MatchingService` (scoring/ranking), `GapAnalyzerService`, `AuthService`.
- `app/Jobs/` — `ParseCVJob`, `RefineApplicationScoreJob`, `SendRejectionEmailJob`, `SendApprovedEmailJob` (async queue work).
- `app/Models/` — Eloquent models (see §11).
- `app/Http/Middleware/` — `RoleMiddleware`, `EnsureEmailVerified`, `EnsureCVUploaded`, `BanCheck`, `SetLocale`.
- `app/Http/Requests/` — validation (`RegisterRequest`, `LoginRequest`, `StoreJobRequest`, `UpdateJobRequest`, `ApplyRequest`, `UpdateStatusRequest`).
- `app/Http/Resources/` — JSON transformers (`JobResource`, `ApplicationResource`, `CompanyResource`, `UserResource`, `SkillResource`, collections).
- `app/Traits/` — `ApiResponse` (envelope), `HasLocalizedFields` (EN/AR field localization).
- `app/Mail/`, `app/Events/`, `app/Listeners/`, `app/Notifications/` — email + event-driven status notifications.
- `config/ai.php`, `config/matching.php` — AI engine URL/key and matching weights (70/30).
- `database/migrations/`, `database/seeders/` — schema and demo/seed data.
- `postman/`, `smart_job_postman_collection.json` — API collection.

Frontend (`frontend/src/`):
- `api/` — endpoint map (`endpoints.js`), axios + fetch clients, per-domain service wrappers.
- `services/` — data-layer aggregators (`jobSeekerDataService.js`, `companyDataService.js`, `adminDataService.js`, `publicDataService.js`).
- `pages/` — screens grouped by `public/`, `auth/`, `jobSeeker/`, `company/`, `admin/`, `errors/`.
- `components/`, `layouts/`, `context/` (`AuthContext`, `ThemeContext`), `routes/` (guards), `i18n/`, `locales/` (en/ar), `motion/`, `utils/`.

AI (`Ai/`):
- `main.py` — FastAPI app, API-key auth, CORS, upload safety, endpoints.
- `models/cv_parser.py` — text extraction + NER/regex/heuristic parsing.
- `models/skill_extractor.py` — skill vocabulary + categorization (technical/soft).
- `models/matcher.py` — skill gap + (unexposed) two-stage semantic matcher.
- `models/embedder.py` — sentence-transformer embedding engine (unexposed).
- `models/linkedin_api.py` — LinkedIn scraping helper (unexposed).

---

## 11. Database / Data Models

Source of truth: `backend/database/migrations/` (schema) and `backend/app/Models/` (relationships). The `smart_job.sql` dump contains the same tables.

### Core entities / tables

| Table | Key fields | Notes |
|---|---|---|
| `users` | id, name, email (unique), password, role enum(`job_seeker`,`company`,`admin`), email_verified_at, is_banned, timestamps, softDeletes | `create_users_table.php`; `User.php` |
| `job_seeker_profiles` | id, user_id (unique FK→users), resume_file_url, years_of_experience, education_level (TEXT after `change_education_level...`), contact_information, cv_parse_status enum, phone, address | `create_job_seeker_profiles_table.php`; cv_parse_status later `('pending','processing','completed','done','failed')` (`modify_cv_parse_status_enum...`) |
| `company_profiles` | id, user_id (unique FK→users), company_name(+_ar), description(+_ar), logo_url, website, location(+_ar), phone, founded_year, company_size, industry(+_ar) | base + `add_industry...`, `add_extra_fields...`, `add_arabic_translation_columns` |
| `skills` | id, name (unique), name_ar, type enum(`technical`,`soft`) | `create_skills_table.php` + `add_arabic_translation_columns` |
| `job_seeker_skills` | id, job_seeker_id (FK→job_seeker_profiles), skill_id (FK→skills), source enum(`cv`,`manual`), unique(job_seeker_id, skill_id) | pivot; `JobSeekerSkill.php` |
| `cv_parsed_data` | id, job_seeker_id (unique FK→job_seeker_profiles), parsed_json (JSON), parsed_at | one-to-one with profile; `CvParsedData.php` |
| `job_posts` | id, company_id (FK→company_profiles), title(+_ar), category(+_ar), description(+_ar), responsibilities(+_ar), location(+_ar), work_mode, job_type enum(`full_time`,`part_time`,`remote`,`contract`,`internship`), experience_level, education, salary_range, salary_min, salary_max, status, is_active, views, timestamps, softDeletes | base + `add_category...`, `add_missing_columns_for_frontend_sync`, `add_internship_to_..._enum`, `add_arabic_translation_columns`, `add_is_active_index` |
| `job_required_skills` | id, job_id (FK→job_posts), skill_id (FK→skills), is_mandatory (bool), unique(job_id, skill_id) | pivot; `JobRequiredSkill.php` |
| `applications` | id, job_id (FK→job_posts), job_seeker_id (FK→job_seeker_profiles), ai_score decimal(5,2), missing_skills_json (JSON), status enum(`applied`,`under_review`,`shortlisted`,`rejected`,`approved`), timestamps, softDeletes, unique(job_id, job_seeker_id) | base + `add_approved_to_applications_status`; `Application.php` |
| `application_status_history` | id, application_id (FK→applications), status, changed_by (FK→users), notes, created_at | audit trail; no updated_at; `ApplicationStatusHistory.php` |
| `notifications` | id, user_id (FK→users), type, data (JSON), read_at, created_at | in-app notifications; `Notification.php` |
| `messages` | id, sender_id (FK→users), receiver_id (FK→users), job_id (nullable FK→job_posts), content, read_at, timestamps | direct messaging; `Message.php` |
| `saved_jobs` | id, job_seeker_id (FK→job_seeker_profiles), job_id (FK→job_posts), timestamps, unique(job_seeker_id, job_id) | bookmarks |
| `job_post_views` | id, job_id (FK→job_posts), user_id (FK→users), timestamps, unique(job_id, user_id) | view tracking |
| `email_verification_tokens` | id, user_id (FK→users), token (unique), expires_at, created_at | custom email verification |
| `password_reset_tokens` | email (PK), token, created_at | password reset |
| `personal_access_tokens` | Sanctum tokens | `create_personal_access_tokens_table.php` |
| `sessions` | id, user_id, ip_address, user_agent, payload, last_activity | session store |
| `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `migrations` | Laravel framework tables (cache + queue + migrations) | `create_cache_table.php`, `create_jobs_table.php`, `smart_job.sql` |

### Main relationships (`backend/app/Models/`)
- `User` 1—1 `JobSeekerProfile`; `User` 1—1 `CompanyProfile`; `User` 1—* `Notification`.
- `JobSeekerProfile` 1—1 `CvParsedData`; 1—* `JobSeekerSkill`; *—* `Skill` (via `job_seeker_skills`); 1—* `Application`; *—* `JobPost` (via `saved_jobs`).
- `CompanyProfile` 1—* `JobPost`.
- `JobPost` *—* `Skill` (via `job_required_skills`); 1—* `Application`; belongs to `CompanyProfile`.
- `Application` belongs to `JobPost` and `JobSeekerProfile`; 1—* `ApplicationStatusHistory`.
- `Message` belongs to sender `User`, receiver `User`, optional `JobPost`.

> Note: the authored `docs/ERD  Database Schema.txt` is a simplified conceptual ERD (8 entities). The implemented schema is richer (bilingual columns, messaging, notifications, saved jobs, views, status history). Cite the migrations as authoritative.

---

## 12. API Endpoints / Services

All routes from `backend/routes/api.php` (base prefix `/api`; envelope `{success, data, message, errors}` via `ApiResponse`). Auth group requires `auth:sanctum` + `verified` + `ban.check`.

### Public (no auth)
| Method & Path | Controller@method | Purpose |
|---|---|---|
| GET `/public/jobs` | PublicJobController@index | List active public jobs (filters via query) |
| GET `/public/jobs/{job}` | PublicJobController@show | Public job detail |
| GET `/public/companies` | PublicCompanyController@index | List companies |
| GET `/public/companies/{company}` | PublicCompanyController@show | Public company profile |
| GET `/public/skills` | SkillController@index | Skills lookup |

### Auth (throttled `throttle:auth`)
| POST `/auth/register` | AuthController@register | Create user (role required); returns 201 |
| POST `/auth/login` | AuthController@login | Session login; rejects banned/unverified |
| GET `/auth/verify-email` | AuthController@verifyEmail | Verify email by token |
| POST `/auth/resend-verification` | AuthController@resendVerification | Resend link (always 200, anti-enumeration) |
| POST `/auth/forgot-password` | PasswordResetController@sendLink | Send reset link |
| POST `/auth/reset-password` | PasswordResetController@reset | Reset password |

### Authenticated — shared
| POST `/auth/logout` | AuthController@logout | End session |
| GET `/auth/me` | AuthController@me | Current user (+profile) |
| GET `/skills` | SkillController@index | Skills lookup |
| GET `/jobs`, `/jobs/{job}` | JobController@index/show | Authenticated job browse |
| POST `/jobs/{job}/view` | JobController@recordView | Record a job view |
| GET `/notifications`, PATCH `/notifications/{id}/read`, POST `/notifications/read-all` | NotificationController | In-app notifications |
| GET `/messages`, GET `/messages/{user_id}`, POST `/messages`, PATCH `/messages/{user_id}/read`, DELETE `/messages/{user_id}` | MessageController | Conversations / send / read / delete |

### Job Seeker (`role:job_seeker`)
| GET/PUT `/profile`, POST `/profile/avatar`, POST `/profile/cover`, POST `/profile/verify-password`, PUT `/profile/settings` | ProfileController | Profile management |
| POST `/cv/upload` (throttle:cv_upload) | CVController@upload | Upload CV (PDF/DOCX ≤5MB); dispatches parse job; 202 |
| GET `/cv/status`, GET `/cv/parsed`, PUT `/cv/parsed` | CVController | Parse status / view / edit parsed data |
| POST `/seeker/skills`, DELETE `/seeker/skills/{skill_id}` | SkillController@addToSeeker/removeFromSeeker | Manage seeker skills |
| GET `/seeker/saved-jobs`, POST/DELETE `/seeker/saved-jobs/{job}` | SavedJobController | Bookmarks |
| GET `/seeker/jobs/recommended` (cv.uploaded) | JobRecommendationController@index | Ranked recommendations (top 20 by local score) |
| GET `/applications` | ApplicationController@index | My applications (paginated) |
| POST `/applications` (cv.uploaded) | ApplicationController@store | One-click apply; computes score; 201 |
| GET `/applications/{application}` | ApplicationController@show | Application detail (policy-guarded) |
| GET `/applications/{application}/feedback` | ApplicationController@feedback | Rejection feedback (missing skills) |
| DELETE `/applications/{application}` | ApplicationController@destroy | Withdraw application |

### Company (`role:company`, prefix `/company`)
| GET `/company/dashboard` | CompanyDashboardController@index | Stats, recent applicants, top jobs |
| GET/PUT `/company/profile`, POST `/company/profile/logo`, POST `/company/verify-password`, PUT `/company/settings` | CompanyProfileController | Company profile |
| GET/POST `/company/jobs`, GET/PUT/DELETE `/company/jobs/{job}`, PATCH `/company/jobs/{job}/toggle` | CompanyJobController | Job CRUD + activate/deactivate |
| GET `/company/jobs/{job}/applicants` | ATSController@applicants | Ranked applicants for one job |
| GET `/company/applicants` | ATSController@index | Ranked applicants across all jobs (search/status/sort) |
| GET `/company/applicants/{application}` | ATSController@show | Applicant detail |
| GET `/company/applicants/{application}/cv` | ATSController@downloadCV | Download applicant CV (owner-only) |
| PATCH `/company/applicants/{application}/status` | ApplicationController@updateStatus | Change status; triggers email/notification |

### Admin (`role:admin`, prefix `/admin`)
| GET `/admin/stats` | AdminController@stats | Platform metrics |
| GET `/admin/users`, GET `/admin/users/{user}` | AdminController@users/showUser | List/show users (filters) |
| PATCH `/admin/users/{user}/ban` | AdminController@toggleBan | Ban/unban (self/admin protected) |
| PATCH `/admin/users/{user}/verify` | AdminController@verifyUser | Manually verify user |
| GET `/admin/jobs` | AdminController@jobs | Jobs incl. trashed |
| DELETE `/admin/jobs/{job}` | AdminController@forceDeleteJob | Permanent delete |
| POST `/admin/verify-password`, PUT `/admin/settings` | AdminController | Settings |

### AI engine services (`Ai/main.py`)
| GET `/health` | health check → `{status:"ok"}` |
| POST `/parse-cv` (X-API-Key) | multipart file → `{success, data:{name,email,phone,location,technical_skills,soft_skills,all_skills,education,experience}}` |
| POST `/match-skills` (X-API-Key) | `{candidate_skills[], job_skills_str}` → `{success, data:{ai_score, missing_skills, matched_skills}}` |

> Full request/response field lists are confirmed in `Ai/main.py` and `backend/app/Services/AiService.php`. Frontend endpoint map: `frontend/src/api/endpoints.js`. A Postman collection is at `backend/smart_job_postman_collection.json` for exact payloads.

---

## 13. User Flows

### Registration / Login (`docs/SD-01`, `AuthController`, frontend `auth/`)
1. User submits registration form (name, email, password, role) → `POST /auth/register`.
2. Backend validates (`RegisterRequest`), creates user with hashed password, creates an `email_verification_tokens` row, sends verification email (`VerificationEmail`).
3. User clicks link → `GET /auth/verify-email?token=...` sets `email_verified_at`.
4. Login `POST /auth/login`: rejected if banned (403) or unverified (401); on success regenerates session and returns user (+profile). Client redirects by role (`frontend/src/utils/constants.js@getRoleRedirect`).
5. SPA bootstraps session on load via `GET /auth/me` (`frontend/src/context/AuthContext.jsx`).

### Job Seeker main journey (`docs/SD-02..04`)
1. Upload CV `POST /cv/upload` → file stored privately, `cv_parse_status='processing'`, `ParseCVJob` queued.
2. Worker calls AI `/parse-cv`, stores `cv_parsed_data`, creates `job_seeker_skills` (source=`cv`), sets `cv_parse_status='completed'`. Seeker can edit via `PUT /cv/parsed` (`CvReviewPage`).
3. View recommendations `GET /seeker/jobs/recommended` (requires CV) → jobs scored by `MatchingService@calculateLocalScore`, sorted desc, top 20.
4. Apply `POST /applications` → duplicate check, local score + missing skills computed synchronously, `Application` created (status `applied`), status-history row, company notified; `RefineApplicationScoreJob` upgrades score via AI asynchronously.
5. Track applications `GET /applications`; on rejection, view feedback `GET /applications/{id}/feedback` (missing skills).

### Company / Recruiter journey (`docs/SD-05..06`)
1. Build company profile; post job `POST /company/jobs` with required skills (`StoreJobRequest`).
2. Review applicants `GET /company/jobs/{job}/applicants` or `/company/applicants` — auto-ranked by AI score (`MatchingService@rankApplications`), with search/status/sort (experience/newest).
3. Change status `PATCH /company/applicants/{id}/status`:
   - `rejected` → `GapAnalyzerService` computes missing skills, `SendRejectionEmailJob` emails candidate.
   - `approved` → notification + `SendApprovedEmailJob`.
   - Always writes `application_status_history` and fires `ApplicationStatusChanged` event.
4. Download applicant CV (`GET /company/applicants/{id}/cv`), message candidate.

### Admin journey
1. View `GET /admin/stats`; list/manage users (`/admin/users`, ban/verify); manage jobs (`/admin/jobs`, force delete). Self-ban and admin-ban are blocked (`AdminController@toggleBan`).

---

## 14. Diagrams Needed

The repo already contains several authored diagrams (text + JPEG) under `docs/`. Recommended set for the documentation:

- **Use Case diagram** — actors Job Seeker, Company/Recruiter, Admin (+ AI Engine, Email Service). Not present as a diagram in repo → **create new**. Base on §5–6 and `docs/system requirements analysis.txt`.
- **ERD** — exists as `docs/ERD  Database Schema.jpeg` / `.txt` and `docs/Database Schema  ERD.jpeg`, but simplified. **Update** to the full implemented schema in §11 (add messages, notifications, saved_jobs, job_post_views, application_status_history, bilingual columns).
- **Sequence diagrams** — already authored as `docs/SD-01`…`SD-06` (Registration & Email Verification, CV Upload & AI Parsing, Smart Job Recommendation, One-Click Apply, Smart Rejection & Gap Analysis, Smart ATS Ranking), each with `.txt` + `.jpeg`. Verify against code and reuse.
- **Data Flow Diagram (DFD)** — **create new** (Level 0/1): CV → AI Engine → parsed JSON/skills → DB; skills + job requirements → Matching → score/recommendations/ATS ranking.
- **Architecture diagram** — **create new**: SPA (React/Vite) ↔ Laravel API (+queue worker, MySQL) ↔ FastAPI AI engine; plus Email Service. Base on §10.
- (Optional) **Component/Deployment diagram** and **Class diagram** for the model layer (`backend/app/Models/`).

---

## 15. Screenshots Needed

Enumerated from `frontend/src/routeConfig.jsx` (every implemented screen):

**Public:** Home (`/`), About (`/about`), Companies (`/companies`), Public Company Profile (`/companies/:id`), Public Jobs (`/jobs`), Public Job Details (`/jobs/:id`), Salaries (`/salaries`), Contact (`/contact`), FAQ (`/faq`), Privacy (`/privacy`), Terms (`/terms`).

**Auth:** Register (`/register`), Login (`/login`), Forgot Password (`/forgot-password`), Reset Password (`/reset-password`), Email Verification Result (`/email-verification`), Session Expired (`/session-expired`).

**Job Seeker:** Dashboard (`/seeker/dashboard`), CV Upload (`/seeker/cv-upload`), CV Parsing (`/seeker/cv-parsing`), CV Review (`/seeker/cv-review`), Job Search (`/seeker/jobs`), Job Details (`/seeker/jobs/:id`), Recommended Jobs (`/seeker/recommended-jobs`), Saved Jobs (`/seeker/saved-jobs`), Applications (`/seeker/applications`), Application Details (`/seeker/applications/:id`), Rejection Feedback (`/seeker/applications/:id/rejection-feedback`), Skills (`/seeker/skills`), Interviews (`/seeker/interviews`), Messages (`/seeker/messages`), Notifications (`/seeker/notifications`), Profile (`/seeker/profile`), Edit Profile (`/seeker/profile/edit`), Settings (`/seeker/settings`).

**Company:** Dashboard (`/company/dashboard`), Profile (`/company/profile`), Profile Preview (`/company/profile/preview`), Edit Profile (`/company/profile/edit`), Manage Jobs (`/company/jobs`), Create Job (`/company/jobs/create`), Edit Job (`/company/jobs/:id/edit`), Job Preview (`/company/jobs/:id/preview`), Job Details (`/company/jobs/:id`), Applicants (`/company/applicants`, `/company/jobs/:id/applicants`), Applicant Profile (`/company/applicants/:id`), Applicant CV Viewer (`/company/applicants/:id/cv`), Applicant Matching Details (`/company/applicants/:id/matching`), Messages (`/company/messages`), Notifications (`/company/notifications`), Settings (`/company/settings`).

**Admin:** Dashboard (`/admin/dashboard`), Users (`/admin/users`), User Details (`/admin/users/:id`), User Profile (`/admin/users/:id/profile`), Jobs (`/admin/jobs`), Job Details (`/admin/jobs/:id`), Activity Log (`/admin/activity-log`), Settings (`/admin/settings`).

**Errors:** 401 (`/401`), 403 (`/403`), 404 (`/404`), 500 (`/500`).

> Capture each in both EN and AR (RTL) to evidence the bilingual UI. Note: `JobSeekerInterviewsPage` and `AdminActivityLogPage` exist as screens, but no dedicated backend endpoints were found for "interviews" or "activity log" — they appear to be derived from notifications/messages/status-history. Confirm data source before documenting them as standalone features (**UNKNOWN**).

---

## 16. Implementation Details

### Important modules
- **AI HTTP client + fallback** (`backend/app/Services/AiService.php`, `MatchingService.php`): all AI calls go through `AiService` (timeout 30s parse / 10s match, `X-API-Key`); `MatchingService` catches failures and falls back to a local score so the product stays functional offline.
- **Async pipeline** (`backend/app/Jobs/`): `ParseCVJob` (queue `cv-parsing`, 3 tries, `WithoutOverlapping` per profile, DB transaction, sets status pending→processing→completed/failed); `RefineApplicationScoreJob` upgrades the synchronous local score using the AI service; rejection/approval emails are queued.
- **Localization trait** (`backend/app/Traits/HasLocalizedFields.php`) exposes `*_localized` accessors selecting `_ar` columns per request locale (`SetLocale` middleware reads `X-Locale`).
- **Frontend data layer** (`frontend/src/api/`, `frontend/src/services/`): endpoint map + axios/fetch clients with CSRF cookie handling and a 401 interceptor that redirects to login preserving destination.

### Important algorithms
- **CV parsing** (`Ai/models/cv_parser.py`): per-format text extraction (PyPDF2 / python-docx / txt) → email & phone via regex → name via 3-strategy cascade (heuristic top-line → labeled-field regex → spaCy PERSON NER) → location via spaCy GPE/LOC NER → section detection (education/experience/skills/certifications) by header regex. spaCy model lazy-loaded as a singleton.
- **Skill extraction** (`Ai/models/skill_extractor.py`): master-vocabulary regex matching + common-tech keyword list; categorized into technical vs. soft via a soft-skills keyword set.
- **Skill-gap matching (live)** (`Ai/models/matcher.py@compute_skill_gap` via `/match-skills`): splits job-skills string, substring/containment match against candidate skills → matched/missing; `ai_score = matched_count / total_required * 100` (`Ai/main.py`).
- **Local weighted score** (`backend/app/Services/MatchingService.php@calculateLocalScore`): mandatory vs. optional required skills weighted **70/30** (`backend/config/matching.php`); used for recommendation lists and synchronous apply.
- **ATS ranking** (`MatchingService@rankApplications`): lazily computes a local score where missing, then `sortByDesc('ai_score')`; optional sort by experience/newest.
- **Two-stage semantic matcher (present, not wired to endpoints)** (`Ai/models/matcher.py@compute_matches`, `embedder.py`): bi-encoder cosine retrieval + cross-encoder re-rank + skill overlap (50/30/20 hybrid). Documented but not reachable through `Ai/main.py` — treat as future/experimental.

### Validation / security handling
- **Validation:** FormRequests (`backend/app/Http/Requests/`); CV upload validated by both `mimetypes` and `mimes` plus `max:5120` KB (`CVController`); AI side enforces extension allowlist, 10MB cap (streamed), and **magic-byte** checks (`Ai/main.py`).
- **Auth/session:** Sanctum stateful cookie auth, CSRF cookie (`/sanctum/csrf-cookie`), session regeneration on login/logout; passwords `hashed` cast (bcrypt) (`User.php`).
- **Authorization:** role middleware + Policies (`backend/app/Policies/ApplicationPolicy.php`, `JobPostPolicy.php`); CV download restricted to owning company; admins can't self-ban or ban admins.
- **Abuse protection:** rate limiting (`throttle:auth`, `throttle:cv_upload`), ban enforcement (`BanCheck`), anti-enumeration on resend-verification.
- **Hardening details:** random UUID CV filenames (path not guessable); `numpy.load(..., allow_pickle=False)` to prevent deserialization RCE (`matcher.py`); AI service requires `AI_ENGINE_KEY` (no default) and restricts CORS origins.
- **Consistent error envelope:** global exception handlers map validation/auth/authorization/not-found/DB/HTTP errors to JSON with localized messages (`backend/bootstrap/app.php`).

---

## 17. Testing Summary

### What exists (`backend/tests/`)
- **Feature tests:** `AuthTest` (register; cannot login without verification), `CVUploadTest` (seeker can upload CV), `JobTest` (company can post job), `ApplicationTest` (seeker can apply; company can reject), `ATSTest`, `DemoDataSeederTest`, `ExampleTest`. (`backend/tests/Feature/`)
- **Unit tests:** `MatchingServiceTest` — perfect score when all skills match, partial mandatory match, zero score when no match, full score when no required skills. (`backend/tests/Unit/MatchingServiceTest.php`)
- **CI:** GitHub Actions runs the backend suite against MySQL 8 (`.github/workflows/ci.yml`).
- No automated tests were found for the **frontend** or the **AI service** → **UNKNOWN/none** (only ESLint configured for frontend).

### What can be tested (suggested cases)
- **Auth:** registration validation (role required, password strength), email verification token (valid/expired), login blocks for banned/unverified, password reset.
- **CV upload/parse:** reject wrong MIME/oversized; queue dispatch; status transitions processing→completed/failed; parsed JSON + `job_seeker_skills` creation; AI-down path leaves status failed.
- **Matching:** `calculateLocalScore` weighting (70/30), `/match-skills` percentage and missing/matched lists, AI fallback path.
- **Applications:** duplicate-apply 409, gating without CV, score/missing-skills persisted, status-history + notifications on status change, rejection email contains missing skills.
- **ATS:** applicants ranked descending by score; search/status/sort; pagination; CV download authorization (owner vs. non-owner).
- **Admin:** stats correctness; self-ban/admin-ban blocked; force-delete job.
- **AI unit (recommended new):** `cv_parser` extractors (email/phone/name strategies), `skill_extractor` categorization, `compute_skill_gap` edge cases (empty inputs).
- **Frontend (recommended new):** route guards (ProtectedRoute/RoleRoute), CSRF/401 interceptor, EN/AR + RTL rendering.

---

## 18. Limitations

Grounded in code observations:

1. **Semantic matching is not used in production paths.** `Ai/models/matcher.py@compute_matches` and `embedder.py` (bi/cross-encoder) are implemented but **not exposed** by `Ai/main.py`; the live `/match-skills` and all Laravel scoring use keyword/substring overlap or local weighted counts. The "two-stage >90% accuracy" design is dormant. (`Ai/main.py`, `MatchingService.php`)
2. **Recommendations use the local scorer, not the AI**, by design, to avoid N HTTP calls per list (explicit comment in `JobRecommendationController.php`). Quality is bounded by exact skill-id overlap.
3. **CV experience/education extraction is shallow.** `years_of_experience` is only stored if the AI returns a numeric value; otherwise null (`ParseCVJob.php`). Section text is heuristic and may misclassify.
4. **LinkedIn integration is unused.** `Ai/models/linkedin_api.py` scrapes LinkedIn's guest API but is not called anywhere in the service; it is fragile (HTML-class dependent) and not wired in.
5. **Skill matching is substring-based**, which can over/under-match (e.g., "java" ⊂ "javascript"). (`matcher.py`, `MatchingService`)
6. **No production deployment artifacts.** No Dockerfile/compose, no web-server/TLS config; setup is local Windows/XAMPP. Production hosting is **UNKNOWN**. (`scripts/`, `*.cmd`, `README.md`)
7. **No frontend or AI automated tests**; only backend PHPUnit + ESLint.
8. **Some screens may lack dedicated backends** (Interviews, Activity Log) — appear derived from notifications/messages/status history; confirm. (`frontend/src/pages/...`, no matching routes in `api.php`)
9. **Empty `Smart-Job-Portal/` directory** at the repo root (no contents) — likely leftover; not part of the build.
10. **Single AI instance, synchronous 30s timeout** for parse; no autoscaling/retry beyond queue tries (`AiService.php`, `ParseCVJob.php`).
11. **Email provider not committed** (env-driven; `.env` gitignored) — actual delivery channel **UNKNOWN**.

---

## 19. Future Work

Suggested, consistent with the existing architecture:

1. **Activate semantic matching:** expose `matcher.compute_matches`/`EmbeddingEngine` via a new AI endpoint and call it for recommendations and ATS (replacing/augmenting substring overlap), with precomputed job embeddings.
2. **Improve recommendation quality:** batch/async semantic scoring or a nightly job to cache match scores, so the list endpoint can use AI-grade relevance without per-request latency.
3. **Stronger CV understanding:** structured education/experience extraction (dates, titles, durations), multilingual (Arabic) CV parsing.
4. **Real external job integration:** wire `linkedin_api.py` (or an official API/dataset) behind an endpoint, or remove it; add caching and resilience.
5. **Interviews module:** add first-class interview scheduling endpoints/models to back `JobSeekerInterviewsPage`.
6. **Productionization:** containerize (Docker) the three services, add HTTPS/reverse proxy, environment configs, and DB backups (addresses NFR-02.2, NFR-04.2).
7. **Test coverage:** add AI (pytest) and frontend (component/E2E) tests; expand backend coverage; add CI steps for frontend/AI.
8. **Observability & scaling:** queue monitoring, AI service health/retry/circuit-breaker, horizontal scaling of the AI engine.
9. **Skill normalization:** canonical skill taxonomy/synonyms to fix substring mismatches (java vs javascript).
10. **Realtime messaging/notifications:** WebSockets/broadcasting (an `ApplicationStatusChanged` event already exists to build on).

---

### Source map (primary evidence)
- API surface & middleware: `backend/routes/api.php`, `backend/bootstrap/app.php`
- Business logic: `backend/app/Http/Controllers/`, `backend/app/Services/`, `backend/app/Jobs/`
- Data model: `backend/database/migrations/`, `backend/app/Models/`, `smart_job.sql`
- AI engine: `Ai/main.py`, `Ai/models/`, `Ai/requirements.txt`
- Frontend: `frontend/src/routeConfig.jsx`, `frontend/src/api/`, `frontend/src/pages/`, `frontend/package.json`
- Authored docs: `docs/system requirements analysis.txt`, `docs/ERD  Database Schema.txt`, `docs/SD-01…SD-06`, `docs/Chapter 2 Background and Related Work.txt`
- Ops/CI: `.github/workflows/ci.yml`, `scripts/`, `*.cmd`, `README.md`
