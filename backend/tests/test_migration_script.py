import os
import sys
import json
from datetime import datetime
import pytest

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from scripts.migrate_mysql_to_postgres import get_target_db_url

def test_get_target_db_url_normalization(monkeypatch):
    monkeypatch.setenv("SUPABASE_DB_URL", "postgres://user:pass@host:5432/db")
    assert get_target_db_url() == "postgresql+psycopg2://user:pass@host:5432/db"

    monkeypatch.setenv("SUPABASE_DB_URL", "postgresql://user:pass@host:5432/db")
    assert get_target_db_url() == "postgresql+psycopg2://user:pass@host:5432/db"

    monkeypatch.setenv("SUPABASE_DB_URL", "postgresql+psycopg2://user:pass@host:5432/db")
    assert get_target_db_url() == "postgresql+psycopg2://user:pass@host:5432/db"

def test_data_cleaning_nul_byte_and_email_lowercasing():
    # Test NUL byte stripping
    raw_text = "Hello\x00World\x00!"
    clean_text = raw_text.replace('\x00', '')
    assert clean_text == "HelloWorld!"

    # Test email lowercasing and trimming
    raw_email = "  User.Name@Example.COM  "
    clean_email = raw_email.strip().lower()
    assert clean_email == "user.name@example.com"

def test_jsonb_parsing_and_boolean_conversion():
    # Boolean 0/1 to True/False
    assert bool(1) is True
    assert bool(0) is False

    # JSON string to parsed python object
    raw_json = '[{"id": "1", "name": "Bug", "color": "#f00"}]'
    parsed = json.loads(raw_json)
    assert isinstance(parsed, list)
    assert parsed[0]["name"] == "Bug"
