# attestara

Python client for the [Attestara](https://attestara.ai) cryptographic trust protocol.

> **Status:** alpha. The Python core ships the HTTP client and types used by the framework
> plugins (`attestara-crewai`, `attestara-langgraph`). It calls the Attestara relay's REST
> API directly — ZK proof generation and on-chain settlement happen server-side.

## Install

```bash
pip install attestara
```

Requires Python ≥ 3.10.

## Quickstart

```python
import asyncio
from attestara_core import AttestaraClient

async def main() -> None:
    async with AttestaraClient(base_url="https://api.attestara.ai", api_key="...") as client:
        agent = await client.agents.create(name="my-buyer")
        print(agent.did)

asyncio.run(main())
```

For framework integrations, see:
- [`attestara-crewai`](https://pypi.org/project/attestara-crewai/) — CrewAI tools
- [`attestara-langgraph`](https://pypi.org/project/attestara-langgraph/) — LangGraph nodes

## Development

```bash
uv venv --python 3.10
. .venv/Scripts/activate         # Windows
# . .venv/bin/activate            # Unix
uv pip install -e ".[dev]"
ruff check .
ruff format --check .
mypy .
pytest -m "not integration"
```

## License

MIT — see [LICENSE](../../LICENSE) at repo root.
