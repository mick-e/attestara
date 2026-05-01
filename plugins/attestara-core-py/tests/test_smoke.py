"""Smoke test: package imports and exposes its version."""

from __future__ import annotations

import attestara_core


def test_version_exposed() -> None:
    assert isinstance(attestara_core.__version__, str)
    assert attestara_core.__version__ == "0.1.0"
