import io
import socket
from fastapi import APIRouter, Response, Request
from fastapi.responses import StreamingResponse
import qrcode

router = APIRouter()

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

@router.get("/code")
def generate_portal_qr(request: Request):
    """
    Generates a live QR Code image pointing to the CampusVoice Portal.
    Scanning on a mobile device opens the student portal or signup page.
    """
    # Prefer base URL or host IP
    host_ip = get_local_ip()
    port = request.url.port or 8000
    portal_url = f"http://{host_ip}:{port}/"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(portal_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#1d4ed8", back_color="#ffffff")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return StreamingResponse(buf, media_type="image/png")

@router.get("/info")
def get_qr_info(request: Request):
    host_ip = get_local_ip()
    port = request.url.port or 8000
    portal_url = f"http://{host_ip}:{port}/"
    return {
        "portal_url": portal_url,
        "local_ip": host_ip,
        "qr_image_url": "/api/qr/code",
        "instructions": "Scan with your smartphone camera to access the CampusVoice Portal directly from anywhere on campus Wi-Fi."
    }
