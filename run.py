#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Q Chat Manager - 主应用入口
"""
import os
from app import create_app, socketio
from app.utils.logger import setup_logging

# 获取配置环境
config_name = os.environ.get('FLASK_ENV', 'development')

# 获取端口配置
port = int(os.environ.get('PORT', 5001))

# 创建应用
app = create_app()

# 设置日志
setup_logging(app)

if __name__ == '__main__':
    # 开发环境使用socketio.run，生产环境使用gunicorn
    socketio.run(
        app, 
        host='0.0.0.0', 
        port=port, 
        debug=True,
        allow_unsafe_werkzeug=True
    )
