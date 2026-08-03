import logging
from backend.config import Config

logger = logging.getLogger(__name__)

def send_email_notification(subject, html_content):
    """
    Send an email via Resend API.
    If RESEND_API_KEY or TO_EMAIL is not configured, logs the email content safely.
    """
    api_key = Config.RESEND_API_KEY
    to_email = Config.TO_EMAIL
    from_email = Config.FROM_EMAIL

    if not api_key or not to_email:
        logger.info(f"[Email Notification Skipped - Missing Credentials] Subject: {subject}")
        logger.debug(f"HTML Content:\n{html_content}")
        return False

    try:
        import resend
        resend.api_key = api_key
        
        params = {
            "from": from_email,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }

        email_response = resend.Emails.send(params)
        logger.info(f"[Email Sent Successfully via Resend] ID: {email_response}")
        return True
    except Exception as e:
        logger.error(f"[Failed to Send Resend Email]: {str(e)}")
        return False


def build_email_wrapper(title, key_value_pairs):
    """Build a styled, responsive romantic HTML email."""
    rows = ""
    for label, val in key_value_pairs.items():
        rows += f"""
        <tr>
            <td style="padding: 10px 14px; font-weight: bold; color: #ff69b4; border-bottom: 1px solid #3a1c3a; width: 35%;">{label}</td>
            <td style="padding: 10px 14px; color: #fce4ec; border-bottom: 1px solid #3a1c3a;">{val}</td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #120514; margin: 0; padding: 20px; color: #fce4ec; }}
        .card {{ max-width: 550px; margin: 0 auto; background: #230926; border-radius: 16px; border: 1px solid #ff4081; padding: 24px; box-shadow: 0 10px 30px rgba(255,64,129,0.3); }}
        .header {{ text-align: center; border-bottom: 2px solid #ff4081; padding-bottom: 15px; margin-bottom: 20px; }}
        .header h2 {{ color: #ff4081; margin: 0; font-size: 24px; letter-spacing: 1px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
        .footer {{ text-align: center; margin-top: 25px; font-size: 12px; color: #f48fb1; opacity: 0.8; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2>💖 {title} 💖</h2>
        </div>
        <table>
          {rows}
        </table>
        <div class="footer">
          <p>Romantic Interactive App Notification System</p>
        </div>
      </div>
    </body>
    </html>
    """
    return html


def send_new_visitor_email(visitor):
    """Trigger email notification when a new visitor arrives."""
    subject = "New Romantic Visitor 💖"
    pairs = {
        "Session ID": visitor.session_id,
        "Visit Time": visitor.visit_timestamp.strftime("%Y-%m-%d %H:%M:%S UTC") if visitor.visit_timestamp else "N/A",
        "Greeting": visitor.greeting or "N/A",
        "Word (Adjective)": visitor.adjective or "N/A",
        "Browser": visitor.browser,
        "Operating System": visitor.operating_system,
        "Device": visitor.device_type,
        "Screen": visitor.screen_resolution,
        "IP Address": visitor.ip_address,
        "Country": visitor.country
    }
    html = build_email_wrapper("New Visitor Alert", pairs)
    return send_email_notification(subject, html)


def send_yes_clicked_email(visitor):
    """Trigger email notification when YES button is clicked."""
    subject = "Someone Clicked YES 💖"
    pairs = {
        "Status": "YES Button Clicked!",
        "Time": visitor.yes_clicked_at.strftime("%Y-%m-%d %H:%M:%S UTC") if visitor.yes_clicked_at else "N/A",
        "Session ID": visitor.session_id,
        "IP Address": visitor.ip_address,
        "Country": visitor.country,
        "Browser": visitor.browser,
        "Device": visitor.device_type,
        "Greeting Displayed": visitor.greeting or "N/A",
        "Selected Adjective": visitor.adjective or "N/A",
        "NO Attempt Count": visitor.no_attempt_count
    }
    html = build_email_wrapper("YES Button Clicked!", pairs)
    return send_email_notification(subject, html)


def send_kiss_selected_email(visitor, kiss_choice):
    """Trigger email notification when a Kiss option is selected."""
    subject = f"Kiss Selection 💋 - {kiss_choice}"
    pairs = {
        "Selected Kiss Option": f"💋 {kiss_choice}",
        "Date & Time": visitor.kiss_selected_at.strftime("%Y-%m-%d %H:%M:%S UTC") if visitor.kiss_selected_at else "N/A",
        "Session ID": visitor.session_id,
        "Greeting": visitor.greeting or "N/A",
        "IP Address": visitor.ip_address,
        "Browser": visitor.browser,
        "Device": visitor.device_type
    }
    html = build_email_wrapper(f"Kiss Selected: {kiss_choice}", pairs)
    return send_email_notification(subject, html)


def send_visit_completed_email(visitor):
    """Trigger email notification when the visit completes on the final screen."""
    subject = "Visit Completed 💕"
    pairs = {
        "Session ID": visitor.session_id,
        "Visit Duration": f"{round(visitor.visit_duration, 1)} seconds",
        "YES Clicked": "Yes" if visitor.yes_clicked else "No",
        "Kiss Selected": visitor.kiss_category or "None",
        "NO Attempt Count": visitor.no_attempt_count,
        "Country": visitor.country,
        "Device": visitor.device_type
    }
    html = build_email_wrapper("Visit Completed", pairs)
    return send_email_notification(subject, html)
