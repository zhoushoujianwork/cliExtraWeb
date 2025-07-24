# -*- coding: utf-8 -*-
"""
API endpoints for Q Chat Manager
"""
from flask import Blueprint, request, jsonify
import logging
import subprocess
import os
import json
import platform

from app.services.instance_manager import instance_manager
from app.services.chat_manager import chat_manager
from app.services.role_manager import role_manager

bp = Blueprint('api', __name__)
logger = logging.getLogger(__name__)

@bp.route('/instances', methods=['GET'])
def get_instances():
    """获取实例列表，支持namespace过滤和显示所有namespace选项"""
    try:
        # 获取参数
        namespace = request.args.get('namespace', '').strip()
        show_all = request.args.get('show_all', 'true').lower() == 'true'  # 默认显示所有
        
        logger.info(f"📋 获取实例列表 - namespace: {namespace or 'None'}, show_all: {show_all}")
        
        if namespace:
            # 获取指定namespace的实例
            instances = instance_manager.get_instances_by_namespace(namespace)
        else:
            # 根据show_all参数决定是否显示所有namespace
            instance_manager.sync_screen_instances(show_all_namespaces=show_all)
            instances = instance_manager.get_instances()
        
        # 获取聊天历史
        from app.services.chat_manager import chat_manager
        chat_history = chat_manager.get_chat_history(limit=50, namespace=namespace or 'q_cli')
        
        return jsonify({
            'success': True, 
            'instances': instances,
            'chat_history': chat_history,
            'show_all_namespaces': show_all,  # 返回当前设置
            'namespace_filter': namespace or None
        })
    except Exception as e:
        logger.error("获取实例列表失败: {}".format(str(e)))
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/instances/status', methods=['GET'])
def get_instances_status():
    """获取所有实例状态信息"""
    try:
        instances_status = instance_manager.get_instances_status()
        return jsonify({
            'success': True,
            'instances_status': instances_status
        })
    except Exception as e:
        logger.error("获取实例状态失败: {}".format(str(e)))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/instances/<instance_name>/status', methods=['GET'])
def get_instance_status(instance_name):
    """获取单个实例详细状态"""
    try:
        status = instance_manager.get_instance_detailed_status(instance_name)
        return jsonify({
            'success': True,
            'status': status
        })
    except Exception as e:
        logger.error(f"获取实例 {instance_name} 状态失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/start-with-config', methods=['POST'])
def start_instance_with_config():
    """启动带配置的实例"""
    try:
        data = request.get_json() or {}
        name = data.get('name', '').strip()
        path = data.get('path', '').strip()
        role = data.get('role', '').strip()
        namespace = data.get('namespace', '').strip()
        path_type = data.get('path_type', 'local').strip()
        conflict_resolution = data.get('conflict_resolution', None)
        
        # 如果是Git地址，先克隆到本地
        if path_type == 'git' and path:
            clone_result = instance_manager.clone_git_repository(
                path, name, conflict_resolution
            )
            if not clone_result['success']:
                # 检查是否是目录冲突
                if 'directory_exists' in clone_result:
                    return jsonify({
                        'success': False,
                        'error': clone_result['error'],
                        'conflict_type': 'directory_exists',
                        'conflict_path': clone_result['conflict_path'],
                        'suggested_actions': ['delete', 'rename', 'use']
                    }), 409  # Conflict status code
                return jsonify(clone_result), 400
            
            # 使用克隆后的本地路径
            path = clone_result['local_path']
            chat_manager.add_system_log(f'Git仓库已克隆到: {path}')
        
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
            if path_type == 'git':
                chat_manager.add_system_log(f'实例 {instance_id} 基于Git仓库创建')
        else:
            chat_manager.add_system_log(f'实例启动失败: {result["error"]}')
        
        return jsonify(result)
    except Exception as e:
        logger.error("启动配置实例失败: {}".format(str(e)))
        error_msg = f'启动实例失败: {str(e)}'
        chat_manager.add_system_log(error_msg)
        return jsonify({'success': False, 'error': error_msg}), 500

@bp.route('/create_instance', methods=['POST'])
def create_instance_api():
    """创建新实例API"""
    try:
        data = request.get_json() or {}
        instance_id = data.get('instance_id', '').strip()
        project_path = data.get('project_path', '').strip()
        role = data.get('role', '').strip()
        namespace = data.get('namespace', '').strip()
        tools = data.get('tools', [])
        
        # 构建参数
        kwargs = {}
        if instance_id:
            kwargs['name'] = instance_id
        if project_path:
            kwargs['path'] = project_path
        if role:
            kwargs['role'] = role
        if namespace:
            kwargs['namespace'] = namespace
        if tools:
            kwargs['tools'] = tools
        
        result = instance_manager.create_instance_with_config(**kwargs)
        
        if result['success']:
            final_instance_id = result.get('instance_id', instance_id or 'auto-generated')
            chat_manager.add_system_log(f'实例 {final_instance_id} 创建成功')
            
            if namespace:
                chat_manager.add_system_log(f'实例 {final_instance_id} 已设置namespace: {namespace}')
            if role:
                chat_manager.add_system_log(f'实例 {final_instance_id} 已应用角色: {role}')
            if tools:
                chat_manager.add_system_log(f'实例 {final_instance_id} 已安装工具: {", ".join(tools)}')
                
            return jsonify({
                'success': True,
                'instance_id': final_instance_id,
                'message': f'实例 {final_instance_id} 创建成功'
            })
        else:
            chat_manager.add_system_log(f'实例创建失败: {result["error"]}')
            return jsonify(result), 400
            
    except Exception as e:
        logger.error("创建实例失败: {}\3".format(str(e)))
        error_msg = f'创建实例失败: {str(e)}'
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
        logger.error("创建实例失败: {}\3".format(str(e)))
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
        logger.error("启动tmux实例 {instance_id} 失败: {}\3".format(str(e)))
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
        logger.error("停止tmux实例 {instance_id} 失败: {}\3".format(str(e)))
        error_msg = f'停止tmux实例失败: {str(e)}'
        chat_manager.add_system_log(error_msg)
        return jsonify({'success': False, 'error': error_msg}), 500

@bp.route('/clean/<instance_id>', methods=['POST'])
def clean_instance(instance_id):
    """清理实例数据"""
    try:
        result = instance_manager.clean_instance(instance_id)
        if result['success']:
            chat_manager.add_system_log(f'实例 {instance_id} 数据已清理')
            return jsonify({'success': True, 'message': f'实例 {instance_id} 已清理'})
        else:
            logger.error(f'清理实例 {instance_id} 失败: {result.get("error", "未知错误")}')
            return jsonify({'success': False, 'error': result.get('error', '清理失败')}), 500
    except Exception as e:
        logger.error(f'清理实例 {instance_id} 失败: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/restart/<instance_id>', methods=['POST'])
def restart_instance(instance_id):
    """重新启动实例"""
    try:
        # 首先尝试停止实例（如果还在运行）
        try:
            instance_manager.stop_instance(instance_id)
        except:
            pass  # 忽略停止失败，可能实例已经停止
        
        # 重新启动实例
        result = instance_manager.restart_instance(instance_id)
        if result['success']:
            chat_manager.add_system_log(f'实例 {instance_id} 已重新启动')
            return jsonify({'success': True, 'message': f'实例 {instance_id} 已重新启动'})
        else:
            logger.error(f'重启实例 {instance_id} 失败: {result.get("error", "未知错误")}')
            return jsonify({'success': False, 'error': result.get('error', '重启失败')}), 500
    except Exception as e:
        logger.error(f'重启实例 {instance_id} 失败: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500



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
        logger.error("发送消息失败: {}\3".format(str(e)))
        error_msg = f'发送消息失败: {str(e)}'
        chat_manager.add_system_log(error_msg)
        return jsonify({'success': False, 'error': error_msg}), 500

@bp.route('/send-message', methods=['POST'])
def send_message_new():
    """新的消息发送API - 支持指定实例和system实例"""
    try:
        data = request.get_json()
        target_instance = data.get('target_instance', '').strip()
        message = data.get('message', '').strip()
        
        if not target_instance or not message:
            return jsonify({'success': False, 'error': '缺少目标实例或消息内容'}), 400
        
        logger.info(f"📤 发送消息到实例 {target_instance}: {message}")
        
        result = instance_manager.send_message(target_instance, message)
        
        if result['success']:
            logger.info(f"✅ 消息发送成功到 {target_instance}")
            return jsonify({
                'success': True,
                'message': f'消息已发送给 {target_instance}',
                'target': target_instance
            })
        else:
            logger.error(f"❌ 消息发送失败到 {target_instance}: {result.get('error', 'Unknown error')}")
            return jsonify({
                'success': False, 
                'error': result.get('error', '发送失败')
            }), 500
            
    except Exception as e:
        logger.error(f"发送消息异常: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/clean', methods=['POST'])
def clean_all():
    """清理所有实例"""
    try:
        result = instance_manager.clean_all_instances()
        chat_manager.add_system_log(result['message'])
        return jsonify(result)
    except Exception as e:
        logger.error("清理tmux实例失败: {}\3".format(str(e)))
        error_msg = f'清理tmux实例失败: {str(e)}'
        chat_manager.add_system_log(error_msg)
        return jsonify({'success': False, 'error': error_msg}), 500

@bp.route('/chat/history', methods=['GET'])
def get_chat_history():
    """获取聊天历史"""
    try:
        limit = request.args.get('limit', type=int)
        namespace = request.args.get('namespace', 'q_cli')
        
        # 获取聊天历史，支持namespace参数
        history = chat_manager.get_chat_history(limit=limit, namespace=namespace)
        return jsonify({'success': True, 'history': history})
    except Exception as e:
        logger.error("获取聊天历史失败: {}\3".format(str(e)))
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/logs/system', methods=['GET'])
def get_system_logs():
    """获取系统日志"""
    try:
        limit = request.args.get('limit', type=int)
        logs = chat_manager.get_system_logs(limit=limit)
        return jsonify({'success': True, 'logs': logs})
    except Exception as e:
        logger.error("获取系统日志失败: {}\3".format(str(e)))
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/chat/clear', methods=['POST'])
def clear_chat():
    """清空聊天历史"""
    try:
        chat_manager.clear_chat_history()
        chat_manager.add_system_log('聊天历史已清空')
        return jsonify({'success': True, 'message': '聊天历史已清空'})
    except Exception as e:
        logger.error("清空聊天历史失败: {}\3".format(str(e)))
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/logs/clear', methods=['POST'])
def clear_logs():
    """清空系统日志"""
    try:
        chat_manager.clear_system_logs()
        chat_manager.add_system_log('系统日志已清空')
        return jsonify({'success': True, 'message': '系统日志已清空'})
    except Exception as e:
        logger.error("清空系统日志失败: {}\3".format(str(e)))
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/instances/<instance_id>/conversations', methods=['GET'])
def get_instance_conversations(instance_id):
    """获取实例的对话历史"""
    try:
        namespace = request.args.get('namespace')
        conversations = instance_manager.get_conversation_history(instance_id, namespace)
        
        return jsonify({
            'success': True,
            'instance_id': instance_id,
            'namespace': namespace,
            'conversations': conversations
        })
    except Exception as e:
        logger.error("获取实例 {instance_id} 对话历史失败: {}\3".format(str(e)))
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/instances/<instance_id>/conversations', methods=['POST'])
def save_instance_conversation(instance_id):
    """保存实例对话消息"""
    try:
        data = request.get_json() or {}
        sender = data.get('sender', 'user')
        message = data.get('message', '')
        namespace = data.get('namespace')
        
        if not message:
            return jsonify({'success': False, 'error': '消息内容不能为空'}), 400
        
        instance_manager.save_conversation_message(instance_id, sender, message, namespace)
        
        return jsonify({
            'success': True,
            'message': '对话消息已保存'
        })
    except Exception as e:
        logger.error("保存实例 {instance_id} 对话消息失败: {}\3".format(str(e)))
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/namespaces/<namespace>/conversations', methods=['GET'])
def get_namespace_conversations(namespace):
    """获取namespace的所有对话历史"""
    try:
        limit = int(request.args.get('limit', 100))
        conversations = instance_manager.get_namespace_conversation_history(namespace, limit)
        
        return jsonify({
            'success': True,
            'namespace': namespace,
            'conversations': conversations,
            'total': len(conversations)
        })
    except Exception as e:
        logger.error("获取namespace {namespace} 对话历史失败: {}\3".format(str(e)))
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/replay/<target_type>/<target_name>', methods=['GET'])
def replay_conversations(target_type, target_name):
    """回放对话记录"""
    try:
        if target_type not in ['instance', 'namespace']:
            return jsonify({'success': False, 'error': '无效的目标类型，只支持 instance 或 namespace'}), 400
        
        limit = request.args.get('limit', 50, type=int)
        since = request.args.get('since')
        
        result = instance_manager.replay_conversations(target_type, target_name, limit, since)
        
        return jsonify(result)
    except Exception as e:
        logger.error("回放 {target_type} {target_name} 对话记录失败: {}\3".format(str(e)))
        return jsonify({'success': False, 'error': str(e)}), 500



@bp.route('/instances/<instance_id>/session-info', methods=['GET'])
def get_instance_session_info(instance_id):
    """获取实例的tmux会话信息"""
    try:
        # 首先尝试从实例管理器获取信息
        instance_manager.sync_screen_instances()
        instances = instance_manager.get_instances()
        
        # 查找指定实例
        target_instance = None
        for instance in instances:
            if instance.get('id') == instance_id:
                target_instance = instance
                break
        
        if target_instance:
            session_name = target_instance.get('screen_session', '')
            
            # 检查 tmux 会话是否真的存在
            try:
                result = subprocess.run(['tmux', 'list-sessions'], capture_output=True, text=True)
                session_exists = result.returncode == 0 and session_name in result.stdout
            except:
                session_exists = False
            
            if not session_exists:
                return jsonify({
                    'success': False,
                    'error': f'实例 {instance_id} 的 tmux 会话不存在或已停止，请重新启动实例'
                }), 404
            
            return jsonify({
                'success': True,
                'instance_id': instance_id,
                'session': session_name,
                'status': target_instance.get('status', ''),
                'namespace': target_instance.get('namespace', 'default'),
                'project_path': target_instance.get('project_path', ''),
                'role': target_instance.get('role', ''),
                'attach_command': "tmux attach-session -t {}\3".format(session_name)
            })
        
        # 如果实例管理器中没有找到，尝试使用cliExtra命令
        result = subprocess.run(
            ['cliExtra', 'list', instance_id, '--json'],
            capture_output=True, text=True, timeout=10
        )
        
        if result.returncode == 0:
            import json
            data = json.loads(result.stdout.strip())
            
            # 适配新的JSON格式
            if 'instances' in data and data['instances']:
                instance_data = data['instances'][0]  # 单个实例查询返回数组
            else:
                instance_data = data.get('instance', {})
            
            if instance_data:
                session_name = instance_data.get('session', '')
                status = instance_data.get('status', '')
                
                # 检查实例状态
                if status.lower() in ['not running', 'stopped', 'detached']:
                    return jsonify({
                        'success': False,
                        'error': f'实例 {instance_id} 当前状态为 "{status}"，无法创建 Web 终端。请先启动实例。'
                    }), 400
                
                # 检查 tmux 会话是否真的存在
                try:
                    tmux_result = subprocess.run(['tmux', 'list-sessions'], capture_output=True, text=True)
                    session_exists = tmux_result.returncode == 0 and session_name in tmux_result.stdout
                except:
                    session_exists = False
                
                if not session_exists:
                    return jsonify({
                        'success': False,
                        'error': f'实例 {instance_id} 的 tmux 会话 "{session_name}" 不存在。请重新启动实例。'
                    }), 404
                
                return jsonify({
                    'success': True,
                    'instance_id': instance_id,
                    'session': session_name,
                    'status': status,
                    'namespace': instance_data.get('namespace', 'default'),
                    'project_path': instance_data.get('project_path', ''),
                    'role': instance_data.get('role', ''),
                    'attach_command': instance_data.get('attach_command', '')
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
@bp.route('/attach/<instance_id>', methods=['GET'])
def get_attach_info(instance_id):
    """获取接管实例的命令信息"""
    try:
        result = instance_manager.attach_to_instance(instance_id)
        return jsonify(result)
    except Exception as e:
        logger.error("获取接管信息失败: {}\3".format(str(e)))
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/status/<instance_id>', methods=['GET'])
def get_instance_details(instance_id):
    """获取实例详细状态"""
    try:
        result = instance_manager.get_instance_status(instance_id)
        return jsonify(result)
    except Exception as e:
        logger.error("获取实例状态失败: {}\3".format(str(e)))
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
        logger.error("创建Web终端失败: {}\3".format(str(e)))
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
        logger.error("分离Web终端失败: {}\3".format(str(e)))
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
        logger.error("终止Web终端失败: {}\3".format(str(e)))
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== 角色管理 API ====================

@bp.route('/instance/<instance_id>/log', methods=['GET'])
def get_instance_log(instance_id):
    """获取实例日志内容"""
    try:
        # 直接尝试所有可能的namespace
        namespaces = ['q_cli', 'default', 'frontend', 'backend', 'devops', 'test']
        log_content = None
        found_namespace = None
        file_path = None
        
        for ns in namespaces:
            log_file_path = os.path.expanduser(
                "~/Library/Application Support/cliExtra/namespaces/{ns}/logs/instance_{}\3".format(instance_id)
            )
            logger.info("检查日志文件: {}\3".format(log_file_path))
            
            if os.path.exists(log_file_path):
                logger.info("找到日志文件在namespace: {}\3".format(ns))
                found_namespace = ns
                file_path = log_file_path
                
                # 读取文件内容
                try:
                    with open(log_file_path, 'r', encoding='utf-8') as f:
                        log_content = f.read()
                    logger.info("成功读取日志文件，大小: {}\3".format(len(log_content)))
                    break
                except UnicodeDecodeError:
                    try:
                        with open(log_file_path, 'r', encoding='latin-1') as f:
                            log_content = f.read()
                        logger.info("使用latin-1编码读取日志文件，大小: {}\3".format(len(log_content)))
                        break
                    except Exception as e:
                        logger.error("读取日志文件失败: {}\3".format(e))
                        continue
        
        if log_content is None:
            return jsonify({
                'success': True, 
                'log_content': '',
                'message': f'未找到实例 {instance_id} 的日志文件',
                'instance_id': instance_id,
                'searched_namespaces': namespaces
            })
        
        # 获取文件大小
        file_size = os.path.getsize(file_path) if file_path else 0
        
        return jsonify({
            'success': True,
            'log_content': log_content,
            'file_size': file_size,
            'file_path': file_path,
            'instance_id': instance_id,
            'namespace': found_namespace
        })
        
    except Exception as e:
        logger.error("读取实例日志失败: {}\3".format(str(e)))
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/roles', methods=['GET'])
def get_available_roles():
    """获取所有可用角色"""
    try:
        roles = role_manager.list_available_roles()
        return jsonify({'success': True, 'roles': roles})
    except Exception as e:
        logger.error("获取角色列表失败: {}\3".format(str(e)))
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
        logger.error("获取角色内容失败: {}\3".format(str(e)))
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/project/role', methods=['GET'])
def get_project_role():
    """获取当前项目的角色"""
    try:
        project_path = request.args.get('path', '.')
        role_info = role_manager.get_project_roles_info(project_path)
        return jsonify({'success': True, 'role_info': role_info})
    except Exception as e:
        logger.error("获取项目角色失败: {}\3".format(str(e)))
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
        logger.error("应用角色到项目失败: {}\3".format(str(e)))
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
        logger.error("应用角色到实例失败: {}\3".format(str(e)))
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
        logger.error("移除项目角色失败: {}\3".format(str(e)))
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
        logger.error("移除实例角色失败: {}\3".format(str(e)))
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
        logger.error("创建自定义角色失败: {}\3".format(str(e)))
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
        logger.error("更新角色内容失败: {}\3".format(str(e)))
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/broadcast', methods=['POST'])
def broadcast_message():
    """广播消息到指定namespace的所有实例"""
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        namespace = data.get('namespace', '').strip()
        broadcast_all = data.get('broadcast_all', True)  # 默认广播给所有namespace
        
        if not message:
            return jsonify({'success': False, 'error': '消息不能为空'}), 400
        
        logger.info(f"📢 广播消息 - namespace: {namespace or 'None'}, broadcast_all: {broadcast_all}")
        
        # 调用修改后的广播方法
        result = instance_manager.broadcast_message(message, namespace, broadcast_all)
        
        if result['success']:
            # 根据参数生成不同的日志消息
            if namespace:
                log_msg = f'广播消息到namespace "{namespace}": {message}'
                response_msg = f'消息已广播给namespace "{namespace}" 中的 {result.get("sent_count", 0)} 个实例'
            elif broadcast_all:
                log_msg = f'广播消息到所有namespace: {message}'
                response_msg = f'消息已广播给所有namespace中的 {result.get("sent_count", 0)} 个实例'
            else:
                log_msg = f'广播消息到default namespace: {message}'
                response_msg = f'消息已广播给default namespace中的 {result.get("sent_count", 0)} 个实例'
            
            chat_manager.add_system_log(log_msg)
            return jsonify({
                'success': True,
                'sent_count': result.get('sent_count', 0),
                'message': response_msg,
                'broadcast_scope': 'specific' if namespace else ('all' if broadcast_all else 'default')
            })
        else:
            logger.error(f'广播消息失败: {result.get("error", "未知错误")}')
            return jsonify({'success': False, 'error': result.get('error', '广播失败')}), 500
            
    except Exception as e:
        logger.error(f'广播消息失败: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500
@bp.route('/tools', methods=['GET'])
def get_tools():
    """获取可用工具列表"""
    try:
        result = subprocess.run(
            ['cliExtra', 'tools', 'list', '-o', 'json'],
            capture_output=True, text=True, timeout=10
        )
        
        if result.returncode == 0:
            try:
                tools_data = json.loads(result.stdout)
                # cliExtra返回的格式是 {"tools": [{"name": "...", "description": "..."}], "count": N}
                if 'tools' in tools_data and isinstance(tools_data['tools'], list):
                    return jsonify({
                        'success': True,
                        'tools': tools_data['tools']
                    })
                else:
                    # 如果格式不符合预期，返回默认工具列表
                    default_tools = [
                        {'name': 'git', 'description': 'Git版本控制'},
                        {'name': 'docker', 'description': 'Docker容器'},
                        {'name': 'npm', 'description': 'Node.js包管理'},
                        {'name': 'python', 'description': 'Python解释器'},
                        {'name': 'node', 'description': 'Node.js运行时'}
                    ]
                    return jsonify({
                        'success': True,
                        'tools': default_tools
                    })
            except json.JSONDecodeError:
                # 如果JSON解析失败，返回默认工具列表
                default_tools = [
                    {'name': 'git', 'description': 'Git版本控制'},
                    {'name': 'docker', 'description': 'Docker容器'},
                    {'name': 'npm', 'description': 'Node.js包管理'},
                    {'name': 'python', 'description': 'Python解释器'},
                    {'name': 'node', 'description': 'Node.js运行时'}
                ]
                return jsonify({
                    'success': True,
                    'tools': default_tools
                })
        else:
            # 命令执行失败，返回默认工具列表
            default_tools = [
                {'name': 'git', 'description': 'Git版本控制'},
                {'name': 'docker', 'description': 'Docker容器'},
                {'name': 'npm', 'description': 'Node.js包管理'},
                {'name': 'python', 'description': 'Python解释器'},
                {'name': 'node', 'description': 'Node.js运行时'}
            ]
            return jsonify({
                'success': True,
                'tools': default_tools
            })
            
    except Exception as e:
        logger.error(f'获取工具列表失败: {str(e)}')
        # 返回默认工具列表
        default_tools = [
            {'name': 'git', 'description': 'Git版本控制'},
            {'name': 'docker', 'description': 'Docker容器'},
            {'name': 'npm', 'description': 'Node.js包管理'},
            {'name': 'python', 'description': 'Python解释器'},
            {'name': 'node', 'description': 'Node.js运行时'}
        ]
        return jsonify({
            'success': True,
            'tools': default_tools
        })

@bp.route('/browse_directory', methods=['POST'])
def browse_directory():
    """浏览目录 - 跨平台兼容"""
    try:
        data = request.get_json()
        current_path = data.get('path', '')
        
        # 获取默认起始路径
        if not current_path:
            if platform.system() == 'Windows':
                current_path = os.path.expanduser('~\\Desktop')  # Windows桌面
                if not os.path.exists(current_path):
                    current_path = os.path.expanduser('~')  # 用户主目录
            else:
                current_path = os.path.expanduser('~')  # Unix/Linux/macOS用户主目录
        
        # 确保路径存在且是目录
        if not os.path.exists(current_path) or not os.path.isdir(current_path):
            current_path = os.path.expanduser('~')
        
        # 规范化路径
        current_path = os.path.abspath(current_path)
        
        # 获取目录内容
        items = []
        try:
            # 添加父目录选项（除非是根目录）
            parent_dir = os.path.dirname(current_path)
            if parent_dir != current_path:
                items.append({
                    'name': '..',
                    'path': parent_dir,
                    'type': 'directory',
                    'is_parent': True
                })
            
            # 获取当前目录下的所有项目
            try:
                dir_items = os.listdir(current_path)
            except PermissionError:
                return jsonify({
                    'success': False,
                    'error': '没有权限访问该目录'
                }), 403
            
            # 分别处理目录和文件
            directories = []
            files = []
            
            for item in dir_items:
                # 跳过隐藏文件/目录（以.开头的）
                if item.startswith('.'):
                    continue
                    
                item_path = os.path.join(current_path, item)
                
                try:
                    if os.path.isdir(item_path):
                        directories.append({
                            'name': item,
                            'path': item_path,
                            'type': 'directory',
                            'is_parent': False
                        })
                    elif os.path.isfile(item_path):
                        # 只显示常见的项目文件
                        if item.lower().endswith(('.json', '.md', '.txt', '.py', '.js', '.html', '.css', '.yml', '.yaml', '.xml', '.gitignore', 'readme', 'package.json', 'requirements.txt')):
                            files.append({
                                'name': item,
                                'path': item_path,
                                'type': 'file',
                                'is_parent': False
                            })
                except (OSError, PermissionError):
                    # 跳过无法访问的项目
                    continue
            
            # 按名称排序并合并（目录在前，文件在后）
            directories.sort(key=lambda x: x['name'].lower())
            files.sort(key=lambda x: x['name'].lower())
            items.extend(directories)
            items.extend(files)
                    
        except Exception as e:
            logger.error(f'读取目录内容失败: {str(e)}')
            return jsonify({
                'success': False,
                'error': f'读取目录内容失败: {str(e)}'
            }), 500
            
        return jsonify({
            'success': True,
            'current_path': current_path,
            'items': items,
            'system': platform.system()
        })
        
    except Exception as e:
        logger.error(f'浏览目录失败: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/upload-temp-image', methods=['POST'])
def upload_temp_image():
    """上传临时图片文件"""
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
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({
                'success': False,
                'error': f'不支持的文件类型: {file_ext}'
            }), 400
        
        # 获取自定义文件名或生成默认文件名
        custom_filename = request.form.get('filename')
        if custom_filename:
            filename = custom_filename
        else:
            import time
            timestamp = int(time.time())
            filename = f'temp_image_{timestamp}.{file_ext}'
        
        # 创建临时目录
        import tempfile
        import os
        temp_dir = tempfile.gettempdir()
        cliextra_temp_dir = os.path.join(temp_dir, 'cliExtraWeb_images')
        
        if not os.path.exists(cliextra_temp_dir):
            os.makedirs(cliextra_temp_dir)
        
        # 保存文件
        file_path = os.path.join(cliextra_temp_dir, filename)
        file.save(file_path)
        
        logger.info("临时图片已保存: {}\3".format(file_path))
        
        return jsonify({
            'success': True,
            'path': file_path,
            'filename': filename,
            'size': os.path.getsize(file_path)
        })
        
    except Exception as e:
        logger.error("上传临时图片失败: {}\3".format(str(e)))
        return jsonify({
            'success': False,
            'error': f'上传失败: {str(e)}'
        }), 500

@bp.route('/clean-temp-images', methods=['POST'])
def clean_temp_images():
    """清理临时图片文件"""
    try:
        import os
        import glob
        
        # 使用 cliExtra 配置目录
        cliextra_dir = os.path.expanduser('~/Library/Application Support/cliExtra')
        temp_dir = os.path.join(cliextra_dir, 'temp_images')
        
        if not os.path.exists(temp_dir):
            return jsonify({
                'success': True,
                'message': '临时目录不存在',
                'cleaned_count': 0
            })
        
        # 获取所有临时图片文件
        pattern = os.path.join(temp_dir, 'temp_image_*')
        temp_files = glob.glob(pattern)
        
        cleaned_count = 0
        for file_path in temp_files:
            try:
                # 检查文件年龄，只删除超过1小时的文件
                import time
                file_age = time.time() - os.path.getmtime(file_path)
                if file_age > 3600:  # 1小时 = 3600秒
                    os.remove(file_path)
                    cleaned_count += 1
            except Exception as e:
                logger.warning("删除临时文件失败 {file_path}: {}\3".format(str(e)))
        
        logger.info("清理了 {}\3".format(cleaned_count))
        
        return jsonify({
            'success': True,
            'message': f'清理了 {cleaned_count} 个临时文件',
            'cleaned_count': cleaned_count
        })
        
    except Exception as e:
        logger.error("清理临时图片失败: {}\3".format(str(e)))
        return jsonify({
            'success': False,
            'error': f'清理失败: {str(e)}'
        }), 500

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
                'error': f'不支持的文件类型: {file_extension}'
            }), 400
        
        # 创建临时目录 - 使用 cliExtra 配置目录
        cliextra_dir = os.path.expanduser('~/Library/Application Support/cliExtra')
        temp_dir = os.path.join(cliextra_dir, 'temp_images')
        os.makedirs(temp_dir, exist_ok=True)
        
        # 生成文件名
        filename = request.form.get('filename')
        if not filename:
            import time
            timestamp = int(time.time())
            filename = f'temp_image_{timestamp}.{file_extension}'
        
        # 保存文件
        file_path = os.path.join(temp_dir, filename)
        file.save(file_path)
        
        logger.info("图片上传成功: {}".format(file_path))
        
        return jsonify({
            'success': True,
            'path': file_path,           # 绝对路径
            'url': file_path,            # 兼容性：也提供url字段
            'filename': filename,        # 文件名
            'relative_path': f'temp_images/{filename}',  # 相对路径
            'message': '图片上传成功'
        })
        
    except Exception as e:
        logger.error("图片上传失败: {}\3".format(str(e)))
        return jsonify({
            'success': False,
            'error': f'上传失败: {str(e)}'
        }), 500

@bp.route('/chat/test-cache', methods=['GET'])
def test_chat_cache():
    """测试聊天历史缓存加载"""
    try:
        namespace = request.args.get('namespace', 'q_cli')
        
        # 强制重新加载缓存
        chat_manager.namespace_cache_loaded = False
        chat_manager.load_namespace_cache_history(namespace)
        
        # 获取历史记录
        history = chat_manager.get_chat_history(limit=10, namespace=namespace)
        
        return jsonify({
            'success': True,
            'message': '缓存测试完成',
            'history': history,
            'count': len(history),
            'cache_loaded': chat_manager.namespace_cache_loaded
        })
        
    except Exception as e:
        logger.error("测试聊天历史缓存失败: {}".format(e))
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@bp.route('/chat/refresh-cache', methods=['POST'])
def refresh_chat_cache():
    """刷新聊天历史缓存"""
    try:
        data = request.get_json() or {}
        namespace = data.get('namespace', 'q_cli')
        
        # 刷新缓存历史记录
        chat_manager.refresh_cache_history(namespace)
        
        # 获取更新后的历史记录
        history = chat_manager.get_chat_history(limit=50, namespace=namespace)
        
        return jsonify({
            'success': True,
            'message': '聊天历史缓存刷新成功',
            'history': history,
            'count': len(history)
        })
        
    except Exception as e:
        logger.error("刷新聊天历史缓存失败: {}".format(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/namespaces/<namespace_name>', methods=['DELETE'])
def delete_namespace(namespace_name):
    """删除指定的 namespace"""
    try:
        if not namespace_name or namespace_name.strip() == '':
            return jsonify({
                'success': False,
                'error': '无法删除默认 namespace'
            }), 400
        
        result = instance_manager.delete_namespace(namespace_name)
        
        if result.get('success'):
            return jsonify({
                'success': True,
                'message': f'Namespace "{namespace_name}" 删除成功'
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', '删除失败')
            }), 400
            
    except Exception as e:
        logger.error(f"删除 namespace 失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/instances/<instance_id>/details', methods=['GET'])
def get_instance_info(instance_id):
    """获取实例详情"""
    try:
        # 获取实例基本信息
        instances = instance_manager.list_instances()
        instance = None
        
        for inst in instances:
            if inst.get('id') == instance_id:
                instance = inst
                break
        
        if not instance:
            return jsonify({
                'success': False,
                'error': f'实例 {instance_id} 不存在'
            }), 404
        
        # 获取详细信息
        instance_details = {
            'id': instance.get('id'),
            'status': instance.get('status'),
            'namespace': instance.get('namespace', 'default'),
            'role': instance.get('role'),
            'project_path': instance.get('project_path'),
            'created_at': instance.get('created_at'),
            'tools': instance.get('tools', []),
            'stats': {
                'uptime': instance.get('uptime', '0分钟'),
                'messages': instance.get('message_count', 0),
                'memory': instance.get('memory_usage', '0MB'),
                'cpu': instance.get('cpu_usage', '0%')
            }
        }
        
        return jsonify({
            'success': True,
            'instance': instance_details
        })
        
    except Exception as e:
        logger.error(f"获取实例详情失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/instances/<instance_id>/tools', methods=['PUT'])
def update_instance_tools(instance_id):
    """更新实例工具配置"""
    try:
        data = request.get_json() or {}
        tools = data.get('tools', [])
        
        if not isinstance(tools, list):
            return jsonify({
                'success': False,
                'error': '工具列表必须是数组格式'
            }), 400
        
        # 验证工具名称
        valid_tools = [
            'git', 'docker', 'kubectl', 'terraform', 'ansible',
            'jenkins', 'prometheus', 'grafana', 'elasticsearch', 'redis'
        ]
        
        invalid_tools = [tool for tool in tools if tool not in valid_tools]
        if invalid_tools:
            return jsonify({
                'success': False,
                'error': f'无效的工具: {", ".join(invalid_tools)}'
            }), 400
        
        # 检查实例是否存在
        instances = instance_manager.list_instances()
        instance = None
        
        for inst in instances:
            if inst.get('id') == instance_id:
                instance = inst
                break
        
        if not instance:
            return jsonify({
                'success': False,
                'error': f'实例 {instance_id} 不存在'
            }), 404
        
        # 更新工具配置
        result = instance_manager.update_instance_tools(instance_id, tools)
        
        if result.get('success'):
            chat_manager.add_system_log(f'实例 {instance_id} 工具配置已更新: {", ".join(tools)}')
            
            return jsonify({
                'success': True,
                'message': '工具配置更新成功',
                'tools': tools
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', '更新工具配置失败')
            }), 500
            
    except Exception as e:
        logger.error(f"更新实例工具配置失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
