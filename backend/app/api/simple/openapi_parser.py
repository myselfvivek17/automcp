"""
OpenAPI/Swagger parser API
"""
import json
import logging
from typing import Any, Dict, Optional

import yaml
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()


class ParseRequest(BaseModel):
    content: str
    format: str = "auto"  # auto, json, yaml


class ParseResponse(BaseModel):
    success: bool
    format: str
    version: str
    info: Dict[str, Any]
    servers: list
    paths: Dict[str, Any]
    components: Optional[Dict[str, Any]] = None
    message: str


class ValidateRequest(BaseModel):
    spec_type: str
    content: str


def _parse_content(content: str, format_hint: str) -> dict:
    """Parse content as JSON or YAML based on hint, falling back automatically."""
    if format_hint == "json":
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")
    if format_hint == "yaml":
        try:
            return yaml.safe_load(content)
        except yaml.YAMLError as e:
            raise HTTPException(status_code=400, detail=f"Invalid YAML: {e}")
    # auto
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        try:
            return yaml.safe_load(content)
        except yaml.YAMLError as e:
            raise HTTPException(status_code=400, detail=f"Could not parse as JSON or YAML: {e}")


@router.post("/parse/openapi", response_model=ParseResponse)
async def parse_openapi_spec(request: ParseRequest):
    try:
        spec = _parse_content(request.content, request.format)
        detected_format = "yaml" if request.format == "yaml" else "json"

        if "openapi" not in spec:
            raise HTTPException(status_code=400, detail="Not a valid OpenAPI 3.0 specification")

        version = spec.get("openapi", "3.0.0")
        paths = spec.get("paths", {})
        logger.info(f"Parsed OpenAPI {version} spec with {len(paths)} paths")

        return ParseResponse(
            success=True,
            format=detected_format,
            version=version,
            info=spec.get("info", {}),
            servers=spec.get("servers", []),
            paths=paths,
            components=spec.get("components", {}),
            message=f"Successfully parsed OpenAPI {version} specification",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing OpenAPI spec: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse/swagger", response_model=ParseResponse)
async def parse_swagger_spec(request: ParseRequest):
    try:
        spec = _parse_content(request.content, request.format)

        if "swagger" not in spec:
            raise HTTPException(status_code=400, detail="Not a valid Swagger 2.0 specification")

        version = spec.get("swagger", "2.0")
        host = spec.get("host", "")
        base_path = spec.get("basePath", "")
        paths = spec.get("paths", {})

        servers = []
        if host:
            schemes = spec.get("schemes", ["https"])
            for scheme in schemes:
                servers.append({"url": f"{scheme}://{host}{base_path}"})

        logger.info(f"Parsed Swagger {version} spec with {len(paths)} paths")

        return ParseResponse(
            success=True,
            format="json",
            version=version,
            info=spec.get("info", {}),
            servers=servers,
            paths=paths,
            components={"schemas": spec.get("definitions", {})},
            message=f"Successfully parsed Swagger {version} specification",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing Swagger spec: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse/file")
async def parse_spec_file(file: UploadFile = File(...)):
    try:
        content_bytes = await file.read()
        content_str = content_bytes.decode("utf-8")

        filename = (file.filename or "").lower()
        if filename.endswith(".json"):
            format_hint = "json"
        elif filename.endswith((".yaml", ".yml")):
            format_hint = "yaml"
        else:
            format_hint = "auto"

        spec = _parse_content(content_str, format_hint)

        if "openapi" in spec:
            return await parse_openapi_spec(ParseRequest(content=content_str, format=format_hint))
        elif "swagger" in spec:
            return await parse_swagger_spec(ParseRequest(content=content_str, format=format_hint))
        else:
            raise HTTPException(status_code=400, detail="Unknown specification format — expected 'openapi' or 'swagger' key")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate_spec(request: ValidateRequest):
    try:
        if request.spec_type == "openapi":
            result = await parse_openapi_spec(ParseRequest(content=request.content))
        elif request.spec_type == "swagger":
            result = await parse_swagger_spec(ParseRequest(content=request.content))
        else:
            raise HTTPException(status_code=400, detail="Invalid spec_type. Use 'openapi' or 'swagger'")

        return {
            "valid": result.success,
            "version": result.version,
            "endpoints_count": len(result.paths),
            "message": result.message,
        }
    except HTTPException as e:
        return {"valid": False, "error": e.detail}
    except Exception as e:
        return {"valid": False, "error": str(e)}
