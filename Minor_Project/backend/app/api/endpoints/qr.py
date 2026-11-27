import io
import os
import socket
from typing import Optional
from urllib.parse import quote
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
import qrcode

router = APIRouter()


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass
    try:
        for ip in socket.gethostbyname_ex(socket.gethostname())[2]:
            if not ip.startswith("127.") and ":" not in ip:
                return ip
    except Exception:
        pass
    return "127.0.0.1"


def get_portal_url(request: Request, override_url: Optional[str] = None) -> str:
    if override_url:
        cleaned = override_url.strip()
        if not cleaned.startswith(("http://", "https://")):
            raise HTTPException(status_code=400, detail="Custom portal URL must start with http:// or https://")
        return cleaned if cleaned.endswith("/") else f"{cleaned}/"

    env_url = (os.getenv("PORTAL_URL") or "").strip()
    if env_url:
        return env_url if env_url.endswith("/") else f"{env_url}/"

    host_header = (request.headers.get("host") or "").strip()
    if host_header and not host_header.startswith(("127.0.0.1", "localhost", "0.0.0.0")):
        fwd_proto = (request.headers.get("x-forwarded-proto") or "").split(",")[0].strip().lower()
        if fwd_proto in ("http", "https"):
            scheme = fwd_proto
        elif any(host_header.split(":")[0].endswith(sfx) for sfx in (".onrender.com", ".up.railway.app", ".fly.dev", ".trycloudflare.com")):
            scheme = "https"
        else:
            scheme = request.url.scheme or "http"
        return f"{scheme}://{host_header}/"

    host_ip = get_local_ip()
    port = request.url.port or 8000
    return f"http://{host_ip}:{port}/"


@router.get("/code")
def generate_portal_qr(
    request: Request,
    url: Optional[str] = Query(None, description="Optional public or custom portal URL to encode"),
):
    """
    Generates a high-contrast QR Code PNG with standard 4-module quiet zone
    pointing to the live CampusVoice Portal URL.
    """
    portal_url = get_portal_url(request, override_url=url)

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(portal_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="image/png",
        headers={"Cache-Control": "no-store"},
    )


@router.get("/info")
def get_qr_info(
    request: Request,
    url: Optional[str] = Query(None, description="Optional override URL"),
):
    host_ip = get_local_ip()
    portal_url = get_portal_url(request, override_url=url)
    return {
        "portal_url": portal_url,
        "local_ip": host_ip,
        "qr_image_url": "/api/qr/code" + (f"?url={quote(portal_url, safe='')}" if url else ""),
        "instructions": "Scan with any phone camera on the same Wi-Fi network (or open the URL below) to access CampusVoice.",
    }
