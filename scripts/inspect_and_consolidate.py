import sqlite3
import shutil
import sys

def run():
    shutil.copyfile("wb_agent.db", "wb_agent.db.bak")
    print("Created database backup: wb_agent.db.bak")

    conn = sqlite3.connect("wb_agent.db")
    cursor = conn.cursor()

    print("\n--- ALL CUSTOMERS ---")
    for r in cursor.execute("SELECT id, primary_phone, name, company_name FROM customers").fetchall():
        print(r)

    print("\n--- ALL CONVERSATIONS ---")
    for r in cursor.execute("SELECT id, customer_id, channel, channel_id, sales_stage, lead_score FROM conversations").fetchall():
        print(r)

    print("\n--- MESSAGES IN 57159df4 (LID) ---")
    for r in cursor.execute("SELECT id, direction, sender_type, content, created_at FROM messages WHERE conversation_id='57159df4-afd9-4f3b-a5cb-f789576613ec' ORDER BY created_at ASC").fetchall():
        txt = r[3] if r[3] else ""
        safe_txt = txt[:80].encode('ascii', 'backslashreplace').decode('ascii')
        print(f"[{r[4]}] {r[1]}-{r[2]}: {safe_txt}")

    print("\n--- MESSAGES IN efd1ebda (SIMULATED) ---")
    for r in cursor.execute("SELECT id, direction, sender_type, content, created_at FROM messages WHERE conversation_id='efd1ebda-9039-4292-922f-24f993bb228c' ORDER BY created_at ASC").fetchall():
        txt = r[3] if r[3] else ""
        safe_txt = txt[:80].encode('ascii', 'backslashreplace').decode('ascii')
        print(f"[{r[4]}] {r[1]}-{r[2]}: {safe_txt}")

    conn.close()

if __name__ == "__main__":
    run()
