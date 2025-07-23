# -*- coding: utf-8 -*-
"""
Q Chat Manager Flask Application
"""
from flask import Flask
from flask_socketio import SocketIO
from config.config import Config

socketio = SocketIO()

def create_app(config_class=Config):
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    socketio.init_app(app, cors_allowed_origins="*")
    
    # Register blueprints
    from app.views.main import bp as main_bp
    from app.views.api import bp as api_bp
    from app.views.websocket import bp as ws_bp
    from app.views.workflow_api import bp as workflow_api_bp
    from app.views.terminal_api import bp as terminal_api_bp
    from app.views.image_api import bp as image_api_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(ws_bp)
    app.register_blueprint(workflow_api_bp)
    app.register_blueprint(terminal_api_bp)
    app.register_blueprint(image_api_bp, url_prefix='/api')
    
    # 应用启动时同步tmux实例
    with app.app_context():
        from app.services.instance_manager import instance_manager
        from app.services.web_terminal import web_terminal_manager
        import threading
        import time
        
        def startup_sync():
            time.sleep(1)  # Wait for app to fully start
            print("Syncing tmux instances on startup...")
            instance_manager.sync_screen_instances()
            time.sleep(2)
            instances = instance_manager.get_instances()
            print("Found {} existing tmux instances".format(len(instances)))
            for inst in instances:
                print("   - {}: {}".format(inst['id'], inst['status']))
            
            # Clean up any remaining Web terminal resources
            print("Cleaning up Web terminal resources...")
            web_terminal_manager.cleanup_all()
        
        # Execute sync in background thread
        sync_thread = threading.Thread(target=startup_sync, daemon=True)
        sync_thread.start()
    
    return app
