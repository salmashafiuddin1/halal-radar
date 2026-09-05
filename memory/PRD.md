# Ummah Visibility — Product Requirements

## Original problem statement
> I want to help muslims around the world. I want to make a search visibility app. An AI search visibility analyzer that shows Muslim businesses and mosques exactly which questions AI engines can't answer about them — and what content would fix it.

## User personas
- **Mosque board member / imam** — wants to know why new Muslims moving to town can't find their masjid on ChatGPT.
- **Muslim business owner** (halal restaurant, modest fashion, bookstore) — wants to grow AI-search-driven traffic.
- **Islamic center marketer / da'wah team** — wants concrete content briefs to fix invisibility.

## Core requirements (static)
- No-auth public MVP
- Multi-engine probe: GPT, Claude, Gemini (via Emergent Universal LLM key)
- 5 content clusters: Prayer Logistics, Community & Social, Services & Offerings, Convert & Newcomer Friendly, General Recommendations
- 10 auto-generated realistic community questions per audit (2 per cluster)
- Detect entity mention in each engine's response
- Compute visibility score per cluster and per engine
- Plain-language content recommendations for each invisible cluster
- Downloadable audit report

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) + emergentintegrations LlmChat
  - POST /api/analyze — runs the full audit (~15–30 s, 30 LLM calls in parallel)
  - GET /api/analyses, GET /api/analyses/{id}, GET /api/config, GET /api/
- **Frontend**: React 19 + React Router + Tailwind + shadcn/ui + Recharts + framer-motion + sonner
  - Routes: `/`, `/results/:id`, `/history`

## What's been implemented (Feb 2026)
- End-to-end analysis pipeline (question generation → 3-engine parallel probe → clustering → scoring → recommendations)
- Landing page with hero + audit form
- Live analysis loading overlay
- Results dashboard: overall score, radar chart per cluster, bar chart per engine, cluster recommendation cards, per-question accordion showing each engine's answer + mention badge
- History page listing prior audits
- JSON download of the full audit report
- 100% pass on first testing agent iteration (backend + frontend)

## Prioritized backlog

### P1
- Real PDF export (currently downloads JSON) — WeasyPrint or reactpdf
- K-means clustering on question embeddings (currently pre-tagged by theme). Would let user-uploaded website content also cluster naturally.
- Website URL crawl — pull About / FAQ / Prayer Times pages, include in analyzer context to inform "what to fix" more precisely.
- Share link (public read-only result page with OG image)

### P2
- Email the report to the entity owner
- Compare mode: run the same audit for a competitor mosque nearby
- Track visibility over time (weekly re-audits, trend chart)
- Multi-language question generation (Arabic, Urdu, French, etc.)

### P3
- Rate limiting / abuse protection
- Auth (Emergent Google) with saved workspaces for organizations
- Paid tier: unlimited monthly re-audits + PDF export + AI-drafted content pack
