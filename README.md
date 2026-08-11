# SkillGap AI — Unified AI-Powered Recruitment & Career Intelligence Platform

A unified enterprise-grade recruitment and career acceleration platform merging **SkillGap AI** and **ATS Resume Scorer** into a single cohesive SaaS solution.

---

## 🌟 Core Platform Pillars & Architecture

### 1. Deterministic ATS Scoring Engine (Zero Hallucination)
- **100% Mathematical & Deterministic Scoring**:
  - **Formatting & Structure (20%)**: Section completeness, layout clarity, contact parseability.
  - **Keyword & Technical Taxonomy (25%)**: ESCO taxonomy normalization and RapidFuzz matching.
  - **Content Quality & Action Verbs (25%)**: Power action verbs, quantifiable metrics, and bullet point length.
  - **Skill Validation (15%)**: Cosine similarity embedding validation matching claimed skills against actual projects and experience descriptions.
  - **ATS System Compatibility (15%)**: PII location detection and non-standard character screening.
- **LLM Role Guardrails**: Groq LLMs are strictly isolated from scoring and exclusively used for structural JSON entity extraction, personalized resume recommendations, learning roadmaps, recruiter candidate summaries, and targeted technical interview questions.

### 2. Single-Source Resume Pipeline & Skill Gap Engine
- Candidate resumes are uploaded and parsed once.
- The **Skill Gap Engine** consumes the pre-parsed resume structure to benchmark against FAANG/top tech company roles or custom JDs without redundant reparsing.
- Generates an actionable **4-Week Learning Roadmap** with free curated resources (FreeCodeCamp, Official Docs, Coursera, YouTube).

### 3. Student Career Acceleration Portal
- **Interactive Dashboard**: Real-time ATS gauge, application status tracker, and skill gap summaries.
- **ATS Resume Scorer**: Instant 5-pillar score cards, radar chart, validated vs. unvalidated skills breakdown, and downloadable branded PDF reports.
- **Verified Job Board**: One-click application with verified ATS score submission.
- **Company DSA Tracker**: Curated LeetCode problems categorized by company and topic.
- **Psychometric Career Assessment**: 10-question evaluation matching personality and technical intuition to optimal engineering roles.
- **Real-Time Tech Hiring News**: Live industry trends and placement feeds.

### 4. Recruiter Intelligence Console
- **Recruiter Dashboard**: Job statistics, total candidate pipeline, and average ATS metrics.
- **Job Postings Manager**: Configure minimum ATS thresholds and required competencies.
- **Candidate Pipeline & Ranking**: Deterministic applicant sorting by ATS Score or Match %, status filtering (Applied, Reviewing, Shortlisted, Rejected, Offered).
- **Candidate Evaluation Drawer**: Full candidate profile, 5-pillar ATS breakdown, project evidence tags, and **On-Demand AI Candidate Summary & Technical Interview Questions**.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.12, FastAPI, Supabase (PostgreSQL & Storage), Supabase Python SDK, SentenceTransformers (`all-MiniLM-L6-v2`), spaCy (`en_core_web_sm`), RapidFuzz, Groq API, Cloudinary, xhtml2pdf, PyPDF2, pdfplumber, python-docx.
- **Frontend**: React 19, TailwindCSS, Framer Motion, Recharts, Lucide Icons, Sonner, Axios.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.12+
- Node.js 18+ and Yarn / npm
- Supabase Project URL & Key (Free tier at [supabase.com](https://supabase.com))
- Groq API Key (Optional for LLM features; rule-based fallbacks are built-in)

### Database Setup (Supabase)
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** -> **New Query**, paste the contents of `backend/supabase_schema.sql`, and click **Run**.
3. Copy your project URL and `anon` / `service_role` key into your `.env` file (`SUPABASE_URL` and `SUPABASE_KEY`).

### 1. Run the Entire Project (Single Command)
```bash
npm run dev
```
Runs the FastAPI Backend on `http://localhost:8000` and the React Frontend on `http://localhost:3000`.

### 2. Frontend Setup
```bash
# Run frontend application (runs on http://localhost:3000)
./run_frontend.sh
```

### 3. Running Unit Tests
```bash
PYTHONPATH=backend .venv/bin/pytest backend/tests -v
```

---

## 🌐 Public Cloud Deployment Guide (Vercel + Render + Supabase)

### Step 1: Database Setup on **Supabase**
1. Create a project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** -> **New Query**, paste [backend/supabase_schema.sql](file:///Users/agnikdutta/Documents/CODING/AI%20ATS%20Scorer/backend/supabase_schema.sql), and click **Run**.
3. Go to **Project Settings** -> **API**, and copy:
   - `Project URL`
   - `anon / public key` or `service_role key`

---

### Step 2: Backend Deployment on **Render** (Native Python Web Service)
1. Push your repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** -> **Web Service**.
3. Connect your repository. Render will automatically detect the [render.yaml](file:///Users/agnikdutta/Documents/CODING/AI%20ATS%20Scorer/render.yaml) Blueprint!
4. Or configure manually:
   - **Environment**: `Python 3`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt && python -m spacy download en_core_web_sm`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Set Environment Variables in Render:
   - `SUPABASE_URL`: `https://your-project.supabase.co`
   - `SUPABASE_KEY`: `your_supabase_key`
   - `JWT_SECRET_KEY`: `generate_a_random_32_byte_string`
   - `GROQ_API_KEY`: `your_groq_api_key` (from [console.groq.com](https://console.groq.com))
6. Click **Deploy Web Service**. Copy your live backend URL (e.g. `https://skillgap-backend.onrender.com`).

---

### Step 3: Frontend Deployment on **Vercel**
1. In [Vercel Dashboard](https://vercel.com), click **Add New...** -> **Project**.
2. Import your GitHub repository.
3. Configure project settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable in Vercel:
   - `VITE_BACKEND_URL`: `https://skillgap-backend.onrender.com` (Your deployed Render backend URL)
5. Click **Deploy**. Your app is live with global CDN edge performance and SSL!

---

## 📁 Repository Structure

```
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py              # Auth & RBAC dependencies
│   │   │   └── v1/                  # API v1 Routers (auth, ats, skill_gap, jobs, recruiter, student, career, admin)
│   │   ├── core/                    # Settings (Pydantic Settings) & Security (JWT, bcrypt)
│   │   ├── database/                # Motor & Beanie ODM initialization
│   │   ├── models/                  # Beanie Document Models (User, Resume, ATSReport, Job, Application, etc.)
│   │   ├── schemas/                 # Pydantic v2 Request/Response schemas
│   │   ├── services/                # ATS Scorer, Resume Parser, Groq, Skill Gap, Taxonomy, DSA, News, PDF Report
│   │   └── main.py                  # FastAPI Application Lifespan & Router Mount
│   ├── tests/                       # Pytest test suite
│   └── requirements.txt
├── Skill-Booster-AI-main/
│   └── frontend/
│       ├── src/
│       │   ├── components/          # Navbar, ThemeToggle, UI components
│       │   ├── context/             # AuthContext, ThemeContext
│       │   ├── lib/                 # Axios client with auto-refresh JWT interceptor
│       │   ├── pages/               # Dashboard, UploadResume, SkillAnalysis, JobListings, DSATracker, CareerTest, Recruiter, Admin
│       │   └── App.js               # Main React router
│       └── package.json
├── run_backend.sh                   # One-click backend startup script
├── run_frontend.sh                  # One-click frontend startup script
└── README.md
```

---

## 🔒 API Endpoints Overview (`/api/v1`)

| Module | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `POST` | `/auth/register` | Register student or recruiter |
| **Auth** | `POST` | `/auth/login` | JWT access & refresh token login |
| **Auth** | `GET` | `/auth/me` | Current authenticated user profile |
| **ATS** | `POST` | `/ats/upload-and-analyze` | Upload resume & run 5-pillar ATS scoring |
| **ATS** | `GET` | `/ats/reports/{id}` | Get ATS score report breakdown |
| **ATS** | `GET` | `/ats/reports/{id}/export-pdf` | Download branded PDF report |
| **Skill Gap** | `POST` | `/skill-gap/analyze` | Single-source skill gap analysis & 4-week roadmap |
| **Skill Gap** | `GET` | `/skill-gap/companies` | List benchmark target companies |
| **Jobs** | `GET` | `/jobs` | Browse and filter open positions |
| **Jobs** | `POST` | `/jobs/{id}/apply` | Submit verified ATS application |
| **Recruiter** | `GET` | `/recruiter/dashboard` | High-level candidate & job metrics |
| **Recruiter** | `POST` | `/recruiter/jobs` | Post new vacancy with min ATS score |
| **Recruiter** | `GET` | `/recruiter/jobs/{id}/candidates` | Deterministically ranked applicants |
| **Recruiter** | `POST` | `/recruiter/applications/{id}/ai-summary` | Generate Groq AI candidate summary & interview Qs |
| **Recruiter** | `PATCH` | `/recruiter/applications/{id}/status` | Update candidate hiring pipeline status |
| **Career** | `GET` | `/career/test/questions` | Psychometric assessment questions |
| **Career** | `POST` | `/career/test/submit` | Evaluate answers & predict career path |
| **Career** | `GET` | `/career/dsa/all` | Company-categorized DSA problem tracker |
| **Career** | `GET` | `/career/news` | Live tech recruitment news |
| **Admin** | `GET` | `/admin/dashboard` | System health & platform analytics |
