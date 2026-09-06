# Ummah Visibility - Halal Restaurant AI Visibility Analyzer

A web application that analyzes how well halal restaurants are discoverable through Claude AI, and provides specific, actionable recommendations to improve their visibility.

## Problem

Muslim customers search for halal restaurants using AI engines like Claude. But most halal restaurants don't appear in Claude's recommendations, causing them to lose customers.

**Question:** When Muslims search for "Where can I find halal biryani in my city?" — will Claude mention YOUR halal restaurant?

## Solution

This app tests visibility by:
1. Generating 10 realistic halal restaurant search questions (2 per category)
2. Asking Claude each question
3. Checking if your restaurant gets mentioned
4. Scoring visibility per category (Menu, Location, Reviews, Community, Pricing)
5. Providing specific content recommendations for invisible categories

## Tech Stack

**Backend:** FastAPI + SQLite + Claude Haiku API  
**Frontend:** React + Recharts + Tailwind + shadcn/ui  
**Deployment:** Railway (backend) + Vercel (frontend)  

## How It Works

### Backend Flow
1. **Generate Questions** - Claude creates 10 realistic halal restaurant search questions (2 per cluster)
2. **Probe Claude** - Ask each question to Claude in parallel, check if restaurant is mentioned
3. **Calculate Gap** - Compare what Claude knows vs what's publicly available (mock Yelp data)
4. **Generate Fixes** - For invisible categories, ask Claude what content the restaurant should publish
5. **Return Report** - Send complete analysis with score, recommendations, business data comparison

### Frontend Flow
1. User enters restaurant name + location
2. Click "Reveal my visibility"
3. Backend analyzes (~40 seconds)
4. See results: visibility score, radar chart, recommendations, business data comparison

## Key Features

- ⚡ Parallel processing (all 10 questions asked simultaneously)
- 🎯 5 content categories (Menu, Location, Reviews, Community, Pricing)
- 💡 Personalized recommendations for invisible categories
- 📊 Visual dashboard with radar charts and business data
- 💾 Database persistence (SQLite)
- 🚀 Production ready (deployed to Railway + Vercel)

## Database

Uses SQLite (`backend/data.db`) to store all analysis results.

Each analysis includes:
- Restaurant name, location, category
- Overall visibility score (0-100%)
- Per-category scores
- All 10 questions + Claude's responses
- Recommendations for content improvement

View stored analyses:
```bash
python3 view_database.py          # Quick summary
python3 view_database_full.py     # Detailed results
```

## Running Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
export ANTHROPIC_API_KEY=your_key_here
python -m uvicorn server:app --reload
```

Backend runs on http://localhost:8000

### Frontend
```bash
cd frontend
npm install
npm start
```

Frontend runs on http://localhost:3000

## Deployment

- **Backend:** Railway (`railway.json` configuration)
- **Frontend:** Vercel (connected to GitHub)

Set environment variables:
- Backend: `ANTHROPIC_API_KEY`, `CORS_ORIGINS`
- Frontend: `REACT_APP_BACKEND_URL`
