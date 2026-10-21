import json
import sys
from contextlib import AsyncExitStack
from typing import Any, Optional

from mcp import ClientSession, StdioServerParameters, types
from mcp.client.stdio import stdio_client


class MCPClient:
    def __init__(self, command: str, args: list[str], env: Optional[dict] = None):
        self._command = command
        self._args = args
        self._env = env
        self._exit_stack = AsyncExitStack()
        self._session: Optional[ClientSession] = None

    def session(self) -> ClientSession:
        if self._session is None:
            raise ConnectionError("Client not connected. Call connect() first.")
        return self._session

    async def connect(self):
        params = StdioServerParameters(
            command=self._command, args=self._args, env=self._env
        )
        read, write = await self._exit_stack.enter_async_context(stdio_client(params))
        self._session = await self._exit_stack.enter_async_context(
            ClientSession(read, write)
        )
        await self._session.initialize()

    async def cleanup(self):
        await self._exit_stack.aclose()
        self._session = None

    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, *exc):
        await self.cleanup()

    # Tools
    async def list_tools(self) -> list[types.Tool]:
        result = await self.session().list_tools()
        return result.tools

    async def call_tool(
        self, tool_name: str, tool_input: dict
    ) -> types.CallToolResult | None:
        return await self.session().call_tool(tool_name, tool_input)

    # Resources
    async def read_resource(self, uri: str) -> Any:
        result = await self.session().read_resource(uri)
        resource = result.contents[0]

        if isinstance(resource, types.TextResourceContents):
            if resource.mime_type == "application/json":
                return json.loads(resource.text)

        return resource.text

    # Prompts
    async def list_prompts(self) -> list[types.Prompt]:
        result = await self.session().list_prompts()
        return result.prompts

    async def get_prompt(self, prompt_name: str, args: dict[str, str]):
        result = await self.session().get_prompt(prompt_name, args)
        return result.messages


async def main():
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
