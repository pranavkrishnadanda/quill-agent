.PHONY: install test test-unit test-integration test-e2e lint run docker-up docker-down clean

VENV := .venv
PYTHON := $(VENV)/bin/python
PYTEST := $(VENV)/bin/pytest
PIP := $(VENV)/bin/pip

install:
	$(PIP) install -e ".[dev]"

test:
	$(PYTEST) -v

test-unit:
	$(PYTEST) tests/unit -v

test-integration:
	$(PYTEST) tests/integration -v

test-e2e:
	$(PYTEST) tests/e2e -v

lint:
	$(VENV)/bin/ruff check src tests
	$(VENV)/bin/ruff format --check src tests

run:
	$(PYTHON) -m job_agent_server

docker-up:
	docker compose up -d

docker-down:
	docker compose down

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type d -name .pytest_cache -exec rm -rf {} +
	find . -type d -name .ruff_cache -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf build dist *.egg-info .coverage htmlcov
