# -*- coding: utf-8 -*-
"""
Image upload API for Q Chat Manager
"""
from flask import Blueprint, request, jsonify
import logging
import os
import time

bp = Blueprint('image_api', __name__)
logger = logging.getLogger(__name__)

@bp.route('/upload-image', methods=['POST'])
def upload_image():
    """上传图片到临时目录"""
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
        
        # 创建临时目录
        temp_dir = os.path.join(os.getcwd(), 'temp_images')
        os.makedirs(temp_dir, exist_ok=True)
        
        # 生成文件名
        filename = request.form.get('filename')
        if not filename:
            timestamp = int(time.time())
            filename = 'temp_image_{}.{}'.format(timestamp, file_extension)
        
        # 保存文件
        file_path = os.path.join(temp_dir, filename)
        file.save(file_path)
        
        logger.info("图片上传成功: {}".format(file_path))
        
        return jsonify({
            'success': True,
            'path': file_path,
            'filename': filename,
            'message': '图片上传成功'
        })
        
    except Exception as e:
        logger.error("图片上传失败: {}".format(str(e)))
        return jsonify({
            'success': False,
            'error': '上传失败: {}'.format(str(e))
        }), 500
