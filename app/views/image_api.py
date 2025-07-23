# -*- coding: utf-8 -*-
"""
Image upload API for Q Chat Manager
"""
from flask import Blueprint, request, jsonify
import logging
import os
import time
from app.services.instance_manager import instance_manager

bp = Blueprint('image_api', __name__)
logger = logging.getLogger(__name__)

@bp.route('/upload-image', methods=['POST'])
def upload_image():
    """上传图片到聊天记录目录"""
    try:
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': '没有找到图片文件'
            }), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': '没有选择文件'
            }), 400
        
        # 检查文件类型
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
        file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_extension not in allowed_extensions:
            return jsonify({
                'success': False,
                'error': '不支持的文件类型: {}'.format(file_extension)
            }), 400
        
        # 获取namespace参数
        namespace = request.form.get('namespace', 'default')
        
        # 创建图片存储目录 - 存储到聊天记录同目录下的images子目录
        conversations_dir = instance_manager.get_namespace_conversations_dir(namespace)
        images_dir = os.path.join(conversations_dir, 'images')
        os.makedirs(images_dir, exist_ok=True)
        
        # 生成文件名
        filename = request.form.get('filename')
        if not filename:
            timestamp = int(time.time() * 1000)  # 使用毫秒时间戳
            filename = 'image_{}_{}.{}'.format(timestamp, os.getpid(), file_extension)
        
        # 保存文件
        file_path = os.path.join(images_dir, filename)
        file.save(file_path)
        
        # 生成相对路径用于前端访问
        relative_path = os.path.join('namespaces', namespace, 'conversations', 'images', filename)
        
        logger.info("图片上传成功: {}".format(file_path))
        
        return jsonify({
            'success': True,
            'path': file_path,
            'relative_path': relative_path,
            'filename': filename,
            'namespace': namespace,
            'url': '/static/data/{}'.format(relative_path),  # 用于前端显示的URL
            'message': '图片上传成功'
        })
        
    except Exception as e:
        logger.error("图片上传失败: {}".format(str(e)))
        return jsonify({
            'success': False,
            'error': '上传失败: {}'.format(str(e))
        }), 500

@bp.route('/image/<namespace>/<filename>')
def serve_image(namespace, filename):
    """提供图片访问服务"""
    try:
        conversations_dir = instance_manager.get_namespace_conversations_dir(namespace)
        images_dir = os.path.join(conversations_dir, 'images')
        file_path = os.path.join(images_dir, filename)
        
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': '图片不存在'
            }), 404
        
        from flask import send_file
        return send_file(file_path)
        
    except Exception as e:
        logger.error("图片访问失败: {}".format(str(e)))
        return jsonify({
            'success': False,
            'error': '访问失败: {}'.format(str(e))
        }), 500
