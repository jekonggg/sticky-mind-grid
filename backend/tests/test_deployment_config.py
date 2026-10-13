import os
import importlib.util
import pytest

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
