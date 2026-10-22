import json
import sys
from contextlib import AsyncExitStack
from typing import Any, Optional

from mcp import ClientSession, StdioServerParameters, types
from mcp.client.stdio import stdio_client


class MCPClient:
    """Thin async wrapper around an MCP ClientSession that talks to a stdio server.

    Use it as an async context manager so the server subprocess is always
    started and stopped:

        async with MCPClient(command=sys.executable, args=["server.py"]) as client:
            tools = await client.list_tools()
    """

    def __init__(self, command: str, args: list[str], env: Optional[dict] = None):
        """Store how to launch the server; nothing is started until connect().

        Args:
            command: Executable that starts the server, e.g. sys.executable.
            args: Arguments for the command, e.g. ["server.py"].
            env: Environment variables for the server process. None uses the
                MCP SDK's default (a restricted set), not the full parent env.
        """
        self._command = command
        self._args = args
        self._env = env
        self._exit_stack = AsyncExitStack()
        self._session: Optional[ClientSession] = None

    def session(self) -> ClientSession:
        """Return the active ClientSession.

        Raises:
            ConnectionError: If connect() has not been called yet (or cleanup()
                has already run).
        """
        if self._session is None:
            raise ConnectionError("Client not connected. Call connect() first.")
        return self._session

    async def connect(self):
        """Launch the server over stdio, open a session and run the MCP handshake."""
        params = StdioServerParameters(
            command=self._command, args=self._args, env=self._env
        )
        read, write = await self._exit_stack.enter_async_context(stdio_client(params))
        self._session = await self._exit_stack.enter_async_context(
            ClientSession(read, write)
        )
        await self._session.initialize()

    async def cleanup(self):
        """Close the session and stop the server subprocess."""
        await self._exit_stack.aclose()
        self._session = None

    async def __aenter__(self):
        """Connect on entering `async with` and return this client."""
        await self.connect()
        return self

    async def __aexit__(self, *exc):
        """Clean up on leaving `async with`; exceptions are not suppressed."""
        await self.cleanup()

    # Tools
    async def list_tools(self) -> list[types.Tool]:
        """Return the tools the server exposes."""
        result = await self.session().list_tools()
        return result.tools

    async def call_tool(
        self, tool_name: str, tool_input: dict
    ) -> types.CallToolResult | None:
        """Call a server tool by name.

        Args:
            tool_name: Name of the tool, e.g. "read_doc".
            tool_input: Tool arguments keyed by parameter name.

        Returns:
            The raw CallToolResult. A tool-side failure is reported through
            its is_error flag rather than raised.
        """
        return await self.session().call_tool(tool_name, tool_input)

    # Resources
    async def read_resource(self, uri: str) -> Any:
        """Read a resource and return its first content item.

        Args:
            uri: Resource URI, e.g. "docs://documents/plan.md".

        Returns:
            The parsed JSON value when the mime type is application/json,
            otherwise the text of the resource.
        """
        result = await self.session().read_resource(uri)
        resource = result.contents[0]

        if isinstance(resource, types.TextResourceContents):
            if resource.mime_type == "application/json":
                return json.loads(resource.text)

        return resource.text

    # Prompts
    async def list_prompts(self) -> list[types.Prompt]:
        """Return the prompt templates the server exposes."""
        result = await self.session().list_prompts()
        return result.prompts

    async def get_prompt(self, prompt_name: str, args: dict[str, str]):
        """Render a prompt template and return its messages.

        Args:
            prompt_name: Name of the prompt, e.g. "format".
            args: Prompt arguments keyed by name; values must be strings.
        """
        result = await self.session().get_prompt(prompt_name, args)
        return result.messages


async def main():
    """Demo: start server.py and use one tool, resource and prompt feature each."""
    async with MCPClient(command=sys.executable, args=["server.py"]) as client:
        print("== Tools ==")
        print([t.name for t in await client.list_tools()])
        result = await client.call_tool("read_doc", {"doc_id": "plan.md"})
        print("read_doc ->", result.content[0].text)
        result = await client.call_tool(
            "edit_document",
            {"doc_id": "plan.md", "old_text": "steps", "new_text": "STEPS"},
        )
        print("edit_document ->", result.content[0].text)

        print("\n== Resources ==")
        print("docs://documents ->", await client.read_resource("docs://documents"))
        print(
            "docs://documents/plan.md ->",
            await client.read_resource("docs://documents/plan.md"),
        )

        print("\n== Prompts ==")
        print([p.name for p in await client.list_prompts()])
        messages = await client.get_prompt("format", {"doc_id": "plan.md"})
        print(messages[0].content.text)


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
