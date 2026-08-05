import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from backend.config import Config
from backend.database import init_db
from backend.routes import api

# Define path to frontend folder relative to root
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FRONTEND_DIR = os.path.join(ROOT_DIR, 'frontend')

def create_app():
    app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
    app.config.from_object(Config)

    # Set secret key for Flask session encryption (required for session-based admin auth)
    app.secret_key = Config.SECRET_KEY

    # Enable CORS for all routes
    CORS(app)

    # Initialize Database
    init_db(app)

    # Register API blueprint
    app.register_blueprint(api)

    # Serve Frontend Static Files
    @app.route('/')
    def serve_index():
        return send_from_directory(FRONTEND_DIR, 'index.html')

    @app.route('/<path:path>')
    def serve_static(path):
        if os.path.exists(os.path.join(FRONTEND_DIR, path)):
            return send_from_directory(FRONTEND_DIR, path)
        return send_from_directory(FRONTEND_DIR, 'index.html')

    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=Config.SECRET_KEY == "romantic_super_secret_key_2026")
