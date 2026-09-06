import sqlite3
import json

# Connect to database
db_path = r"C:\Users\salma\portfolio project\backend\data.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 100)
print("DATABASE VIEW: All Analyses")
print("=" * 100)
print()

# Get all analyses
cursor.execute("SELECT id, entity_name, location, overall_score, created_at FROM analyses")
rows = cursor.fetchall()

if rows:
    print(f"Total Analyses: {len(rows)}")
    print("-" * 100)

    for i, row in enumerate(rows, 1):
        print(f"\n[{i}] ANALYSIS")
        print(f"    ID:           {row[0]}")
        print(f"    Restaurant:   {row[1]}")
        print(f"    Location:     {row[2]}")
        print(f"    Score:        {row[3]}%")
        print(f"    Created:      {row[4]}")

    print("\n" + "=" * 100)
    print("To see FULL RESULTS (with recommendations), run: python3 view_database_full.py")
    print("=" * 100)
else:
    print("Database is empty - no analyses yet")

conn.close()
