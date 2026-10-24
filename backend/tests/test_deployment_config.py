import os
import importlib.util
import subprocess
import sys

import pytest

from config import DEFAULT_SUPABASE_CA, _resolve_postgres_ssl

def test_gunicorn_config_pins_single_process_multithreaded_sse():
    """
    OQ-16: Because EventBroadcaster uses in-process threading queues,
    deployment must pin Gunicorn to 1 worker with multiple threads (gthread).
    """
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    gunicorn_conf = os.path.join(repo_root, "backend", "gunicorn.conf.py")
    procfile = os.path.join(repo_root, "Procfile")

    assert os.path.exists(gunicorn_conf), f"{gunicorn_conf} must exist to pin deployment config"
    assert os.path.exists(procfile), f"{procfile} must exist to declare web process command"

    # Load gunicorn.conf.py as python module
    spec = importlib.util.spec_from_file_location("gunicorn_conf", gunicorn_conf)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    assert getattr(mod, "workers", None) == 1, "Gunicorn workers must be strictly pinned to 1 for in-process SSE"
    assert getattr(mod, "worker_class", None) == "gthread", "Gunicorn worker_class must be gthread"
    assert getattr(mod, "threads", 0) >= 4, "Gunicorn must configure multiple threads to service concurrent SSE streams"

    # Check Procfile contents
    with open(procfile, "r", encoding="utf-8") as f:
        content = f.read()
    assert "gunicorn" in content
    assert "gunicorn.conf.py" in content


def test_postgres_ssl_defaults_to_verify_full_for_supabase(monkeypatch):
    monkeypatch.delenv("DB_SSL_MODE", raising=False)
    monkeypatch.delenv("DB_SSL_CA", raising=False)

    options = _resolve_postgres_ssl("aws-1-us-east-1.pooler.supabase.com", "")

    assert options["sslmode"] == "verify-full"
    assert options["sslrootcert"] == DEFAULT_SUPABASE_CA


def test_postgres_ssl_defaults_to_require_for_non_supabase_hosts(monkeypatch):
    monkeypatch.delenv("DB_SSL_MODE", raising=False)
    monkeypatch.delenv("DB_SSL_CA", raising=False)

    options = _resolve_postgres_ssl("db.internal.example.com", "")

    assert options["sslmode"] == "require"
    assert "sslrootcert" not in options


def test_postgres_ssl_honors_explicit_url_mode(monkeypatch):
    monkeypatch.delenv("DB_SSL_MODE", raising=False)
    monkeypatch.delenv("DB_SSL_CA", raising=False)

    options = _resolve_postgres_ssl("db.internal.example.com", "sslmode=verify-full")

    assert options["sslmode"] == "verify-full"
    assert options["sslrootcert"] == DEFAULT_SUPABASE_CA


def test_postgres_ssl_env_override_wins_over_url(monkeypatch):
    monkeypatch.setenv("DB_SSL_MODE", "require")

    options = _resolve_postgres_ssl(
        "aws-1-us-east-1.pooler.supabase.com",
        "sslmode=verify-full&sslrootcert=ignored.crt",
    )

    assert options == {"sslmode": "require"}


def test_postgres_ssl_rejects_invalid_mode(monkeypatch):
    monkeypatch.setenv("DB_SSL_MODE", "bogus")

    with pytest.raises(ValueError, match="Invalid DB_SSL_MODE"):
        _resolve_postgres_ssl("db.internal.example.com", "")


def test_postgres_ssl_rejects_missing_ca(monkeypatch, tmp_path):
    monkeypatch.setenv("DB_SSL_MODE", "verify-full")
    monkeypatch.setenv("DB_SSL_CA", str(tmp_path / "missing-ca.crt"))

    with pytest.raises(ValueError, match="DB_SSL_CA file not found"):
        _resolve_postgres_ssl("db.internal.example.com", "")


def test_config_wires_postgres_ssl_into_engine_options(monkeypatch):
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env = os.environ.copy()
    env["DATABASE_URL"] = "postgresql://user:pass@db.internal.example.com:5432/app"
    env.pop("DB_SSL_MODE", None)
    env.pop("DB_SSL_CA", None)

    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "from config import Config; print(Config.SQLALCHEMY_ENGINE_OPTIONS['connect_args']['sslmode'])",
        ],
        cwd=backend_dir,
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
    )

    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "require"
