# System Design Diagrams - UML & Flow

## 1. Sequence Diagram: User Request Flow

Shows the sequence of interactions when a user submits an analysis request.

```
User         Frontend         Backend          Claude API       Database
 |              |                |                  |              |
 |--Fills Form->|                |                  |              |
 |              |                |                  |              |
 |--Clicks "Analyze"->|          |                  |              |
 |              |                |                  |              |
 |              |--Validates Input-->|             |              |
 |              |<--OK--|             |              |              |
 |              |                |                  |              |
 |              |--POST /api/analyze->|             |              |
 |              |                |                  |              |
 |              |                |--generate_questions()-->|       |
 |              |                |<--10 Questions--|              |
 |              |                |                  |              |
 |              |                |--asyncio.gather([probe_question for each Q])-->|
 |              |                |<--All 10 Results (5 sec)--|    |
 |              |                |                  |              |
 |              |                |--For invisible clusters:        |
 |              |                |  asyncio.gather([generate_recommendation])-->|
 |              |                |<--Recommendations--|            |
 |              |                |                  |              |
 |              |                |--score calculations-->|         |
 |              |                |                  |              |
 |              |                |--save_analysis()------|-------->|
 |              |                |<--Success--|              |
 |              |                |                  |              |
 |              |<--AnalysisResult JSON--|           |              |
 |<--Navigate to /results/{id}--|                  |              |
 |              |                |                  |              |
 |--Display Radar Chart->|       |                  |              |
 |--Display Pie Chart->|         |                  |              |
 |--Show Recommendations->|      |                  |              |
 |              |                |                  |              |
 |--Click Download-->|           |                  |              |
 |<--JSON File--|                |                  |              |
```

---

## 2. Component Diagram: System Architecture

Shows the major components and their dependencies.

```
┌────────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         React Frontend (localhost:3001)                   │  │
│  │  ┌─────────────────┐  ┌────────────────────────────────┐ │  │
│  │  │ Landing.jsx     │  │ Results.jsx                    │ │  │
│  │  │ - Form          │  │ - Radar Chart (Recharts)       │ │  │
│  │  │ - Validation    │  │ - Pie Chart (Recharts)         │ │  │
│  │  │ - API Call      │  │ - Download Feature             │ │  │
│  │  └────────┬────────┘  └────────────────────────────────┘ │  │
│  │           │                                                │  │
│  │           └─────────────────┬──────────────────────────── │  │
│  │                             │                            │  │
│  │                    ┌────────▼────────┐                   │  │
│  │                    │ React Router    │                   │  │
│  │                    │ Axios HTTP      │                   │  │
│  │                    └────────┬────────┘                   │  │
│  └───────────────────────────┬─────────────────────────────┘  │
└──────────────────────────────┼────────────────────────────────┘
                               │ HTTP (REST API)
                               ▼
┌────────────────────────────────────────────────────────────────┐
│                 APPLICATION LAYER                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │      FastAPI Backend (localhost:8000)                    │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐│  │
│  │  │ API Endpoints:                                       ││  │
│  │  │ - POST /api/analyze (main orchestration)             ││  │
│  │  │ - GET /api/analyses/{id}                             ││  │
│  │  │ - GET /api/config                                    ││  │
│  │  └──────────────────┬──────────────────────────────────┘│  │
│  │                     │                                     │  │
│  │  ┌──────────────────▼──────────────────────────────────┐│  │
│  │  │ Core Functions:                                      ││  │
│  │  │ - generate_questions()  ────────┐                   ││  │
│  │  │ - probe_question()      ──────┐ │                   ││  │
│  │  │ - _mentions_entity()    ──────┼─┤ Calls Claude API  ││  │
│  │  │ - generate_recommendation() ──┤ │                   ││  │
│  │  │ - calculate_visibility_gap()   │ │                   ││  │
│  │  │ - analyze() [ORCHESTRATOR]     │ │                   ││  │
│  │  │                                │ │                   ││  │
│  │  │ asyncio.gather() ◄─────────────┘ │                   ││  │
│  │  └──────────────────┬──────────────┘│                   ││  │
│  │                     │                │                   ││  │
│  │  ┌──────────────────▼────────────────▼──────────────────┐│  │
│  │  │ Pydantic Models:                                     ││  │
│  │  │ - AnalyzeRequest                                     ││  │
│  │  │ - QuestionResult                                     ││  │
│  │  │ - ClusterScore                                       ││  │
│  │  │ - AnalysisResult                                     ││  │
│  │  └──────────────────┬──────────────────────────────────┘│  │
│  └───────────────────┬──────────────────────────────────────┘  │
└──────────────────────┼────────────────────────────────────────┘
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
┌─────────────────────┐   ┌──────────────────────┐
│ Claude API          │   │ SQLite Database      │
│ (Anthropic SDK)     │   │ (backend/data.db)    │
│                     │   │                      │
│ AsyncAnthropic      │   │ Table: analyses      │
│ - Generate Q's      │   │ - id (PRIMARY KEY)   │
│ - Probe Q's         │   │ - entity_name        │
│ - Recommend fixes   │   │ - location           │
│                     │   │ - overall_score      │
│ Model: Haiku        │   │ - payload (JSON)     │
│ (Cost optimized)    │   │ - created_at         │
└─────────────────────┘   └──────────────────────┘
```

---

## 3. Flow Diagram: Analysis Process (Detailed)

Shows the step-by-step flow inside the `analyze()` endpoint.

```
START: User submits form
│
├─ Input Validation
│  ├─ entity_name required? → No → Error (400)
│  ├─ location required? → No → Error (400)
│  └─ OK? → Continue
│
├─ Step 1: Generate 10 Questions
│  ├─ Ask Claude: "Generate 10 halal restaurant questions (2 per cluster)"
│  ├─ Parse JSON response
│  ├─ Validate cluster_ids
│  └─ Return: List[QuestionResult]
│
├─ Step 2: Probe Questions (PARALLEL ⚡)
│  ├─ asyncio.gather() all 10 questions simultaneously
│  ├─ For each question Q:
│  │  ├─ Ask Claude: Q (generic context, no restaurant name)
│  │  ├─ Check if restaurant name mentioned in response
│  │  ├─ Truncate response to 320 chars
│  │  └─ Return: {mentioned: bool, snippet: str}
│  └─ Wait for all 10 results (~5 seconds)
│
├─ Step 3: Group Results by Cluster
│  ├─ Create cluster_stats: {cluster_id: {visible, total}}
│  ├─ For each question result:
│  │  ├─ Get cluster_id
│  │  ├─ Increment total counter
│  │  ├─ If mentioned, increment visible counter
│  └─ Result: 5 clusters with visibility counts
│
├─ Step 4: Generate Recommendations (PARALLEL ⚡)
│  ├─ Find invisible clusters (visible == 0)
│  ├─ For each invisible cluster:
│  │  ├─ Ask Claude: "What content should restaurant publish?"
│  │  ├─ Clean markdown from response
│  │  ├─ Truncate at sentence boundary
│  ├─ asyncio.gather() all recommendations
│  └─ Result: {cluster_id: recommendation}
│
├─ Step 5: Build Cluster Scores
│  ├─ For each of 5 clusters:
│  │  ├─ Calculate visibility_pct = (visible/total) * 100
│  │  ├─ If visible == 0:
│  │  │   └─ Use generated recommendation
│  │  ├─ Else:
│  │  │   └─ Use generic "Keep publishing fresh content" message
│  │  └─ Add to cluster_scores list
│  └─ Result: List[ClusterScore] (5 items)
│
├─ Step 6: Calculate Overall Score
│  ├─ total_visible = sum of all visible counts
│  ├─ total_questions = sum of all total counts (always 10)
│  ├─ overall_score = (total_visible / total_questions) * 100
│  └─ Result: int (0-100)
│
├─ Step 7: Fetch Business Data
│  ├─ Simulate Yelp API call
│  ├─ Return: {rating: 4.5, review_count: 128, menu_items: [...], ...}
│  └─ (TODO: Replace with real Yelp API)
│
├─ Step 8: Calculate Visibility Gap
│  ├─ Count invisible questions (not mentioned by Claude)
│  ├─ If invisible == 0:
│  │   └─ gap_desc = "Strong visibility"
│  ├─ Elif invisible <= 3:
│  │   └─ gap_desc = "Moderate visibility"
│  ├─ Else:
│  │   └─ gap_desc = "Significant gap"
│  └─ Generate estimated_customer_impact message
│
├─ Step 9: Save to Database
│  ├─ Create AnalysisResult object (combines all data)
│  ├─ Generate UUID for analysis ID
│  ├─ Insert into analyses table:
│  │  ├─ id, entity_name, location, category, overall_score, created_at
│  │  └─ payload (full JSON)
│  └─ Result: Persisted in backend/data.db
│
├─ Step 10: Return Analysis
│  └─ Return: AnalysisResult JSON to frontend
│
END: Frontend displays results
```

---

## 4. Data Flow Diagram: The Journey of One Question

Trace what happens to a single question through the entire system.

```
QUESTION: "Where can I find authentic halal biryani in New York, NY?"
│
├─ GENERATION PHASE
│  ├─ Backend calls: generate_questions()
│  ├─ Request: "Generate realistic halal restaurant questions"
│  ├─ Claude generates 10 questions (this is one of them)
│  └─ Question is assigned to: cluster_id="menu_offerings"
│
├─ PROBING PHASE
│  ├─ Backend calls: probe_question(question, "Halal Guys")
│  ├─ Request to Claude: "Where can I find authentic halal biryani in New York, NY?"
│  │                     (WITHOUT mentioning "Halal Guys")
│  ├─ Claude responds: "Several restaurants in NYC offer biryani..."
│  ├─ Backend calls: _mentions_entity("...", "Halal Guys")
│  │  ├─ Check: Is "Halal Guys" in response? → No
│  │  ├─ Check: Are all words ("halal", "guys") in response? → "guys" missing
│  │  └─ Result: mentioned = False
│  ├─ Backend truncates response to 320 chars
│  └─ Result: QuestionResult {
│                cluster_id: "menu_offerings",
│                question: "Where can I find...",
│                mentioned: False,
│                snippet: "Several restaurants..."
│             }
│
├─ SCORING PHASE
│  ├─ Question is grouped with other "menu_offerings" question
│  ├─ cluster_stats["menu_offerings"] = {visible: 0, total: 2}
│  │  (0 out of 2 questions mentioned "Halal Guys")
│  └─ This contributes to: visibility_pct = 0%
│
├─ RECOMMENDATION PHASE
│  ├─ Since cluster is invisible (0%), generate recommendation
│  ├─ Request to Claude: "Biryani restaurant should publish what content?"
│  ├─ Claude responds: "Create a dedicated biryani page with recipes, sourcing..."
│  ├─ Backend cleans response (remove markdown, truncate)
│  └─ Result: recommendation = "Create a dedicated biryani page..."
│
├─ STORAGE PHASE
│  ├─ Question stored in AnalysisResult.questions[] array
│  ├─ Cluster score stored with recommendation in cluster_scores[] array
│  ├─ Full data persisted to database as JSON payload
│  └─ Database INSERT: {id, entity_name, ..., payload: "...full JSON..."}
│
├─ RETRIEVAL PHASE
│  ├─ Frontend receives AnalysisResult
│  ├─ Transforms question data for display
│  ├─ Shows in Questions Accordion:
│  │   ├─ "Where can I find authentic halal biryani in New York, NY?"
│  │   ├─ Status: [NO] NOT FOUND
│  │   └─ Answer snippet: "Several restaurants..."
│  └─ Shows recommendation: "Create a dedicated biryani page..."
│
END: User sees complete analysis with this question's data
```

---

## 5. Async/Parallel Processing: Why It Matters

Comparing Sequential vs Parallel Question Probing.

### Sequential Approach (❌ Slow)
```
Time ──────────────────────────────────────────────────────────────────>

Question 1 ──5 sec──┐
                    Question 2 ──5 sec──┐
                                        Question 3 ──5 sec──┐
                                                            ...
                                                            Question 10 ──5 sec──┐
                                                                                 ▼
Total: ~50 seconds
```

### Parallel Approach (✅ Fast)
```
Time ──────────────────────────────────────────────────────────────────>

Question 1 ──┐
Question 2 ──┤
Question 3 ──┤
...          ├─ 5 seconds (all run concurrently)
Question 10 ─┘

Total: ~5 seconds

10x FASTER!
```

### Implementation
```python
# Parallel: All questions asked simultaneously
probe_results = await asyncio.gather(
    *(probe_question(q["question"], req.entity_name) for q in questions)
)

# asyncio.gather() = "wait for all these async operations to complete"
# Each probe_question() is I/O-bound (waiting for Claude API)
# Modern async runtime handles concurrency efficiently
```

---

## 6. Decision Tree: How Restaurant Gets a Score

```
                    START: Analyze Restaurant
                              │
                    Generate 10 Questions
                    (2 per cluster)
                              │
                    Ask Claude each Q
                    In parallel
                              │
                    ┌─────────▼─────────┐
                    │ Count Results     │
                    │ per cluster       │
                    └─────────┬─────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
         Cluster 1:    Cluster 2:    Cluster 3:
         0 mentioned    1 mentioned   2 mentioned
         2 total        2 total       2 total
              │             │             │
         ┌────▼─┐      ┌────▼─┐     ┌────▼─┐
         │ 0%   │      │ 50%  │     │ 100% │
         └──┬───┘      └──┬───┘     └──┬───┘
            │             │            │
         Generate      Keep          Maintain
         Recommend.    Pushing       Status
              │             │            │
              └─────────────┼────────────┘
                            │
                    ┌───────▼────────┐
                    │ OVERALL SCORE  │
                    │ (0 + 50 + 100  │
                    │  + ... / 5)    │
                    │ = 60%          │
                    └────────────────┘
```

---

## 7. Entity Relationship Diagram (Database)

```
┌─────────────────────────────────────────────────────────┐
│ ANALYSES Table                                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ id (TEXT, PRIMARY KEY)        ◄── UUID                │
│  ├─ Example: "550e8400-e29b-41d4-a716-4466" │
│  │                                                     │
│ entity_name (TEXT)            ◄── Restaurant name     │
│  ├─ Example: "Halal Guys"                             │
│  │                                                     │
│ location (TEXT)               ◄── Location            │
│  ├─ Example: "New York, NY"                           │
│  │                                                     │
│ category (TEXT)               ◄── Always same         │
│  ├─ Example: "Halal Restaurant"                       │
│  │                                                     │
│ overall_score (INTEGER)       ◄── 0-100 %            │
│  ├─ Example: 60                                       │
│  │                                                     │
│ created_at (TEXT)             ◄── ISO timestamp      │
│  ├─ Example: "2026-09-06T06:30:00Z"                  │
│  │                                                     │
│ payload (TEXT/JSON)           ◄── Full analysis      │
│  └─ Contains:                                         │
│      {                                                 │
│        "id": "...",                                    │
│        "entity_name": "...",                           │
│        "overall_score": 60,                            │
│        "cluster_scores": [                             │
│          {                                             │
│            "cluster_id": "menu_offerings",             │
│            "label": "Menu & Offerings",                │
│            "visibility_pct": 0,                        │
│            "recommendation": "..."                     │
│          },                                            │
│          ...                                           │
│        ],                                              │
│        "questions": [                                  │
│          {                                             │
│            "question": "...",                          │
│            "cluster_id": "menu_offerings",             │
│            "mentioned": false,                         │
│            "snippet": "..."                            │
│          },                                            │
│          ...                                           │
│        ]                                               │
│      }                                                 │
└─────────────────────────────────────────────────────────┘
```

---

## How to Use These Diagrams in Your Presentation

**For Judges:**

1. **Sequence Diagram** → "Here's what happens step-by-step when someone analyzes a restaurant"
2. **Component Diagram** → "Here's how my system is built: React frontend, FastAPI backend, Claude API, SQLite database"
3. **Analysis Flow Diagram** → "Here are the 10 steps I execute in the backend to produce a score"
4. **Async Processing** → "Here's my key optimization: instead of asking 10 questions one-by-one (50 seconds), I ask them all in parallel (5 seconds)"
5. **Data Journey** → "Let me trace one question through the entire system from generation to display"
6. **Decision Tree** → "Here's how I calculate the overall score from cluster visibility"

**Practice explaining ONE diagram to me.** Which one do you want to walk through?
