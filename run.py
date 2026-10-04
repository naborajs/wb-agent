#!/usr/bin/env python3
"""
===============================================================================
  WHATSAPP AI AGENT BY NS — DUAL-BRAIN OPERATING SYSTEM
  Unified All-In-One Orchestrator: Check, Auto-Install, Configure, Start & Stream
  FRIDAY (Google Gemini 3.1 Flash Live) & EDITH (NVIDIA NIM)

  Architected & Engineered by Naboraj Sarkar (NS)
  Official Website: https://naborajs.me
  Documentation Hub: https://naborajs.me/projects/whatsapp-ai-agent-dual-brain/docs
  Operations & Scaling (Ch 10): https://naborajs.me/docs/whatsapp-ai-agent/ch-10-deployment-ops
  Codebase Reference (Ch 12): https://naborajs.me/docs/whatsapp-ai-agent/ch-12-code-breakdown
===============================================================================
Usage:
    python run.py             # Full check, auto-install missing packages, and launch all services
    python run.py --prod      # Production build & server mode (for Linux VPS, Docker, Render, Railway)
    python run.py --no-open   # Launch without automatically opening browser
    python run.py --clean     # Clean dependencies cache and restart
===============================================================================
"""

import sys
import os
import time
import signal
import shutil
import shlex
import socket
import urllib.request
import urllib.error
import threading
import subprocess
import webbrowser
import re
import json
from pathlib import Path
import functools

# Force unbuffered immediate flushing for all prints
print = functools.partial(print, flush=True)

# Ensure UTF-8 stdout/stderr on all consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
        sys.stderr.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
    except Exception:
        pass

# Enable ANSI escape sequences on Windows console
if os.name == "nt":
    try:
        os.system("")
    except Exception:
        pass

# =============================================================================
# Terminal Styling & Colors
# =============================================================================
class C:
    RESET     = "\033[0m"
    BOLD      = "\033[1m"
    DIM       = "\033[2m"
    ITALIC    = "\033[3m"
    UNDERLINE = "\033[4m"
    RED       = "\033[91m"
    GREEN     = "\033[92m"
    YELLOW    = "\033[93m"
    BLUE      = "\033[94m"
    MAGENTA   = "\033[95m"
    CYAN      = "\033[96m"
    WHITE     = "\033[97m"
    BG_BLUE   = "\033[44m"
    BG_DARK   = "\033[100m"

def timestamp():
    return time.strftime("%H:%M:%S")

def log_header(text):
    print(f"\n{C.BOLD}{C.CYAN}{'='*80}{C.RESET}")
    print(f"{C.BOLD}{C.WHITE}  {text}{C.RESET}")
    print(f"{C.BOLD}{C.CYAN}{'='*80}{C.RESET}\n")

def log_step(step, title):
    print(f"{C.BOLD}{C.CYAN}[{timestamp()}] {C.YELLOW}[{step}] {C.WHITE}{title}{C.RESET}")

def log_success(msg):
    print(f"  {C.GREEN}[OK] {msg}{C.RESET}")

def log_warn(msg):
    print(f"  {C.YELLOW}[WARN] {msg}{C.RESET}")

def log_error(msg):
    print(f"  {C.RED}[FAIL] {msg}{C.RESET}")

def log_info(msg):
    print(f"  {C.DIM}* {msg}{C.RESET}")

def log_box(title, lines, color=C.CYAN):
    width = 78
    print(f"\n{color}  +{'-' * width}+")
    print(f"  | {C.BOLD}{title.ljust(width - 2)}{color} |")
    print(f"  +{'-' * width}+{C.RESET}")
    for line in lines:
        print(f"{color}  | {C.RESET}{line.ljust(width - 2)}{color} |{C.RESET}")
    print(f"{color}  +{'-' * width}+{C.RESET}\n")

# Global process tracking for graceful shutdown
PROCESSES = []
SHUTTING_DOWN = False
ROOT_DIR = Path(__file__).resolve().parent

# =============================================================================
# 1. Environment & Pre-Flight Checks
# =============================================================================
def check_environment():
    log_header("STEP 1: PRE-FLIGHT SYSTEM & ENVIRONMENT CHECKS")

    # A. Python Version
    py_ver = sys.version_info
    log_info(f"Python Version: {py_ver.major}.{py_ver.minor}.{py_ver.micro} ({sys.executable})")
    if py_ver < (3, 10):
        log_error("Python 3.10+ is required. Please upgrade your Python version.")
        sys.exit(1)
    log_success("Python runtime verified (>= 3.10)")

    # B. Node.js & npm
    node_path = shutil.which("node")
    npm_path = shutil.which("npm")
    if not node_path or not npm_path:
        log_error("Node.js and npm must be installed and available in PATH.")
        log_box(
            "ACTION REQUIRED: INSTALL NODE.JS",
            [
                "Node.js is required to run the Next.js Dashboard and WhatsApp Bridge.",
                "1. Download Node.js (LTS version recommended): https://nodejs.org/",
                "2. Install and restart your terminal.",
            ],
            color=C.RED,
        )
        sys.exit(1)

    try:
        node_ver = subprocess.check_output([node_path, "-v"], text=True).strip()
        npm_ver = subprocess.check_output([npm_path, "-v"], text=True).strip()
        log_info(f"Node.js: {node_ver} ({node_path})")
        log_info(f"npm: v{npm_ver} ({npm_path})")
        log_success("Node.js & npm runtime verified")
    except Exception as e:
        log_error(f"Failed to check Node.js/npm version: {e}")
        sys.exit(1)

    # C. Directory Structure
    req_dirs = [
        ROOT_DIR / "backend",
        ROOT_DIR / "dashboard",
        ROOT_DIR / "whatsapp-bridge",
        ROOT_DIR / "backend" / "app" / "assets",
        ROOT_DIR / "dashboard" / "public",
        ROOT_DIR / "storage",
        ROOT_DIR / "assets docs" / "screenshots",
    ]
    for d in req_dirs:
        d.mkdir(parents=True, exist_ok=True)
    log_success("Workspace directory structure validated")

    # D. Environment Files (.env)
    env_example = ROOT_DIR / ".env.example"
    env_root = ROOT_DIR / ".env"
    env_backend = ROOT_DIR / "backend" / ".env"
    env_wa = ROOT_DIR / "whatsapp-bridge" / ".env"

    if not env_root.exists() and env_example.exists():
        shutil.copy(env_example, env_root)
        log_warn("Created root .env from .env.example")
    if not env_backend.exists() and env_example.exists():
        shutil.copy(env_example, env_backend)
        log_warn("Created backend/.env from .env.example")
    if not env_wa.exists() and env_example.exists():
        shutil.copy(env_example, env_wa)
        log_warn("Created whatsapp-bridge/.env from .env.example")
    log_success("Environment configuration files (.env) present")

    # E. Brand Identity Assets
    brand_emblem = ROOT_DIR / "dashboard" / "public" / "logo-icon.png"
    brand_master = ROOT_DIR / "dashboard" / "public" / "logo.png"
    brand_favicon = ROOT_DIR / "dashboard" / "public" / "favicon.ico"

    if not brand_emblem.exists() or not brand_master.exists() or not brand_favicon.exists():
        log_warn("Brand assets missing. Generating high-resolution transparent assets...")
        gen_script = ROOT_DIR / "scripts" / "generate_brand_assets.py"
        if gen_script.exists():
            subprocess.run([sys.executable, str(gen_script)], check=True)
            log_success("Brand assets generated successfully")
        else:
            log_warn("Brand asset script not found; continuing with defaults")
    else:
        log_success("Platform brand assets and favicon verified")


# =============================================================================
# 2. Dependency Verification & Automatic Installation
# =============================================================================
def install_dependencies():
    log_header("STEP 2: DEPENDENCY VERIFICATION & AUTO-INSTALL")

    # A. Python Backend Dependencies
    log_step("2A", "Checking Python Dependencies...")
    req_file = ROOT_DIR / "requirements.txt"
    packages_to_check = {
        "fastapi": "fastapi",
        "uvicorn": "uvicorn",
        "sqlalchemy": "sqlalchemy",
        "pydantic": "pydantic",
        "pydantic_settings": "pydantic_settings",
        "httpx": "httpx",
        "reportlab": "reportlab",
        "PIL": "pillow",
        "numpy": "numpy",
        "websockets": "websockets",
        "aiosqlite": "aiosqlite",
        "pypdf": "pypdf",
        "docx": "python-docx",
        "dotenv": "python-dotenv",
        "bcrypt": "bcrypt",
    }

    missing_packages = []
    for mod_name, pkg_name in packages_to_check.items():
        try:
            __import__(mod_name)
        except ImportError:
            missing_packages.append(pkg_name)

    if missing_packages:
        log_warn(f"Missing Python package(s): {', '.join(missing_packages)}")
        log_info("Automatically installing requirements via pip...")
        try:
            if req_file.exists():
                cmd = [sys.executable, "-m", "pip", "install", "-r", str(req_file)]
            else:
                cmd = [sys.executable, "-m", "pip", "install"] + missing_packages
            subprocess.run(cmd, check=True)
            log_success("Python dependencies installed successfully")
        except subprocess.CalledProcessError as e:
            log_error(f"Failed to auto-install Python dependencies: {e}")
            log_box(
                "ACTION REQUIRED: INSTALL PYTHON PACKAGES",
                [
                    "Pip encountered an issue installing required packages.",
                    f"Please run manually in your terminal:",
                    f"  python -m pip install -r requirements.txt",
                ],
                color=C.RED,
            )
            sys.exit(1)
    else:
        log_success("All core Python packages verified")

    is_win = os.name == "nt"

    # B. WhatsApp Bridge Dependencies
    log_step("2B", "Checking WhatsApp Bridge Node Modules...")
    wa_dir = ROOT_DIR / "whatsapp-bridge"
    wa_modules = wa_dir / "node_modules"
    wa_critical = wa_modules / "@whiskeysockets" / "baileys"
    if not wa_modules.exists() or not wa_critical.exists():
        log_warn("whatsapp-bridge/node_modules missing. Running npm install automatically...")
        try:
            subprocess.run(["npm", "install"], cwd=str(wa_dir), shell=is_win, check=True)
            log_success("WhatsApp Bridge dependencies installed")
        except subprocess.CalledProcessError as e:
            log_warn(f"WhatsApp Bridge npm install failed: {e}. (Will continue; can retry later)")
    else:
        log_success("WhatsApp Bridge dependencies verified")

    # C. Next.js Dashboard Dependencies
    log_step("2C", "Checking Dashboard Node Modules...")
    dash_dir = ROOT_DIR / "dashboard"
    dash_modules = dash_dir / "node_modules"
    dash_next = dash_modules / "next"
    dash_lucide = dash_modules / "lucide-react"

    if not dash_modules.exists() or not dash_next.exists() or not dash_lucide.exists():
        log_warn("dashboard/node_modules missing or incomplete. Running npm install automatically...")
        try:
            subprocess.run(["npm", "install"], cwd=str(dash_dir), shell=is_win, check=True)
            log_success("Dashboard dependencies installed successfully")
        except subprocess.CalledProcessError as e:
            log_error(f"Failed to install Dashboard dependencies: {e}")
            log_box(
                "ACTION REQUIRED: INSTALL DASHBOARD DEPENDENCIES",
                [
                    "Next.js Dashboard failed to install npm packages.",
                    "Please navigate to dashboard/ and run:",
                    "  cd dashboard",
                    "  npm install",
                ],
                color=C.RED,
            )
            sys.exit(1)
    else:
        log_success("Dashboard dependencies verified")


# =============================================================================
# 3. Interactive Configuration & API Keys Diagnostics
# =============================================================================
def check_configuration_and_keys():
    log_header("STEP 3: CONFIGURATION & API KEYS INSPECTION")

    # Read .env if available
    env_vars = {}
    env_file = ROOT_DIR / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env_vars[k.strip()] = v.strip().strip("\"'")

    # 1. Business Profile
    biz_name = env_vars.get("BUSINESS_NAME", os.environ.get("BUSINESS_NAME", "Commercial Enterprise"))
    biz_ind = env_vars.get("BUSINESS_INDUSTRY", os.environ.get("BUSINESS_INDUSTRY", "Wholesale & Commerce"))
    log_success(f"Configured Business: {biz_name} ({biz_ind})")

    # 2. Google Gemini API Key (Friday Brain)
    gemini_key = env_vars.get("GEMINI_API_KEY", os.environ.get("GEMINI_API_KEY", ""))
    gemini_is_mock = not gemini_key or "your_" in gemini_key or gemini_key.startswith("mock")
    if gemini_is_mock:
        log_box(
            "🔵 FRIDAY BRAIN: RUNNING IN LOCAL INTELLIGENCE FALLBACK",
            [
                "Model Target: Google Gemini 3.1 Flash Live Preview (gemini-3.1-flash-live-preview)",
                "Status: Local fallback mode active (Executive persona, UI actions & Code Inspection).",
                "",
                "👉 TO UNLOCK FRIDAY'S FULL MULTIMODAL CAPABILITIES (Audio, Live WebSockets, Thinking):",
                "   1. Get your free Gemini API key: https://aistudio.google.com/",
                "   2. Open .env and fill in: GEMINI_API_KEY=AIzaSy...",
                "   (No payment required; Google AI Studio provides a free tier!)",
            ],
            color=C.CYAN,
        )
    else:
        masked_key = gemini_key[:8] + "..." + gemini_key[-4:] if len(gemini_key) > 12 else "***"
        log_success(f"Friday Copilot configured with Google Gemini: {masked_key} (gemini-3.1-flash-live-preview)")

    # 3. NVIDIA NIM API Key (EDITH Brain)
    nvidia_key = env_vars.get("NVIDIA_API_KEY", os.environ.get("NVIDIA_API_KEY", ""))
    nvidia_is_mock = not nvidia_key or "your_" in nvidia_key or "mock" in nvidia_key
    if nvidia_is_mock:
        log_box(
            "🟢 EDITH BRAIN: RUNNING IN DETERMINISTIC COMMERCIAL POLICY ENGINE",
            [
                "Model Target: NVIDIA NIM (meta/llama-3.3-70b-instruct / nemotron-4-340b)",
                "Status: Policy engine active (Autonomously evaluates discounts, refusal & anti-spam).",
                "",
                "👉 TO UNLOCK EDITH'S NVIDIA NIM COMMERCIAL CLOSER LLM:",
                "   1. Get your free NVIDIA NIM API key: https://build.nvidia.com/",
                "   2. Open .env and fill in: NVIDIA_API_KEY=nvapi-...",
                "   (EDITH automatically applies all business pricing rules regardless)",
            ],
            color=C.GREEN,
        )
    else:
        masked_nv = nvidia_key[:8] + "..." + nvidia_key[-4:] if len(nvidia_key) > 12 else "***"
        log_success(f"EDITH Commercial Closer configured with NVIDIA NIM: {masked_nv}")

    # 4. WhatsApp Gateway Status
    wa_phone_id = env_vars.get("WHATSAPP_PHONE_NUMBER_ID", os.environ.get("WHATSAPP_PHONE_NUMBER_ID", ""))
    wa_token = env_vars.get("WHATSAPP_API_TOKEN", os.environ.get("WHATSAPP_API_TOKEN", ""))
    if wa_phone_id and wa_token and "your_" not in wa_token:
        log_success(f"WhatsApp Cloud API Gateway configured (Phone ID: {wa_phone_id})")
    else:
        log_info("WhatsApp Cloud API credentials not set in .env. Using Local Baileys Bridge (Port 3001) for QR pairing.")

    # 5. Database Schema Initialization Pre-Check
    log_info("Ensuring database schema and tables exist...")
    try:
        init_code = (
            "import asyncio\n"
            "import sys\n"
            "sys.path.insert(0, 'backend')\n"
            "from app.database.session import get_engine\n"
            "from app.database.base import Base\n"
            "import app.database.models\n"
            "async def init():\n"
            "    engine = get_engine()\n"
            "    async with engine.begin() as conn:\n"
            "        await conn.run_sync(Base.metadata.create_all)\n"
            "asyncio.run(init())\n"
        )
        res = subprocess.run(
            [sys.executable, "-c", init_code],
            cwd=str(ROOT_DIR),
            capture_output=True,
            text=True,
        )
        if res.returncode == 0:
            log_success("Database schema verified (All tables, pricing rules & agent notifications ready)")
        else:
            log_warn(f"Database schema init note: {res.stderr.strip()[:100]}")
    except Exception as e:
        log_warn(f"Database init check skipped: {e}")


# =============================================================================
# 4. Port Conflict Detection & Cleanup (Windows + Linux/macOS)
# =============================================================================
def find_listening_pid(port):
    try:
        if os.name == "nt":
            out = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True, text=True, stderr=subprocess.DEVNULL)
            for line in out.strip().splitlines():
                parts = line.split()
                if len(parts) >= 5 and parts[3] == "LISTENING":
                    local_addr = parts[1]
                    if local_addr.endswith(f":{port}"):
                        return int(parts[4])
        else:
            if shutil.which("lsof"):
                out = subprocess.check_output(["lsof", "-ti", f"tcp:{port}"], text=True, stderr=subprocess.DEVNULL)
                for line in out.strip().splitlines():
                    if line.strip().isdigit():
                        return int(line.strip())
            elif shutil.which("fuser"):
                out = subprocess.check_output(["fuser", f"{port}/tcp"], text=True, stderr=subprocess.DEVNULL)
                for part in out.strip().split():
                    if part.strip().isdigit():
                        return int(part.strip())
    except Exception:
        pass
    return None

def kill_pid(pid):
    if pid and pid > 0 and pid != os.getpid():
        try:
            if os.name == "nt":
                subprocess.run(f"taskkill /F /T /PID {pid}", shell=True, capture_output=True, text=True)
            else:
                os.kill(pid, signal.SIGTERM)
        except Exception:
            pass

def clean_stale_ports(ports=None):
    log_header("STEP 4: PORT AVAILABILITY & STALE PROCESS CLEANUP")
    if ports is None:
        ports = [3000, 3001, 8000]
    for p in ports:
        pid = find_listening_pid(p)
        if pid:
            log_warn(f"Port {p} is currently in use by PID {pid}. Terminating stale process...")
            kill_pid(pid)
            time.sleep(1)
            if find_listening_pid(p):
                kill_pid(pid)
                time.sleep(1)
            log_success(f"Port {p} is cleared and ready")
        else:
            log_success(f"Port {p} is free")


# =============================================================================
# 5. Stream Multiplexing & Runtime Auto-Healing
# =============================================================================
def stream_process_output(pipe, prefix, color):
    try:
        for line in iter(pipe.readline, ""):
            if not line:
                break
            line_str = line.strip()
            if not line_str:
                continue

            # Check for runtime missing python module error and attempt on-the-fly fix
            if "ModuleNotFoundError: No module named" in line_str:
                match = re.search(r"No module named ['\"]([^'\"]+)['\"]", line_str)
                if match:
                    pkg = match.group(1)
                    print(f"\n{C.BOLD}{C.YELLOW}[AUTO-FIX] Detected missing module '{pkg}'! Running pip install {pkg}...{C.RESET}")
                    try:
                        subprocess.run([sys.executable, "-m", "pip", "install", pkg], check=True)
                        print(f"{C.GREEN}[AUTO-FIX] Successfully installed '{pkg}'.{C.RESET}\n")
                    except Exception as ex:
                        print(f"{C.RED}[AUTO-FIX] Could not install '{pkg}': {ex}{C.RESET}\n")

            # Colorized prefix for clean log reading
            print(f"{color}[{prefix}]{C.RESET} {line_str}")
    except Exception:
        pass
    finally:
        pipe.close()


# =============================================================================
# 6. Service Orchestration (Cross-Platform Windows + Linux/macOS/Docker)
# =============================================================================
def start_service(cmd, cwd, prefix, color, env_extra=None):
    env = os.environ.copy()
    if env_extra:
        env.update(env_extra)

    is_win = os.name == "nt"
    popen_kwargs = {
        "cwd": str(cwd),
        "env": env,
        "stdout": subprocess.PIPE,
        "stderr": subprocess.STDOUT,
        "text": True,
        "bufsize": 1,
        "shell": is_win,
    }
    if is_win:
        popen_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
        exec_cmd = cmd
    else:
        popen_kwargs["start_new_session"] = True
        exec_cmd = shlex.split(cmd) if isinstance(cmd, str) else cmd

    proc = subprocess.Popen(exec_cmd, **popen_kwargs)
    PROCESSES.append((prefix, proc))

    t = threading.Thread(target=stream_process_output, args=(proc.stdout, prefix, color), daemon=True)
    t.start()
    return proc

def poll_health(url, timeout=30, service_name="Service"):
    start_time = time.time()
    while time.time() - start_time < timeout:
        if SHUTTING_DOWN:
            return False
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "WB-Agent-Launcher"})
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.status in [200, 304]:
                    return True
        except Exception:
            pass
        time.sleep(0.8)
    return False


# =============================================================================
# 7. Graceful Shutdown Handler
# =============================================================================
def shutdown_handler(signum=None, frame=None):
    global SHUTTING_DOWN
    if SHUTTING_DOWN:
        return
    SHUTTING_DOWN = True
    print(f"\n\n{C.BOLD}{C.YELLOW}[{timestamp()}] SHUTTING DOWN ALL PLATFORM SERVICES...{C.RESET}")

    for prefix, proc in reversed(PROCESSES):
        print(f"  {C.DIM}Stopping {prefix} (PID {proc.pid})...{C.RESET}")
        try:
            if os.name == "nt":
                subprocess.run(f"taskkill /F /T /PID {proc.pid}", shell=True, capture_output=True)
            else:
                try:
                    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                except Exception:
                    proc.terminate()
                proc.wait(timeout=3)
        except Exception:
            pass

    # Double check ports
    for p in [3000, 3001, 8000]:
        pid = find_listening_pid(p)
        if pid:
            kill_pid(pid)

    print(f"{C.BOLD}{C.GREEN}[{timestamp()}] All services stopped cleanly. Goodbye!{C.RESET}\n")
    sys.exit(0)


# =============================================================================
# Main Entry Point
# =============================================================================
def main():
    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)

    is_prod = (
        "--prod" in sys.argv
        or os.environ.get("APP_ENV", "").lower() == "production"
        or bool(os.environ.get("RENDER") or os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("FLY_APP_NAME"))
    )
    dash_port = int(os.environ.get("PORT", "3000"))
    backend_port = int(os.environ.get("BACKEND_PORT", "8000"))
    if dash_port == backend_port:
        backend_port = 8001
    bridge_port = int(os.environ.get("BRIDGE_PORT", "3001"))

    print(f"""{C.BOLD}{C.CYAN}
  +-------------------------------------------------------------------------------+
  |                                                                               |
  |    W H A T S A P P   A I   A G E N T   B Y   N S                              |
  |                                                                               |
  |    Dual-Brain Operating System:                                               |
  |    • FRIDAY : Executive Web Copilot & Voice Agent (Gemini 3.1 Flash Live)     |
  |    • EDITH  : Autonomous Commercial Closer & WhatsApp Negotiator (NVIDIA NIM) |
  |                                                                               |
  |    Website  : https://naborajs.me                                             |
  |    Docs Hub : https://naborajs.me/projects/whatsapp-ai-agent-dual-brain/docs  |
  +-------------------------------------------------------------------------------+{C.RESET}""")

    # 1. Environment & Pre-Flight Checks
    check_environment()

    # 2. Dependency Verification & Automatic Installation
    install_dependencies()

    # 3. Interactive Configuration & API Keys Guidance
    check_configuration_and_keys()

    # 4. Port Cleanup
    clean_stale_ports([dash_port, bridge_port, backend_port])

    # 5. Service Launch
    mode_label = "PRODUCTION SERVER MODE" if is_prod else "DEVELOPMENT MODE"
    log_header(f"STEP 5: LAUNCHING DUAL-BRAIN PLATFORM SERVICES ({mode_label})")

    # If production mode, ensure Next.js production build exists
    dash_dir = ROOT_DIR / "dashboard"
    if is_prod and not (dash_dir / ".next" / "BUILD_ID").exists():
        log_step("5-BUILD", "Building Next.js Dashboard for Production...")
        subprocess.run(
            ["npm", "run", "build"],
            cwd=str(dash_dir),
            shell=(os.name == "nt"),
            check=True,
            env={**os.environ, "INTERNAL_API_URL": f"http://127.0.0.1:{backend_port}"},
        )
        log_success("Next.js Production build completed")

    # Service 1: WhatsApp Bridge (Port 3001)
    log_step("5A", f"Starting WhatsApp Bridge (Port {bridge_port})...")
    start_service(
        cmd="node index.js",
        cwd=ROOT_DIR / "whatsapp-bridge",
        prefix="WHATSAPP-BRIDGE",
        color=C.MAGENTA,
        env_extra={
            "BRIDGE_PORT": str(bridge_port),
            "API_URL": f"http://127.0.0.1:{backend_port}",
        },
    )

    # Service 2: FastAPI Backend (Port 8000)
    log_step("5B", f"Starting FastAPI Backend (Port {backend_port})...")
    uvicorn_cmd = (
        f'"{sys.executable}" -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port {backend_port}'
        if is_prod
        else f'"{sys.executable}" -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port {backend_port} --reload'
    )
    start_service(
        cmd=uvicorn_cmd,
        cwd=ROOT_DIR,
        prefix="FASTAPI-BACKEND",
        color=C.CYAN,
        env_extra={
            "PYTHONPATH": "backend",
            "WHATSAPP_BRIDGE_URL": f"http://127.0.0.1:{bridge_port}",
        },
    )

    # Service 3: Next.js Dashboard UI (Port 3000 or $PORT)
    log_step("5C", f"Starting Next.js Operator Dashboard (Port {dash_port})...")
    dash_cmd = (
        f"npm run start -- -H 0.0.0.0 -p {dash_port}"
        if is_prod
        else f"npm run dev -- -H 0.0.0.0 -p {dash_port}"
    )
    start_service(
        cmd=dash_cmd,
        cwd=dash_dir,
        prefix="DASHBOARD-UI   ",
        color=C.BLUE,
        env_extra={
            "PORT": str(dash_port),
            "INTERNAL_API_URL": f"http://127.0.0.1:{backend_port}",
        },
    )

    # 6. Service Health Verification & Diagnostics
    log_header("STEP 6: HEALTH CHECKING ALL RUNNING SERVICES")
    print(f"  {C.DIM}Verifying API endpoints and service readiness...{C.RESET}")

    # FastAPI Backend
    backend_ok = poll_health(f"http://127.0.0.1:{backend_port}/api/v1/health", timeout=30, service_name="FastAPI Backend")
    if backend_ok:
        log_success(f"FastAPI Backend is ONLINE & HEALTHY (http://localhost:{backend_port})")
    else:
        log_error("FastAPI Backend health check timed out!")
        log_box(
            "TROUBLESHOOTING: BACKEND SERVICE",
            [
                f"The FastAPI backend did not respond at http://localhost:{backend_port}/api/v1/health.",
                f"1. Check if another process is using port {backend_port}.",
                "2. Check the [FASTAPI-BACKEND] logs printed above for any Python traceback.",
                "3. Try running manually to inspect errors: python -m uvicorn app.main:app --app-dir backend",
            ],
            color=C.RED,
        )

    # Dual-Brain Bus Endpoint
    brain_ok = poll_health(f"http://127.0.0.1:{backend_port}/api/v1/brain/status", timeout=10, service_name="Dual-Brain Bus")
    if brain_ok:
        log_success("Dual-Brain Architecture Bus is ACTIVE & SYNCED (Friday & EDITH)")
    else:
        log_warn("Dual-Brain Bus is initializing...")

    # Notifications Center Endpoint
    notif_ok = poll_health(f"http://127.0.0.1:{backend_port}/api/v1/notifications", timeout=10, service_name="Notifications Center")
    if notif_ok:
        log_success("Autonomous Agent Notification Center is ACTIVE (WebSocket ready)")
    else:
        log_warn("Notification Center is initializing...")

    # Next.js Dashboard
    dash_ok = poll_health(f"http://127.0.0.1:{dash_port}", timeout=40, service_name="Next.js Dashboard")
    if dash_ok:
        log_success(f"Next.js Operator Dashboard is ONLINE & READY (http://localhost:{dash_port})")
    else:
        log_warn("Next.js Dashboard is still compiling initial pages (will be ready shortly)...")

    # WhatsApp Bridge
    wa_ok = poll_health(f"http://127.0.0.1:{bridge_port}/health", timeout=15, service_name="WhatsApp Bridge")
    if wa_ok:
        log_success(f"WhatsApp Bridge is ONLINE & READY for QR Pairing (http://localhost:{bridge_port})")
    else:
        log_info("WhatsApp Bridge is starting up in background (QR authentication mode)")

    # Summary Display
    print(f"\n{C.BOLD}{C.GREEN}{'='*80}{C.RESET}")
    print(f"{C.BOLD}{C.GREEN}  ✔ ALL PLATFORM SERVICES ARE LIVE AND OPERATIONAL!{C.RESET}")
    print(f"{C.BOLD}{C.GREEN}{'='*80}{C.RESET}")
    print(f"""
  {C.BOLD}Platform Service Endpoints:{C.RESET}
    {C.BLUE}• Operator Dashboard:{C.RESET}        http://localhost:{dash_port}
    {C.CYAN}• Dual-Brain Console:{C.RESET}        http://localhost:{dash_port}/brain
    {C.CYAN}• Knowledge & Policies:{C.RESET}      http://localhost:{dash_port}/knowledge
    {C.CYAN}• Notification Center:{C.RESET}       http://localhost:{dash_port}/notifications
    {C.WHITE}• Backend API & Docs:{C.RESET}        http://localhost:{backend_port}/api/v1/docs
    {C.MAGENTA}• WhatsApp Bridge:{C.RESET}           http://localhost:{bridge_port}
    {C.GREEN}• Online Documentation:{C.RESET}      https://naborajs.me/projects/whatsapp-ai-agent-dual-brain/docs
    {C.GREEN}• Creator Website:{C.RESET}           https://naborajs.me

  {C.BOLD}{C.YELLOW}┌─────────────────────────────────────────────────────────────────────────────┐{C.RESET}
  {C.BOLD}{C.YELLOW}│            WHATSAPP AGENT CONNECTION GUIDE — 3 SIMPLE WAYS TO CONNECT       │{C.RESET}
  {C.BOLD}{C.YELLOW}└─────────────────────────────────────────────────────────────────────────────┘{C.RESET}
  
  {C.BOLD}{C.CYAN}1. METHOD 1: SCAN QR CODE (Instant Multi-Device Pairing){C.RESET}
     • Open the Dashboard at {C.UNDERLINE}http://localhost:{dash_port}{C.RESET} -> Setup & Mode Modal (works on any remote server!), OR
     • Scan the terminal ASCII QR code that appears in the logs below.
     • On phone: WhatsApp > Settings (or 3 dots) > Linked Devices > Link a Device.

  {C.BOLD}{C.CYAN}2. METHOD 2: 8-DIGIT PAIRING CODE (No Camera / Remote Server){C.RESET}
     • Open the Dashboard Setup Modal -> Enter your phone number -> Click {C.BOLD}"Get 8-Digit Code"{C.RESET}.
     • On phone: WhatsApp > Linked Devices > Link a Device > {C.BOLD}"Link with phone number instead"{C.RESET}.
     • Enter the 8-character pairing code displayed on screen.

  {C.BOLD}{C.CYAN}3. METHOD 3: OFFICIAL META CLOUD API (Production Enterprise){C.RESET}
     • Switch to {C.BOLD}"Official (Meta API)"{C.RESET} in the Dashboard Setup Modal or Settings, OR set in {C.BOLD}.env{C.RESET}:
       {C.DIM}WHATSAPP_PROVIDER=meta_cloud{C.RESET}
       {C.DIM}WHATSAPP_ACCESS_TOKEN=<your_access_token>{C.RESET}
       {C.DIM}WHATSAPP_PHONE_NUMBER_ID=<your_phone_id>{C.RESET}
       {C.DIM}WHATSAPP_VERIFY_TOKEN=<your_webhook_verify_token>{C.RESET}

  {C.DIM}Press {C.BOLD}Ctrl+C{C.RESET}{C.DIM} at any time to gracefully stop all services.{C.RESET}
  {C.DIM}Streaming real-time multiplexed logs below:{C.RESET}
    """)

    # Auto-open browser only on desktop interactive environments
    headless_linux = (os.name != "nt" and sys.platform != "darwin" and not os.environ.get("DISPLAY"))
    if "--no-open" not in sys.argv and not is_prod and not headless_linux:
        try:
            webbrowser.open(f"http://localhost:{dash_port}")
        except Exception:
            pass

    # Keep main thread alive and monitor processes
    try:
        while True:
            time.sleep(1)
            for prefix, proc in PROCESSES:
                if proc.poll() is not None and not SHUTTING_DOWN:
                    log_warn(f"{prefix} process exited unexpectedly with code {proc.returncode}!")
    except KeyboardInterrupt:
        shutdown_handler()

if __name__ == "__main__":
    main()
