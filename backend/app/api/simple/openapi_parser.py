"""
OpenAPI/Swagger parser API
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json
import yaml
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class ParseRequest(BaseModel):
    """Request to parse OpenAPI/Swagger spec from URL or text"""
    content: str
    format: str = "auto"  # auto, json, yaml


class ParseResponse(BaseModel):
    """Parsed OpenAPI/Swagger specification"""
    success: bool
    format: str
    version: str
    info: Dict[str, Any]
    servers: list
    paths: Dict[str, Any]
    components: Optional[Dict[str, Any]] = None
    message: str


@router.post("/parse/openapi", response_model=ParseResponse)
async def parse_openapi_spec(request: ParseRequest):
    """
    Parse OpenAPI 3.0 specification from JSON or YAML
    """
    try:
        logger.info(f"Parsing OpenAPI spec (format: {request.format})")
        
        # Try to parse as JSON first
        spec = None
        detected_format = "json"
        
        if request.format in ["auto", "json"]:
            try:
                spec = json.loads(request.content)
                detected_format = "json"
            except json.JSONDecodeError:
                if request.format == "json":
                    raise HTTPException(status_code=400, detail="Invalid JSON format")
        
        # Try YAML if JSON failed or format is yaml
        if spec is None and request.format in ["auto", "yaml"]:
            try:
                spec = yaml.safe_load(request.content)
                detected_format = "yaml"
            except yaml.YAMLError as e:
                raise HTTPException(status_code=400, detail=f"Invalid YAML format: {str(e)}")
        
        if spec is None:
            raise HTTPException(status_code=400, detail="Could not parse specification")
        
        # Validate OpenAPI structure
        if "openapi" not in spec:
            raise HTTPException(status_code=400, detail="Not a valid OpenAPI 3.0 specification")
        
        version = spec.get("openapi", "3.0.0")
        info = spec.get("info", {})
        servers = spec.get("servers", [])
        paths = spec.get("paths", {})
        components = spec.get("components", {})
        
        logger.info(f"Successfully parsed OpenAPI {version} spec with {len(paths)} paths")
        
        return ParseResponse(
            success=True,
            format=detected_format,
            version=version,
            info=info,
            servers=servers,
            paths=paths,
            components=components,
            message=f"Successfully parsed OpenAPI {version} specification"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing OpenAPI spec: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse/swagger", response_model=ParseResponse)
async def parse_swagger_spec(request: ParseRequest):
    """
    Parse Swagger 2.0 specification from JSON
    """
    try:
        logger.info("Parsing Swagger 2.0 spec")
        
        # Parse JSON
        try:
            spec = json.loads(request.content)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format")
        
        # Validate Swagger structure
        if "swagger" not in spec:
            raise HTTPException(status_code=400, detail="Not a valid Swagger 2.0 specification")
        
        version = spec.get("swagger", "2.0")
        info = spec.get("info", {})
        host = spec.get("host", "")
        base_path = spec.get("basePath", "")
        paths = spec.get("paths", {})
        definitions = spec.get("definitions", {})
        
        # Convert to OpenAPI-like structure
        servers = []
        if host:
            servers.append({
                "url": f"https://{host}{base_path}"
            })
        
        components = {
            "schemas": definitions
        }
        
        logger.info(f"Successfully parsed Swagger {version} spec with {len(paths)} paths")
        
        return ParseResponse(
            success=True,
            format="json",
            version=version,
            info=info,
            servers=servers,
            paths=paths,
            components=components,
            message=f"Successfully parsed Swagger {version} specification"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing Swagger spec: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse/file")
async def parse_spec_file(file: UploadFile = File(...)):
    """
    Parse OpenAPI/Swagger specification from uploaded file
    """
    try:
        logger.info(f"Parsing uploaded file: {file.filename}")
        
        # Read file content
        content = await file.read()
        content_str = content.decode("utf-8")
        
        # Detect format from filename
        filename = file.filename.lower()
        if filename.endswith(".json"):
            format_hint = "json"
        elif filename.endswith((".yaml", ".yml")):
            format_hint = "yaml"
        else:
            format_hint = "auto"
        
        # Try to parse
        request = ParseRequest(content=content_str, format=format_hint)
        
        # Detect if OpenAPI or Swagger
        try:
            spec = json.loads(content_str) if format_hint == "json" else yaml.safe_load(content_str)
            
            if "openapi" in spec:
                return await parse_openapi_spec(request)
            elif "swagger" in spec:
                return await parse_swagger_spec(request)
            else:
                raise HTTPException(status_code=400, detail="Unknown specification format")
                
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not parse file: {str(e)}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/validate")
async def validate_spec(spec_type: str, content: str):
    """
    Validate OpenAPI or Swagger specification
    """
    try:
        if spec_type == "openapi":
            result = await parse_openapi_spec(ParseRequest(content=content))
        elif spec_type == "swagger":
            result = await parse_swagger_spec(ParseRequest(content=content))
        else:
            raise HTTPException(status_code=400, detail="Invalid spec_type. Use 'openapi' or 'swagger'")
        
        return {
            "valid": result.success,
            "version": result.version,
            "endpoints_count": len(result.paths),
            "message": result.message
        }
        
    except HTTPException as e:
        return {
            "valid": False,
            "error": e.detail
        }
    except Exception as e:
        return {
            "valid": False,
            "error": str(e)
        }

# Made with Bob
