"""
项目配置API
"""

import os
from flask import Blueprint, request, jsonify
from app.services.project_config import project_config
import logging

logger = logging.getLogger(__name__)

config_bp = Blueprint('config', __name__)

@config_bp.route('/api/config', methods=['GET'])
def get_config():
    """获取项目配置"""
    try:
        config_summary = project_config.get_config_summary()
        return jsonify({
            'success': True,
            'config': config_summary
        })
    except Exception as e:
        logger.error(f'获取配置失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@config_bp.route('/api/config/projects-dir', methods=['GET'])
def get_projects_dir():
    """获取默认项目目录"""
    try:
        projects_dir = project_config.get_default_projects_dir()
        
        # 确保返回绝对路径
        abs_projects_dir = os.path.abspath(os.path.expanduser(projects_dir))
        
        return jsonify({
            'success': True,
            'projects_dir': abs_projects_dir,
            'exists': os.path.exists(abs_projects_dir),
            'writable': os.access(abs_projects_dir, os.W_OK) if os.path.exists(abs_projects_dir) else False,
            'is_absolute': os.path.isabs(abs_projects_dir)
        })
    except Exception as e:
        logger.error(f'获取项目目录失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@config_bp.route('/api/config/projects-dir', methods=['POST'])
def set_projects_dir():
    """设置默认项目目录"""
    try:
        data = request.get_json() or {}
        new_path = data.get('path', '').strip()
        
        if not new_path:
            return jsonify({
                'success': False,
                'error': '路径不能为空'
            }), 400
        
        # 验证并设置路径
        project_config.set_default_projects_dir(new_path)
        
        return jsonify({
            'success': True,
            'message': f'默认项目目录已设置为: {new_path}',
            'projects_dir': project_config.get_default_projects_dir()
        })
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        logger.error(f'设置项目目录失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@config_bp.route('/api/config/git-settings', methods=['GET'])
def get_git_settings():
    """获取Git相关设置"""
    try:
        return jsonify({
            'success': True,
            'settings': {
                'clone_timeout': project_config.get_git_clone_timeout(),
                'naming_strategy': project_config.get_git_clone_naming(),
                'auto_create_dir': project_config.get('auto_create_projects_dir', True)
            }
        })
    except Exception as e:
        logger.error(f'获取Git设置失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@config_bp.route('/api/config/git-settings', methods=['POST'])
def set_git_settings():
    """设置Git相关设置"""
    try:
        data = request.get_json() or {}
        
        # 设置克隆超时时间
        if 'clone_timeout' in data:
            timeout = int(data['clone_timeout'])
            project_config.set_git_clone_timeout(timeout)
        
        # 设置命名策略
        if 'naming_strategy' in data:
            naming = data['naming_strategy']
            project_config.set_git_clone_naming(naming)
        
        # 设置自动创建目录
        if 'auto_create_dir' in data:
            auto_create = bool(data['auto_create_dir'])
            project_config.set('auto_create_projects_dir', auto_create)
        
        return jsonify({
            'success': True,
            'message': 'Git设置已更新',
            'settings': {
                'clone_timeout': project_config.get_git_clone_timeout(),
                'naming_strategy': project_config.get_git_clone_naming(),
                'auto_create_dir': project_config.get('auto_create_projects_dir', True)
            }
        })
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        logger.error(f'设置Git配置失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@config_bp.route('/api/config/cliextra-info', methods=['GET'])
def get_cliextra_info():
    """获取cliExtra配置信息"""
    try:
        import subprocess
        
        # 获取cliExtra配置
        result = subprocess.run(
            ['cliExtra', 'config', 'show'],
            capture_output=True, text=True, timeout=10
        )
        
        if result.returncode != 0:
            return jsonify({
                'success': False,
                'error': 'cliExtra配置获取失败'
            }), 500
        
        # 解析配置输出
        config_info = {}
        lines = result.stdout.split('\n')
        
        for line in lines:
            if ':' in line and not line.startswith('==='):
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip()
                
                if key in ['工作目录', '配置文件', '工具源目录', '规则源目录']:
                    config_info[key] = value
                elif key in ['Namespaces', 'Projects', 'Logs', 'Cache']:
                    config_info[key] = value
        
        return jsonify({
            'success': True,
            'cliextra_config': config_info,
            'projects_dir': config_info.get('Projects', ''),
            'working_dir': config_info.get('工作目录', ''),
            'raw_output': result.stdout
        })
        
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': 'cliExtra配置获取超时'
        }), 500
    except Exception as e:
        logger.error(f'获取cliExtra配置失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
def validate_git_url():
    """验证Git URL"""
    try:
        data = request.get_json() or {}
        git_url = data.get('url', '').strip()
        
        if not git_url:
            return jsonify({
                'success': False,
                'error': 'Git URL不能为空'
            })
        
        # 基本URL格式验证
        import re
        git_patterns = [
            r'^https?://.*\.git$',  # HTTPS
            r'^git@.*:.*\.git$',    # SSH
            r'^https?://github\.com/.+/.+$',  # GitHub HTTPS (可能没有.git后缀)
            r'^https?://gitlab\.com/.+/.+$',  # GitLab HTTPS
            r'^https?://bitbucket\.org/.+/.+$'  # Bitbucket HTTPS
        ]
        
        is_valid = any(re.match(pattern, git_url) for pattern in git_patterns)
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': 'Git URL格式不正确'
            })
        
        # 解析仓库名
        from urllib.parse import urlparse
        if git_url.endswith('.git'):
            repo_name = os.path.basename(git_url)[:-4]
        else:
            repo_name = os.path.basename(urlparse(git_url).path)
        
        return jsonify({
            'success': True,
            'repo_name': repo_name,
            'url': git_url,
            'message': 'Git URL格式正确'
        })
        
    except Exception as e:
        logger.error(f'验证Git URL失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
