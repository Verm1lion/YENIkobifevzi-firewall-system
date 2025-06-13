import time
from starlette.requests import Request
from starlette.responses import Response
from app.database import db
from datetime import datetime

async def log_requests(request: Request, call_next):
    start_time = time.time()
    response: Response = await call_next(request)
    process_time = time.time() - start_time

    log_doc = {
        "timestamp": datetime.utcnow(),
        "method": request.method,
        "path": request.url.path,
        "query_string": request.url.query,
        "status_code": response.status_code,
        "process_time_ms": int(process_time * 1000),
        "source_ip": request.client.host,
        "level": "INFO",
        "message": f"Request to {request.url.path}"
    }

    await db["logs"].insert_one(log_doc)
    return response
