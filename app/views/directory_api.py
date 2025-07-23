"""
目录浏览API
"""

import os
import json
import subprocess
import logging
from pathlib import Path
from flask import Blueprint, request, jsonify

logger = logging.getLogger(__name__)

directory_bp = Blueprint('directory', __name__)

@directory_bp.route('/api/directory/select', methods=['POST'])
def select_directory():
    """打开系统目录选择对话框"""
    try:
        # 使用AppleScript在macOS上打开目录选择对话框
        applescript = '''
        tell application "System Events"
            set selectedFolder to choose folder with prompt "选择项目目录"
            return POSIX path of selectedFolder
        end tell
        '''
        
        # 增加超时时间到5分钟，给用户足够时间选择
        result = subprocess.run(
            ['osascript', '-e', applescript],
            capture_output=True, text=True, timeout=300
        )
        
        if result.returncode == 0:
            selected_path = result.stdout.strip()
            
            # 验证路径是否存在
            if os.path.exists(selected_path) and os.path.isdir(selected_path):
                # 获取绝对路径
                abs_path = os.path.abspath(selected_path)
                
                logger.info(f'用户选择目录: {abs_path}')
                
                return jsonify({
                    'success': True,
                    'path': abs_path,
                    'directory_name': os.path.basename(abs_path),
                    'parent_path': os.path.dirname(abs_path)
                })
            else:
                logger.error(f'选择的路径无效: {selected_path}')
                return jsonify({
                    'success': False,
                    'error': '选择的路径不存在或不是目录'
                }), 400
        else:
            # 检查是否是用户取消
            stderr_output = result.stderr.strip() if result.stderr else ''
            
            if 'User canceled' in stderr_output or result.returncode == 1:
                logger.info('用户取消了目录选择')
                return jsonify({
                    'success': False,
                    'error': '用户取消选择',
                    'cancelled': True
                }), 400
            else:
                logger.error(f'AppleScript执行失败: returncode={result.returncode}, stderr={stderr_output}')
                return jsonify({
                    'success': False,
                    'error': f'目录选择失败: {stderr_output or "未知错误"}'
                }), 400
            
    except subprocess.TimeoutExpired:
        logger.error('目录选择超时 - 用户可能需要更多时间')
        return jsonify({
            'success': False,
            'error': '目录选择超时，请重试或手动输入路径',
            'timeout': True
        }), 408
    except FileNotFoundError:
        logger.error('osascript命令不存在 - 可能不是macOS系统')
        return jsonify({
            'success': False,
            'error': '系统不支持目录选择对话框，请手动输入路径',
            'unsupported': True
        }), 400
    except Exception as e:
        logger.error(f'目录选择异常: {e}')
        return jsonify({
            'success': False,
            'error': f'目录选择失败: {str(e)}'
        }), 500

@directory_bp.route('/api/directory/validate', methods=['POST'])
def validate_directory():
    """验证目录路径并返回绝对路径"""
    try:
        data = request.get_json()
        path = data.get('path', '').strip()
        
        if not path:
            return jsonify({
                'success': False,
                'error': '路径不能为空'
            }), 400
        
        # 展开用户目录符号
        expanded_path = os.path.expanduser(path)
        
        # 获取绝对路径
        abs_path = os.path.abspath(expanded_path)
        
        # 检查路径是否存在
        if not os.path.exists(abs_path):
            return jsonify({
                'success': False,
                'error': f'路径不存在: {abs_path}',
                'suggested_path': abs_path
            }), 400
        
        # 检查是否是目录
        if not os.path.isdir(abs_path):
            return jsonify({
                'success': False,
                'error': f'路径不是目录: {abs_path}',
                'suggested_path': abs_path
            }), 400
        
        # 检查是否可读
        if not os.access(abs_path, os.R_OK):
            return jsonify({
                'success': False,
                'error': f'目录不可读: {abs_path}',
                'suggested_path': abs_path
            }), 400
        
        return jsonify({
            'success': True,
            'path': abs_path,
            'directory_name': os.path.basename(abs_path),
            'parent_path': os.path.dirname(abs_path),
            'exists': True,
            'readable': True
        })
        
    except Exception as e:
        logger.error(f'验证目录失败: {e}')
        return jsonify({
            'success': False,
            'error': f'验证目录失败: {str(e)}'
        }), 500

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
