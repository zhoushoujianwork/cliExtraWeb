"""
目录浏览API
"""

import os
import json
from pathlib import Path
from flask import Blueprint, request, jsonify

directory_bp = Blueprint('directory', __name__)

@directory_bp.route('/api/browse-directory', methods=['POST'])
def browse_directory():
    """浏览目录内容"""
    try:
        data = request.get_json()
        path = data.get('path', os.getcwd())
        
        # 安全检查：确保路径存在且是目录
        if not os.path.exists(path):
            return jsonify({
                'success': False,
                'error': f'路径不存在: {path}'
            }), 400
            
        if not os.path.isdir(path):
            return jsonify({
                'success': False,
                'error': f'不是有效的目录: {path}'
            }), 400
        
        # 获取目录内容
        try:
            items = []
            for item in os.listdir(path):
                item_path = os.path.join(path, item)
                try:
                    is_dir = os.path.isdir(item_path)
                    items.append({
                        'name': item,
                        'path': item_path,
                        'is_directory': is_dir,
                        'size': os.path.getsize(item_path) if not is_dir else None,
                        'modified': os.path.getmtime(item_path)
                    })
                except (OSError, PermissionError):
                    # 跳过无法访问的项目
                    continue
            
            # 按类型和名称排序（目录在前）
            items.sort(key=lambda x: (not x['is_directory'], x['name'].lower()))
            
            return jsonify({
                'success': True,
                'path': path,
                'parent': os.path.dirname(path) if path != os.path.dirname(path) else None,
                'items': items
            })
            
        except PermissionError:
            return jsonify({
                'success': False,
                'error': f'没有权限访问目录: {path}'
            }), 403
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'浏览目录失败: {str(e)}'
        }), 500

@directory_bp.route('/api/validate-path', methods=['POST'])
def validate_path():
    """验证路径是否有效"""
    try:
        data = request.get_json()
        path = data.get('path', '')
        
        if not path:
            return jsonify({
                'success': False,
                'error': '路径不能为空'
            })
        
        # 展开用户目录和环境变量
        expanded_path = os.path.expanduser(os.path.expandvars(path))
        
        # 检查路径是否存在
        if not os.path.exists(expanded_path):
            return jsonify({
                'success': False,
                'error': f'路径不存在: {expanded_path}',
                'expanded_path': expanded_path
            })
        
        # 检查是否是目录
        if not os.path.isdir(expanded_path):
            return jsonify({
                'success': False,
                'error': f'不是有效的目录: {expanded_path}',
                'expanded_path': expanded_path
            })
        
        # 检查权限
        if not os.access(expanded_path, os.R_OK):
            return jsonify({
                'success': False,
                'error': f'没有读取权限: {expanded_path}',
                'expanded_path': expanded_path
            })
        
        return jsonify({
            'success': True,
            'path': path,
            'expanded_path': expanded_path,
            'absolute_path': os.path.abspath(expanded_path)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'验证路径失败: {str(e)}'
        })

@directory_bp.route('/api/get-home-directory', methods=['GET'])
def get_home_directory():
    """获取用户主目录"""
    try:
        home_dir = os.path.expanduser('~')
        current_dir = os.getcwd()
        
        # 常用目录建议
        common_dirs = []
        
        # 添加主目录
        if os.path.exists(home_dir):
            common_dirs.append({
                'name': '主目录',
                'path': home_dir,
                'icon': 'fas fa-home'
            })
        
        # 添加桌面目录
        desktop_dir = os.path.join(home_dir, 'Desktop')
        if os.path.exists(desktop_dir):
            common_dirs.append({
                'name': '桌面',
                'path': desktop_dir,
                'icon': 'fas fa-desktop'
            })
        
        # 添加文档目录
        documents_dir = os.path.join(home_dir, 'Documents')
        if os.path.exists(documents_dir):
            common_dirs.append({
                'name': '文档',
                'path': documents_dir,
                'icon': 'fas fa-file-alt'
            })
        
        # 添加下载目录
        downloads_dir = os.path.join(home_dir, 'Downloads')
        if os.path.exists(downloads_dir):
            common_dirs.append({
                'name': '下载',
                'path': downloads_dir,
                'icon': 'fas fa-download'
            })
        
        return jsonify({
            'success': True,
            'home_directory': home_dir,
            'current_directory': current_dir,
            'common_directories': common_dirs
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'获取主目录失败: {str(e)}'
        })
