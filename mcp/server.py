from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.prompts import base
from pydantic import Field

from docs import docs

mcp = MCPServer("DocumentMCP")


# --- Tools: actions the client can call -------------------------------------


@mcp.tool()
def read_doc(doc_id: str) -> str:
    """Read the contents of a document."""
    if doc_id not in docs:
        raise ValueError(f"Doc {doc_id} not found")
    return docs[doc_id]


@mcp.tool()
def edit_document(doc_id: str, old_text: str, new_text: str) -> str:
    """Edit a document by replacing old_text with new_text."""
    if doc_id not in docs:
        raise ValueError(f"Doc {doc_id} not found")
    if old_text not in docs[doc_id]:
        raise ValueError(f"'{old_text}' not found in {doc_id}")
    docs[doc_id] = docs[doc_id].replace(old_text, new_text)
    return f"Edited {doc_id}"


# --- Resources: read-only data addressed by URI -----------------------------


@mcp.resource("docs://documents", mime_type="application/json")
def list_documents() -> list[str]:
    return list(docs.keys())


@mcp.resource("docs://documents/{doc_id}", mime_type="text/plain")
def fetch_doc(doc_id: str) -> str:
    if doc_id not in docs:
        raise ValueError(f"Doc with id {doc_id} not found")
    return docs[doc_id]


# --- Prompts: reusable prompt templates -------------------------------------


@mcp.prompt(
    name="format",
    description="Rewrites the contents of the document in Markdown format.",
)
def format_document(
    doc_id: str = Field(description="Id of the document to format"),
) -> list[base.Message]:
    prompt = f"""
Your goal is to reformat a document to be written with markdown syntax.

The id of the document you need to reformat is:
<document_id>
{doc_id}
</document_id>

Add in headers, bullet points, tables, etc as necessary. Feel free to add in structure.
Use the 'edit_document' tool to edit the document. After the document has been
reformatted, reply with a short summary of what you changed.
"""
    return [base.UserMessage(prompt)]


if __name__ == "__main__":
    mcp.run(transport="stdio")
