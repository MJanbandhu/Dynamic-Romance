import io
import csv
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, make_response
from backend.database import db
from backend.models import Visitor, Activity
from backend.config import Config
from backend.utils import get_client_ip, parse_user_agent, get_country_by_ip
from backend.email_service import (
    send_new_visitor_email,
    send_yes_clicked_email,
    send_kiss_selected_email,
    send_visit_completed_email
)

api = Blueprint('api', __name__, url_prefix='/api')

def verify_admin_auth(req):
    """Check Authorization header or query token against ADMIN_PASSWORD."""
    token = req.headers.get("Authorization") or req.args.get("token")
    if not token:
        return False
    if token.startswith("Bearer "):
        token = token.split(" ")[1]
    return token == Config.ADMIN_PASSWORD


@api.route('/visit', methods=['POST'])
def record_visit():
    data = request.get_json() or {}
    session_id = data.get("session_id")
    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    ip_addr = get_client_ip(request)
    ua_info = parse_user_agent(request.headers.get("User-Agent"))
    country = get_country_by_ip(ip_addr)

    visitor = Visitor.query.filter_by(session_id=session_id).first()
    if not visitor:
        visitor = Visitor(
            session_id=session_id,
            ip_address=ip_addr,
            country=country,
            browser=ua_info["browser"],
            operating_system=ua_info["operating_system"],
            device_type=ua_info["device_type"],
            screen_resolution=data.get("screen_resolution", "Unknown"),
            greeting=data.get("greeting", ""),
            adjective=data.get("adjective", ""),
            visit_timestamp=datetime.utcnow()
        )
        db.session.add(visitor)
    else:
        # Update details if already existing
        visitor.ip_address = ip_addr
        visitor.country = country
        visitor.screen_resolution = data.get("screen_resolution", visitor.screen_resolution)
        visitor.greeting = data.get("greeting", visitor.greeting)
        visitor.adjective = data.get("adjective", visitor.adjective)

    activity = Activity(
        session_id=session_id,
        event_name="VISIT_STARTED",
        details=f"Greeting: {data.get('greeting')} | Adjective: {data.get('adjective')}"
    )
    db.session.add(activity)
    db.session.commit()

    # Trigger email asynchronously / safely
    send_new_visitor_email(visitor)

    return jsonify({"status": "success", "visitor": visitor.to_dict()}), 200


@api.route('/no-attempt', methods=['POST'])
def record_no_attempt():
    data = request.get_json() or {}
    session_id = data.get("session_id")
    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    visitor = Visitor.query.filter_by(session_id=session_id).first()
    if visitor:
        visitor.no_attempt_count = (visitor.no_attempt_count or 0) + 1
        activity = Activity(
            session_id=session_id,
            event_name="NO_ATTEMPT",
            details=f"NO Hover/Tap Count: {visitor.no_attempt_count}"
        )
        db.session.add(activity)
        db.session.commit()
        return jsonify({"status": "success", "no_attempt_count": visitor.no_attempt_count}), 200
    
    return jsonify({"error": "Visitor not found"}), 404


@api.route('/yes-click', methods=['POST'])
def record_yes_click():
    data = request.get_json() or {}
    session_id = data.get("session_id")
    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    visitor = Visitor.query.filter_by(session_id=session_id).first()
    if visitor:
        visitor.yes_clicked = True
        visitor.yes_clicked_at = datetime.utcnow()
        activity = Activity(
            session_id=session_id,
            event_name="YES_CLICKED",
            details="User clicked YES on Question Screen"
        )
        db.session.add(activity)
        db.session.commit()

        # Send Email
        send_yes_clicked_email(visitor)
        return jsonify({"status": "success", "visitor": visitor.to_dict()}), 200

    return jsonify({"error": "Visitor not found"}), 404


@api.route('/kiss-selection', methods=['POST'])
def record_kiss_selection():
    data = request.get_json() or {}
    session_id = data.get("session_id")
    kiss_category = data.get("kiss_category")

    if not session_id or not kiss_category:
        return jsonify({"error": "session_id and kiss_category are required"}), 400

    visitor = Visitor.query.filter_by(session_id=session_id).first()
    if visitor:
        visitor.kiss_category = kiss_category
        visitor.kiss_selected_at = datetime.utcnow()
        activity = Activity(
            session_id=session_id,
            event_name="KISS_SELECTED",
            details=f"Selected kiss option: {kiss_category}"
        )
        db.session.add(activity)
        db.session.commit()

        # Send Email
        send_kiss_selected_email(visitor, kiss_category)
        return jsonify({"status": "success", "visitor": visitor.to_dict()}), 200

    return jsonify({"error": "Visitor not found"}), 404


@api.route('/complete-visit', methods=['POST'])
def record_complete_visit():
    data = request.get_json() or {}
    session_id = data.get("session_id")
    duration = data.get("visit_duration", 0.0)

    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    visitor = Visitor.query.filter_by(session_id=session_id).first()
    if visitor:
        visitor.final_timestamp = datetime.utcnow()
        visitor.visit_duration = float(duration)
        activity = Activity(
            session_id=session_id,
            event_name="VISIT_COMPLETED",
            details=f"Duration: {duration}s"
        )
        db.session.add(activity)
        db.session.commit()

        # Send Email
        send_visit_completed_email(visitor)
        return jsonify({"status": "success", "visitor": visitor.to_dict()}), 200

    return jsonify({"error": "Visitor not found"}), 404


# ------------------- ADMIN DASHBOARD APIS -------------------

@api.route('/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json() or {}
    password = data.get("password", "")
    if password == Config.ADMIN_PASSWORD:
        return jsonify({"status": "success", "token": Config.ADMIN_PASSWORD}), 200
    return jsonify({"status": "error", "message": "Invalid Password"}), 401


@api.route('/admin/statistics', methods=['GET'])
def get_statistics():
    if not verify_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401

    total_visitors = Visitor.query.count()
    
    # Today's visitors
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_visitors = Visitor.query.filter(Visitor.visit_timestamp >= today_start).count()
    
    yes_clicks = Visitor.query.filter_by(yes_clicked=True).count()
    
    # Total NO Attempts
    no_attempts_sum = db.session.query(db.func.sum(Visitor.no_attempt_count)).scalar() or 0
    
    # Most Selected Kiss
    kiss_stats = db.session.query(
        Visitor.kiss_category, db.func.count(Visitor.kiss_category)
    ).filter(Visitor.kiss_category.isnot(None)).group_by(Visitor.kiss_category).all()
    
    kiss_distribution = {k: v for k, v in kiss_stats}
    most_selected_kiss = max(kiss_distribution, key=kiss_distribution.get) if kiss_distribution else "None"

    # Country Distribution
    country_stats = db.session.query(
        Visitor.country, db.func.count(Visitor.country)
    ).group_by(Visitor.country).all()
    country_distribution = {c: count for c, count in country_stats if c}

    # Device Types
    device_stats = db.session.query(
        Visitor.device_type, db.func.count(Visitor.device_type)
    ).group_by(Visitor.device_type).all()
    device_types = {d: count for d, count in device_stats if d}

    # Greeting Statistics
    greeting_stats = db.session.query(
        Visitor.greeting, db.func.count(Visitor.greeting)
    ).group_by(Visitor.greeting).all()
    greeting_distribution = {g: count for g, count in greeting_stats if g}

    return jsonify({
        "total_visitors": total_visitors,
        "today_visitors": today_visitors,
        "yes_clicks": yes_clicks,
        "no_attempts": int(no_attempts_sum),
        "most_selected_kiss": most_selected_kiss,
        "kiss_distribution": kiss_distribution,
        "country_distribution": country_distribution,
        "device_types": device_types,
        "greeting_distribution": greeting_distribution
    }), 200


@api.route('/admin/recent-visits', methods=['GET'])
def get_recent_visits():
    if not verify_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401

    search_query = request.args.get('q', '').strip()
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))

    query = Visitor.query

    if search_query:
        search_filter = f"%{search_query}%"
        query = query.filter(
            (Visitor.session_id.ilike(search_filter)) |
            (Visitor.ip_address.ilike(search_filter)) |
            (Visitor.country.ilike(search_filter)) |
            (Visitor.browser.ilike(search_filter)) |
            (Visitor.operating_system.ilike(search_filter)) |
            (Visitor.kiss_category.ilike(search_filter)) |
            (Visitor.greeting.ilike(search_filter))
        )

    query = query.order_by(Visitor.visit_timestamp.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "visitors": [v.to_dict() for v in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "per_page": per_page
    }), 200


@api.route('/admin/visit/<int:visit_id>', methods=['DELETE'])
def delete_visit(visit_id):
    if not verify_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401

    visitor = Visitor.query.get(visit_id)
    if not visitor:
        return jsonify({"error": "Visitor record not found"}), 404

    # Delete related activities first
    Activity.query.filter_by(session_id=visitor.session_id).delete()
    db.session.delete(visitor)
    db.session.commit()

    return jsonify({"status": "success", "message": f"Deleted visitor {visit_id}"}), 200


@api.route('/admin/export-csv', methods=['GET'])
def export_csv():
    if not verify_admin_auth(request):
        return jsonify({"error": "Unauthorized"}), 401

    visitors = Visitor.query.order_by(Visitor.visit_timestamp.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Write Header
    writer.writerow([
        "ID", "Session ID", "IP Address", "Country", "Browser", 
        "Operating System", "Device Type", "Screen Resolution", 
        "Greeting", "Adjective", "Visit Timestamp", "YES Clicked", 
        "NO Attempt Count", "Kiss Category", "Final Timestamp", "Visit Duration (s)"
    ])

    for v in visitors:
        writer.writerow([
            v.id, v.session_id, v.ip_address, v.country, v.browser,
            v.operating_system, v.device_type, v.screen_resolution,
            v.greeting, v.adjective, 
            v.visit_timestamp.isoformat() if v.visit_timestamp else "",
            v.yes_clicked, v.no_attempt_count, v.kiss_category or "",
            v.final_timestamp.isoformat() if v.final_timestamp else "",
            v.visit_duration
        ])

    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=romantic_app_visitors.csv"
    response.headers["Content-type"] = "text/csv"
    return response
