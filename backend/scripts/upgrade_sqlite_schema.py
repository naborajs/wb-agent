import sqlite3
from pathlib import Path
import asyncio

def fix_sqlite_db(db_path: Path):
    if not db_path.exists():
        print(f"DB not found at {db_path}")
        return

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    def get_cols(table):
        try:
            return [c[1] for c in cur.execute(f"PRAGMA table_info({table})").fetchall()]
        except Exception:
            return []

    # 1. Knowledge chunks item_id
    chunk_cols = get_cols("knowledge_chunks")
    if chunk_cols and "item_id" not in chunk_cols:
        print(f"Adding item_id to knowledge_chunks in {db_path.name}...")
        cur.execute("ALTER TABLE knowledge_chunks ADD COLUMN item_id VARCHAR(36)")
        cur.execute("CREATE INDEX IF NOT EXISTS ix_knowledge_chunks_item_id ON knowledge_chunks(item_id)")

    # 2. Pricing rules columns
    pr_cols = get_cols("pricing_rules")
    if pr_cols:
        if "min_quantity" not in pr_cols:
            print(f"Adding min_quantity to pricing_rules in {db_path.name}...")
            cur.execute("ALTER TABLE pricing_rules ADD COLUMN min_quantity NUMERIC(10, 2) DEFAULT 0.0")
        if "max_quantity" not in pr_cols:
            print(f"Adding max_quantity to pricing_rules in {db_path.name}...")
            cur.execute("ALTER TABLE pricing_rules ADD COLUMN max_quantity NUMERIC(10, 2)")
        if "fixed_price" not in pr_cols:
            print(f"Adding fixed_price to pricing_rules in {db_path.name}...")
            cur.execute("ALTER TABLE pricing_rules ADD COLUMN fixed_price NUMERIC(10, 2)")
        if "rule_metadata" not in pr_cols:
            print(f"Adding rule_metadata to pricing_rules in {db_path.name}...")
            cur.execute("ALTER TABLE pricing_rules ADD COLUMN rule_metadata JSON DEFAULT '{}'")

        # Backfill if _kg columns exist
        if "min_quantity_kg" in pr_cols:
            cur.execute("UPDATE pricing_rules SET min_quantity = min_quantity_kg WHERE (min_quantity IS NULL OR min_quantity = 0) AND min_quantity_kg IS NOT NULL")
        if "max_quantity_kg" in pr_cols:
            cur.execute("UPDATE pricing_rules SET max_quantity = max_quantity_kg WHERE max_quantity IS NULL AND max_quantity_kg IS NOT NULL")
        if "fixed_price_per_kg" in pr_cols:
            cur.execute("UPDATE pricing_rules SET fixed_price = fixed_price_per_kg WHERE fixed_price IS NULL AND fixed_price_per_kg IS NOT NULL")

    # 3. Products columns
    prod_cols = get_cols("products")
    if prod_cols:
        if "grade" not in prod_cols:
            print(f"Adding grade to products in {db_path.name}...")
            cur.execute("ALTER TABLE products ADD COLUMN grade VARCHAR(64)")
        if "min_order_quantity" not in prod_cols:
            print(f"Adding min_order_quantity to products in {db_path.name}...")
            cur.execute("ALTER TABLE products ADD COLUMN min_order_quantity NUMERIC(10, 2) DEFAULT 1.0")

        if "tea_grade" in prod_cols:
            cur.execute("UPDATE products SET grade = tea_grade WHERE grade IS NULL AND tea_grade IS NOT NULL")
        if "min_order_quantity_kg" in prod_cols:
            cur.execute("UPDATE products SET min_order_quantity = min_order_quantity_kg WHERE (min_order_quantity IS NULL OR min_order_quantity = 1.0) AND min_order_quantity_kg IS NOT NULL")

    # 4. Product variants columns
    pv_cols = get_cols("product_variants")
    if pv_cols:
        if "unit_quantity" not in pv_cols:
            print(f"Adding unit_quantity to product_variants in {db_path.name}...")
            cur.execute("ALTER TABLE product_variants ADD COLUMN unit_quantity NUMERIC(10, 2) DEFAULT 1.0")
        if "base_price_per_unit" not in pv_cols:
            print(f"Adding base_price_per_unit to product_variants in {db_path.name}...")
            cur.execute("ALTER TABLE product_variants ADD COLUMN base_price_per_unit NUMERIC(10, 2)")

        if "weight_kg" in pv_cols:
            cur.execute("UPDATE product_variants SET unit_quantity = weight_kg WHERE (unit_quantity IS NULL OR unit_quantity = 1.0) AND weight_kg IS NOT NULL")
        if "base_price_per_kg" in pv_cols:
            cur.execute("UPDATE product_variants SET base_price_per_unit = base_price_per_kg WHERE base_price_per_unit IS NULL AND base_price_per_kg IS NOT NULL")

    conn.commit()
    conn.close()
    print(f"Schema upgrade finished for {db_path.name}.")

if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[2]
    fix_sqlite_db(repo_root / "wb_agent.db")
    fix_sqlite_db(repo_root / "backend" / "wb_agent.db")
