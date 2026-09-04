import sqlite3
import shutil

def migrate():
    # 1. Back up db
    shutil.copyfile("wb_agent.db", "wb_agent.db.bak2")
    print("Database backed up to wb_agent.db.bak2")

    conn = sqlite3.connect("wb_agent.db")
    cursor = conn.cursor()

    # Target real customer (+918900653250)
    cursor.execute("SELECT id FROM customers WHERE primary_phone LIKE '%8900653250'")
    target_cust = cursor.fetchone()
    if not target_cust:
        print("Target customer +918900653250 not found!")
        return
    target_cust_id = target_cust[0]
    print(f"Target customer ID (+918900653250): {target_cust_id}")

    # LID customer (+249808719728891)
    cursor.execute("SELECT id FROM customers WHERE primary_phone LIKE '%249808719728891'")
    lid_cust = cursor.fetchone()
    lid_cust_id = lid_cust[0] if lid_cust else None
    print(f"LID customer ID: {lid_cust_id}")

    # Simulated conversation ID
    sim_conv_id = "efd1ebda-9039-4292-922f-24f993bb228c"
    # Real conversation ID
    real_conv_id = "57159df4-afd9-4f3b-a5cb-f789576613ec"

    # Step 1: Delete simulated messages from efd1ebda
    cursor.execute("DELETE FROM messages WHERE conversation_id = ?", (sim_conv_id,))
    print(f"Deleted simulated messages from conversation {sim_conv_id}")

    # Step 2: Delete simulated conversation efd1ebda
    cursor.execute("DELETE FROM conversations WHERE id = ?", (sim_conv_id,))
    print(f"Deleted simulated conversation {sim_conv_id}")

    # Step 3: Point the real conversation 57159df4 to target_cust_id and +918900653250
    cursor.execute(
        "UPDATE conversations SET customer_id = ?, channel_id = '+918900653250' WHERE id = ?",
        (target_cust_id, real_conv_id)
    )
    print(f"Updated real conversation {real_conv_id} to customer {target_cust_id} and channel_id +918900653250")

    # Step 4: Delete LID customer if exists
    if lid_cust_id:
        # Move any customer_memory from LID to target_cust_id
        cursor.execute("UPDATE customer_memory SET customer_id = ? WHERE customer_id = ?", (target_cust_id, lid_cust_id))
        cursor.execute("DELETE FROM customers WHERE id = ?", (lid_cust_id,))
        print(f"Deleted LID customer {lid_cust_id}")

    # Step 5: Clean up old test LID customer (+78971597271125)
    cursor.execute("SELECT id FROM customers WHERE primary_phone LIKE '%78971597271125'")
    old_lid = cursor.fetchone()
    if old_lid:
        old_lid_id = old_lid[0]
        cursor.execute("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE customer_id = ?)", (old_lid_id,))
        cursor.execute("DELETE FROM conversations WHERE customer_id = ?", (old_lid_id,))
        cursor.execute("DELETE FROM customer_memory WHERE customer_id = ?", (old_lid_id,))
        cursor.execute("DELETE FROM customers WHERE id = ?", (old_lid_id,))
        print(f"Cleaned up old test customer {old_lid_id} (+78971597271125)")

    # Step 6: Update customer details for +918900653250
    cursor.execute(
        "UPDATE customers SET name = 'Naboraj Sarkar', company_name = 'Owner Direct', company_type = 'Direct WhatsApp' WHERE id = ?",
        (target_cust_id,)
    )
    print(f"Updated customer details for {target_cust_id}")

    conn.commit()
    conn.close()
    print("Migration completed successfully!")

if __name__ == "__main__":
    migrate()
