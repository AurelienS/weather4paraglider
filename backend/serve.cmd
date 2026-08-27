@echo off
setlocal
cd /d "%~dp0"
set "PY=%~dp0.venv\Scripts\python.exe"
if not exist "%PY%" set "PY=%~dp0..\.venv\Scripts\python.exe"
if not exist "%PY%" (
  echo [serve] venv introuvable. Depuis backend\ :
  echo   python -m venv .venv
  echo   .venv\Scripts\python.exe -m pip install -e ".[dev]"
  exit /b 1
)
"%PY%" -m uvicorn src.api:app --host 127.0.0.1 --port 8000 %*
