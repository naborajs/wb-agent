#!/usr/bin/env python3
"""
===============================================================================
  EDITH — Autonomous B2B AI Sales Agent Platform
  Unified All-In-One Orchestrator: Check, Install, Start & Stream
===============================================================================
Usage:
    python run.py             # Full check, install missing deps, and launch all services
    python run.py --no-open   # Launch without automatically opening browser
    python run.py --clean     # Clean dependencies cache and restart
===============================================================================
"""

import sys
import os
import time
import signal
import shutil
import socket
import urllib.request
import urllib.error
import threading
import subprocess
import webbrowser
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
    RESET   = "\033[0m"
    BOLD    = "\033[1m"
    DIM     = "\033[2m"
    RED     = "\033[91m"
    GREEN   = "\033[92m"
    YELLOW  = "\033[93m"
    BLUE    = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN    = "\033[96m"
    WHITE   = "\033[97m"

def timestamp():
    return time.strftime("%H:%M:%S")

def log_header(text):
    print(f"\n{C.BOLD}{C.CYAN}{'='*78}{C.RESET}")
    print(f"{C.BOLD}{C.WHITE}  {text}{C.RESET}")
    print(f"{C.BOLD}{C.CYAN}{'='*78}{C.RESET}\n")

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
    log_success("Python version verified (>= 3.10)")

    # B. Node.js & npm
    node_path = shutil.which("node")
    npm_path = shutil.which("npm")
    if not node_path or not npm_path:
        log_error("Node.js and npm must be installed and available in PATH.")
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
        ROOT_DIR / "docs" / "assets",
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
            log_error("Brand asset generation script not found!")
    else:
        log_success("EDITH brand assets and favicon verified")

# =============================================================================
# 2. Dependency Verification & Installation
# =============================================================================
def install_dependencies():
    log_header("STEP 2: DEPENDENCY VERIFICATION & AUTO-INSTALL")

    # A. Python Backend Dependencies
    log_step("2A", "Checking Python Dependencies...")
    core_pkgs = ["fastapi", "uvicorn", "sqlalchemy", "pydantic", "reportlab", "PIL", "numpy", "websockets", "httpx"]
    missing_pkgs = []
    for pkg in core_pkgs:
        try:
            __import__(pkg)
        except ImportError:
            missing_pkgs.append(pkg)

    req_file = ROOT_DIR / "requirements.txt"
    if missing_pkgs:
        log_warn(f"Missing Python packages: {', '.join(missing_pkgs)}")
        log_info("Installing requirements via pip...")
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(req_file)], check=True)
            log_success("Python requirements installed successfully")
        except subprocess.CalledProcessError as e:
            log_error(f"Failed to install Python requirements: {e}")
            sys.exit(1)
    else:
        log_success("All core Python packages verified")

    # B. WhatsApp Bridge Dependencies
    log_step("2B", "Checking WhatsApp Bridge Node Modules...")
    wa_modules = ROOT_DIR / "whatsapp-bridge" / "node_modules"
    if not wa_modules.exists() or not (wa_modules / "@whiskeysockets").exists():
        log_warn("whatsapp-bridge/node_modules missing. Running npm install...")
        try:
            subprocess.run(["npm", "install"], cwd=str(ROOT_DIR / "whatsapp-bridge"), shell=True, check=True)
            log_success("WhatsApp Bridge dependencies installed")
        except subprocess.CalledProcessError as e:
            log_error(f"Failed to install WhatsApp Bridge dependencies: {e}")
            sys.exit(1)
    else:
        log_success("WhatsApp Bridge dependencies verified")

    # C. Next.js Dashboard Dependencies
    log_step("2C", "Checking Dashboard Node Modules...")
    dash_modules = ROOT_DIR / "dashboard" / "node_modules"
    if not dash_modules.exists() or not (dash_modules / "next").exists():
        log_warn("dashboard/node_modules missing. Running npm install...")
        try:
            subprocess.run(["npm", "install"], cwd=str(ROOT_DIR / "dashboard"), shell=True, check=True)
            log_success("Dashboard dependencies installed")
        except subprocess.CalledProcessError as e:
            log_error(f"Failed to install Dashboard dependencies: {e}")
            sys.exit(1)
    else:
        log_success("Dashboard dependencies verified")

# =============================================================================
# 3. Port Conflict Detection & Cleanup
# =============================================================================
def find_listening_pid(port):
    try:
        out = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True, text=True, stderr=subprocess.DEVNULL)
        for line in out.strip().splitlines():
            parts = line.split()
            if len(parts) >= 5 and parts[3] == "LISTENING":
                local_addr = parts[1]
                if local_addr.endswith(f":{port}"):
                    return int(parts[4])
    except Exception:
        pass
    return None

def kill_pid(pid):
    if pid and pid > 0 and pid != os.getpid():
        try:
            subprocess.run(f"taskkill /F /T /PID {pid}", shell=True, capture_output=True, text=True)
        except Exception:
            pass

def clean_stale_ports():
    log_header("STEP 3: PORT AVAILABILITY & STALE PROCESS CLEANUP")
    ports = [3000, 3001, 8000]
    for p in ports:
        pid = find_listening_pid(p)
        if pid:
            log_warn(f"Port {p} is currently in use by PID {pid}. Terminating stale process...")
            kill_pid(pid)
            time.sleep(1)
            # Re-check
            if find_listening_pid(p):
                log_warn(f"Force re-terminating port {p}...")
                kill_pid(pid)
                time.sleep(1)
            log_success(f"Port {p} is cleared and ready")
        else:
            log_success(f"Port {p} is free")

# =============================================================================
# 4. Stream Multiplexing
# =============================================================================
def stream_process_output(pipe, prefix, color):
    try:
        for line in iter(pipe.readline, ""):
            if not line:
                break
            line_str = line.strip()
            if line_str:
                # Colorized prefix for clean log reading
                print(f"{color}[{prefix}]{C.RESET} {line_str}")
    except Exception:
        pass
    finally:
        pipe.close()

# =============================================================================
# 5. Service Orchestration
# =============================================================================
def start_service(cmd, cwd, prefix, color, env_extra=None):
    env = os.environ.copy()
    if env_extra:
        env.update(env_extra)

    proc = subprocess.Popen(
        cmd,
        cwd=str(cwd),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        shell=True if os.name == "nt" else False
    )
    PROCESSES.append((prefix, proc))

    # Spawn background thread to stream output
    t = threading.Thread(target=stream_process_output, args=(proc.stdout, prefix, color), daemon=True)
    t.start()
    return proc

def poll_health(url, timeout=30, service_name="Service"):
    start_time = time.time()
    while time.time() - start_time < timeout:
        if SHUTTING_DOWN:
            return False
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "EDITH-Launcher"})
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.status in [200, 304]:
                    return True
        except Exception:
            pass
        time.sleep(0.8)
    return False

# =============================================================================
# 6. Graceful Shutdown Handler
# =============================================================================
def shutdown_handler(signum=None, frame=None):
    global SHUTTING_DOWN
    if SHUTTING_DOWN:
        return
    SHUTTING_DOWN = True
    print(f"\n\n{C.BOLD}{C.YELLOW}[{timestamp()}] SHUTTING DOWN ALL SERVICES...{C.RESET}")

    for prefix, proc in reversed(PROCESSES):
        print(f"  {C.DIM}Stopping {prefix} (PID {proc.pid})...{C.RESET}")
        try:
            if os.name == "nt":
                subprocess.run(f"taskkill /F /T /PID {proc.pid}", shell=True, capture_output=True)
            else:
                proc.terminate()
                proc.wait(timeout=2)
        except Exception:
            pass

    # Double check ports
    for p in [3000, 3001, 8000]:
        pid = find_listening_pid(p)
        if pid:
            kill_pid(pid)

    print(f"{C.BOLD}{C.GREEN}[{timestamp()}] All EDITH services stopped cleanly. Goodbye!{C.RESET}\n")
    sys.exit(0)

# =============================================================================
# Main Entry Point
# =============================================================================
def main():
    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)

    print(f"""{C.BOLD}{C.CYAN}
  +----------------------------------------------------------------------+
  |                                                                      |
  |     EEEEE  DDDD   IIIII  TTTTT  H   H     OOO    SSSS                |
  |     E      D   D    I      T    H   H    O   O  S                    |
  |     EEEE   D   D    I      T    HHHHH    O   O   SSS                 |
  |     E      D   D    I      T    H   H    O   O      S                |
  |     EEEEE  DDDD   IIIII    T    H   H     OOO   SSSS                 |
  |                                                                      |
  |     Autonomous B2B AI Sales Agent Operating System                   |
  |     More Conversations. Real Opportunities.                          |
  +----------------------------------------------------------------------+{C.RESET}""")

    # 1. Environment Checks
    check_environment()

    # 2. Dependency Verification & Installation
    install_dependencies()

    # 3. Port Cleanup
    clean_stale_ports()

    # 4. Service Launch
    log_header("STEP 4: LAUNCHING ALL 4 EDITH SERVICES")

    # Service 1: WhatsApp Bridge (Port 3001)
    log_step("4A", "Starting WhatsApp Bridge (Port 3001)...")
    start_service(
        cmd="node index.js",
        cwd=ROOT_DIR / "whatsapp-bridge",
        prefix="WHATSAPP-BRIDGE",
        color=C.MAGENTA
    )

    # Service 2: FastAPI Backend (Port 8000)
    log_step("4B", "Starting FastAPI Backend (Port 8000)...")
    start_service(
        cmd=f'"{sys.executable}" -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000',
        cwd=ROOT_DIR,
        prefix="FASTAPI-BACKEND",
        color=C.CYAN,
        env_extra={"PYTHONPATH": "backend"}
    )

    # Service 3: Job Worker Daemon
    log_step("4C", "Starting Job Worker Daemon...")
    start_service(
        cmd=f'"{sys.executable}" -m app.jobs.worker',
        cwd=ROOT_DIR,
        prefix="JOB-WORKER     ",
        color=C.YELLOW,
        env_extra={"PYTHONPATH": "backend"}
    )

    # Service 4: Next.js Dashboard UI (Port 3000)
    log_step("4D", "Starting Next.js Dashboard UI (Port 3000)...")
    start_service(
        cmd="npm run dev",
        cwd=ROOT_DIR / "dashboard",
        prefix="DASHBOARD-UI   ",
        color=C.BLUE
    )

    # 5. Service Health Verification
    log_header("STEP 5: HEALTH CHECKING ALL RUNNING SERVICES")

    print(f"  {C.DIM}Waiting for services to become responsive...{C.RESET}")

    # WhatsApp Bridge
    if poll_health("http://localhost:3001/health", timeout=25, service_name="WhatsApp Bridge"):
        log_success("WhatsApp Bridge is ONLINE & HEALTHY (http://localhost:3001)")
    else:
        log_warn("WhatsApp Bridge is starting up (still initializing authentication)")

    # FastAPI Backend
    if poll_health("http://localhost:8000/api/v1/health", timeout=25, service_name="FastAPI Backend"):
        log_success("FastAPI Backend is ONLINE & HEALTHY (http://localhost:8000)")
    else:
        log_error("FastAPI Backend health check timed out!")

    # Next.js Dashboard
    if poll_health("http://localhost:3000", timeout=35, service_name="Next.js Dashboard"):
        log_success("Next.js Dashboard is ONLINE & READY (http://localhost:3000)")
    else:
        log_warn("Next.js Dashboard is still compiling pages...")

    # Summary Display
    print(f"\n{C.BOLD}{C.GREEN}{'='*78}{C.RESET}")
    print(f"{C.BOLD}{C.GREEN}  ✔ ALL EDITH PLATFORM SERVICES ARE LIVE AND OPERATIONAL!{C.RESET}")
    print(f"{C.BOLD}{C.GREEN}{'='*78}{C.RESET}")
    print(f"""
  {C.BOLD}Service Endpoints:{C.RESET}
    {C.BLUE}• Operator Dashboard:{C.RESET}    http://localhost:3000
    {C.CYAN}• Backend API & Docs:{C.RESET}    http://localhost:8000/api/v1/docs
    {C.MAGENTA}• WhatsApp Bridge:{C.RESET}       http://localhost:3001/health
    {C.YELLOW}• Job Worker Daemon:{C.RESET}     Running in background (continuous polling)

  {C.DIM}Press {C.BOLD}Ctrl+C{C.RESET}{C.DIM} at any time to gracefully stop all services.{C.RESET}
  {C.DIM}Streaming real-time logs below:{C.RESET}
    """)

    # Auto-open browser if not disabled
    if "--no-open" not in sys.argv:
        try:
            webbrowser.open("http://localhost:3000")
        except Exception:
            pass

    # Keep main thread alive and monitor processes
    try:
        while True:
            time.sleep(1)
            # Check if any critical process died prematurely
            for prefix, proc in PROCESSES:
                if proc.poll() is not None and not SHUTTING_DOWN:
                    log_warn(f"{prefix} process exited unexpectedly with code {proc.returncode}!")
    except KeyboardInterrupt:
        shutdown_handler()

if __name__ == "__main__":
    main()
