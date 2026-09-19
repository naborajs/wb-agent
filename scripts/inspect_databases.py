import sqlite3
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

conn = sqlite3.connect('./wb_agent.db')
cur = conn.cursor()

print("--- Sender +249808719728891 ---")
cur.execute("SELECT conversation_id, sender_type, direction, content, created_at FROM messages WHERE sender_id = '+249808719728891';")
for r in cur.fetchall():
    print(r)

print("\n--- All Conversations Detailed ---")
cur.execute("SELECT id, channel, channel_id, mode, sales_stage, lead_score, created_at FROM conversations ORDER BY created_at DESC;")
for r in cur.fetchall():
    conv_id = r[0]
    cur.execute("SELECT COUNT(*) FROM messages WHERE conversation_id = ?;", (conv_id,))
    msg_count = cur.fetchone()[0]
    cur.execute("SELECT content FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1;", (conv_id,))
    last_msg = cur.fetchone()
    last_text = (last_msg[0][:40] if last_msg and last_msg[0] else "No messages")
    print(f"ID: {r[0]} | Ch: {r[1]} | Phone: {r[2]} | Mode: {r[3]} | Msgs: {msg_count} | Last: {repr(last_text)}")

print("\n--- All Customers ---")
cur.execute("SELECT id, primary_phone, name, company_name FROM customers;")
for r in cur.fetchall():
    print(r)

conn.close()
