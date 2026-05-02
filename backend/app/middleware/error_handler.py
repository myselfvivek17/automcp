from fastapi.responses import JSONResponse


async def error_handler_middleware(request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"error": "Internal Server Error", "message": str(exc)},
        )
