import os
import sys
import subprocess
import time

def start_backend():
    print("[CX PULSE] Starting FastAPI Backend on http://localhost:8000 ...")
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "--app-dir", "backend", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=os.path.abspath(".")
    )
    return proc

def start_frontend():
    print("[CX PULSE] Starting Vite React Frontend on http://localhost:5173 ...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    proc = subprocess.Popen(
        [npm_cmd, "--workspace=frontend", "run", "dev", "--", "--host"],
        cwd=os.path.abspath(".")
    )
    return proc

def main():
    print("=" * 65)
    print(" CX PULSE - Autonomous Customer Experience Recovery Platform")
    print(" Multi-Company Intelligence Engine & Decision Simulator")
    print("=" * 65)
    
    backend_proc = start_backend()
    time.sleep(2)
    frontend_proc = start_frontend()
    
    print("\n[CX PULSE] Active Services:")
    print("  -> Web Application: http://localhost:5173")
    print("  -> Backend API:     http://localhost:8000")
    print("  -> API Docs:        http://localhost:8000/docs\n")
    print("Press Ctrl+C to stop all services.\n")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[CX PULSE] Shutting down services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("[CX PULSE] Shutdown complete.")

if __name__ == "__main__":
    main()
