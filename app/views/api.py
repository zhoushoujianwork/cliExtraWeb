"""
API endpoints for Q Chat Manager
"""
from flask import Blueprint, request, jsonify
import logging
import subprocess

from app.services.instance_manager import instance_manager
from app.services.chat_manager import chat_manager
from app.services.role_manager import role_manager

bp = Blueprint('api', __name__)
logger = logging.getLogger(__name__)

@bp.route('/instances', methods=['GET'])
def get_instances():
    """获取所有实例"""
    try:
        # 同步tmux实例状态
        instance_manager.sync_screen_instances()
        
        instances = instance_manager.get_instances()
        return jsonify({'success': True, 'instances': instances})
    except Exception as e:
        logger.error(f"获取实例列表失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/start-with-config', methods=['POST'])
def start_instance_with_config():
    """启动带配置的实例"""
    try:
        data = request.get_json() or {}
        name = data.get('name', '').strip()
        path = data.get('path', '').strip()
        role = data.get('role', '').strip()
        namespace = data.get('namespace', '').strip()
        
        result = instance_manager.create_instance_with_config(
            name=name if name else None,
            path=path if path else None,
            role=role if role else None,
            namespace=namespace if namespace else None
        )
        
        if result['success']:
            instance_id = result.get('instance_id', name or 'unknown')
            chat_manager.add_system_log(f'实例 {instance_id} 启动成功')
            if namespace:
                chat_manager.add_system_log(f'实例 {instance_id} 已设置namespace: {namespace}')
            if role:
                chat_manager.add_system_log(f'实例 {instance_id} 已应用角色: {role}')
        else:
            chat_manager.add_system_log(f'实例启动失败: {result["error"]}')
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"启动配置实例失败: {str(e)}")
        error_msg = f'启动实例失败: {str(e)}'
        chat_manager.add_system_log(error_msg)
        return jsonify({'success': False, 'error': error_msg}), 500

# 添加标准的实例创建API
@bp.route('/instances', methods=['POST'])
def create_instance():
    """创建新实例（标准RESTful API）"""
    try:
        data = request.get_json() or {}
        name = data.get('name', '').strip()
        path = data.get('path', '').strip()
        role = data.get('role', '').strip()
        namespace = data.get('namespace', '').strip()
        
        result = instance_manager.create_instance_with_config(
            name=name if name else None,
            path=path if path else None,
            role=role if role else None,
            namespace=namespace if namespace else None
        )
        
        if result['success']:
            instance_id = result.get('instance_id', name or 'unknown')
            chat_manager.add_system_log(f'实例 {instance_id} 创建成功')
            if namespace:
                chat_manager.add_system_log(f'实例 {instance_id} 已设置namespace: {namespace}')
            if role:
                chat_manager.add_system_log(f'实例 {instance_id} 已应用角色: {role}')
        else:
            chat_manager.add_system_log(f'实例创建失败: {result["error"]}')
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"创建实例失败: {str(e)}")
        error_msg = f'创建实例失败: {str(e)}'
        chat_manager.add_system_log(error_msg)
        return jsonify({'success': False, 'error': error_msg}), 500

@bp.route('/start/<instance_id>', methods=['POST'])
def start_instance(instance_id):
    """启动实例（兼容旧版本）"""
    try:
        result = instance_manager.create_instance(instance_id)
        if result['success']:
            chat_manager.add_system_log(f'tmux实例 {instance_id} 启动成功')
        else:
            chat_manager.add_system_log(f'tmux实例 {instance_id} 启动失败: {result["error"]}')
        return jsonify(result)
    except Exception as e:
        logger.error(f"启动tmux实例 {instance_id} 失败: {str(e)}")
        error_msg = f'启动tmux实例失败: {str(e)}'
        chat_manager.add_system_log(error_msg)
        return jsonify({'success': False, 'error': error_msg}), 500

@bp.route('/stop/<instance_id>', methods=['POST'])
def stop_instance(instance_id):
    """停止实例"""
    try:
        result = instance_manager.stop_instance(instance_id)
        if result['success']:
            chat_manager.add_system_log(f'tmux实例 {instance_id} 已停止')
        else:
            chat_manager.add_system_log(f'停止tmux实例 {instance_id} 失败: {result["error"]}')
        return jsonify(result)
    except Exception as e:
        logger.error(f"停止tmux实例 {instance_id} 失败: {str(e)}")
        error_msg = f'停止tmux实例失败: {str(e)}'
        chat_manager.add_system_log(error_msg)
        return jsonify({'success': False, 'error': error_msg}), 500

@bp.route('/send', methods=['POST'])
def send_message():
    """发送消息到实例"""
    try:
        data = request.get_json()
        instance_id = data.get('instance_id')
        message = data.get('message')
        
        if not instance_id or not message:
            return jsonify({'success': False, 'error': '缺少必要参数'}), 400
        
        result = instance_manager.send_message(instance_id, message)
        
        if result['success']:
            # 记录用户消息到聊天历史
            chat_manager.add_chat_message('user', message, instance_id)
        else:
            chat_manager.add_system_log(f'向tmux实例 {instance_id} 发送消息失败: {result["error"]}')
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"发送消息失败: {str(e)}")
        error_msg = f'发送消息失败: {str(e)}'
        chat_manager.add_system_log(error_msg)
        return jsonify({'success': False, 'error': error_msg}), 500

@bp.route('/clean', methods=['POST'])
def clean_all():
    """清理所有实例"""
    try:
        result = instance_manager.clean_all_instances()
        chat_manager.add_system_log(result['message'])
        return jsonify(result)
    except Exception as e:
        logger.error(f"清理tmux实例失败: {str(e)}")
        error_msg = f'清理tmux实例失败: {str(e)}'
        chat_manager.add_system_log(error_msg)
        return jsonify({'success': False, 'error': error_msg}), 500

@bp.route('/chat/history', methods=['GET'])
def get_chat_history():
    """获取聊天历史"""
    try:
        limit = request.args.get('limit', type=int)
        history = chat_manager.get_chat_history(limit=limit)
        return jsonify({'success': True, 'history': history})
    except Exception as e:
        logger.error(f"获取聊天历史失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/logs/system', methods=['GET'])
def get_system_logs():
    """获取系统日志"""
    try:
        limit = request.args.get('limit', type=int)
        logs = chat_manager.get_system_logs(limit=limit)
        return jsonify({'success': True, 'logs': logs})
    except Exception as e:
        logger.error(f"获取系统日志失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/chat/clear', methods=['POST'])
def clear_chat():
    """清空聊天历史"""
    try:
        chat_manager.clear_chat_history()
        chat_manager.add_system_log('聊天历史已清空')
        return jsonify({'success': True, 'message': '聊天历史已清空'})
    except Exception as e:
        logger.error(f"清空聊天历史失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/logs/clear', methods=['POST'])
def clear_logs():
    """清空系统日志"""
    try:
        chat_manager.clear_system_logs()
        chat_manager.add_system_log('系统日志已清空')
        return jsonify({'success': True, 'message': '系统日志已清空'})
    except Exception as e:
        logger.error(f"清空系统日志失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/instances/<instance_id>/session-info', methods=['GET'])
def get_instance_session_info(instance_id):
    """获取实例的tmux会话信息"""
    try:
        # 使用cliExtra获取实例详细信息
        result = subprocess.run(
            ['cliExtra', 'list', instance_id, '--json'],
            capture_output=True, text=True, timeout=10
        )
        
        if result.returncode == 0:
            import json
            data = json.loads(result.stdout.strip())
            instance_data = data.get('instance', {})
            
            if instance_data:
                return jsonify({
                    'success': True,
                    'instance_id': instance_id,
                    'session': instance_data.get('session', ''),
                    'status': instance_data.get('status', ''),
                    'project_dir': instance_data.get('project_dir', ''),
                    'attach_command': data.get('commands', {}).get('attach', '')
                })
            else:
                return jsonify({
                    'success': False,
                    'error': f'实例 {instance_id} 不存在'
                }), 404
        else:
            return jsonify({
                'success': False,
                'error': f'获取实例信息失败: {result.stderr}'
            }), 500
            
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': '获取实例信息超时'
        }), 500
    except Exception as e:
        logger.error(f'获取实例 {instance_id} 会话信息失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Namespace管理API
@bp.route('/namespaces', methods=['GET'])
def get_namespaces():
    """获取所有namespace列表"""
    try:
        result = subprocess.run(
            ['cliExtra', 'ns', 'show', '--json'],
            capture_output=True, text=True, timeout=10
        )
        
        if result.returncode == 0:
            import json
            data = json.loads(result.stdout.strip())
            return jsonify({
                'success': True,
                'namespaces': data.get('namespaces', [])
            })
        else:
            return jsonify({
                'success': False,
                'error': f'获取namespace列表失败: {result.stderr}'
            }), 500
            
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': '获取namespace列表超时'
        }), 500
    except Exception as e:
        logger.error(f'获取namespace列表失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/namespaces', methods=['POST'])
def create_namespace():
    """创建新的namespace"""
    try:
        data = request.get_json()
        namespace_name = data.get('name', '').strip()
        
        if not namespace_name:
            return jsonify({
                'success': False,
                'error': 'namespace名称不能为空'
            }), 400
        
        result = subprocess.run(
            ['cliExtra', 'ns', 'create', namespace_name],
            capture_output=True, text=True, timeout=10
        )
        
        if result.returncode == 0:
            return jsonify({
                'success': True,
                'message': f'namespace {namespace_name} 创建成功'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'创建namespace失败: {result.stderr}'
            }), 500
            
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': '创建namespace超时'
        }), 500
    except Exception as e:
        logger.error(f'创建namespace失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/namespaces/<namespace_name>', methods=['DELETE'])
def delete_namespace(namespace_name):
    """删除namespace"""
    try:
        force = request.args.get('force', 'false').lower() == 'true'
        
        cmd = ['cliExtra', 'ns', 'delete', namespace_name]
        if force:
            cmd.append('--force')
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            return jsonify({
                'success': True,
                'message': f'namespace {namespace_name} 删除成功'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'删除namespace失败: {result.stderr}'
            }), 500
            
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': '删除namespace超时'
        }), 500
    except Exception as e:
        logger.error(f'删除namespace失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/instances/<instance_id>/namespace', methods=['PUT'])
def update_instance_namespace(instance_id):
    """修改实例的namespace"""
    try:
        data = request.get_json()
        new_namespace = data.get('namespace', '').strip()
        
        # 如果namespace为空，使用"default"作为默认值
        if not new_namespace:
            new_namespace = 'default'
        
        result = subprocess.run(
            ['cliExtra', 'set-ns', instance_id, new_namespace],
            capture_output=True, text=True, timeout=10
        )
        
        if result.returncode == 0:
            display_namespace = new_namespace if new_namespace != 'default' else '默认'
            return jsonify({
                'success': True,
                'message': f'实例 {instance_id} 的namespace已更新为 {display_namespace}'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'更新实例namespace失败: {result.stderr.strip()}'
            }), 500
            
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': '更新实例namespace超时'
        }), 500
    except Exception as e:
        logger.error(f'更新实例namespace失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
        return jsonify({
            'success': False,
            'error': '更新实例namespace超时'
        }), 500
    except Exception as e:
        logger.error(f'更新实例namespace失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/attach/<instance_id>', methods=['GET'])
def get_attach_info(instance_id):
    """获取接管实例的命令信息"""
    try:
        result = instance_manager.attach_to_instance(instance_id)
        return jsonify(result)
    except Exception as e:
        logger.error(f"获取接管信息失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/status/<instance_id>', methods=['GET'])
def get_instance_status(instance_id):
    """获取实例详细状态"""
    try:
        result = instance_manager.get_instance_status(instance_id)
        return jsonify(result)
    except Exception as e:
        logger.error(f"获取实例状态失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/terminal/create/<instance_id>', methods=['POST'])
def create_web_terminal(instance_id):
    """创建Web终端"""
    try:
        from app.services.web_terminal import web_terminal_manager
        
        # 检查实例是否存在
        instance = instance_manager.get_instance(instance_id)
        if not instance:
            return jsonify({'success': False, 'error': f'实例 {instance_id} 不存在'}), 404
        
        # 创建Web终端的输出回调将通过WebSocket处理
        def output_callback(inst_id, output):
            from app import socketio
            socketio.emit('terminal_output', {
                'instance_id': inst_id,
                'output': output
            }, room=f'terminal_{inst_id}')
        
        success = web_terminal_manager.create_terminal(instance_id, output_callback)
        
        if success:
            chat_manager.add_system_log(f'Web终端已创建: 实例{instance_id}')
            return jsonify({'success': True, 'message': 'Web终端创建成功'})
        else:
            return jsonify({'success': False, 'error': 'Web终端创建失败'}), 500
            
    except Exception as e:
        logger.error(f"创建Web终端失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/terminal/detach/<instance_id>', methods=['POST'])
def detach_web_terminal(instance_id):
    """分离Web终端（保持tmux会话运行）"""
    try:
        from app.services.web_terminal import web_terminal_manager
        
        success = web_terminal_manager.detach_terminal(instance_id)
        
        if success:
            chat_manager.add_system_log(f'Web终端已分离: 实例{instance_id}')
            return jsonify({'success': True, 'message': 'Web终端已分离，Screen会话继续运行'})
        else:
            return jsonify({'success': False, 'error': 'Web终端分离失败'}), 500
            
    except Exception as e:
        logger.error(f"分离Web终端失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/terminal/terminate/<instance_id>', methods=['POST'])
def terminate_web_terminal(instance_id):
    """终止Web终端连接"""
    try:
        from app.services.web_terminal import web_terminal_manager
        
        success = web_terminal_manager.terminate_terminal(instance_id)
        
        if success:
            chat_manager.add_system_log(f'Web终端已终止: 实例{instance_id}')
            return jsonify({'success': True, 'message': 'Web终端连接已终止'})
        else:
            return jsonify({'success': False, 'error': 'Web终端终止失败'}), 500
            
    except Exception as e:
        logger.error(f"终止Web终端失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== 角色管理 API ====================

@bp.route('/roles', methods=['GET'])
def get_available_roles():
    """获取所有可用角色"""
    try:
        roles = role_manager.list_available_roles()
        return jsonify({'success': True, 'roles': roles})
    except Exception as e:
        logger.error(f"获取角色列表失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/roles/<role_name>', methods=['GET'])
def get_role_content(role_name):
    """获取角色内容"""
    try:
        content = role_manager.get_role_content(role_name)
        if content is not None:
            return jsonify({'success': True, 'content': content})
        else:
            return jsonify({'success': False, 'error': f'角色 {role_name} 不存在'}), 404
    except Exception as e:
        logger.error(f"获取角色内容失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/project/role', methods=['GET'])
def get_project_role():
    """获取当前项目的角色"""
    try:
        project_path = request.args.get('path', '.')
        role_info = role_manager.get_project_roles_info(project_path)
        return jsonify({'success': True, 'role_info': role_info})
    except Exception as e:
        logger.error(f"获取项目角色失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/project/role/apply', methods=['POST'])
def apply_role_to_project():
    """将角色应用到项目"""
    try:
        data = request.get_json() or {}
        role_name = data.get('role_name', '').strip()
        project_path = data.get('project_path', '.').strip()
        force = data.get('force', False)
        
        if not role_name:
            return jsonify({'success': False, 'error': '角色名称不能为空'}), 400
        
        success, message = role_manager.apply_role_to_project(role_name, project_path, force)
        
        if success:
            chat_manager.add_system_log(f'角色 {role_name} 已应用到项目: {project_path}')
            return jsonify({'success': True, 'message': message})
        else:
            chat_manager.add_system_log(f'应用角色失败: {message}')
            return jsonify({'success': False, 'error': message}), 500
            
    except Exception as e:
        logger.error(f"应用角色到项目失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/instance/<instance_id>/role/apply', methods=['POST'])
def apply_role_to_instance(instance_id):
    """将角色应用到实例"""
    try:
        data = request.get_json() or {}
        role_name = data.get('role_name', '').strip()
        force = data.get('force', False)
        
        if not role_name:
            return jsonify({'success': False, 'error': '角色名称不能为空'}), 400
        
        # 检查实例是否存在
        instance = instance_manager.get_instance(instance_id)
        if not instance:
            return jsonify({'success': False, 'error': f'实例 {instance_id} 不存在'}), 404
        
        success, message = role_manager.apply_role_to_instance(role_name, instance_id, force)
        
        if success:
            chat_manager.add_system_log(f'角色 {role_name} 已应用到实例: {instance_id}')
            return jsonify({'success': True, 'message': message})
        else:
            chat_manager.add_system_log(f'应用角色到实例失败: {message}')
            return jsonify({'success': False, 'error': message}), 500
            
    except Exception as e:
        logger.error(f"应用角色到实例失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/project/role/remove', methods=['POST'])
def remove_project_role():
    """移除项目角色"""
    try:
        data = request.get_json() or {}
        project_path = data.get('project_path', '.').strip()
        
        success, message = role_manager.remove_project_role(project_path)
        
        if success:
            chat_manager.add_system_log(f'项目角色已移除: {project_path}')
            return jsonify({'success': True, 'message': message})
        else:
            chat_manager.add_system_log(f'移除项目角色失败: {message}')
            return jsonify({'success': False, 'error': message}), 500
            
    except Exception as e:
        logger.error(f"移除项目角色失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/instance/<instance_id>/role/remove', methods=['POST'])
def remove_instance_role(instance_id):
    """移除实例角色"""
    try:
        # 检查实例是否存在
        instance = instance_manager.get_instance(instance_id)
        if not instance:
            return jsonify({'success': False, 'error': f'实例 {instance_id} 不存在'}), 404
        
        success, message = role_manager.remove_instance_role(instance_id)
        
        if success:
            chat_manager.add_system_log(f'实例角色已移除: {instance_id}')
            return jsonify({'success': True, 'message': message})
        else:
            chat_manager.add_system_log(f'移除实例角色失败: {message}')
            return jsonify({'success': False, 'error': message}), 500
            
    except Exception as e:
        logger.error(f"移除实例角色失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/roles/custom', methods=['POST'])
def create_custom_role():
    """创建自定义角色"""
    try:
        data = request.get_json() or {}
        role_name = data.get('role_name', '').strip()
        content = data.get('content', '').strip()
        project_path = data.get('project_path', '.').strip()
        
        if not role_name:
            return jsonify({'success': False, 'error': '角色名称不能为空'}), 400
        
        if not content:
            return jsonify({'success': False, 'error': '角色内容不能为空'}), 400
        
        # 验证角色名称
        valid, message = role_manager.validate_role_name(role_name)
        if not valid:
            return jsonify({'success': False, 'error': message}), 400
        
        success, message = role_manager.create_custom_role(role_name, content, project_path)
        
        if success:
            chat_manager.add_system_log(f'自定义角色已创建: {role_name}')
            return jsonify({'success': True, 'message': message})
        else:
            chat_manager.add_system_log(f'创建自定义角色失败: {message}')
            return jsonify({'success': False, 'error': message}), 500
            
    except Exception as e:
        logger.error(f"创建自定义角色失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/roles/<role_name>/update', methods=['PUT'])
def update_role_content(role_name):
    """更新角色内容"""
    try:
        data = request.get_json() or {}
        content = data.get('content', '').strip()
        project_path = data.get('project_path', '.').strip()
        
        if not content:
            return jsonify({'success': False, 'error': '角色内容不能为空'}), 400
        
        success, message = role_manager.update_role_content(role_name, content, project_path)
        
        if success:
            chat_manager.add_system_log(f'角色内容已更新: {role_name}')
            return jsonify({'success': True, 'message': message})
        else:
            chat_manager.add_system_log(f'更新角色内容失败: {message}')
            return jsonify({'success': False, 'error': message}), 500
            
    except Exception as e:
        logger.error(f"更新角色内容失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
