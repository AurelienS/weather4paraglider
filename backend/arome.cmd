@echo off
setlocal
cd /d "%~dp0"
set "PY=%~dp0.venv\Scripts\python.exe"
if not exist "%PY%" set "PY=%~dp0..\.venv\Scripts\python.exe"
if not exist "%PY%" (
  echo [arome] venv introuvable.
  exit /b 1
)
"%PY%" -m src.cli %*
