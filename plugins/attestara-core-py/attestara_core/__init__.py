"""Python client for the Attestara cryptographic trust protocol.

The full client surface (``AttestaraClient``, ``ProofClient``, identity helpers, typed
exceptions, Pydantic models) lands across tasks A1.2 – A1.5. This module currently
exposes only the package version so the build/publish pipeline can be stood up first.
"""

from __future__ import annotations

__version__ = "0.1.0"

__all__ = ["__version__"]
