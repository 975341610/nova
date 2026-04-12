@echo off
setlocal enabledelayedexpansion

:: 防止 OpenMP 线程冲突导致的崩溃
set OMP_NUM_THREADS=4
set OPENBLAS_NUM_THREADS=4

echo ==========================================
echo    Nova Project - One-Click Startup Script
echo ==========================================

:: 1. Check Python environment
echo [*] Checking Python environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo [!] Python is not installed or not in PATH. Please install Python.
    pause
    exit /b 1
)

:: 2. Check npm environment
echo [*] Checking npm environment...
call npm --version >nul 2>&1
if errorlevel 1 (
    echo [!] npm is not installed or not in PATH. Please install Node.js/npm.
    pause
    exit /b 1
)

:: 3. Install backend dependencies
echo [*] Installing backend dependencies...
call python -m pip install -r requirements.txt
if errorlevel 1 (
    echo [!] Failed to install backend dependencies.
    pause
    exit /b 1
)

:: 4. 确保集成的本地 AI 引擎就绪
echo [*] Checking for integrated Ollama engine...
call python ensure_ollama.py
if errorlevel 1 (
    echo [!] Failed to download or setup the integrated Ollama engine.
    pause
    exit /b 1
)

echo [*] Starting Integrated AI Engine in the background...
start "Nova Local AI (Integrated)" cmd /c "set OLLAMA_HOST=127.0.0.1:11434&& set OLLAMA_MODELS=%cd%\data\ollama_models&& cd bin && ollama.exe serve"

:: 5. Start backend service in a new window
echo [*] Starting backend service in a new window...
start "Nova Backend" cmd /k "python start_backend.py"

:: 6. Frontend startup
echo [*] Moving to frontend directory: nova-block/
cd nova-block
if errorlevel 1 (
    echo [!] Directory nova-block not found.
    pause
    exit /b 1
)

echo [*] Installing frontend dependencies (npm install)...
call npm install
if errorlevel 1 (
    echo [!] Failed to install frontend dependencies.
    pause
    exit /b 1
)

:: 7. Prompt and start frontend
echo.
echo ==========================================
echo    [SUCCESS] Frontend is starting...
echo    URL: http://localhost:5173
echo ==========================================
echo.
call npm run dev

pause
