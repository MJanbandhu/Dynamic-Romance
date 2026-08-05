from backend.database import db
from backend.utils import get_ist_now

class Visitor(db.Model):
    __tablename__ = 'visitors'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    ip_address = db.Column(db.String(50), nullable=True)
    country = db.Column(db.String(100), default="Unknown")
    browser = db.Column(db.String(100), default="Unknown")
    operating_system = db.Column(db.String(100), default="Unknown")
    device_type = db.Column(db.String(50), default="Desktop")
    screen_resolution = db.Column(db.String(50), default="Unknown")
    
    greeting = db.Column(db.String(50), nullable=True)
    adjective = db.Column(db.String(50), nullable=True)
    visit_timestamp = db.Column(db.DateTime, default=get_ist_now)
    
    yes_clicked = db.Column(db.Boolean, default=False)
    yes_clicked_at = db.Column(db.DateTime, nullable=True)
    
    no_attempt_count = db.Column(db.Integer, default=0)
    
    kiss_category = db.Column(db.String(50), nullable=True)
    kiss_selected_at = db.Column(db.DateTime, nullable=True)
    
    final_timestamp = db.Column(db.DateTime, nullable=True)
    visit_duration = db.Column(db.Float, default=0.0) # in seconds

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "ip_address": self.ip_address,
            "country": self.country,
            "browser": self.browser,
            "operating_system": self.operating_system,
            "device_type": self.device_type,
            "screen_resolution": self.screen_resolution,
            "greeting": self.greeting,
            "adjective": self.adjective,
            "visit_timestamp": self.visit_timestamp.isoformat() if self.visit_timestamp else None,
            "yes_clicked": self.yes_clicked,
            "yes_clicked_at": self.yes_clicked_at.isoformat() if self.yes_clicked_at else None,
            "no_attempt_count": self.no_attempt_count,
            "kiss_category": self.kiss_category,
            "kiss_selected_at": self.kiss_selected_at.isoformat() if self.kiss_selected_at else None,
            "final_timestamp": self.final_timestamp.isoformat() if self.final_timestamp else None,
            "visit_duration": round(self.visit_duration, 1) if self.visit_duration else 0.0
        }

class Activity(db.Model):
    __tablename__ = 'activities'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(100), db.ForeignKey('visitors.session_id'), nullable=False)
    event_name = db.Column(db.String(100), nullable=False)
    details = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=get_ist_now)

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "event_name": self.event_name,
            "details": self.details,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }

class AdminSettings(db.Model):
    __tablename__ = 'admin_settings'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=True)
