from typing import Any, TypedDict


class PipelineState(TypedDict, total=False):
    # ── request inputs ──────────────────────────────────────────
    input_type: str
    content: str
    language: str
    agent_configs: dict
    _callback: Any          # WebSocket send callable (not serialized)
    _provider_service: Any  # legacy compat

    # ── accumulated agent outputs ────────────────────────────────
    parsed_data: dict
    normalized: bool
    endpoints: list
    schemas: dict
    base_url: str
    mcp_tools: list
    tool_count: int
    auth_required: bool
    auth_config: dict
    mcp_schema: dict
    code: str
    files: dict
    validation_result: dict
    readme: str
