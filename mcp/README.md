# Simple MCP demo: server, client, tools, resources, prompts

A tiny Model Context Protocol example. The server exposes a few in-memory
documents (`docs.py`); the client connects over stdio and uses every MCP
feature once.

| File        | Role                                                         |
| ----------- | ------------------------------------------------------------ |
| `docs.py`   | The data: a dict of document id -> text                      |
| `server.py` | MCP server with 2 tools, 2 resources, 1 prompt               |
| `client.py` | `MCPClient` wrapper plus a `main()` demo that exercises them |

## What the server exposes

- **Tools** (model-invoked actions): `read_doc(doc_id)`, `edit_document(doc_id, old_text, new_text)`
- **Resources** (read-only data by URI): `docs://documents` (JSON list of ids), `docs://documents/{doc_id}` (text of one doc)
- **Prompt** (reusable template): `format` with argument `doc_id`, which asks the model to rewrite a doc as Markdown

## Setup

From this `mcp` folder, in a virtualenv in `.venv`:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt -r requirements-dev.txt
```

`requirements-dev.txt` adds ruff, which the pre-commit hook needs (see [Development](#development)).

This project uses **mcp 2.x** (`MCPServer`, not `FastMCP`). With mcp 1.x, change
the server import to `from mcp.server.fastmcp import FastMCP` and
`from mcp.server.fastmcp.prompts import base`.

## Run the demo

```powershell
python client.py
```

The client starts `server.py` itself as a subprocess, so you don't need a
second terminal. Expected output (abridged):

```
== Tools ==
['read_doc', 'edit_document']
read_doc -> The plan outlines the steps for the project's implementation.
edit_document -> Edited plan.md

== Resources ==
docs://documents -> ['deposition.md', 'report.pdf', ...]
docs://documents/plan.md -> The plan outlines the STEPS for ...

== Prompts ==
['format']
Your goal is to reformat a document ...
```

Edits are in memory only; restarting resets the documents.

## Explore the server in a browser (optional)

```powershell
mcp dev server.py
```

This opens the MCP Inspector, where you can list and call tools, read
resources and fetch prompts by hand. It needs Node.js installed.

## How it works

1. `MCPClient.connect()` launches `server.py` via `stdio_client`, opens a
   `ClientSession` and calls `initialize()`.
2. Each client method maps to one MCP request: `list_tools` / `call_tool`,
   `read_resource`, `list_prompts` / `get_prompt`.
3. Tools, resources and prompts differ in who controls them: the **model** calls
   tools, the **application** reads resources, the **user** picks prompts.

## Extending it

Add a function to `server.py` with `@mcp.tool()`, `@mcp.resource("uri")` or
`@mcp.prompt()`, then call it from `client.py`.

## Development

Lint and format checks use [ruff](https://docs.astral.sh/ruff/) (config in `ruff.toml`):

```powershell
pip install -r requirements-dev.txt
python -m ruff check .
python -m ruff format .
```

A pre-commit hook (`pre-commit.sh`) runs both checks on staged `.py` files. It is
called from the repo's husky hook in `user-management/.husky/pre-commit`, and only
when files under `mcp/` are staged.
