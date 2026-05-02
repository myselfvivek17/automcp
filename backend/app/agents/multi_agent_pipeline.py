"""
Multi-agent pipeline for MCP code generation.
Each agent uses LLM when available, falls back to deterministic logic otherwise.
"""
import asyncio
import json
import re
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class AgentMessage:
    def __init__(self, agent_name: str, status: str, data: Any, progress: float, message: str):
        self.agent_name = agent_name
        self.status = status
        self.data = data
        self.progress = progress
        self.message = message
        self.timestamp = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "agent_name": self.agent_name,
            "status": self.status,
            "data": self.data,
            "progress": self.progress,
            "message": self.message,
            "timestamp": self.timestamp,
        }


class BaseAgent:
    def __init__(self, name: str, description: str, provider_service=None):
        self.name = name
        self.description = description
        self.provider_service = provider_service
        self._current_cfg: Dict[str, Any] = {}

    async def process(self, input_data: Dict[str, Any], callback: Optional[Callable] = None) -> Dict[str, Any]:
        raise NotImplementedError

    async def send_update(self, status: str, data: Any, progress: float, message: str, callback: Optional[Callable]):
        if callback:
            await callback(AgentMessage(self.name, status, data, progress, message))

    async def _call_llm(self, prompt: str, max_tokens: int = 2000) -> Optional[str]:
        """Call the configured LLM. Returns None when unavailable or on error."""
        if not self.provider_service:
            return None
        provider = self.provider_service.get_provider()
        if not provider:
            return None
        try:
            model_id = self._current_cfg.get("model") or None
            kwargs: Dict[str, Any] = {"max_tokens": max_tokens}
            if model_id:
                kwargs["model_id"] = model_id
            result = await asyncio.to_thread(provider.generate, prompt, **kwargs)
            if isinstance(result, str) and result and not result.startswith("Error:"):
                return result
        except Exception as e:
            logger.warning(f"LLM call failed in {self.name}: {e}")
        return None

    def _extract_json(self, text: str) -> Any:
        """Extract a JSON value from an LLM response that may include prose or fences."""
        if not text:
            return None
        text = text.strip()
        try:
            return json.loads(text)
        except Exception:
            pass
        for pat in [r"```json\s*([\s\S]*?)\s*```", r"```\s*([\s\S]*?)\s*```"]:
            m = re.search(pat, text)
            if m:
                try:
                    return json.loads(m.group(1).strip())
                except Exception:
                    pass
        for start, end in [("[", "]"), ("{", "}")]:
            si = text.find(start)
            ei = text.rfind(end)
            if si >= 0 and ei > si:
                try:
                    return json.loads(text[si : ei + 1])
                except Exception:
                    pass
        return None


# ---------------------------------------------------------------------------
# Agent 1 — Input Parser
# ---------------------------------------------------------------------------

class InputParserAgent(BaseAgent):
    def __init__(self, provider_service=None):
        super().__init__(
            name="Input Parser",
            description="Parses and normalizes API specifications from various formats",
            provider_service=provider_service,
        )

    async def process(self, input_data: Dict[str, Any], callback: Optional[Callable] = None) -> Dict[str, Any]:
        self._current_cfg = input_data.get("_agent_config", {})
        await self.send_update("started", None, 0.0, "Starting input parsing...", callback)

        input_type = input_data.get("input_type", "text")
        content = input_data.get("content", "")

        await self.send_update("processing", None, 0.3, f"Parsing {input_type} input...", callback)
        await asyncio.sleep(0.3)

        if input_type == "openapi":
            parsed = await self._parse_openapi(content)
        elif input_type == "swagger":
            parsed = await self._parse_swagger(content)
        elif input_type == "url":
            await self.send_update("processing", None, 0.5, "Fetching URL...", callback)
            parsed = await self._parse_url(content)
        else:
            parsed = await self._parse_text(content)

        await self.send_update("processing", parsed, 0.8, "Normalizing structure...", callback)
        await asyncio.sleep(0.2)

        result = {"input_type": input_type, "parsed_data": parsed, "normalized": True}
        await self.send_update("completed", result, 1.0, "Input parsing complete", callback)
        return result

    async def _parse_openapi(self, content: str) -> Dict[str, Any]:
        try:
            spec = json.loads(content)
            return {
                "format": "openapi",
                "version": spec.get("openapi", "3.0.0"),
                "info": spec.get("info", {}),
                "servers": spec.get("servers", []),
                "paths": spec.get("paths", {}),
                "components": spec.get("components", {}),
                "securitySchemes": spec.get("components", {}).get("securitySchemes", {}),
            }
        except Exception:
            return {"format": "openapi", "raw": content}

    async def _parse_swagger(self, content: str) -> Dict[str, Any]:
        try:
            spec = json.loads(content)
            host = spec.get("host", "")
            base_path = spec.get("basePath", "")
            scheme = (spec.get("schemes", ["https"]) or ["https"])[0]
            server_url = f"{scheme}://{host}{base_path}" if host else ""
            return {
                "format": "swagger",
                "version": spec.get("swagger", "2.0"),
                "info": spec.get("info", {}),
                "servers": [{"url": server_url}] if server_url else [],
                "paths": spec.get("paths", {}),
                "definitions": spec.get("definitions", {}),
                "securityDefinitions": spec.get("securityDefinitions", {}),
            }
        except Exception:
            return {"format": "swagger", "raw": content}

    async def _parse_url(self, url: str) -> Dict[str, Any]:
        """Fetch a URL and extract its text content for API doc analysis."""
        import httpx
        from html.parser import HTMLParser
        from urllib.parse import urlparse

        class TextExtractor(HTMLParser):
            def __init__(self):
                super().__init__()
                self.parts: List[str] = []
                self._skip = False

            def handle_starttag(self, tag, attrs):
                if tag in ("script", "style", "nav", "footer", "head"):
                    self._skip = True

            def handle_endtag(self, tag):
                if tag in ("script", "style", "nav", "footer", "head"):
                    self._skip = False

            def handle_data(self, data):
                if not self._skip:
                    s = data.strip()
                    if s:
                        self.parts.append(s)

        parsed_url = urlparse(url)
        base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"

        try:
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 AutoMCP/1.0"})
                resp.raise_for_status()
                body = resp.text

            # If the URL serves raw OpenAPI/Swagger JSON, parse it directly
            ct = resp.headers.get("content-type", "")
            if "json" in ct:
                try:
                    spec = json.loads(body)
                    if "openapi" in spec:
                        return await self._parse_openapi(body)
                    if "swagger" in spec:
                        return await self._parse_swagger(body)
                except Exception:
                    pass

            extractor = TextExtractor()
            extractor.feed(body)
            text = "\n".join(extractor.parts)
            text = re.sub(r"\n{3,}", "\n\n", text).strip()

            return {
                "format": "text",
                "description": text[:12000],
                "source_url": url,
                "servers": [{"url": base_url}],
                "endpoints": [],
            }
        except Exception as e:
            return {
                "format": "text",
                "description": f"Failed to fetch {url}: {e}",
                "source_url": url,
                "servers": [{"url": base_url}],
                "endpoints": [],
            }

    async def _parse_text(self, content: str) -> Dict[str, Any]:
        from urllib.parse import urlparse
        servers: List[Dict] = []
        m = re.search(r"https?://[^\s,\n]+", content)
        if m:
            raw = m.group(0).rstrip(".,;:)")
            p = urlparse(raw)
            servers = [{"url": f"{p.scheme}://{p.netloc}"}]
        return {"format": "text", "description": content, "servers": servers, "endpoints": []}


# ---------------------------------------------------------------------------
# Agent 2 — Schema Extractor
# ---------------------------------------------------------------------------

class SchemaExtractorAgent(BaseAgent):
    def __init__(self, provider_service=None):
        super().__init__(
            name="Schema Extractor",
            description="Extracts endpoints, methods, parameters, and schemas",
            provider_service=provider_service,
        )

    async def process(self, input_data: Dict[str, Any], callback: Optional[Callable] = None) -> Dict[str, Any]:
        self._current_cfg = input_data.get("_agent_config", {})
        await self.send_update("started", None, 0.0, "Starting schema extraction...", callback)

        parsed_data = input_data.get("parsed_data", {})

        await self.send_update("processing", None, 0.3, "Extracting endpoints...", callback)
        await asyncio.sleep(0.3)

        endpoints = await self._extract_endpoints(parsed_data, callback)
        schemas = self._extract_schemas(parsed_data)

        servers = parsed_data.get("servers", [])
        base_url = servers[0].get("url", "") if servers else ""

        result = {"endpoints": endpoints, "schemas": schemas, "base_url": base_url}
        await self.send_update("completed", result, 1.0, f"Extracted {len(endpoints)} endpoints", callback)
        return result

    async def _extract_endpoints(self, parsed_data: Dict[str, Any], callback=None) -> List[Dict[str, Any]]:
        fmt = parsed_data.get("format", "")

        if fmt == "text":
            text = parsed_data.get("description", "")
            await self.send_update("processing", None, 0.55, "Using AI to parse API docs...", callback)
            llm_eps = await self._llm_extract_endpoints(text)
            if llm_eps:
                return llm_eps
            # Fallback to regex
            return self._regex_extract_endpoints(text)

        # OpenAPI / Swagger — reliable deterministic parsing
        endpoints: List[Dict[str, Any]] = []
        for path, methods in parsed_data.get("paths", {}).items():
            if not isinstance(methods, dict):
                continue
            for method, details in methods.items():
                if method.upper() not in ("GET", "POST", "PUT", "DELETE", "PATCH"):
                    continue
                if not isinstance(details, dict):
                    continue
                endpoints.append({
                    "path": path,
                    "method": method.upper(),
                    "summary": details.get("summary", ""),
                    "description": details.get("description", ""),
                    "parameters": details.get("parameters", []),
                    "requestBody": details.get("requestBody", {}),
                    "responses": details.get("responses", {}),
                })
        return endpoints

    async def _llm_extract_endpoints(self, text: str) -> Optional[List[Dict[str, Any]]]:
        prompt = f"""You are an API documentation parser. Extract all API endpoints from the documentation below.

Return ONLY a valid JSON array. Each object must have:
- "path": URL path with parameters in {{curly_braces}} (e.g. "/users/{{id}}")
- "method": HTTP method in uppercase (GET, POST, PUT, DELETE, PATCH)
- "summary": one-line description
- "description": detailed description (same as summary if unavailable)
- "parameters": array of objects with: name, in ("path"/"query"/"body"), required (bool), schema ({{"type": "string"}})

Documentation:
{text[:8000]}

Return ONLY the JSON array starting with [ and ending with ]. No explanation."""

        raw = await self._call_llm(prompt, max_tokens=2000)
        if not raw:
            return None
        result = self._extract_json(raw)
        if not isinstance(result, list) or not result:
            return None
        valid = []
        for ep in result:
            if isinstance(ep, dict) and ep.get("path") and ep.get("method"):
                ep.setdefault("summary", "")
                ep.setdefault("description", ep["summary"])
                ep.setdefault("parameters", [])
                ep.setdefault("requestBody", {})
                ep.setdefault("responses", {"200": {"description": "Success"}})
                valid.append(ep)
        return valid if valid else None

    def _regex_extract_endpoints(self, text: str) -> List[Dict[str, Any]]:
        endpoints: List[Dict[str, Any]] = []
        seen: set = set()
        pattern = re.compile(r"\b(GET|POST|PUT|DELETE|PATCH)\s+(/[^\s\n—\-–]*)", re.IGNORECASE)
        for match in pattern.finditer(text):
            method = match.group(1).upper()
            raw_path = match.group(2).rstrip(".,;:)")
            path_part, _, qs = raw_path.partition("?")
            parameters: List[Dict] = []
            for pp in re.findall(r"\{(\w+)\}", path_part):
                parameters.append({"name": pp, "in": "path", "required": True, "schema": {"type": "string"}})
            for qp in re.findall(r"(\w+)=", qs):
                parameters.append({"name": qp, "in": "query", "required": False, "schema": {"type": "string"}})
            key = f"{method}:{path_part}"
            if key in seen:
                continue
            seen.add(key)
            line_end = text.find("\n", match.start())
            line = text[match.start() : line_end if line_end > 0 else match.start() + 120].strip()
            endpoints.append({
                "path": path_part,
                "method": method,
                "summary": line,
                "description": line,
                "parameters": parameters,
                "requestBody": {} if method not in ("POST", "PUT", "PATCH") else {"content": {}},
                "responses": {"200": {"description": "Success"}},
            })
        return endpoints

    def _extract_schemas(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        return parsed_data.get("components", {}).get("schemas", {})


# ---------------------------------------------------------------------------
# Agent 3 — Endpoint Mapper
# ---------------------------------------------------------------------------

class EndpointMapperAgent(BaseAgent):
    def __init__(self, provider_service=None):
        super().__init__(
            name="Endpoint Mapper",
            description="Maps API endpoints to MCP tool definitions",
            provider_service=provider_service,
        )

    async def process(self, input_data: Dict[str, Any], callback: Optional[Callable] = None) -> Dict[str, Any]:
        self._current_cfg = input_data.get("_agent_config", {})
        await self.send_update("started", None, 0.0, "Starting endpoint mapping...", callback)

        endpoints = input_data.get("endpoints", [])
        await self.send_update("processing", None, 0.4, f"Mapping {len(endpoints)} endpoints to MCP tools...", callback)
        await asyncio.sleep(0.4)

        mcp_tools = [self._map_to_mcp_tool(ep) for ep in endpoints]
        result = {"mcp_tools": mcp_tools, "tool_count": len(mcp_tools)}

        await self.send_update("completed", result, 1.0, f"Mapped {len(mcp_tools)} MCP tools", callback)
        return result

    def _map_to_mcp_tool(self, endpoint: Dict[str, Any]) -> Dict[str, Any]:
        path = endpoint["path"].replace("/", "_").replace("{", "").replace("}", "").strip("_")
        method = endpoint["method"].lower()
        tool_name = f"{method}_{path}" if path else method
        # Sanitize: replace non-alphanumeric (except _) with _
        tool_name = re.sub(r"[^a-z0-9_]", "_", tool_name).strip("_")
        return {
            "name": tool_name,
            "description": endpoint.get("summary") or endpoint.get("description") or f"{method.upper()} {endpoint['path']}",
            "endpoint": endpoint["path"],
            "method": endpoint["method"],
            "parameters": endpoint.get("parameters", []),
            "requestBody": endpoint.get("requestBody", {}),
            "responses": endpoint.get("responses", {}),
        }


# ---------------------------------------------------------------------------
# Agent 4 — Auth Analyzer
# ---------------------------------------------------------------------------

class AuthAnalyzerAgent(BaseAgent):
    def __init__(self, provider_service=None):
        super().__init__(
            name="Auth Analyzer",
            description="Analyzes and configures authentication flows",
            provider_service=provider_service,
        )

    async def process(self, input_data: Dict[str, Any], callback: Optional[Callable] = None) -> Dict[str, Any]:
        self._current_cfg = input_data.get("_agent_config", {})
        await self.send_update("started", None, 0.0, "Analyzing authentication...", callback)
        await self.send_update("processing", None, 0.3, "Detecting auth type...", callback)
        await asyncio.sleep(0.3)

        parsed_data = input_data.get("parsed_data", {})
        auth_config = await self._detect_auth(parsed_data, callback)

        result = {"auth_required": auth_config["type"] != "none", "auth_config": auth_config}
        await self.send_update("completed", result, 1.0, f"Auth type: {auth_config['type']}", callback)
        return result

    async def _detect_auth(self, parsed_data: Dict[str, Any], callback=None) -> Dict[str, Any]:
        default = {"type": "bearer", "location": "header", "name": "Authorization", "scheme": "Bearer"}

        # Read security schemes from OpenAPI/Swagger spec
        security_schemes = parsed_data.get("securitySchemes") or parsed_data.get("securityDefinitions") or {}
        if security_schemes:
            for _, scheme in security_schemes.items():
                s_type = scheme.get("type", "").lower()
                s_scheme = scheme.get("scheme", "").lower()
                if s_type == "http" and s_scheme == "bearer":
                    return default
                if s_type == "apikey":
                    return {"type": "api_key", "location": scheme.get("in", "header"), "name": scheme.get("name", "X-API-Key"), "scheme": ""}
                if s_type == "oauth2":
                    return {"type": "oauth2", "location": "header", "name": "Authorization", "scheme": "Bearer"}
                if s_type == "http" and s_scheme == "basic":
                    return {"type": "basic", "location": "header", "name": "Authorization", "scheme": "Basic"}

        # Use LLM for text/url or when spec has no security info
        content = parsed_data.get("description", "") or json.dumps(parsed_data.get("paths", {}))[:2000]
        if content.strip():
            await self.send_update("processing", None, 0.6, "Using AI to detect authentication...", callback)
            llm_result = await self._llm_detect_auth(content[:3000])
            if llm_result:
                return llm_result

        return default

    async def _llm_detect_auth(self, content: str) -> Optional[Dict[str, Any]]:
        prompt = f"""Analyze this API documentation and determine the authentication method.

Return ONLY a valid JSON object with exactly these fields:
- "type": one of "bearer", "api_key", "oauth2", "basic", "none"
- "location": "header", "query", or "cookie"
- "name": header/parameter name (e.g. "Authorization", "X-API-Key")
- "scheme": "Bearer" for bearer/oauth2, "Basic" for basic auth, "" otherwise

Documentation:
{content}

Return ONLY the JSON object. No explanation."""

        raw = await self._call_llm(prompt, max_tokens=200)
        if not raw:
            return None
        result = self._extract_json(raw)
        if isinstance(result, dict) and result.get("type"):
            result.setdefault("location", "header")
            result.setdefault("name", "Authorization")
            result.setdefault("scheme", "")
            return result
        return None


# ---------------------------------------------------------------------------
# Agent 5 — Code Generator
# ---------------------------------------------------------------------------

class CodeGeneratorAgent(BaseAgent):
    def __init__(self, provider_service=None):
        super().__init__(
            name="Code Generator",
            description="Generates production-ready MCP server code",
            provider_service=provider_service,
        )

    async def process(self, input_data: Dict[str, Any], callback: Optional[Callable] = None) -> Dict[str, Any]:
        self._current_cfg = input_data.get("_agent_config", {})
        await self.send_update("started", None, 0.0, "Starting code generation...", callback)

        language = input_data.get("language", "python")
        mcp_tools = input_data.get("mcp_tools", [])
        auth_config = input_data.get("auth_config", {})
        base_url = input_data.get("base_url", "")

        await self.send_update("processing", None, 0.2, f"Generating {language} MCP server...", callback)
        await asyncio.sleep(0.2)

        if language == "python":
            code = await self._generate_python_code(mcp_tools, auth_config, base_url, callback)
        elif language == "typescript":
            code = await self._generate_typescript_code(mcp_tools, auth_config, base_url, callback)
        else:
            code = f"# Language '{language}' not supported"

        result = {
            "language": language,
            "code": code,
            "files": {f"mcp_server.{self._get_extension(language)}": code},
        }
        await self.send_update("completed", result, 1.0, "Code generation complete", callback)
        return result

    def _get_extension(self, language: str) -> str:
        return {"python": "py", "typescript": "ts", "javascript": "js"}.get(language, "txt")

    # ---- Python -----------------------------------------------------------

    async def _generate_python_code(self, mcp_tools, auth_config, base_url, callback=None) -> str:
        await self.send_update("processing", None, 0.45, "Asking AI to write the MCP server...", callback)
        llm_code = await self._llm_generate_python(mcp_tools, base_url)
        if llm_code:
            await self.send_update("processing", None, 0.9, "AI-generated Python code ready", callback)
            return llm_code
        await self.send_update("processing", None, 0.7, "Building from template...", callback)
        return self._template_python(mcp_tools, base_url)

    async def _llm_generate_python(self, mcp_tools: List[Dict], base_url: str) -> Optional[str]:
        tools_json = json.dumps(mcp_tools, indent=2)
        prompt = f"""Generate a complete Python MCP server using the FastMCP framework.

Base URL: {base_url}
Tools to implement:
{tools_json}

Requirements:
- Import: from mcp.server.fastmcp import FastMCP
- Import: import os, httpx
- Set BASE_URL = "{base_url}"
- Set API_KEY = os.environ.get("API_KEY", "")
- Create mcp = FastMCP("mcp-server")
- Each tool: @mcp.tool() decorator on an async function with typed parameters
- Docstring with brief description and Args: section per parameter
- HTTP calls: httpx.AsyncClient(timeout=30.0), call resp.raise_for_status(), return resp.text
- Last two lines: if __name__ == "__main__": / (4 spaces) mcp.run(transport="stdio")

Return ONLY Python code. No markdown fences, no explanation."""

        raw = await self._call_llm(prompt, max_tokens=3000)
        if raw and "FastMCP" in raw and "@mcp.tool()" in raw:
            raw = re.sub(r"^```python\s*\n?", "", raw.strip())
            raw = re.sub(r"\n?```$", "", raw.strip())
            return raw.strip()
        return None

    def _template_python(self, mcp_tools: List[Dict], base_url: str) -> str:
        lines = [
            '"""',
            "MCP Server — Auto-generated by AutoMCP",
            f"Base URL: {base_url}",
            "",
            "Setup:",
            '    pip install mcp httpx',
            '    export API_KEY="your-api-key"',
            "    python mcp_server.py",
            '"""',
            "import os",
            "import httpx",
            "from mcp.server.fastmcp import FastMCP",
            "",
            f'BASE_URL = "{base_url}"',
            'API_KEY = os.environ.get("API_KEY", "")',
            "",
            'mcp = FastMCP("auto-generated-mcp-server")',
            "",
        ]

        for tool in mcp_tools:
            fn = tool["name"]
            path = tool["endpoint"]
            method = tool["method"].lower()
            desc = tool.get("description", f"{method.upper()} {path}")
            params = tool.get("parameters", [])
            has_body = method in ("post", "put", "patch")

            path_params = [p["name"] for p in params if p.get("in") == "path"]
            query_params = [p["name"] for p in params if p.get("in") == "query"]

            sig_parts = [f"{p}: str" for p in path_params]
            sig_parts += [f'{p}: str = ""' for p in query_params]
            if has_body:
                sig_parts.append("body: dict = None")
            sig = ", ".join(sig_parts)

            url_expr = f'f"{{BASE_URL}}{path}"' if path_params else f'BASE_URL + "{path}"'

            doc = [f'    """{desc}', "", "    Args:"]
            for p in path_params:
                doc.append(f"        {p}: Path parameter")
            for p in query_params:
                doc.append(f"        {p}: Query parameter (optional)")
            if has_body:
                doc.append("        body: Request body as dict")
            doc.append('    """')

            lines += ["@mcp.tool()", f"async def {fn}({sig}) -> str:"]
            lines += doc

            if query_params:
                qp = "{" + ", ".join(f'"{p}": {p}' for p in query_params) + "}"
                lines.append(f"    query = {{k: v for k, v in {qp}.items() if v}}")
            else:
                lines.append("    query = {}")

            call = f"client.{method}({url_expr}, headers=headers, params=query or None"
            if has_body:
                call += ", json=body"
            call += ")"

            lines += [
                f"    url = {url_expr}",
                '    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}',
                "    async with httpx.AsyncClient(timeout=30.0) as client:",
                f"        resp = await {call}",
                "        resp.raise_for_status()",
                "        return resp.text",
                "",
            ]

        lines += ['if __name__ == "__main__":', '    mcp.run(transport="stdio")']
        return "\n".join(lines)

    # ---- TypeScript -------------------------------------------------------

    async def _generate_typescript_code(self, mcp_tools, auth_config, base_url, callback=None) -> str:
        await self.send_update("processing", None, 0.45, "Asking AI to write the MCP server...", callback)
        llm_code = await self._llm_generate_typescript(mcp_tools, base_url)
        if llm_code:
            await self.send_update("processing", None, 0.9, "AI-generated TypeScript code ready", callback)
            return llm_code
        await self.send_update("processing", None, 0.7, "Building from template...", callback)
        return self._template_typescript(mcp_tools, base_url)

    async def _llm_generate_typescript(self, mcp_tools: List[Dict], base_url: str) -> Optional[str]:
        tools_json = json.dumps(mcp_tools, indent=2)
        prompt = f"""Generate a complete TypeScript MCP server using the McpServer SDK.

Base URL: {base_url}
Tools to implement:
{tools_json}

Requirements:
- Import McpServer from "@modelcontextprotocol/sdk/server/mcp.js"
- Import StdioServerTransport from "@modelcontextprotocol/sdk/server/stdio.js"
- Import z from "zod"
- const BASE_URL = "{base_url}"; const API_KEY = process.env.API_KEY ?? "";
- const server = new McpServer({{ name: "mcp-server", version: "1.0.0" }});
- Each tool: server.registerTool(name, {{ description, inputSchema: {{ param: z.string().describe("...") }} }}, async (args) => {{ ... }})
- Handler returns: {{ content: [{{ type: "text", text: responseText }}] }}
- HTTP calls: fetch() with AbortSignal.timeout(30000), throw on !r.ok
- Last two lines: const transport = new StdioServerTransport(); / await server.connect(transport);

Return ONLY TypeScript code. No markdown fences, no explanation."""

        raw = await self._call_llm(prompt, max_tokens=3000)
        if raw and "McpServer" in raw and "registerTool" in raw:
            raw = re.sub(r"^```typescript\s*\n?", "", raw.strip())
            raw = re.sub(r"^```ts\s*\n?", "", raw.strip())
            raw = re.sub(r"\n?```$", "", raw.strip())
            return raw.strip()
        return None

    def _template_typescript(self, mcp_tools: List[Dict], base_url: str) -> str:
        lines = [
            "/**",
            " * MCP Server — Auto-generated by AutoMCP",
            f" * Base URL: {base_url}",
            " *",
            " * Setup:",
            " *   npm install @modelcontextprotocol/sdk zod",
            " *   API_KEY=your-key npx ts-node mcp_server.ts",
            " */",
            'import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";',
            'import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";',
            'import { z } from "zod";',
            "",
            f'const BASE_URL = "{base_url}";',
            'const API_KEY = process.env.API_KEY ?? "";',
            "",
            'const server = new McpServer({ name: "auto-generated-mcp-server", version: "1.0.0" });',
            "",
        ]

        for tool in mcp_tools:
            fn = tool["name"]
            path = tool["endpoint"]
            method = tool["method"]
            desc = tool.get("description", f"{method} {path}")
            params = tool.get("parameters", [])
            has_body = method in ("POST", "PUT", "PATCH")

            path_params = [p for p in params if p.get("in") == "path"]
            query_params = [p for p in params if p.get("in") == "query"]

            schema_entries: List[str] = []
            handler_args: List[str] = []
            for p in path_params:
                pname = p.get("name", "param")
                schema_entries.append(f'    {pname}: z.string().describe("Path parameter: {pname}"),')
                handler_args.append(pname)
            for p in query_params:
                pname = p.get("name", "param")
                schema_entries.append(f'    {pname}: z.string().optional().describe("Query parameter: {pname}"),')
                handler_args.append(pname)
            if has_body:
                schema_entries.append('    body: z.record(z.unknown()).optional().describe("Request body"),')
                handler_args.append("body")

            ts_path = path
            for p in path_params:
                pname = p.get("name", "param")
                ts_path = ts_path.replace("{" + pname + "}", "${" + pname + "}")
            url_expr = f"`${{BASE_URL}}{ts_path}`"

            destructure = "{ " + ", ".join(handler_args) + " }" if handler_args else "{}"

            lines += [
                f'server.registerTool(',
                f'  "{fn}",',
                f'  {{',
                f'    description: "{desc}",',
                f'    inputSchema: {{',
            ] + schema_entries + [
                f'    }},',
                f'  }},',
                f'  async ({destructure}) => {{',
                f'    const url = {url_expr};',
            ]

            if query_params:
                qparts = ", ".join(f'"{p.get("name","p")}": {p.get("name","p")}' for p in query_params)
                lines += [
                    f'    const query = new URLSearchParams();',
                    f'    const qp: Record<string, string | undefined> = {{ {qparts} }};',
                    f'    for (const [k, v] of Object.entries(qp)) if (v) query.set(k, v);',
                    f'    const reqUrl = query.toString() ? `${{url}}?${{query}}` : url;',
                ]
                req_url = "reqUrl"
            else:
                req_url = "url"

            fetch_opts = f'method: "{method}", headers: {{ "Authorization": `Bearer ${{API_KEY}}`, "Content-Type": "application/json" }}'
            if has_body:
                fetch_opts += ", body: body ? JSON.stringify(body) : undefined"

            lines += [
                f'    const r = await fetch({req_url}, {{ {fetch_opts}, signal: AbortSignal.timeout(30000) }});',
                f'    if (!r.ok) throw new Error(`HTTP ${{r.status}}: ${{await r.text()}}`);',
                f'    return {{ content: [{{ type: "text", text: await r.text() }}] }};',
                f'  }}',
                f');',
                "",
            ]

        lines += [
            "const transport = new StdioServerTransport();",
            "await server.connect(transport);",
        ]
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Pipeline Orchestrator
# ---------------------------------------------------------------------------

class MultiAgentPipeline:
    def __init__(self, provider_service=None):
        self.provider_service = provider_service
        self.agents = [
            InputParserAgent(provider_service),
            SchemaExtractorAgent(provider_service),
            EndpointMapperAgent(provider_service),
            AuthAnalyzerAgent(provider_service),
            CodeGeneratorAgent(provider_service),
        ]
        self.total_agents = len(self.agents)

    async def run(self, input_data: Dict[str, Any], callback: Optional[Callable] = None) -> Dict[str, Any]:
        logger.info("Starting multi-agent pipeline...")
        current_data = {**input_data}
        agent_configs = input_data.get("agent_configs", {})

        for i, agent in enumerate(self.agents):
            logger.info(f"Running agent {i + 1}/{self.total_agents}: {agent.name}")
            current_data["_agent_config"] = agent_configs.get(agent.name, {})
            try:
                result = await agent.process(current_data, callback)
                current_data.update(result)
            except Exception as e:
                logger.error(f"Error in agent {agent.name}: {e}")
                if callback:
                    await callback(AgentMessage(
                        agent.name, "error", None,
                        (i + 1) / self.total_agents, f"Error: {str(e)}",
                    ))
                raise

        if callback:
            await callback(AgentMessage(
                "Pipeline", "completed",
                {"code": current_data.get("code", ""), "language": current_data.get("language", "python")},
                1.0, "Generation complete",
            ))
        return current_data
