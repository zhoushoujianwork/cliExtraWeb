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
    
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(ws_bp)
    
    # 应用启动时同步tmux实例
    with app.app_context():
        from app.services.instance_manager import instance_manager
        from app.services.web_terminal import web_terminal_manager
        import threading
        import time
        
        def startup_sync():
            time.sleep(1)  # 等待应用完全启动
            print("🔄 启动时同步tmux实例...")
            instance_manager.sync_screen_instances()
            time.sleep(2)
            instances = instance_manager.get_instances()
            print(f"✅ 发现 {len(instances)} 个已存在的tmux实例")
            for inst in instances:
                print(f"   - {inst['id']}: {inst['status']}")
            
            # 清理可能残留的Web终端
            print("🧹 清理Web终端资源...")
            web_terminal_manager.cleanup_all()
        
        # 在后台线程中执行同步
        sync_thread = threading.Thread(target=startup_sync, daemon=True)
        sync_thread.start()
    
    return app
