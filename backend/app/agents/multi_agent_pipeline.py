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
            logger.info(f"[LLM] {self.name} calling {provider.__class__.__name__} model={model_id or 'default'} max_tokens={max_tokens}")
            result = await asyncio.to_thread(provider.generate, prompt, **kwargs)
            if isinstance(result, str) and result and not result.startswith("Error:"):
                logger.info(f"[LLM] {self.name} got {len(result)} chars")
                return result
            logger.warning(f"[LLM] {self.name} got empty/error response: {result!r:.100}")
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
        elif input_type == "github":
            await self.send_update("processing", None, 0.5, "Fetching GitHub repo...", callback)
            parsed = await self._parse_github(content)
        elif input_type == "form":
            parsed = await self._parse_form(content)
        else:
            parsed = await self._parse_text(content)

        # Validate parsed result — fail fast with clear message
        fmt = parsed.get("format", "")
        if fmt == "github_failed":
            title = parsed.get("info", {}).get("title", "repo")
            msg = f"No OpenAPI/Swagger spec found in '{title}'. Add openapi.json or swagger.yaml to the repo root, or paste the raw file URL directly."
            await self.send_update("error", None, 0.0, msg, callback)
            raise ValueError(msg)
        if input_type == "form" and not parsed.get("paths"):
            msg = "Form input has no endpoints. Add at least one endpoint before generating."
            await self.send_update("error", None, 0.0, msg, callback)
            raise ValueError(msg)

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

    async def _parse_form(self, content: str) -> Dict[str, Any]:
        """Parse manual form entry JSON: {api_name, base_url, endpoints: [{method, path, description}]}"""
        try:
            data = json.loads(content)
        except Exception:
            return {"format": "form", "raw": content, "paths": {}, "servers": [], "components": {}, "securitySchemes": {}}

        api_name = data.get("api_name", "Custom API")
        base_url = data.get("base_url", "")
        endpoints = data.get("endpoints", [])

        paths: Dict = {}
        for ep in endpoints:
            path = ep.get("path", "/")
            method = ep.get("method", "GET").lower()
            if path not in paths:
                paths[path] = {}
            paths[path][method] = {
                "summary": ep.get("description", f"{method.upper()} {path}"),
                "parameters": [],
                "responses": {"200": {"description": "Success"}},
            }

        return {
            "format": "openapi",
            "version": "3.0.0",
            "info": {"title": api_name, "version": "1.0.0"},
            "servers": [{"url": base_url}] if base_url else [],
            "paths": paths,
            "components": {"schemas": {}, "securitySchemes": {}},
            "securitySchemes": {},
        }

    async def _parse_github(self, url: str) -> Dict[str, Any]:
        """Fetch OpenAPI/Swagger spec from a GitHub repository URL."""
        import httpx as _httpx
        m = re.match(r"https?://github\.com/([^/]+)/([^/]+?)(?:\.git)?(?:/.*)?$", url)
        if not m:
            return await self._parse_url(url)

        owner, repo = m.group(1), m.group(2)
        raw_base = f"https://raw.githubusercontent.com/{owner}/{repo}/HEAD"
        candidates = [
            "/openapi.json", "/openapi.yaml", "/openapi.yml",
            "/swagger.json", "/swagger.yaml", "/swagger.yml",
            "/docs/openapi.json", "/api/openapi.json",
        ]

        async with _httpx.AsyncClient(timeout=20.0) as client:
            for path in candidates:
                try:
                    resp = await client.get(raw_base + path)
                    if resp.status_code != 200:
                        continue
                    text = resp.text
                    try:
                        spec = json.loads(text)
                        if "openapi" in spec:
                            return await self._parse_openapi(text)
                        if "swagger" in spec:
                            return await self._parse_swagger(text)
                    except Exception:
                        pass
                    return await self._parse_text(f"API spec from {url}:\n{text[:4000]}")
                except Exception:
                    continue

            try:
                resp = await client.get(f"{raw_base}/README.md")
                if resp.status_code == 200:
                    return await self._parse_text(resp.text[:5000])
            except Exception:
                pass

        return {
            "format": "github_failed",
            "info": {"title": f"{owner}/{repo}", "version": "1.0.0"},
            "servers": [], "paths": {}, "components": {}, "securitySchemes": {},
        }


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
        server_name = input_data.get("mcp_schema", {}).get("server_name", "mcp-server")

        await self.send_update("processing", None, 0.2, f"Generating {language} MCP server...", callback)
        await asyncio.sleep(0.2)

        if language == "python":
            code = await self._generate_python_code(mcp_tools, auth_config, base_url, server_name, callback)
        elif language == "typescript":
            code = await self._generate_typescript_code(mcp_tools, auth_config, base_url, server_name, callback)
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

    async def _generate_python_code(self, mcp_tools, auth_config, base_url, server_name="mcp-server", callback=None) -> str:
        await self.send_update("processing", None, 0.45, "Asking AI to write the MCP server...", callback)
        llm_code = await self._llm_generate_python(mcp_tools, auth_config, base_url, server_name)
        if llm_code:
            await self.send_update("processing", None, 0.9, "AI-generated Python code ready", callback)
            return llm_code
        await self.send_update("processing", None, 0.7, "Building from template...", callback)
        return self._template_python(mcp_tools, auth_config, base_url, server_name)

    @staticmethod
    def _auth_python(auth_config: Dict) -> tuple:
        """Returns (env_var_line, headers_expr, env_var_name)."""
        auth_type = auth_config.get("type", "bearer")
        auth_name = auth_config.get("name", "Authorization")
        auth_scheme = auth_config.get("scheme", "Bearer")
        auth_location = auth_config.get("location", "header")
        if auth_type == "none":
            return ("", "{}", "")
        env_name = "API_KEY"
        env_line = f'{env_name} = os.environ.get("{env_name}", "")'
        if auth_type == "api_key" and auth_location == "header":
            headers = '{' + f'"{auth_name}": {env_name}' + '}'
        else:
            headers = '{' + f'"{auth_name}": f"{auth_scheme} {{{env_name}}}"' + '}'
        return (env_line, headers, env_name)

    @staticmethod
    def _schema_to_python_type(schema_type: str) -> str:
        return {"integer": "int", "number": "float", "boolean": "bool"}.get(schema_type, "str")

    async def _llm_generate_python(self, mcp_tools: List[Dict], auth_config: Dict, base_url: str, server_name: str) -> Optional[str]:
        env_line, headers_expr, env_name = self._auth_python(auth_config)

        # Build compact tool summary with typed params from inputSchema
        tool_specs = []
        for t in mcp_tools[:20]:
            props = t.get("inputSchema", {}).get("properties", {})
            required_set = set(t.get("inputSchema", {}).get("required", []))
            params = []
            for pname, pschema in props.items():
                ptype = self._schema_to_python_type(pschema.get("type", "string"))
                default = "" if ptype == "str" else ("0" if ptype in ("int", "float") else "False")
                if pname in required_set:
                    params.append(f"{pname}: {ptype}")
                else:
                    params.append(f'{pname}: {ptype} = {repr(default) if ptype == "str" else default}')
            tool_specs.append({
                "name": t["name"],
                "description": t.get("description", ""),
                "method": t.get("method", "GET"),
                "endpoint": t.get("endpoint", "/"),
                "signature": ", ".join(params),
                "path_params": [p for p in re.findall(r"\{(\w+)\}", t.get("endpoint", ""))],
            })

        tools_json = json.dumps(tool_specs, indent=2)
        auth_note = f"headers = {headers_expr}" if headers_expr != "{}" else "headers = {}"

        prompt = f"""Generate a complete runnable Python MCP server.

Server name: {server_name}
Base URL: {base_url}

Tools:
{tools_json}

EXACT code structure to follow:

```python
from mcp.server.fastmcp import FastMCP
import os
import httpx
import json

BASE_URL = "{base_url}"
{env_line}

mcp = FastMCP("{server_name}")


@mcp.tool()
async def example_tool(pet_id: int, status: str = "") -> str:
    \"\"\"Short description of what this tool does.

    Args:
        pet_id: The pet identifier.
        status: Filter by status (optional).
    \"\"\"
    {auth_note}
    params = {{k: v for k, v in {{"status": status}}.items() if v}}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{{BASE_URL}}/pet/{{pet_id}}",
            headers=headers,
            params=params or None,
        )
        resp.raise_for_status()
        try:
            return json.dumps(resp.json(), indent=2)
        except Exception:
            return resp.text


if __name__ == "__main__":
    mcp.run(transport="stdio")
```

Rules — follow exactly:
1. Implement ALL {len(mcp_tools)} tools from the list above
2. Use the exact signature from each tool's "signature" field — types are already correct
3. Path params (in endpoint as {{param}}): use in f-string URL — f"{{BASE_URL}}{{}}"
4. Query params: collect as dict, filter empty values, pass as params=
5. POST/PUT/PATCH: add `body: dict = None`, pass `json=body` to the client call
6. Auth header every tool: {auth_note}
7. Always: resp.raise_for_status(), then json.dumps(resp.json()) with fallback resp.text
8. No markdown fences in output

Return ONLY Python code starting with `from mcp.server.fastmcp import FastMCP`."""

        raw = await self._call_llm(prompt, max_tokens=4000)
        if raw and "FastMCP" in raw and "@mcp.tool()" in raw:
            raw = re.sub(r"^```python\s*\n?", "", raw.strip())
            raw = re.sub(r"^```\s*\n?", "", raw.strip())
            raw = re.sub(r"\n?```$", "", raw.strip())
            return raw.strip()
        return None

    def _template_python(self, mcp_tools: List[Dict], auth_config: Dict, base_url: str, server_name: str = "mcp-server") -> str:
        env_line, headers_expr, env_name = self._auth_python(auth_config)
        install_env = f'export {env_name}="your-api-key"' if env_name else ""
        lines = [
            '"""',
            f"MCP Server — {server_name}",
            f"Base URL: {base_url}",
            "",
            "Setup:",
            '    pip install "mcp[cli]" httpx',
        ]
        if install_env:
            lines.append(f"    {install_env}")
        lines += [
            "    python mcp_server.py",
            '"""',
            "import os",
            "import httpx",
            "import json",
            "from mcp.server.fastmcp import FastMCP",
            "",
            f'BASE_URL = "{base_url}"',
        ]
        if env_line:
            lines.append(env_line)
        lines += [
            "",
            f'mcp = FastMCP("{server_name}")',
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

            props = tool.get("inputSchema", {}).get("properties", {})
            required_set = set(tool.get("inputSchema", {}).get("required", []))

            sig_parts = []
            for p in path_params:
                ptype = self._schema_to_python_type(props.get(p, {}).get("type", "string"))
                sig_parts.append(f"{p}: {ptype}")
            for p in query_params:
                ptype = self._schema_to_python_type(props.get(p, {}).get("type", "string"))
                if p in required_set:
                    sig_parts.append(f"{p}: {ptype}")
                else:
                    sig_parts.append(f'{p}: {ptype} = ""')
            if has_body:
                sig_parts.append("body: dict = None")
            sig = ", ".join(sig_parts)

            url_expr = f'f"{{BASE_URL}}{path}"' if path_params else f'BASE_URL + "{path}"'

            doc = [f'    """{desc}', "", "    Args:"]
            for p in path_params:
                doc.append(f"        {p}: {props.get(p, {}).get('description', 'Path parameter')}")
            for p in query_params:
                doc.append(f"        {p}: {props.get(p, {}).get('description', 'Query parameter')} (optional)")
            if has_body:
                doc.append("        body: Request body as dict")
            doc.append('    """')

            _, headers_expr, _ = self._auth_python({})
            lines += ["@mcp.tool()", f"async def {fn}({sig}) -> str:"]
            lines += doc

            if query_params:
                qp = "{" + ", ".join(f'"{p}": str({p})' for p in query_params) + "}"
                lines.append(f"    query = {{k: v for k, v in {qp}.items() if v}}")
            else:
                lines.append("    query = {}")

            call = f"client.{method}({url_expr}, headers=headers, params=query or None"
            if has_body:
                call += ", json=body"
            call += ")"

            lines += [
                f"    url = {url_expr}",
                f"    headers = {headers_expr}",
                "    async with httpx.AsyncClient(timeout=30.0) as client:",
                f"        resp = await {call}",
                "        resp.raise_for_status()",
                "        try:",
                "            return json.dumps(resp.json(), indent=2)",
                "        except Exception:",
                "            return resp.text",
                "",
            ]

        lines += ['if __name__ == "__main__":', '    mcp.run(transport="stdio")']
        return "\n".join(lines)

    # ---- TypeScript -------------------------------------------------------

    async def _generate_typescript_code(self, mcp_tools, auth_config, base_url, server_name="mcp-server", callback=None) -> str:
        await self.send_update("processing", None, 0.45, "Asking AI to write the MCP server...", callback)
        llm_code = await self._llm_generate_typescript(mcp_tools, auth_config, base_url, server_name)
        if llm_code:
            await self.send_update("processing", None, 0.9, "AI-generated TypeScript code ready", callback)
            return llm_code
        await self.send_update("processing", None, 0.7, "Building from template...", callback)
        return self._template_typescript(mcp_tools, auth_config, base_url, server_name)

    @staticmethod
    def _auth_typescript(auth_config: Dict) -> tuple:
        """Returns (env_var_line, headers_expr, env_var_name)."""
        auth_type = auth_config.get("type", "bearer")
        auth_name = auth_config.get("name", "Authorization")
        auth_scheme = auth_config.get("scheme", "Bearer")
        auth_location = auth_config.get("location", "header")
        if auth_type == "none":
            return ("", "{}", "")
        env_name = "API_KEY"
        env_line = f'const {env_name} = process.env.{env_name} ?? "";'
        if auth_type == "api_key" and auth_location == "header":
            headers = '{' + f' "{auth_name}": {env_name}, "Content-Type": "application/json"' + ' }'
        else:
            headers = '{' + f' "{auth_name}": `{auth_scheme} ${{{env_name}}}`, "Content-Type": "application/json"' + ' }'
        return (env_line, headers, env_name)

    @staticmethod
    def _schema_to_zod(schema_type: str, required: bool, description: str) -> str:
        base = {"integer": "z.number().int()", "number": "z.number()", "boolean": "z.boolean()"}.get(schema_type, "z.string()")
        if description:
            base += f'.describe("{description}")'
        if not required:
            base += ".optional()"
        return base

    async def _llm_generate_typescript(self, mcp_tools: List[Dict], auth_config: Dict, base_url: str, server_name: str) -> Optional[str]:
        env_line, headers_expr, env_name = self._auth_typescript(auth_config)

        tool_specs = []
        for t in mcp_tools[:20]:
            props = t.get("inputSchema", {}).get("properties", {})
            required_set = set(t.get("inputSchema", {}).get("required", []))
            schema_fields = {
                pname: self._schema_to_zod(pschema.get("type", "string"), pname in required_set, pschema.get("description", ""))
                for pname, pschema in props.items()
            }
            tool_specs.append({
                "name": t["name"],
                "description": t.get("description", ""),
                "method": t.get("method", "GET"),
                "endpoint": t.get("endpoint", "/"),
                "inputSchema": schema_fields,
                "path_params": re.findall(r"\{(\w+)\}", t.get("endpoint", "")),
            })

        tools_json = json.dumps(tool_specs, indent=2)

        prompt = f"""Generate a complete runnable TypeScript MCP server.

Server name: {server_name}
Base URL: {base_url}

Tools:
{tools_json}

EXACT code structure to follow:

```typescript
import {{ McpServer }} from "@modelcontextprotocol/sdk/server/mcp.js";
import {{ StdioServerTransport }} from "@modelcontextprotocol/sdk/server/stdio.js";
import {{ z }} from "zod";

const BASE_URL = "{base_url}";
{env_line}

const server = new McpServer({{ name: "{server_name}", version: "1.0.0" }});

server.registerTool(
  "example_tool",
  {{
    description: "Short description",
    inputSchema: {{
      pet_id: z.number().int().describe("The pet identifier"),
      status: z.string().optional().describe("Filter by status"),
    }},
  }},
  async ({{ pet_id, status }}) => {{
    const headers = {headers_expr};
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const url = params.toString()
      ? `${{BASE_URL}}/pet/${{pet_id}}?${{params}}`
      : `${{BASE_URL}}/pet/${{pet_id}}`;
    const r = await fetch(url, {{ method: "GET", headers, signal: AbortSignal.timeout(30000) }});
    if (!r.ok) throw new Error(`HTTP ${{r.status}}: ${{await r.text()}}`);
    const data = await r.json().catch(() => r.text());
    return {{ content: [{{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }}] }};
  }}
);

async function main() {{
  const transport = new StdioServerTransport();
  await server.connect(transport);
}}
main().catch(console.error);
```

Rules:
1. Implement ALL {len(mcp_tools)} tools from the list — use each tool's "inputSchema" field for Zod types
2. Auth headers every tool: {headers_expr}
3. Path params: interpolate into URL template literal
4. Query params: URLSearchParams, only append if value is defined/non-empty
5. POST/PUT/PATCH: add `body: z.record(z.unknown()).optional()` to inputSchema, pass `body: body ? JSON.stringify(body) : undefined` to fetch
6. Always: throw if !r.ok, return json with JSON.stringify fallback
7. Wrap in async main(), call main().catch(console.error) at the end

Return ONLY TypeScript code starting with the import statements. No markdown fences."""

        raw = await self._call_llm(prompt, max_tokens=4000)
        if raw and "McpServer" in raw and "registerTool" in raw:
            raw = re.sub(r"^```typescript\s*\n?", "", raw.strip())
            raw = re.sub(r"^```ts\s*\n?", "", raw.strip())
            raw = re.sub(r"^```\s*\n?", "", raw.strip())
            raw = re.sub(r"\n?```$", "", raw.strip())
            return raw.strip()
        return None

    def _template_typescript(self, mcp_tools: List[Dict], auth_config: Dict, base_url: str, server_name: str = "mcp-server") -> str:
        env_line, headers_expr, env_name = self._auth_typescript(auth_config)
        install_env = f"  {env_name}=your-key npx ts-node mcp_server.ts" if env_name else "  npx ts-node mcp_server.ts"
        lines = [
            "/**",
            f" * MCP Server — {server_name}",
            f" * Base URL: {base_url}",
            " *",
            " * Setup:",
            " *   npm install @modelcontextprotocol/sdk zod",
            f" * {install_env}",
            " */",
            'import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";',
            'import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";',
            'import { z } from "zod";',
            "",
            f'const BASE_URL = "{base_url}";',
            env_line,
            "",
            f'const server = new McpServer({{ name: "{server_name}", version: "1.0.0" }});',
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

            props = tool.get("inputSchema", {}).get("properties", {})
            required_set = set(tool.get("inputSchema", {}).get("required", []))

            schema_entries: List[str] = []
            handler_args: List[str] = []
            for p in path_params:
                pname = p.get("name", "param")
                pdesc = props.get(pname, {}).get("description", f"Path: {pname}")
                ptype = props.get(pname, {}).get("type", "string")
                zod = self._schema_to_zod(ptype, True, pdesc)
                schema_entries.append(f'    {pname}: {zod},')
                handler_args.append(pname)
            for p in query_params:
                pname = p.get("name", "param")
                pdesc = props.get(pname, {}).get("description", f"Query: {pname}")
                ptype = props.get(pname, {}).get("type", "string")
                zod = self._schema_to_zod(ptype, pname in required_set, pdesc)
                schema_entries.append(f'    {pname}: {zod},')
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
                f'    const headers = {headers_expr};',
                f'    const url = {url_expr};',
            ]

            if query_params:
                qparts = ", ".join(f'"{p.get("name","p")}": String({p.get("name","p")} ?? "")' for p in query_params)
                lines += [
                    f'    const query = new URLSearchParams();',
                    f'    const qp: Record<string, string> = {{ {qparts} }};',
                    f'    for (const [k, v] of Object.entries(qp)) if (v) query.set(k, v);',
                    f'    const reqUrl = query.toString() ? `${{url}}?${{query}}` : url;',
                ]
                req_url = "reqUrl"
            else:
                req_url = "url"

            fetch_body = ", body: body ? JSON.stringify(body) : undefined" if has_body else ""
            lines += [
                f'    const r = await fetch({req_url}, {{ method: "{method}", headers{fetch_body}, signal: AbortSignal.timeout(30000) }});',
                f'    if (!r.ok) throw new Error(`HTTP ${{r.status}}: ${{await r.text()}}`);',
                f'    const data = await r.json().catch(() => r.text());',
                f'    return {{ content: [{{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }}] }};',
                f'  }}',
                f');',
                "",
            ]

        lines += [
            "async function main() {",
            "  const transport = new StdioServerTransport();",
            "  await server.connect(transport);",
            "}",
            "main().catch(console.error);",
        ]
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Agent 5b — MCP Translator
# ---------------------------------------------------------------------------

class MCPTranslatorAgent(BaseAgent):
    def __init__(self, provider_service=None):
        super().__init__(
            name="MCP Translator",
            description="Translates endpoint mappings to formal MCP tool schema with JSON Schema",
            provider_service=provider_service,
        )

    async def process(self, input_data: Dict[str, Any], callback: Optional[Callable] = None) -> Dict[str, Any]:
        self._current_cfg = input_data.get("_agent_config", {})
        await self.send_update("started", None, 0.0, "Translating to MCP schema...", callback)

        mcp_tools = input_data.get("mcp_tools", [])
        auth_config = input_data.get("auth_config", {})
        base_url = input_data.get("base_url", "")

        await self.send_update("processing", None, 0.4, f"Formalizing {len(mcp_tools)} tool schemas...", callback)

        mcp_schema = await self._translate(mcp_tools, auth_config, base_url)

        tool_count = len(mcp_schema.get("tools", []))
        await self.send_update("completed", mcp_schema, 1.0, f"MCP schema ready — {tool_count} tools", callback)
        return {"mcp_schema": mcp_schema, "mcp_tools": mcp_schema.get("tools", mcp_tools)}

    async def _translate(self, tools: List[Dict], auth_config: Dict, base_url: str) -> Dict:
        prompt = f"""Convert these API endpoints to a formal MCP (Model Context Protocol) tool schema with JSON Schema input definitions.

Input endpoints:
{json.dumps(tools, indent=2)}

Auth config: {json.dumps(auth_config)}
Base URL: {base_url}

Return ONLY valid JSON in this exact structure:
{{
  "server_name": "descriptive-mcp-server-name",
  "server_description": "One sentence description of what this MCP server does",
  "tools": [
    {{
      "name": "snake_case_tool_name",
      "description": "Clear description of what this tool does",
      "method": "GET",
      "endpoint": "/path/{{param}}",
      "inputSchema": {{
        "type": "object",
        "properties": {{
          "param": {{"type": "string", "description": "Description of param"}}
        }},
        "required": ["param"]
      }},
      "parameters": []
    }}
  ]
}}"""

        result = await self._call_llm(prompt, max_tokens=3000)
        if result:
            parsed = self._extract_json(result)
            if parsed and "tools" in parsed:
                return parsed

        server_name = base_url.replace("https://", "").replace("http://", "").split("/")[0].replace(".", "-") + "-mcp" if base_url else "api-mcp-server"
        return {
            "server_name": server_name,
            "server_description": f"MCP server for {base_url}",
            "tools": [self._enhance_tool(t) for t in tools],
        }

    def _enhance_tool(self, tool: Dict) -> Dict:
        params = tool.get("parameters", [])
        props: Dict = {}
        required: List[str] = []
        for p in params:
            name = p.get("name", "param")
            props[name] = {
                "type": p.get("schema", {}).get("type", "string"),
                "description": p.get("description", name),
            }
            if p.get("required"):
                required.append(name)
        return {**tool, "inputSchema": {"type": "object", "properties": props, "required": required}}


# ---------------------------------------------------------------------------
# Agent 7 — Validator
# ---------------------------------------------------------------------------

class ValidatorAgent(BaseAgent):
    def __init__(self, provider_service=None):
        super().__init__(
            name="Validator",
            description="Reviews generated code for syntax errors and MCP compliance",
            provider_service=provider_service,
        )

    async def process(self, input_data: Dict[str, Any], callback: Optional[Callable] = None) -> Dict[str, Any]:
        self._current_cfg = input_data.get("_agent_config", {})
        await self.send_update("started", None, 0.0, "Validating generated code...", callback)

        code = input_data.get("code", "")
        language = input_data.get("language", "python")

        if not code:
            await self.send_update("completed", None, 1.0, "No code to validate", callback)
            return {"validation_result": {"valid": False, "issues": ["No code generated"]}}

        await self.send_update("processing", None, 0.5, "Checking code quality...", callback)

        result = await self._validate(code, language)
        final_code = result.get("fixed_code") or code

        issues = result.get("issues", [])
        msg = "Code valid ✓" if not issues else f"{len(issues)} issue(s) fixed"
        await self.send_update("completed", result, 1.0, msg, callback)
        return {"validation_result": result, "code": final_code}

    async def _validate(self, code: str, language: str) -> Dict:
        checks_python = """
- `from mcp.server.fastmcp import FastMCP` present
- `import httpx` and `import json` present
- `mcp = FastMCP(...)` present
- Every tool has `@mcp.tool()` decorator
- Every tool function is `async def`
- Every tool returns `str`
- `resp.raise_for_status()` called before returning
- `if __name__ == "__main__": mcp.run(transport="stdio")` at end"""

        checks_typescript = """
- `import { McpServer }` from correct MCP SDK path
- `import { StdioServerTransport }` present
- `import { z }` from "zod" present
- `new McpServer(...)` present
- Every tool uses `server.registerTool(...)`
- Handler returns `{ content: [{ type: "text", text: ... }] }`
- `AbortSignal.timeout(30000)` on fetch
- `async function main()` with `server.connect(transport)` at end"""

        checks = checks_python if language == "python" else checks_typescript

        prompt = f"""You are a code reviewer for {language} MCP servers. Review the code below and fix ALL issues.

Checklist — verify each item:{checks}

Code to review:
```{language}
{code[:4000]}
```

Return ONLY valid JSON — no prose, no fences:
{{
  "valid": true,
  "issues": [],
  "fixed_code": null
}}

Rules:
- Set "valid": false if ANY checklist item fails
- List each failing check in "issues" array (short phrases)
- If issues found: set "fixed_code" to the COMPLETE corrected {language} code as a string
- If no issues: set "fixed_code": null
- Do NOT truncate fixed_code — it must be the full file"""

        result = await self._call_llm(prompt, max_tokens=4500)
        if result:
            parsed = self._extract_json(result)
            if parsed and "valid" in parsed:
                return parsed

        issues: List[str] = []
        if language == "python":
            if "import" not in code:
                issues.append("Missing imports")
            if "FastMCP" not in code and "Server" not in code:
                issues.append("MCP server not initialized")
        else:
            if "import" not in code and "require" not in code:
                issues.append("Missing imports")
            if "Server" not in code and "McpServer" not in code:
                issues.append("MCP server not initialized")
        return {"valid": len(issues) == 0, "issues": issues, "fixed_code": None}


# ---------------------------------------------------------------------------
# Agent 8 — Docs Generator
# ---------------------------------------------------------------------------

class DocsGeneratorAgent(BaseAgent):
    def __init__(self, provider_service=None):
        super().__init__(
            name="Docs Generator",
            description="Generates README.md with setup instructions and tool documentation",
            provider_service=provider_service,
        )

    async def process(self, input_data: Dict[str, Any], callback: Optional[Callable] = None) -> Dict[str, Any]:
        self._current_cfg = input_data.get("_agent_config", {})
        await self.send_update("started", None, 0.0, "Generating README...", callback)

        mcp_schema = input_data.get("mcp_schema", {})
        tools = mcp_schema.get("tools", input_data.get("mcp_tools", []))
        auth_config = input_data.get("auth_config", {})
        base_url = input_data.get("base_url", "")
        language = input_data.get("language", "python")
        server_name = mcp_schema.get("server_name", "mcp-server")

        await self.send_update("processing", None, 0.5, "Writing documentation...", callback)

        readme = await self._generate_readme(server_name, tools, auth_config, base_url, language)

        await self.send_update("completed", {"preview": readme[:200]}, 1.0, "README ready", callback)
        return {"readme": readme}

    async def _generate_readme(self, server_name: str, tools: List[Dict], auth_config: Dict, base_url: str, language: str) -> str:
        ext = "py" if language == "python" else "ts"
        install = 'pip install "mcp[cli]" httpx' if language == "python" else "npm install @modelcontextprotocol/sdk zod"
        run_cmd = f"python mcp_server.{ext}" if language == "python" else f"npx ts-node mcp_server.{ext}"
        auth_type = auth_config.get("type", "none")
        env_name = "API_KEY"
        env_setup = f'export {env_name}="your-api-key"' if auth_type != "none" else ""
        claude_env = f', "env": {{"{env_name}": "your-api-key"}}' if auth_type != "none" else ""
        tool_list = "\n".join(f"- `{t['name']}`: {t.get('description', '')}" for t in tools[:20])

        prompt = f"""Write a complete README.md for this MCP server. Use real values — no placeholders like <your-key>.

Server name: {server_name}
Base URL: {base_url}
Language: {language}
Auth: {auth_type}{f" ({auth_config.get('name', '')})" if auth_type != "none" else ""}
Install: {install}
Run: {run_cmd}
{f"Env var: {env_name}" if env_setup else "No auth required"}

Tools ({len(tools)} total, showing first 20):
{tool_list}

Write these sections in order — use real commands from above:

# {server_name}

One-line description of what this MCP server does.

## Setup

```bash
{install}
{env_setup}
```

## Run

```bash
{run_cmd}
```

## Available Tools

| Tool | Description |
|------|-------------|
(one row per tool)

## Claude Desktop Config

```json
{{
  "mcpServers": {{
    "{server_name}": {{
      "command": "{"python" if language == "python" else "npx"}",
      "args": [{"mcp_server.py" if language == "python" else "ts-node mcp_server.ts"}]{claude_env}
    }}
  }}
}}
```

## Example Usage

Show one realistic example of calling a tool through Claude.

Write clean Markdown only."""

        result = await self._call_llm(prompt, max_tokens=2000)
        if result and len(result) > 200:
            return result

        # Fallback template
        tool_rows = "\n".join(f"| `{t['name']}` | {t.get('description', '-')} |" for t in tools)
        return f"""# {server_name}

Auto-generated MCP server for `{base_url}`.

## Setup

```bash
{install}
export API_KEY="your-api-key"
```

## Run

```bash
{run_cmd}
```

## Available Tools

| Tool | Description |
|------|-------------|
{tool_rows}

## Claude Desktop Config

```json
{{
  "mcpServers": {{
    "{server_name}": {{
      "command": "python",
      "args": ["mcp_server.{ext}"],
      "env": {{"API_KEY": "your-api-key"}}
    }}
  }}
}}
```
"""


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
            MCPTranslatorAgent(provider_service),
            CodeGeneratorAgent(provider_service),
            ValidatorAgent(provider_service),
            DocsGeneratorAgent(provider_service),
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
                {
                    "code": current_data.get("code", ""),
                    "language": current_data.get("language", "python"),
                    "readme": current_data.get("readme", ""),
                },
                1.0, "Generation complete",
            ))
        return current_data
