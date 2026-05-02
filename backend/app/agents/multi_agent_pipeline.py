"""
Multi-agent pipeline for MCP code generation
Each agent specializes in a specific task and passes results to the next agent
"""
import asyncio
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class AgentMessage:
    """Message passed between agents"""
    def __init__(self, agent_name: str, status: str, data: Any, progress: float, message: str):
        self.agent_name = agent_name
        self.status = status  # "started", "processing", "completed", "error"
        self.data = data
        self.progress = progress  # 0.0 to 1.0
        self.message = message
        self.timestamp = datetime.utcnow().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "agent_name": self.agent_name,
            "status": self.status,
            "data": self.data,
            "progress": self.progress,
            "message": self.message,
            "timestamp": self.timestamp
        }


class BaseAgent:
    """Base class for all agents"""
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
    
    async def process(self, input_data: Dict[str, Any], callback: Optional[Callable] = None) -> Dict[str, Any]:
        """Process input and return output. Override in subclasses."""
        raise NotImplementedError
    
    async def send_update(self, status: str, data: Any, progress: float, message: str, callback: Optional[Callable]):
        """Send update to callback if provided"""
        if callback:
            msg = AgentMessage(self.name, status, data, progress, message)
            await callback(msg)


class InputParserAgent(BaseAgent):
    """Parses and normalizes different input formats"""
    
    def __init__(self):
        super().__init__(
            name="Input Parser",
            description="Parses and normalizes API specifications from various formats"
        )
    
    async def process(self, input_data: Dict[str, Any], callback: Optional[Callable] = None) -> Dict[str, Any]:
        await self.send_update("started", None, 0.0, "Starting input parsing...", callback)
        
        input_type = input_data.get("input_type", "text")
        content = input_data.get("content", "")
        
        await self.send_update("processing", None, 0.3, f"Parsing {input_type} input...", callback)
        await asyncio.sleep(0.5)  # Simulate processing
        
        # Parse based on input type
        if input_type == "openapi":
            parsed = await self._parse_openapi(content)
        elif input_type == "swagger":
            parsed = await self._parse_swagger(content)
        elif input_type == "text":
            parsed = await self._parse_text(content)
        else:
            parsed = {"raw": content}
        
        await self.send_update("processing", parsed, 0.7, "Normalizing structure...", callback)
        await asyncio.sleep(0.3)
        
        result = {
            "input_type": input_type,
            "parsed_data": parsed,
            "normalized": True
        }
        
        await self.send_update("completed", result, 1.0, "Input parsing complete", callback)
        return result
    
    async def _parse_openapi(self, content: str) -> Dict[str, Any]:
        """Parse OpenAPI specification"""
        import json
        try:
            spec = json.loads(content)
            return {
                "format": "openapi",
                "version": spec.get("openapi", "3.0.0"),
                "info": spec.get("info", {}),
                "servers": spec.get("servers", []),
                "paths": spec.get("paths", {}),
                "components": spec.get("components", {})
            }
        except:
            return {"format": "openapi", "raw": content}
    
    async def _parse_swagger(self, content: str) -> Dict[str, Any]:
        """Parse Swagger specification"""
        import json
        try:
            spec = json.loads(content)
            return {
                "format": "swagger",
                "version": spec.get("swagger", "2.0"),
                "info": spec.get("info", {}),
                "host": spec.get("host", ""),
                "basePath": spec.get("basePath", ""),
                "paths": spec.get("paths", {}),
                "definitions": spec.get("definitions", {})
            }
        except:
            return {"format": "swagger", "raw": content}
    
    async def _parse_text(self, content: str) -> Dict[str, Any]:
        """Parse plain text description"""
        return {
            "format": "text",
            "description": content,
            "endpoints": []  # Will be extracted by next agent
        }


class SchemaExtractorAgent(BaseAgent):
    """Extracts API schema and endpoint information"""
    
    def __init__(self):
        super().__init__(
            name="Schema Extractor",
            description="Extracts endpoints, methods, parameters, and schemas"
        )
    
    async def process(self, input_data: Dict[str, Any], callback: Optional[Callable] = None) -> Dict[str, Any]:
        await self.send_update("started", None, 0.0, "Starting schema extraction...", callback)
        
        parsed_data = input_data.get("parsed_data", {})
        
        await self.send_update("processing", None, 0.3, "Extracting endpoints...", callback)
        await asyncio.sleep(0.5)
        
        endpoints = await self._extract_endpoints(parsed_data)
        
        await self.send_update("processing", None, 0.6, "Extracting schemas...", callback)
        await asyncio.sleep(0.4)
        
        schemas = await self._extract_schemas(parsed_data)
        
        result = {
            "endpoints": endpoints,
            "schemas": schemas,
            "base_url": parsed_data.get("servers", [{}])[0].get("url", "") if parsed_data.get("servers") else ""
        }
        
        await self.send_update("completed", result, 1.0, f"Extracted {len(endpoints)} endpoints", callback)
        return result
    
    async def _extract_endpoints(self, parsed_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract endpoint information"""
        endpoints = []
        paths = parsed_data.get("paths", {})
        
        for path, methods in paths.items():
            for method, details in methods.items():
                if method.upper() in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                    endpoints.append({
                        "path": path,
                        "method": method.upper(),
                        "summary": details.get("summary", ""),
                        "description": details.get("description", ""),
                        "parameters": details.get("parameters", []),
                        "requestBody": details.get("requestBody", {}),
                        "responses": details.get("responses", {})
                    })
        
        return endpoints
    
    async def _extract_schemas(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract schema definitions"""
        components = parsed_data.get("components", {})
        return components.get("schemas", {})


class EndpointMapperAgent(BaseAgent):
    """Maps endpoints to MCP tools"""
    
    def __init__(self):
        super().__init__(
            name="Endpoint Mapper",
            description="Maps API endpoints to MCP tool definitions"
        )
    
    async def process(self, input_data: Dict[str, Any], callback: Optional[Callable] = None) -> Dict[str, Any]:
        await self.send_update("started", None, 0.0, "Starting endpoint mapping...", callback)
        
        endpoints = input_data.get("endpoints", [])
        
        await self.send_update("processing", None, 0.4, f"Mapping {len(endpoints)} endpoints to MCP tools...", callback)
        await asyncio.sleep(0.6)
        
        mcp_tools = []
        for endpoint in endpoints:
            tool = await self._map_to_mcp_tool(endpoint)
            mcp_tools.append(tool)
        
        result = {
            "mcp_tools": mcp_tools,
            "tool_count": len(mcp_tools)
        }
        
        await self.send_update("completed", result, 1.0, f"Mapped {len(mcp_tools)} MCP tools", callback)
        return result
    
    async def _map_to_mcp_tool(self, endpoint: Dict[str, Any]) -> Dict[str, Any]:
        """Map single endpoint to MCP tool"""
        # Create tool name from path and method
        path = endpoint["path"].replace("/", "_").replace("{", "").replace("}", "").strip("_")
        method = endpoint["method"].lower()
        tool_name = f"{method}_{path}"
        
        return {
            "name": tool_name,
            "description": endpoint.get("summary") or endpoint.get("description") or f"{method.upper()} {endpoint['path']}",
            "endpoint": endpoint["path"],
            "method": endpoint["method"],
            "parameters": endpoint.get("parameters", []),
            "requestBody": endpoint.get("requestBody", {}),
            "responses": endpoint.get("responses", {})
        }


class AuthAnalyzerAgent(BaseAgent):
    """Analyzes authentication requirements"""
    
    def __init__(self):
        super().__init__(
            name="Auth Analyzer",
            description="Analyzes and configures authentication flows"
        )
    
    async def process(self, input_data: Dict[str, Any], callback: Optional[Callable] = None) -> Dict[str, Any]:
        await self.send_update("started", None, 0.0, "Analyzing authentication...", callback)
        
        await self.send_update("processing", None, 0.5, "Detecting auth type...", callback)
        await asyncio.sleep(0.4)
        
        # Simple auth detection (can be enhanced)
        auth_type = "api_key"  # Default
        auth_config = {
            "type": auth_type,
            "location": "header",
            "name": "Authorization",
            "scheme": "Bearer"
        }
        
        result = {
            "auth_required": True,
            "auth_config": auth_config
        }
        
        await self.send_update("completed", result, 1.0, f"Auth type: {auth_type}", callback)
        return result


class CodeGeneratorAgent(BaseAgent):
    """Generates MCP server code"""
    
    def __init__(self, provider_service=None):
        super().__init__(
            name="Code Generator",
            description="Generates production-ready MCP server code"
        )
        self.provider_service = provider_service
    
    async def process(self, input_data: Dict[str, Any], callback: Optional[Callable] = None) -> Dict[str, Any]:
        await self.send_update("started", None, 0.0, "Starting code generation...", callback)
        
        language = input_data.get("language", "python")
        mcp_tools = input_data.get("mcp_tools", [])
        auth_config = input_data.get("auth_config", {})
        base_url = input_data.get("base_url", "")
        
        await self.send_update("processing", None, 0.3, f"Generating {language} code...", callback)
        await asyncio.sleep(0.5)
        
        if language == "python":
            code = await self._generate_python_code(mcp_tools, auth_config, base_url)
        elif language == "typescript":
            code = await self._generate_typescript_code(mcp_tools, auth_config, base_url)
        else:
            code = f"# Language {language} not yet supported"
        
        await self.send_update("processing", None, 0.8, "Adding documentation...", callback)
        await asyncio.sleep(0.3)
        
        result = {
            "language": language,
            "code": code,
            "files": {
                f"mcp_server.{self._get_extension(language)}": code
            }
        }
        
        await self.send_update("completed", result, 1.0, "Code generation complete", callback)
        return result
    
    def _get_extension(self, language: str) -> str:
        """Get file extension for language"""
        extensions = {
            "python": "py",
            "typescript": "ts",
            "javascript": "js"
        }
        return extensions.get(language, "txt")
    
    async def _generate_python_code(self, mcp_tools: List[Dict], auth_config: Dict, base_url: str) -> str:
        lines = [
            '"""',
            'MCP Server — Auto-generated by AutoMCP',
            f'Base URL: {base_url}',
            '',
            'Setup:',
            '    pip install mcp httpx',
            '    export API_KEY="your-actual-api-key"',
            '    python mcp_server.py',
            '"""',
            'import os, asyncio',
            'import httpx',
            'from mcp.server import Server',
            'from mcp.server.stdio import stdio_server',
            '',
            f'BASE_URL = "{base_url}"',
            '# Load API key from environment — never hardcode credentials',
            'API_KEY = os.environ.get("API_KEY", "")',
            '',
            'mcp = Server("auto-generated-mcp-server")',
            '',
        ]

        for tool in mcp_tools:
            fn = tool["name"]
            path = tool["endpoint"]
            method = tool["method"].lower()
            desc = tool.get("description", f'{method.upper()} {path}')
            params = tool.get("parameters", [])
            has_body = method in ("post", "put", "patch")

            path_params = [p["name"] for p in params if p.get("in") == "path"]
            query_params = [p["name"] for p in params if p.get("in") == "query"]

            sig_parts = [f'{p}: str' for p in path_params]
            sig_parts += [f'{p}: str = ""' for p in query_params]
            if has_body:
                sig_parts.append("body: dict = None")
            sig = ", ".join(sig_parts)

            url_expr = f'f"{{BASE_URL}}{path}"' if path_params else f'BASE_URL + "{path}"'

            lines += [
                '@mcp.tool()',
                f'async def {fn}({sig}):',
                f'    """{desc} — {method.upper()} {path}"""',
                f'    url = {url_expr}',
            ]

            if query_params:
                qp = "{" + ", ".join(f'"{p}": {p}' for p in query_params) + "}"
                lines.append(f'    params = {{k: v for k, v in {qp}.items() if v}}')
            else:
                lines.append('    params = {}')

            lines += [
                '    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}',
                '    try:',
                '        async with httpx.AsyncClient(timeout=30.0) as client:',
            ]
            call = f'client.{method}(url, headers=headers, params=params or None'
            if has_body:
                call += ', json=body'
            call += ')'
            lines += [
                f'            resp = await {call}',
                '            resp.raise_for_status()',
                '            return resp.json()',
                '    except httpx.TimeoutException:',
                '        raise ValueError("Request timed out after 30 seconds")',
                '    except httpx.HTTPStatusError as e:',
                '        raise ValueError(f"HTTP {e.response.status_code}: {e.response.text[:200]}")',
                '',
            ]

        lines += [
            'async def main():',
            '    async with stdio_server() as (read_stream, write_stream):',
            '        await mcp.run(read_stream, write_stream, mcp.create_initialization_options())',
            '',
            'if __name__ == "__main__":',
            '    asyncio.run(main())',
        ]
        return "\n".join(lines)

    async def _generate_typescript_code(self, mcp_tools: List[Dict], auth_config: Dict, base_url: str) -> str:
        lines = [
            '/**',
            ' * MCP Server — Auto-generated by AutoMCP',
            f' * Base URL: {base_url}',
            ' *',
            ' * Setup:',
            ' *   npm install @modelcontextprotocol/sdk',
            ' *   API_KEY=your-key npx ts-node mcp_server.ts',
            ' */',
            'import { Server } from "@modelcontextprotocol/sdk/server/index.js";',
            'import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";',
            'import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";',
            '',
            f'const BASE_URL = "{base_url}";',
            '// Load API key from environment — never hardcode credentials',
            'const API_KEY = process.env.API_KEY ?? "";',
            '',
            'const server = new Server(',
            '  { name: "auto-generated-mcp-server", version: "1.0.0" },',
            '  { capabilities: { tools: {} } }',
            ');',
            '',
        ]

        tool_defs = []
        cases = []

        for tool in mcp_tools:
            fn = tool["name"]
            path = tool["endpoint"]
            method = tool["method"]
            desc = tool.get("description", f'{method} {path}')
            params = tool.get("parameters", [])
            has_body = method in ("POST", "PUT", "PATCH")

            ts_path = path.replace("{", "${(args as any).")
            url_expr = f'`${{BASE_URL}}{ts_path}`' if "{" in path else f'`${{BASE_URL}}{path}`'

            props: Dict[str, Any] = {}
            for p in params:
                pname = p.get("name", "param")
                ptype = p.get("schema", {}).get("type", "string")
                props[pname] = {"type": ptype}
            if has_body:
                props["body"] = {"type": "object"}

            import json as _json
            schema_str = _json.dumps({"type": "object", "properties": props})
            tool_defs.append(f'  {{ name: "{fn}", description: "{desc}", inputSchema: {schema_str} }},')

            fetch_opts = f'method: "{method}", headers: {{"Authorization": `Bearer ${{API_KEY}}`, "Content-Type": "application/json"}}'
            if has_body:
                fetch_opts += ', body: JSON.stringify((args as any).body ?? {})'

            cases.append(
                f'    case "{fn}": {{\n'
                f'      const r = await fetch({url_expr}, {{ {fetch_opts}, signal: AbortSignal.timeout(30000) }});\n'
                f'      if (!r.ok) throw new Error(`HTTP ${{r.status}}: ${{await r.text()}}`);\n'
                f'      return {{ content: [{{ type: "text", text: JSON.stringify(await r.json()) }}] }};\n'
                f'    }}'
            )

        lines += [
            'server.setRequestHandler(ListToolsRequestSchema, async () => ({',
            '  tools: [',
        ] + tool_defs + [
            '  ]',
            '}));',
            '',
            'server.setRequestHandler(CallToolRequestSchema, async (request) => {',
            '  const args = request.params.arguments ?? {};',
            '  switch (request.params.name) {',
        ] + cases + [
            '    default: throw new Error(`Unknown tool: ${request.params.name}`);',
            '  }',
            '});',
            '',
            'await server.connect(new StdioServerTransport());',
        ]

        return "\n".join(lines)


class MultiAgentPipeline:
    """Orchestrates multiple agents in sequence"""
    
    def __init__(self, provider_service=None):
        self.agents = [
            InputParserAgent(),
            SchemaExtractorAgent(),
            EndpointMapperAgent(),
            AuthAnalyzerAgent(),
            CodeGeneratorAgent(provider_service)
        ]
        self.total_agents = len(self.agents)
    
    async def run(self, input_data: Dict[str, Any], callback: Optional[Callable] = None) -> Dict[str, Any]:
        """Run all agents in sequence"""
        logger.info("Starting multi-agent pipeline...")

        current_data = {**input_data}
        agent_configs = input_data.get("agent_configs", {})

        for i, agent in enumerate(self.agents):
            logger.info(f"Running agent {i+1}/{self.total_agents}: {agent.name}")
            current_data["_agent_config"] = agent_configs.get(agent.name, {})

            try:
                result = await agent.process(current_data, callback)
                current_data.update(result)

            except Exception as e:
                logger.error(f"Error in agent {agent.name}: {e}")
                if callback:
                    await callback(AgentMessage(
                        agent.name, "error", None,
                        (i + 1) / self.total_agents, f"Error: {str(e)}"
                    ))
                raise

        logger.info("Multi-agent pipeline completed successfully")

        # Send final Pipeline completed message with the generated code
        if callback:
            await callback(AgentMessage(
                "Pipeline", "completed", current_data, 1.0, "Generation complete"
            ))

        return current_data

# Made with Bob
