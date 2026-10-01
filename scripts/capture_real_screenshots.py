import os
import shutil
import subprocess
import time

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
DOCS_DIR = os.path.abspath("docs/screenshots")
ARTIFACT_DIR = r"C:\Users\Naboraj_sarkar\.gemini\antigravity\brain\b7b98307-4ffe-4ada-9d44-58ac7b22ac4f"

os.makedirs(DOCS_DIR, exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)

targets = [
    {
        "name": "overview_dark.png",
        "url": "http://localhost:3000/",
        "color_scheme": "dark",
        "width": 1600,
        "height": 1050,
        "wait": 5000,
    },
    {
        "name": "overview_light.png",
        "url": "http://localhost:3000/",
        "color_scheme": "light",
        "width": 1600,
        "height": 1050,
        "wait": 5000,
    },
    {
        "name": "orders_dark.png",
        "url": "http://localhost:3000/orders",
        "color_scheme": "dark",
        "width": 1600,
        "height": 1050,
        "wait": 5000,
    },
    {
        "name": "conversations_dark.png",
        "url": "http://localhost:3000/conversations",
        "color_scheme": "dark",
        "width": 1600,
        "height": 1050,
        "wait": 5000,
    },
    {
        "name": "analytics_dark.png",
        "url": "http://localhost:3000/analytics",
        "color_scheme": "dark",
        "width": 1600,
        "height": 1050,
        "wait": 5000,
    },
    {
        "name": "campaigns_dark.png",
        "url": "http://localhost:3000/campaigns",
        "color_scheme": "dark",
        "width": 1600,
        "height": 1050,
        "wait": 5000,
    },
    {
        "name": "settings_dark.png",
        "url": "http://localhost:3000/settings",
        "color_scheme": "dark",
        "width": 1600,
        "height": 1050,
        "wait": 5000,
    },
]

print(f"Starting screenshot captures using {CHROME}...")

for t in targets:
    docs_path = os.path.join(DOCS_DIR, t["name"])
    artifact_path = os.path.join(ARTIFACT_DIR, t["name"])

    args = [
        CHROME,
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        f"--force-prefers-color-scheme={t['color_scheme']}",
        f"--window-size={t['width']},{t['height']}",
        f"--virtual-time-budget={t['wait']}",
        f"--screenshot={docs_path}",
        t["url"],
    ]

    print(f"Capturing {t['name']} ({t['color_scheme']}) from {t['url']}...")
    try:
        res = subprocess.run(args, capture_output=True, timeout=30)
        if os.path.exists(docs_path) and os.path.getsize(docs_path) > 1000:
            size_kb = os.path.getsize(docs_path) / 1024
            shutil.copy2(docs_path, artifact_path)
            print(f"  -> Success: {t['name']} ({size_kb:.1f} KB)")
        else:
            print(f"  -> Error: Output file missing or empty for {t['name']}")
    except Exception as e:
        print(f"  -> Failed to capture {t['name']}: {e}")

print("All captures completed.")
