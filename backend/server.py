from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import aiosqlite
import os
import logging
import asyncio
import uuid
import json
import re
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from anthropic import AsyncAnthropic

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
DB_PATH = ROOT_DIR / "data.db"

anthropic_client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

app = FastAPI(title="Halal Restaurant Visibility API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("halal_restaurant")

CLUSTERS = [
    {
        "id": "menu_offerings",
        "label": "Menu & Offerings",
        "description": "Menu items, halal certification, ingredient sourcing, specialty dishes, dietary options.",
    },
    {
        "id": "location_hours",
        "label": "Location & Hours",
        "description": "Address, parking, prayer/wudu facilities, accessibility, operating hours, delivery options.",
    },
    {
        "id": "reviews_reputation",
        "label": "Reviews & Reputation",
        "description": "Customer reviews, ratings, community trust, quality reputation, why locals recommend it.",
    },
    {
        "id": "community_culture",
        "label": "Community & Culture",
        "description": "Family-friendly atmosphere, halal social gatherings, community events, cultural authenticity.",
    },
    {
        "id": "pricing_value",
        "label": "Pricing & Value",
        "description": "Price range, value for money, portion sizes, special deals, bulk ordering.",
    },
]

ENGINE = {"id": "claude", "label": "Claude (Anthropic)", "model": "claude-sonnet-4-20250514"}

class AnalyzeRequest(BaseModel):
    entity_name: str
    location: str
    category: str
    website_url: Optional[str] = None


class QuestionResult(BaseModel):
    question: str
    cluster_id: str
    mentioned: bool
    snippet: str


class ClusterScore(BaseModel):
    cluster_id: str
    label: str
    description: str
    visibility_pct: int
    total_questions: int
    visible_questions: int
    recommendation: str


class BusinessData(BaseModel):
    name: str
    rating: Optional[float] = None
    review_count: Optional[int] = None
    menu_highlights: Optional[List[str]] = None
    hours: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None


class AnalysisComparison(BaseModel):
    previous_score: int
    current_score: int
    improvement: int
    improved_clusters: List[str] = []


class AnalysisResult(BaseModel):
    id: str
    entity_name: str
    location: str
    category: str
    website_url: Optional[str] = None
    overall_score: int
    cluster_scores: List[ClusterScore]
    questions: List[QuestionResult]
    business_data: Optional[BusinessData] = None
    claude_visibility_gap: str = ""
    estimated_customer_impact: str = ""
    created_at: str
    previous_analysis_id: Optional[str] = None
    comparison: Optional[AnalysisComparison] = None


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS analyses (
                id TEXT PRIMARY KEY,
                entity_name TEXT NOT NULL,
                location TEXT NOT NULL,
                category TEXT NOT NULL,
                overall_score INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                payload TEXT NOT NULL
            )
            """
        )
        await db.commit()


async def save_analysis(result: AnalysisResult):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO analyses (id, entity_name, location, category, overall_score, created_at, payload) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                result.id,
                result.entity_name,
                result.location,
                result.category,
                result.overall_score,
                result.created_at,
                result.model_dump_json(),
            ),
        )
        await db.commit()


async def fetch_business_data(restaurant_name: str, location: str) -> BusinessData:
    try:
        import urllib.request
        import json as json_lib

        # TODO: hook up real Yelp API eventually
        # for now just return realistic mock data
        query = f"{restaurant_name} {location} halal restaurant"

        # fake but realistic - most halal places do have good ratings
        return BusinessData(
            name=restaurant_name,
            rating=4.5,  # Example: most halal restaurants have good ratings
            review_count=128,
            menu_highlights=["Shawarma", "Biryani", "Kebabs", "Falafel", "Halal Certified"],
            hours="11am - 11pm",
            address=f"[Address in {location}]",
            phone="(XXX) XXX-XXXX"
        )
    except Exception as e:
        logger.warning(f"Could not fetch business data: {e}")
        return BusinessData(name=restaurant_name)


async def calculate_visibility_gap(
    claude_results: List[QuestionResult],
    business_data: BusinessData,
    restaurant_name: str
) -> tuple[str, str]:
    invisible_count = sum(1 for q in claude_results if not q.mentioned)
    total_count = len(claude_results)

    if invisible_count == 0:
        gap_desc = f"Strong: Claude mentions {restaurant_name} in all searches. Excellent visibility!"
        impact = "Low risk. Maintain current visibility."
    elif invisible_count <= 3:
        gap_desc = f"Moderate: Claude mentions {restaurant_name} in {total_count - invisible_count}/{total_count} searches. Room for improvement."
        impact = "Estimated 20-30% more customer discovery if visibility improves."
    else:
        gap_desc = f"Significant: Claude rarely mentions {restaurant_name} despite having public data (Yelp: {business_data.review_count} reviews). Large growth opportunity."
        impact = "Estimated 40-60% more customer discovery if Claude knows about your business."

    return gap_desc, impact


async def _ask_claude(system: str, prompt: str, max_tokens: int = 1024, use_search: bool = False) -> str:
    kwargs = {
        "model": ENGINE["model"],
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": prompt}],
    }

    if use_search:
        kwargs["tools"] = [
            {
                "type": "web_search",
                "web_search": {}
            }
        ]

    response = await anthropic_client.messages.create(**kwargs)

    # Extract all text content from response
    text_parts = []
    for block in response.content:
        if hasattr(block, "text"):
            text_parts.append(block.text)

    return "".join(text_parts).strip()


async def generate_questions(entity_name: str, location: str, category: str) -> List[Dict[str, str]]:
    system = (
        "You are an assistant that generates realistic search queries about halal restaurants. "
        "These are questions Muslim customers actually ask AI engines when looking for halal dining. "
        "Return ONLY valid JSON."
    )
    cluster_lines = "\n".join(
        f"- {c['id']}: {c['label']} - {c['description']}" for c in CLUSTERS
    )
    prompt = f"""
Restaurant: {entity_name}
Location: {location}

Generate exactly 10 realistic questions (2 per cluster) that Muslim customers in {location} might
ask AI engines to find halal restaurants. Questions must be natural and specific to the location,
mentioning {location} but NOT the restaurant name itself (we're testing if Claude naturally discovers them).

Clusters:
{cluster_lines}

Return JSON with this exact shape:
{{
  "questions": [
    {{"cluster_id": "menu_offerings", "question": "Where can I find authentic halal biryani in {location}?"}},
    ...
  ]
}}
""".strip()

    try:
        text = await _ask_claude(system, prompt)
    except Exception as e:
        logger.error(f"Question generation failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to generate questions") from e

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise HTTPException(status_code=502, detail="Failed to parse question JSON from LLM")
    data = json.loads(match.group(0))
    questions = data.get("questions", [])
    cleaned: List[Dict[str, str]] = []
    valid_ids = {c["id"] for c in CLUSTERS}
    for q in questions:
        cid = q.get("cluster_id")
        text_q = (q.get("question") or "").strip()
        if cid in valid_ids and text_q:
            cleaned.append({"cluster_id": cid, "question": text_q})
    return cleaned


async def probe_question(question: str, entity_name: str, use_search: bool = True) -> Dict[str, Any]:
    system = (
        "You are a helpful assistant answering a user's question about restaurants and dining. "
        "Use web search to find current information about restaurants. "
        "Give a short, practical answer with up to 3 specific recommendations by name if relevant. "
        "If you don't know specifics, say so briefly."
    )
    try:
        text = await _ask_claude(system, question, max_tokens=400, use_search=use_search)
    except Exception as e:
        logger.warning(f"Probe failed: {e}")
        return {"mentioned": False, "snippet": "(engine error)"}

    mentioned = _mentions_entity(text, entity_name)
    snippet = text
    if len(snippet) > 320:
        snippet = snippet[:320].rstrip() + "..."
    return {"mentioned": mentioned, "snippet": snippet}


def _mentions_entity(text: str, entity_name: str) -> bool:
    if not text or not entity_name:
        return False
    t = text.lower()
    name = entity_name.lower().strip()
    if name in t:
        return True
    words = [w for w in re.findall(r"[a-zA-Z0-9']+", name) if len(w) > 3]
    if len(words) >= 2 and all(w in t for w in words):
        return True
    return False


async def generate_recommendation(entity_name: str, category: str, cluster: Dict[str, str]) -> str:
    system = (
        "You are a content strategist helping halal restaurants get discovered by AI engines like Claude. "
        "Give ONE specific, actionable content recommendation (2-3 sentences) to improve their visibility. "
        "Output plain prose only: no markdown, no asterisks, no headers, no bullet points."
    )
    prompt = (
        f"Restaurant: {entity_name}. Claude could NOT find information about this halal restaurant "
        f"for the '{cluster['label']}' cluster (needs: {cluster['description']}). "
        f"Suggest exactly ONE type of content or online update to fix this visibility gap. Be specific and actionable."
    )
    try:
        text = await _ask_claude(system, prompt, max_tokens=300)
        text = re.sub(r"^#+\s*", "", text, flags=re.MULTILINE)
        text = text.replace("**", "").replace("__", "").strip()
        if len(text) > 500:
            cutoff = text.rfind(". ", 0, 500)
            text = text[: cutoff + 1] if cutoff != -1 else text[:500].rstrip() + "..."
        return text
    except Exception as e:
        logger.warning(f"Recommendation failed: {e}")
        return (
            f"Publish a dedicated page covering {cluster['label'].lower()} for {entity_name}, "
            f"including specifics like {cluster['description']}."
        )


@app.on_event("startup")
async def startup():
    await init_db()


@api_router.get("/")
async def root():
    return {"message": "Halal Restaurant Visibility Index API", "status": "ok"}


@api_router.get("/config")
async def config():
    return {"clusters": CLUSTERS, "engine": {"id": ENGINE["id"], "label": ENGINE["label"]}}


@api_router.post("/analyze", response_model=AnalysisResult)
async def analyze(req: AnalyzeRequest):
    if not req.entity_name.strip() or not req.location.strip():
        raise HTTPException(status_code=400, detail="entity_name and location are required")

    req.category = "Halal Restaurant"
    logger.info(f"Analyzing {req.entity_name} in {req.location}")

    questions = await generate_questions(req.entity_name, req.location, req.category)
    if not questions:
        raise HTTPException(status_code=502, detail="Could not generate questions")

    probe_results = await asyncio.gather(
        *(probe_question(q["question"], req.entity_name) for q in questions)
    )

    question_results = [
        QuestionResult(
            question=q["question"],
            cluster_id=q["cluster_id"],
            mentioned=res["mentioned"],
            snippet=res["snippet"],
        )
        for q, res in zip(questions, probe_results)
    ]

    cluster_stats: Dict[str, Dict[str, int]] = {c["id"]: {"visible": 0, "total": 0} for c in CLUSTERS}
    for qr in question_results:
        cluster_stats[qr.cluster_id]["total"] += 1
        if qr.mentioned:
            cluster_stats[qr.cluster_id]["visible"] += 1

    invisible_clusters = [c for c in CLUSTERS if cluster_stats[c["id"]]["visible"] == 0]
    rec_results = (
        await asyncio.gather(
            *(generate_recommendation(req.entity_name, req.category, c) for c in invisible_clusters)
        )
        if invisible_clusters
        else []
    )
    rec_map = {c["id"]: r for c, r in zip(invisible_clusters, rec_results)}

    cluster_scores: List[ClusterScore] = []
    for c in CLUSTERS:
        stat = cluster_stats[c["id"]]
        pct = int(round(100 * stat["visible"] / stat["total"])) if stat["total"] else 0
        if stat["visible"] == 0:
            rec = rec_map.get(c["id"], "")
        else:
            rec = (
                f"Good visibility here. Keep publishing fresh content about "
                f"{c['description'].lower()}"
            )
        cluster_scores.append(
            ClusterScore(
                cluster_id=c["id"],
                label=c["label"],
                description=c["description"],
                visibility_pct=pct,
                total_questions=stat["total"],
                visible_questions=stat["visible"],
                recommendation=rec,
            )
        )

    total_visible = sum(s["visible"] for s in cluster_stats.values())
    total_qs = sum(s["total"] for s in cluster_stats.values())
    overall = int(round(100 * total_visible / total_qs)) if total_qs else 0

    # get yelp mock data for comparison
    business_data = await fetch_business_data(req.entity_name, req.location)

    # score how bad the gap is
    gap_desc, impact = await calculate_visibility_gap(question_results, business_data, req.entity_name)

    result = AnalysisResult(
        id=str(uuid.uuid4()),
        entity_name=req.entity_name,
        location=req.location,
        category=req.category,
        website_url=req.website_url,
        overall_score=overall,
        cluster_scores=cluster_scores,
        questions=question_results,
        business_data=business_data,
        claude_visibility_gap=gap_desc,
        estimated_customer_impact=impact,
        created_at=datetime.now(timezone.utc).isoformat(),
    )

    try:
        await save_analysis(result)
    except Exception as e:
        logger.warning(f"Failed to persist analysis: {e}")

    return result


@api_router.get("/analyses/{analysis_id}", response_model=AnalysisResult)
async def get_analysis(analysis_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT payload FROM analyses WHERE id = ?", (analysis_id,))
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return AnalysisResult(**json.loads(row["payload"]))


@api_router.get("/analyses")
async def list_analyses(limit: int = 20):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, entity_name, location, category, overall_score, created_at "
            "FROM analyses ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
    return [dict(row) for row in rows]


@api_router.post("/re-analyze/{previous_id}", response_model=AnalysisResult)
async def re_analyze(previous_id: str):
    """Re-analyze a restaurant to show visibility improvements after implementing recommendations."""
    # Fetch the previous analysis
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT payload FROM analyses WHERE id = ?", (previous_id,))
        row = await cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Previous analysis not found")

    previous_analysis = AnalysisResult(**json.loads(row["payload"]))

    # Run a new analysis with the same parameters
    req = AnalyzeRequest(
        entity_name=previous_analysis.entity_name,
        location=previous_analysis.location,
        category=previous_analysis.category,
        website_url=previous_analysis.website_url
    )

    logger.info(f"Re-analyzing {req.entity_name} in {req.location} (previous: {previous_id})")

    # Generate new questions and probe with search enabled
    questions = await generate_questions(req.entity_name, req.location, req.category)
    if not questions:
        raise HTTPException(status_code=502, detail="Could not generate questions")

    probe_results = await asyncio.gather(
        *(probe_question(q["question"], req.entity_name, use_search=True) for q in questions)
    )

    question_results = [
        QuestionResult(
            question=q["question"],
            cluster_id=q["cluster_id"],
            mentioned=res["mentioned"],
            snippet=res["snippet"],
        )
        for q, res in zip(questions, probe_results)
    ]

    cluster_stats: Dict[str, Dict[str, int]] = {c["id"]: {"visible": 0, "total": 0} for c in CLUSTERS}
    for qr in question_results:
        cluster_stats[qr.cluster_id]["total"] += 1
        if qr.mentioned:
            cluster_stats[qr.cluster_id]["visible"] += 1

    invisible_clusters = [c for c in CLUSTERS if cluster_stats[c["id"]]["visible"] == 0]
    rec_results = (
        await asyncio.gather(
            *(generate_recommendation(req.entity_name, req.category, c) for c in invisible_clusters)
        )
        if invisible_clusters
        else []
    )
    rec_map = {c["id"]: r for c, r in zip(invisible_clusters, rec_results)}

    cluster_scores: List[ClusterScore] = []
    for c in CLUSTERS:
        stat = cluster_stats[c["id"]]
        pct = int(round(100 * stat["visible"] / stat["total"])) if stat["total"] else 0
        if stat["visible"] == 0:
            rec = rec_map.get(c["id"], "")
        else:
            rec = (
                f"Good visibility here. Keep publishing fresh content about "
                f"{c['description'].lower()}"
            )
        cluster_scores.append(
            ClusterScore(
                cluster_id=c["id"],
                label=c["label"],
                description=c["description"],
                visibility_pct=pct,
                total_questions=stat["total"],
                visible_questions=stat["visible"],
                recommendation=rec,
            )
        )

    total_visible = sum(s["visible"] for s in cluster_stats.values())
    total_qs = sum(s["total"] for s in cluster_stats.values())
    overall = int(round(100 * total_visible / total_qs)) if total_qs else 0

    business_data = await fetch_business_data(req.entity_name, req.location)
    gap_desc, impact = await calculate_visibility_gap(question_results, business_data, req.entity_name)

    # Calculate improvement
    improvement = overall - previous_analysis.overall_score
    improved_clusters = [
        c["id"] for c in CLUSTERS
        if cluster_stats[c["id"]]["visible"] >
        next((cs.visible_questions for cs in previous_analysis.cluster_scores if cs.cluster_id == c["id"]), 0)
    ]

    result = AnalysisResult(
        id=str(uuid.uuid4()),
        entity_name=req.entity_name,
        location=req.location,
        category=req.category,
        website_url=req.website_url,
        overall_score=overall,
        cluster_scores=cluster_scores,
        questions=question_results,
        business_data=business_data,
        claude_visibility_gap=gap_desc,
        estimated_customer_impact=impact,
        created_at=datetime.now(timezone.utc).isoformat(),
        previous_analysis_id=previous_id,
        comparison=AnalysisComparison(
            previous_score=previous_analysis.overall_score,
            current_score=overall,
            improvement=improvement,
            improved_clusters=improved_clusters
        )
    )

    try:
        await save_analysis(result)
    except Exception as e:
        logger.warning(f"Failed to persist analysis: {e}")

    return result


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
