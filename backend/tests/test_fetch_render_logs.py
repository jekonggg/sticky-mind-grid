import os
import sys
import pytest

# Allow importing from project root / scripts
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from scripts.fetch_render_logs import parse_args, resolve_target_service


SAMPLE_SERVICES = [
    {"id": "srv-other-001", "name": "other-unrelated-service", "ownerId": "tea-1"},
    {"id": "srv-dev-222", "name": "sticky-mind-grid-api-dev", "ownerId": "tea-1"},
    {"id": "srv-prod-111", "name": "sticky-mind-grid-api", "ownerId": "tea-1"},
]


def test_resolve_target_service_by_exact_name_prod_and_dev():
    """Resolves sticky-mind-grid-api for prod and sticky-mind-grid-api-dev for dev when both exist."""
    prod_svc = resolve_target_service(SAMPLE_SERVICES, env="prod", environ={})
    assert prod_svc["id"] == "srv-prod-111"
    assert prod_svc["name"] == "sticky-mind-grid-api"

    dev_svc = resolve_target_service(SAMPLE_SERVICES, env="dev", environ={})
    assert dev_svc["id"] == "srv-dev-222"
    assert dev_svc["name"] == "sticky-mind-grid-api-dev"


def test_resolve_target_service_uses_env_specific_service_ids():
    """Uses RENDER_SERVICE_ID_DEV for dev and RENDER_SERVICE_ID_PROD (or RENDER_SERVICE_ID) for prod."""
    custom_services = [
        {"id": "srv-custom-prod", "name": "custom-prod-name"},
        {"id": "srv-custom-dev", "name": "custom-dev-name"},
        {"id": "srv-legacy-prod", "name": "legacy-prod-name"},
    ]

    environ_with_both = {
        "RENDER_SERVICE_ID_PROD": "srv-custom-prod",
        "RENDER_SERVICE_ID_DEV": "srv-custom-dev",
        "RENDER_SERVICE_ID": "srv-legacy-prod",
    }

    dev_res = resolve_target_service(custom_services, env="dev", environ=environ_with_both)
    assert dev_res["id"] == "srv-custom-dev"

    prod_res = resolve_target_service(custom_services, env="prod", environ=environ_with_both)
    assert prod_res["id"] == "srv-custom-prod"

    # Fallback to RENDER_SERVICE_ID for prod when RENDER_SERVICE_ID_PROD is unset
    prod_fallback_res = resolve_target_service(
        custom_services,
        env="prod",
        environ={"RENDER_SERVICE_ID": "srv-legacy-prod"},
    )
    assert prod_fallback_res["id"] == "srv-legacy-prod"


def test_resolve_target_service_dev_ignores_prod_render_service_id_fallback():
    """Does NOT use RENDER_SERVICE_ID (prod fallback) when env='dev'."""
    environ = {"RENDER_SERVICE_ID": "srv-prod-111"}
    dev_svc = resolve_target_service(SAMPLE_SERVICES, env="dev", environ=environ)
    assert dev_svc["id"] == "srv-dev-222"
    assert dev_svc["name"] == "sticky-mind-grid-api-dev"


def test_resolve_target_service_explicit_service_id_override():
    """Explicit --service-id takes highest precedence."""
    svc = resolve_target_service(
        SAMPLE_SERVICES,
        env="prod",
        explicit_service_id="srv-other-001",
        environ={"RENDER_SERVICE_ID_PROD": "srv-prod-111"},
    )
    assert svc["id"] == "srv-other-001"


def test_resolve_target_service_raises_lookup_error_instead_of_fallback():
    """Raises LookupError instead of falling back to services[0] or substring match when missing."""
    only_prod_services = [
        {"id": "srv-other-001", "name": "other-service"},
        {"id": "srv-prod-111", "name": "sticky-mind-grid-api"},
    ]

    with pytest.raises(LookupError) as exc_info:
        resolve_target_service(only_prod_services, env="dev", environ={})

    msg = str(exc_info.value)
    assert "sticky-mind-grid-api-dev" in msg
    assert "RENDER_SERVICE_ID_DEV" in msg

    # Explicit or env service ID that doesn't exist also raises LookupError
    with pytest.raises(LookupError) as exc_id_info:
        resolve_target_service(
            SAMPLE_SERVICES,
            env="prod",
            explicit_service_id="srv-nonexistent-999",
            environ={},
        )
    assert "srv-nonexistent-999" in str(exc_id_info.value)


def test_parse_args_backward_compatible_and_env_flags():
    """Parses CLI args for ['100'], ['--env', 'dev', '100'], and ['--env', 'prod']."""
    args_pos_only = parse_args(["100"])
    assert args_pos_only.env == "prod"
    assert args_pos_only.limit == 100
    assert args_pos_only.service_id is None

    args_dev_with_limit = parse_args(["--env", "dev", "100"])
    assert args_dev_with_limit.env == "dev"
    assert args_dev_with_limit.limit == 100

    args_prod_default_limit = parse_args(["--env", "prod"])
    assert args_prod_default_limit.env == "prod"
    assert args_prod_default_limit.limit == 50

    args_with_service_id = parse_args(["--env", "development", "--service-id", "srv-xyz", "25"])
    assert args_with_service_id.env == "development"
    assert args_with_service_id.service_id == "srv-xyz"
    assert args_with_service_id.limit == 25
