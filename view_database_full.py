import sqlite3
import json

# Connect to database
db_path = r"C:\Users\salma\portfolio project\backend\data.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("\n" + "=" * 120)
print("FULL DATABASE VIEW: Complete Analysis Results")
print("=" * 120 + "\n")

# Get all analyses with full payload
cursor.execute("SELECT id, entity_name, location, overall_score, payload FROM analyses")
rows = cursor.fetchall()

if rows:
    for i, row in enumerate(rows, 1):
        analysis_id = row[0]
        restaurant = row[1]
        location = row[2]
        score = row[3]
        payload_json = json.loads(row[4])

        print(f"\n{'='*120}")
        print(f"ANALYSIS #{i}: {restaurant} ({location})")
        print(f"{'='*120}")

        print(f"\nOVERALL SCORE: {score}%")
        print(f"Created: {payload_json.get('created_at', 'N/A')}")

        print("\n" + "-" * 120)
        print("CLUSTER SCORES (By Category):")
        print("-" * 120)

        for cluster in payload_json.get("cluster_scores", []):
            label = cluster["label"]
            pct = cluster["visibility_pct"]
            visible = cluster["visible_questions"]
            total = cluster["total_questions"]
            rec = cluster["recommendation"]

            visibility_bar = "#" * (pct // 10) + "-" * ((100 - pct) // 10)
            print(f"\n  [{label}]")
            print(f"  Visibility: {pct}% [{visibility_bar}] ({visible}/{total} questions)")
            print(f"  Recommendation: {rec[:100]}..." if len(rec) > 100 else f"  Recommendation: {rec}")

        print("\n" + "-" * 120)
        print("QUESTIONS TESTED:")
        print("-" * 120)

        for j, q in enumerate(payload_json.get("questions", [])[:3], 1):  # Show first 3
            status = "[YES] MENTIONED" if q["mentioned"] else "[NO] NOT FOUND"
            print(f"\n  Q{j}: {q['question']}")
            print(f"       [{q['cluster_id']}] {status}")
            print(f"       Answer: {q['snippet'][:80]}...")

        print("\n" + "-" * 120)
        print("GAP ANALYSIS:")
        print("-" * 120)
        print(f"  Claude's Knowledge: {payload_json.get('claude_visibility_gap', 'N/A')}")
        print(f"  Customer Impact: {payload_json.get('estimated_customer_impact', 'N/A')}")

        print()

    print("\n" + "=" * 120)
    print(f"Total Analyses Stored: {len(rows)}")
    print("=" * 120 + "\n")

else:
    print("Database is empty - no analyses yet\n")

conn.close()
