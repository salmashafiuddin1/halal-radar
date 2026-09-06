# System Architecture: Halal Restaurant Visibility Analyzer

## Overview

This application helps halal restaurants understand their visibility on Claude AI. It tests whether Claude mentions a restaurant when asked realistic customer questions, scores visibility across 5 content categories, and provides actionable recommendations for improvement.

---

## System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│              (http://localhost:3001)                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP Requests (Axios)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                              │
│                  localhost:3001                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Landing.jsx: Form Entry                                │    │
│  │ - Restaurant name (required)                            │    │
│  │ - Location (required)                                   │    │
│  │ - Website (optional)                                    │    │
│  └──────────────┬──────────────────────────────────────────┘    │
│                 │ POST /api/analyze                              │
│  ┌──────────────▼──────────────────────────────────────────┐    │
│  │ Results.jsx: Display Analysis                           │    │
│  │ - Overall visibility score (0-100%)                     │    │
│  │ - Radar chart (5 clusters)                              │    │
│  │ - Pie chart (mentioned vs not found)                    │    │
│  │ - Content recommendations                               │    │
│  │ - Download JSON report                                  │    │
│  └─────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP POST
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI)                              │
│                  localhost:8000                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ POST /api/analyze                                       │    │
│  │  1. Generate 10 realistic questions (2 per cluster)    │    │
│  │  2. Ask Claude each question (in parallel)              │    │
│  │  3. Check if restaurant mentioned in responses          │    │
│  │  4. Score visibility per cluster                        │    │
│  │  5. For invisible clusters, generate recommendations    │    │
│  │  6. Calculate overall score                             │    │
│  │  7. Fetch business data (mock Yelp)                     │    │
│  │  8. Calculate visibility gap                            │    │
│  │  9. Save to database                                    │    │
│  │  10. Return complete analysis                           │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Claude API Calls (Anthropic SDK)                        │    │
│  │ - AsyncAnthropic client                                 │    │
│  │ - Model: claude-haiku-4-5-20251001 (cost-optimized)    │    │
│  │ - Parallel calls via asyncio.gather()                   │    │
│  │ - ~5 seconds total (10 questions in parallel)           │    │
│  └──────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ SQL Queries
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DATABASE (SQLite)                              │
│                backend/data.db                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Table: analyses                                         │    │
│  │ Columns:                                                │    │
│  │  - id (TEXT PRIMARY KEY): UUID of analysis              │    │
│  │  - entity_name (TEXT): Restaurant name                  │    │
│  │  - location (TEXT): Restaurant location                 │    │
│  │  - category (TEXT): "Halal Restaurant"                  │    │
│  │  - overall_score (INTEGER): 0-100 visibility %          │    │
│  │  - created_at (TEXT): ISO timestamp                     │    │
│  │  - payload (TEXT): Full JSON analysis result            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. Frontend (React)

**Landing.jsx**
- Entry point for users
- Form inputs: restaurant name, location, website (optional)
- Validation: name and location required
- API call via axios with 180-second timeout
- Navigation to results page on success

**Results.jsx**
- Displays full analysis
- Transforms backend data into Recharts format
- Shows: overall score, radar chart, pie chart, recommendations
- Download functionality (JSON export)
- Fetch from database if page is refreshed

**Tech Stack**
- React 18
- React Router (navigation)
- Axios (HTTP client)
- Recharts (data visualization)
- shadcn/ui (component library)
- Tailwind CSS (styling)

### 2. Backend (FastAPI)

**Core Endpoints**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/config` | GET | Returns cluster definitions and engine info |
| `/api/analyze` | POST | Main analysis endpoint |
| `/api/analyses/{id}` | GET | Fetch stored analysis by ID |
| `/api/analyses` | GET | List recent analyses |

**Key Functions**

- **generate_questions()**: Ask Claude to create 10 realistic halal restaurant questions (2 per cluster)
- **probe_question()**: Ask a question, check if restaurant is mentioned, truncate answer
- **_mentions_entity()**: Smart string matching (exact match OR all significant words present)
- **generate_recommendation()**: Ask Claude for content fix recommendation, clean markdown
- **calculate_visibility_gap()**: Compare Claude's knowledge to public data
- **analyze()**: Main orchestration function

**Tech Stack**
- FastAPI 0.110.1
- Uvicorn (ASGI server)
- AsyncAnthropic (Anthropic SDK)
- aiosqlite (async SQLite)
- Pydantic (data validation)
- Python 3.11

### 3. Database (SQLite)

**Design Rationale**
- Self-contained (single file, no server)
- Async-friendly with aiosqlite
- Fast enough for MVP (100+ analyses)
- Easy deployment to Railway
- Full analysis stored as JSON in `payload` column

**Query Pattern**
- Insert: Save new analysis with UUID
- Fetch: Get by ID or list recent

---

## Data Flow

### Request Flow (When User Submits Form)

```
User enters "Halal Guys" + "New York, NY"
        ↓
Frontend validates input
        ↓
Frontend POST /api/analyze
        ↓
Backend:
  1. Generate 10 questions via Claude
  2. asyncio.gather() all 10 probe calls (parallel)
     - Each calls Claude with one question
     - Checks if "Halal Guys" mentioned in response
     - Stores mention status + snippet
  3. Group results by cluster (2 questions per cluster)
  4. Calculate visibility % per cluster
  5. For 0% clusters, generate recommendations (parallel)
  6. Fetch business data (mock Yelp: 4.5 rating, 128 reviews)
  7. Calculate visibility gap (Strong/Moderate/Significant)
  8. Save full AnalysisResult to database
        ↓
Backend returns AnalysisResult JSON
        ↓
Frontend transforms data for charts
        ↓
Frontend displays results
```

### Database Save

```
AnalysisResult object
  {
    id: "uuid",
    entity_name: "Halal Guys",
    location: "New York, NY",
    category: "Halal Restaurant",
    overall_score: 80,
    cluster_scores: [...],
    questions: [...],
    business_data: {...},
    claude_visibility_gap: "...",
    estimated_customer_impact: "...",
    created_at: "2026-09-06T..."
  }
        ↓
Saved to SQLite:
  INSERT INTO analyses (id, entity_name, location, category, overall_score, created_at, payload)
  VALUES ("uuid", "Halal Guys", "New York, NY", "Halal Restaurant", 80, "2026-09-06T...", "{full JSON}")
```

---

## Design Decisions & Rationale

### 1. Async/Parallel Processing (asyncio.gather)

**Decision**: Ask all 10 Claude questions simultaneously instead of sequentially

**Rationale**
- Sequential: 10 questions × ~5 sec each = 50 seconds (too slow)
- Parallel: All 10 questions at once = ~5 seconds total
- Each question is I/O-bound (waiting for API), not CPU-bound
- Users expect fast feedback

**Code**
```python
probe_results = await asyncio.gather(
    *(probe_question(q["question"], req.entity_name) for q in questions)
)
```

### 2. 5-Cluster Categorization System

**Decision**: Score visibility across 5 specific categories

**Rationale**
- Muslim customers have specific needs (halal certification, prayer times, community vibe)
- Generic "restaurant visibility" misses these needs
- 5 clusters balance granularity vs complexity
- Each cluster can have targeted content recommendations

**Clusters**
1. Menu & Offerings (halal certification, dishes)
2. Location & Hours (address, prayer facilities, parking)
3. Reviews & Reputation (customer ratings, trust)
4. Community & Culture (family atmosphere, social gatherings)
5. Pricing & Value (affordability, portions, deals)

### 3. Mock Yelp Data (Not Real API)

**Decision**: Return fake but realistic business data instead of calling real Yelp API

**Rationale**
- Real Yelp integration requires API key, rate limits, error handling (~3-4 hours)
- Mock data (4.5 rating, 128 reviews, menu items) is sufficient for MVP
- Demonstrates the concept without external dependencies
- Architecture supports easy swap to real Yelp API later

### 4. SQLite Database (Not MongoDB/PostgreSQL)

**Decision**: Use SQLite for data persistence

**Rationale**
- Self-contained (single file: backend/data.db)
- No server to manage or host
- Works offline
- Good async support via aiosqlite
- Fast for <1000 analyses
- Easy Railway deployment
- Scales to PostgreSQL if needed later

### 5. Claude Haiku (Not Claude 3.5 Sonnet)

**Decision**: Use claude-haiku-4-5-20251001 for all API calls

**Rationale**
- Cheapest model (~10x less than Sonnet)
- Fast enough for this task (generating questions, analyzing text)
- Hackathon budget constraint
- Sufficient intelligence for halal restaurant domain

### 6. Direct Anthropic SDK (Not Emergent Platform)

**Decision**: Call Claude API directly instead of using Emergent platform

**Rationale**
- Removes middleman (faster, cheaper)
- Simpler architecture
- Full control over async/parallel processing
- Direct access to latest models
- Fewer dependencies to manage

---

## Performance Characteristics

| Operation | Time | Reason |
|-----------|------|--------|
| Generate 10 questions | ~3 sec | Single Claude call |
| Probe 10 questions in parallel | ~5 sec | I/O-bound, run in parallel |
| Generate recommendations (up to 5 clusters) | ~10 sec | Sequential Claude calls for invisible clusters |
| Save to database | <1 sec | Local SQLite insert |
| **Total Analysis** | **~18 sec** | Most time is waiting for Claude API |

---

## Scalability Considerations

### Current Bottleneck
Claude API response time (5-10 seconds per call)

### To Improve
1. Cache common questions (same Q asked for different restaurants)
2. Batch recommendation requests (ask Claude to generate 5 recommendations at once)
3. Use faster Claude model if latency critical
4. Add frontend loading indicators (don't let user think it crashed)

### Database Scaling
- SQLite works for <1000 analyses
- To scale: Migrate to PostgreSQL (same async pattern via asyncpg)
- No code changes needed—abstraction layer already in place

---

## Security Considerations

### API Key
- Stored in `backend/.env` (not in repo)
- `.gitignore` prevents accidental commit
- Judges should provide their own key for testing

### User Data
- Full analysis stored in database
- No encryption (not needed for hackathon)
- Mock data only (no real Yelp data exposed)

### CORS
- Frontend can be on different origin (configured in backend)
- Allows easy deployment to separate Vercel/Railway instances

---

## Deployment

### Backend (Railway)
```
- Runtime: Python 3.11
- Build: nixpacks (automatic dependency detection)
- Start: uvicorn server:app --host 0.0.0.0 --port $PORT
- Environment: ANTHROPIC_API_KEY, CORS_ORIGINS
```

### Frontend (Vercel)
```
- Runtime: Node.js
- Build: npm run build (Create React App)
- Start: npm start
- Environment: REACT_APP_BACKEND_URL
```

### Local Development
```bash
# Backend
cd backend
pip install -r requirements.txt
python -m uvicorn server:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm start
```

---

## Architecture Strengths

✅ **Scalability**: Async design ready for high concurrency
✅ **Modularity**: Frontend/backend separated cleanly
✅ **Persistence**: Database stores all analyses
✅ **Performance**: Parallel processing reduces latency 10x
✅ **Simplicity**: Minimal dependencies, no complex services
✅ **Hackathon-Ready**: No authentication, single-page analysis

---

## Future Improvements

1. **Real Yelp API**: Replace mock data with actual business data
2. **Multi-LLM Comparison**: Test Claude vs ChatGPT vs Gemini
3. **Geo-Targeting**: Test if Claude's recommendations vary by location
4. **Historical Tracking**: Track visibility improvements over time
5. **Email Alerts**: Notify restaurants when visibility improves
6. **Advanced Analytics**: Heatmaps of which questions mention restaurants most
7. **Authentication**: Let restaurants create accounts and track their own analyses
8. **Batch Analysis**: Analyze 100 restaurants at once
