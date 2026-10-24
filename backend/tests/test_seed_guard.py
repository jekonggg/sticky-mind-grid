import pytest
from unittest.mock import patch
from seed import validate_seed_safety, seed_database


class TestSeedGuard:
    """Unit tests for the destructive-operation safety guard in seed.py."""

    def test_refuses_when_app_env_is_production(self, monkeypatch):
        """Production must be hard-blocked even with a local DB or ALLOW_DESTRUCTIVE_SEED=true."""
        monkeypatch.setenv('APP_ENV', 'production')
        monkeypatch.setenv('DATABASE_URL', 'sqlite:///:memory:')
        monkeypatch.setenv('ALLOW_DESTRUCTIVE_SEED', 'true')

        with pytest.raises(RuntimeError, match="REFUSING TO SEED: seed.py cannot be executed when APP_ENV is 'production'"):
            validate_seed_safety()

        with pytest.raises(RuntimeError, match="REFUSING TO SEED: seed.py cannot be executed when APP_ENV is 'production'"):
            validate_seed_safety(
                app_env='prod',
                db_uri='mysql+pymysql://root:root@127.0.0.1:3306/sticky_mind_grid',
                allow_destructive='true',
            )

    def test_refuses_when_flask_env_is_production_and_app_env_unset(self, monkeypatch):
        """Fallback to FLASK_ENV='production' must also hard-block seeding."""
        monkeypatch.delenv('APP_ENV', raising=False)
        monkeypatch.setenv('FLASK_ENV', 'production')
        monkeypatch.setenv('DATABASE_URL', 'mysql+pymysql://root:root@localhost:3306/sticky_mind_grid')
        monkeypatch.setenv('ALLOW_DESTRUCTIVE_SEED', 'true')

        with pytest.raises(RuntimeError, match="REFUSING TO SEED: seed.py cannot be executed when APP_ENV is 'production'"):
            validate_seed_safety()

    def test_refuses_remote_supabase_host_without_explicit_opt_in(self, monkeypatch):
        """Targeting a non-local database host without ALLOW_DESTRUCTIVE_SEED=true must be blocked."""
        remote_uri = 'postgresql://user:pass@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
        monkeypatch.setenv('APP_ENV', 'dev')
        monkeypatch.setenv('DATABASE_URL', remote_uri)
        monkeypatch.delenv('ALLOW_DESTRUCTIVE_SEED', raising=False)

        with pytest.raises(
            RuntimeError,
            match=r"REFUSING TO SEED non-local database host 'aws-0-ap-southeast-1\.pooler\.supabase\.com'",
        ):
            validate_seed_safety()

        monkeypatch.setenv('ALLOW_DESTRUCTIVE_SEED', 'false')
        with pytest.raises(
            RuntimeError,
            match=r"REFUSING TO SEED non-local database host 'aws-0-ap-southeast-1\.pooler\.supabase\.com'",
        ):
            validate_seed_safety()

    def test_succeeds_remote_supabase_host_with_explicit_opt_in(self, monkeypatch):
        """Targeting a non-local database host in dev succeeds when ALLOW_DESTRUCTIVE_SEED=true."""
        remote_uri = 'postgresql://user:pass@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
        monkeypatch.setenv('APP_ENV', 'dev')
        monkeypatch.setenv('DATABASE_URL', remote_uri)
        monkeypatch.setenv('ALLOW_DESTRUCTIVE_SEED', 'true')

        env_name, db_host = validate_seed_safety()
        assert env_name == 'dev'
        assert db_host == 'aws-0-ap-southeast-1.pooler.supabase.com'

    @pytest.mark.parametrize(
        'local_uri,expected_host',
        [
            ('mysql+pymysql://root:root@127.0.0.1:3306/sticky_mind_grid_test?charset=utf8mb4', '127.0.0.1'),
            ('mysql+pymysql://root:root@localhost:3306/sticky_mind_grid', 'localhost'),
            ('sqlite:///:memory:', 'localhost'),
            ('', 'localhost'),
        ],
    )
    def test_succeeds_local_database_without_opt_in(self, monkeypatch, local_uri, expected_host):
        """Local database targets (127.0.0.1, localhost, sqlite) succeed with APP_ENV=local and no opt-in flag."""
        monkeypatch.setenv('APP_ENV', 'local')
        monkeypatch.setenv('DATABASE_URL', local_uri)
        monkeypatch.delenv('ALLOW_DESTRUCTIVE_SEED', raising=False)

        env_name, db_host = validate_seed_safety()
        assert env_name == 'local'
        assert db_host == expected_host

    def test_seed_database_fails_fast_before_create_app_in_production(self, monkeypatch):
        """seed_database() must validate safety before invoking create_app()."""
        monkeypatch.setenv('APP_ENV', 'production')
        monkeypatch.setenv('DATABASE_URL', 'sqlite:///:memory:')

        with patch('seed.create_app') as mock_create_app:
            with pytest.raises(RuntimeError, match="REFUSING TO SEED"):
                seed_database()
            mock_create_app.assert_not_called()
