import re
import requests
from flask import request

def get_client_ip(req):
    """Extract real client IP address from request headers (taking proxies into account)."""
    if req.headers.get("X-Forwarded-For"):
        ip = req.headers.get("X-Forwarded-For").split(",")[0].strip()
    elif req.headers.get("X-Real-IP"):
        ip = req.headers.get("X-Real-IP").strip()
    else:
        ip = req.remote_addr or "127.0.0.1"
    return ip

def parse_user_agent(ua_string):
    """Parse User-Agent string to determine Browser, OS, and Device Type."""
    ua = ua_string or ""
    
    # Device
    if re.search(r'Mobile|Android|iPhone|iPad|iPod|Windows Phone', ua, re.I):
        device = "Mobile"
        if "iPad" in ua or "Tablet" in ua:
            device = "Tablet"
    else:
        device = "Desktop"
        
    # OS
    os_name = "Unknown OS"
    if "Windows" in ua:
        os_name = "Windows"
    elif "Mac OS" in ua or "Macintosh" in ua:
        os_name = "macOS"
    elif "Android" in ua:
        os_name = "Android"
    elif "iPhone" in ua or "iPad" in ua or "CPU OS" in ua:
        os_name = "iOS"
    elif "Linux" in ua:
        os_name = "Linux"

    # Browser
    browser = "Unknown Browser"
    if "Edg" in ua:
        browser = "Microsoft Edge"
    elif "Chrome" in ua and "Chromium" not in ua and "Edg" not in ua:
        browser = "Google Chrome"
    elif "Safari" in ua and "Chrome" not in ua:
        browser = "Safari"
    elif "Firefox" in ua:
        browser = "Mozilla Firefox"
    elif "MSIE" in ua or "Trident" in ua:
        browser = "Internet Explorer"

    return {
        "browser": browser,
        "operating_system": os_name,
        "device_type": device
    }

def get_country_by_ip(ip):
    """Look up country name based on IP address using ip-api.com (graceful fallback)."""
    if not ip or ip in ["127.0.0.1", "localhost", "::1"] or ip.startswith("192.168.") or ip.startswith("10."):
        return "Local Network"
    
    try:
        response = requests.get(f"http://ip-api.com/json/{ip}?fields=country", timeout=2)
        if response.status_code == 200:
            data = response.json()
            return data.get("country", "Unknown")
    except Exception:
        pass
    return "Unknown"
