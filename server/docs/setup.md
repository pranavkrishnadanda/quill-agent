# Setup

Step-by-step instructions to run the job-agent-server locally.

## 1. Install Python 3.12

### macOS (Homebrew)

```bash
brew install python@3.12
python3.12 --version
```

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt install -y python3.12 python3.12-venv python3.12-dev
python3.12 --version
```

### Amazon Linux 2023 / RHEL

```bash
sudo dnf install -y python3.12 python3.12-devel
python3.12 --version
```

Verify:

```bash
python3.12 --version   # -> Python 3.12.x
```

## 2. Clone the repository

```bash
git clone <REPO_URL> job-agent-server
cd job-agent-server
```

## 3. Create and activate a virtual environment

```bash
python3.12 -m venv .venv
source .venv/bin/activate           # bash / zsh
# .venv\Scripts\activate            # Windows PowerShell
python -V                            # confirm 3.12.x
```

## 4. Install the package (editable) with dev extras

```bash
pip install --upgrade pip
pip install -e ".[dev]"
```

This installs the `job_agent_server` package, runtime dependencies, and
the test / lint toolchain (`pytest`, `ruff`, `mypy`, ...).

## 5. Configure environment

Copy the example env file and fill in secrets locally:

```bash
cp .env.example .env
```

Open `.env` in your editor and set at minimum:

- `IMAP_HOST`, `IMAP_PORT`, `IMAP_USERNAME`, `IMAP_PASSWORD`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`
- `DATABASE_URL` (e.g. `postgresql+psycopg://user:pass@localhost:5432/jobagent`)
- Any provider API keys documented in the file.

Never commit `.env`. It is git-ignored.

## 6. Run the server locally

```bash
source .venv/bin/activate
python -m job_agent_server
```

The server binds to `http://127.0.0.1:8000` by default. Override the
port with `PORT=9000 python -m job_agent_server`.

Health check:

```bash
curl -sf http://127.0.0.1:8000/health
```

## 7. (Optional) Run the tests

Unit tests only (fast, no external services):

```bash
pytest tests/unit -q
```

Integration tests (require Docker for the shared Greenmail fixture):

```bash
pytest tests/integration -q
```

## Troubleshooting

- `ModuleNotFoundError: job_agent_server` — the venv is not active, or
  `pip install -e ".[dev]"` was not run. Re-activate and reinstall.
- `python: command not found` — use `python3.12` explicitly, or
  re-activate the venv.
- Port already in use — set `PORT` to a free port.
- IMAP/SMTP auth failures — verify credentials in `.env` and that the
  provider allows app passwords / less-secure app access.
