"""
WebSocket handlers for real-time communication
"""
from flask import Blueprint
from flask_socketio import emit, join_room, leave_room
import threading
import time
import logging
import subprocess

from app import socketio
from app.services.instance_manager import instance_manager
from app.services.chat_manager import chat_manager
from app.services.content_filter import content_filter  # 导入内容过滤器

bp = Blueprint('websocket', __name__)
logger = logging.getLogger(__name__)

# 存储客户端监控的实例
client_monitors = {}
monitor_positions = {}  # 跟踪每个监控会话的文件读取位置

@socketio.on('connect')
def handle_connect():
    """客户端连接"""
    logger.info('客户端已连接')
    emit('connected', {'message': 'WebSocket连接成功'})

@socketio.on('disconnect')
def handle_disconnect():
    """客户端断开连接"""
    logger.info('客户端已断开连接')

@socketio.on('join_monitoring')
def handle_join_monitoring(data):
    """加入实例监控"""
    instance_id = data.get('instance_id')
    if not instance_id:
        emit('error', {'message': '缺少实例ID'})
        return
    
    logger.info(f'🔗 客户端请求监控实例: {instance_id}')
    
    try:
        # 加入房间
        join_room(f'instance_{instance_id}')
        logger.info(f'✅ 客户端已加入房间: instance_{instance_id}')
        
        # 启动监控线程
        if instance_id not in client_monitors:
            client_monitors[instance_id] = True
            monitor_positions[instance_id] = 0  # 初始化文件位置
            thread = threading.Thread(
                target=monitor_instance_output, 
                args=(instance_id,), 
                daemon=True,
                name=f"monitor_{instance_id}"
            )
            thread.start()
            logger.info(f'🚀 监控线程已启动: {instance_id}')
        else:
            logger.info(f'📊 监控线程已存在: {instance_id}')
        
        emit('monitoring_started', {'instance_id': instance_id})
        logger.info(f'📤 发送监控启动确认: {instance_id}')
        
    except Exception as e:
        logger.error(f'❌ 启动监控时出错: {str(e)}')
        emit('error', {'message': f'启动监控失败: {str(e)}'})

@socketio.on('leave_monitoring')
def handle_leave_monitoring(data):
    """离开实例监控"""
    instance_id = data.get('instance_id')
    if not instance_id:
        emit('error', {'message': '缺少实例ID'})
        return
    
    logger.info(f'🔌 客户端请求停止监控: {instance_id}')
    
    try:
        # 离开房间
        leave_room(f'instance_{instance_id}')
        
        # 停止监控
        if instance_id in client_monitors:
            client_monitors[instance_id] = False
            del client_monitors[instance_id]
            logger.info(f'🛑 停止监控实例 {instance_id}')
        
        # 清理文件位置跟踪
        if instance_id in monitor_positions:
            del monitor_positions[instance_id]
        
        emit('monitoring_stopped', {'instance_id': instance_id})
        logger.info(f'📤 发送监控停止确认: {instance_id}')
        
    except Exception as e:
        logger.error(f'❌ 停止监控时出错: {str(e)}')
        emit('error', {'message': f'停止监控失败: {str(e)}'})

def monitor_instance_output(instance_id):
    """监控tmux实例输出（支持流式输出和偏移量跟踪）"""
    logger.info(f'🔄 开始监控tmux实例输出: {instance_id}')
    
    while client_monitors.get(instance_id, False):
        try:
            # 获取当前文件位置
            current_position = monitor_positions.get(instance_id, 0)
            
            # 获取新输出
            outputs = instance_manager.get_instance_output(instance_id, current_position)
            
            if outputs:
                logger.info(f'📥 tmux实例 {instance_id} 收到 {len(outputs)} 个输出')
            
            for output in outputs:
                # 更新文件位置
                if 'new_position' in output:
                    monitor_positions[instance_id] = output['new_position']
                
                if output.get('is_streaming', False):
                    # 流式输出 - 实时推送每个片段
                    logger.info(f'📤 发送流式输出: {instance_id} - {output["content"][:30]}...')
                    
                    try:
                        # 对内容进行清理
                        raw_content = output['content']
                        cleaned_content = content_filter.clean_content(raw_content)
                        
                        if socketio:  # 检查socketio是否可用
                            socketio.emit('instance_streaming_response', {
                                'instance_id': instance_id,
                                'content': cleaned_content,  # 清理后的内容
                                'raw_content': raw_content,  # 原始内容
                                'timestamp': output['timestamp'],
                                'is_streaming': True
                            }, room=f'instance_{instance_id}')
                            logger.info(f'✅ 流式输出已发送到房间: instance_{instance_id} (清理后: {len(cleaned_content)}字符)')
                        else:
                            logger.warning('⚠️  socketio 不可用，跳过流式输出推送')
                    except Exception as e:
                        logger.error(f'❌ 发送流式输出时出错: {str(e)}')
                    
                elif output.get('is_complete', False):
                    # 完整回复完成
                    logger.info(f'🎯 完整回复完成: {instance_id} - {len(output["content"])} 字符')
                    
                    try:
                        # 使用新的对话解析功能
                        raw_content = output.get('raw_content', output['content'])
                        
                        # 解析对话内容，区分发言者
                        conversations = content_filter.parse_conversation(raw_content)
                        
                        logger.info(f'📝 对话解析完成: 解析出 {len(conversations)} 条消息')
                        
                        # 处理每条对话消息
                        for conv in conversations:
                            # 为每条消息添加实例信息
                            conv['instance_id'] = instance_id
                            conv['timestamp'] = conv.get('timestamp', output['timestamp'])
                            
                            # 根据消息类型进行不同处理
                            if conv['type'] == 'user':
                                # 用户消息
                                chat_manager.add_chat_message(
                                    sender=f'用户@{instance_id}',
                                    message=conv['content'],
                                    instance_id=instance_id,
                                    message_type='user'
                                )
                                
                                # 发送用户消息事件
                                if socketio:
                                    socketio.emit('user_message', {
                                        'instance_id': instance_id,
                                        'content': conv['content'],
                                        'timestamp': conv['timestamp'],
                                        'needs_rich_text': conv.get('needs_rich_text', False)
                                    }, room=f'instance_{instance_id}')
                                    
                            elif conv['type'] == 'assistant':
                                # AI助手消息
                                formatted_content = content_filter.format_for_display(conv['content'])
                                
                                chat_manager.add_chat_message(
                                    sender=f'AI助手@{instance_id}',
                                    message=formatted_content,
                                    instance_id=instance_id,
                                    message_type='assistant'
                                )
                                
                                # 发送AI消息事件
                                if socketio:
                                    socketio.emit('assistant_message', {
                                        'instance_id': instance_id,
                                        'content': formatted_content,
                                        'raw_content': conv['content'],
                                        'timestamp': conv['timestamp'],
                                        'needs_rich_text': conv.get('needs_rich_text', True),
                                        'is_markdown': True
                                    }, room=f'instance_{instance_id}')
                                    
                            elif conv['type'] == 'system':
                                # 系统消息
                                chat_manager.add_chat_message(
                                    sender=f'系统@{instance_id}',
                                    message=conv['content'],
                                    instance_id=instance_id,
                                    message_type='system'
                                )
                                
                                # 发送系统消息事件
                                if socketio:
                                    socketio.emit('system_message', {
                                        'instance_id': instance_id,
                                        'content': conv['content'],
                                        'timestamp': conv['timestamp'],
                                        'needs_rich_text': False
                                    }, room=f'instance_{instance_id}')
                        
                        # 发送完整对话解析完成事件
                        if socketio:
                            socketio.emit('conversation_parsed', {
                                'instance_id': instance_id,
                                'conversations': conversations,
                                'total_messages': len(conversations),
                                'timestamp': output['timestamp']
                            }, room=f'instance_{instance_id}')
                            
                        logger.info(f'✅ 对话消息已全部处理完成: {instance_id}')
                        
                    except Exception as e:
                        logger.error(f'❌ 处理对话解析时出错: {str(e)}')
                        # 降级处理：使用原有的简单处理方式
                        raw_content = output.get('raw_content', output['content'])
                        cleaned_content = content_filter.clean_content(raw_content)
                        formatted_content = content_filter.format_for_display(cleaned_content)
                        
                        chat_manager.add_chat_message(
                            sender=f'实例{instance_id}',
                            message=formatted_content,
                            instance_id=instance_id
                        )
                        
                        if socketio:
                            socketio.emit('instance_complete_response', {
                                'instance_id': instance_id,
                                'content': formatted_content,
                                'timestamp': output['timestamp'],
                                'is_fallback': True
                            }, room=f'instance_{instance_id}')
            
            time.sleep(0.2)  # 更频繁的检查以支持流式输出
            
        except Exception as e:
            logger.error(f'❌ 监控tmux实例 {instance_id} 输出时出错: {str(e)}')
            time.sleep(1)
    
    # 清理监控状态
    if instance_id in monitor_positions:
        del monitor_positions[instance_id]
    
    logger.info(f'🛑 tmux实例 {instance_id} 监控线程已停止')

@socketio.on('send_message')
def handle_send_message(data):
    """通过WebSocket发送消息"""
    try:
        instance_ids = data.get('instance_ids', [])
        message = data.get('message', '')
        
        if not instance_ids or not message:
            emit('error', {'message': '缺少必要参数'})
            return
        
        success_count = 0
        errors = []
        
        for instance_id in instance_ids:
            result = instance_manager.send_message(instance_id, message)
            if result['success']:
                success_count += 1
            else:
                errors.append(f'tmux实例{instance_id}: {result["error"]}')
        
        if errors:
            emit('message_result', {
                'success': False,
                'message': f'成功发送到 {success_count} 个tmux实例，失败: {len(errors)}',
                'errors': errors
            })
        else:
            emit('message_result', {
                'success': True,
                'message': f'成功发送到 {success_count} 个tmux实例'
            })
            
    except Exception as e:
        logger.error(f'WebSocket发送消息失败: {str(e)}')
        emit('error', {'message': f'发送消息失败: {str(e)}'})

@socketio.on('get_instances')
def handle_get_instances():
    """获取实例列表"""
    try:
        instances = instance_manager.get_instances()
        emit('instances_list', {'instances': instances})
    except Exception as e:
        logger.error(f'获取tmux实例列表失败: {str(e)}')
        emit('error', {'message': f'获取tmux实例列表失败: {str(e)}'})

# Web终端相关WebSocket事件
@socketio.on('join_terminal')
def handle_join_terminal(data):
    """加入Web终端并连接到tmux会话"""
    instance_id = data.get('instance_id')
    session_name = data.get('session_name')
    
    if not instance_id or not session_name:
        emit('terminal_error', {
            'instance_id': instance_id,
            'error': '缺少实例ID或会话名称'
        })
        return
    
    try:
        logger.info(f'客户端连接Web终端: {instance_id} -> {session_name}')
        
        # 加入房间
        join_room(f'terminal_{instance_id}')
        
        # 检查tmux会话是否存在
        result = subprocess.run(['tmux', 'list-sessions'], capture_output=True, text=True)
        if result.returncode != 0 or session_name not in result.stdout:
            logger.error(f'tmux会话 {session_name} 不存在。当前会话: {result.stdout}')
            emit('terminal_error', {
                'instance_id': instance_id,
                'error': f'tmux会话 {session_name} 不存在'
            })
            return
        
        logger.info(f'tmux会话 {session_name} 存在，开始创建Web终端连接')
        
        # 创建Web终端连接
        from app.services.web_terminal import web_terminal_manager
        
        def output_callback(inst_id, output):
            """终端输出回调"""
            logger.debug(f'终端输出 {inst_id}: {repr(output[:100])}...')
            socketio.emit('terminal_output', {
                'instance_id': inst_id,
                'output': output
            }, room=f'terminal_{inst_id}')
        
        logger.info(f'调用 web_terminal_manager.create_terminal({instance_id}, callback)')
        success = web_terminal_manager.create_terminal(instance_id, output_callback)
        logger.info(f'web_terminal_manager.create_terminal 返回: {success}')
        
        if success:
            emit('terminal_connected', {
                'instance_id': instance_id,
                'session_name': session_name
            })
            logger.info(f'Web终端连接成功: {instance_id}')
        else:
            logger.error(f'web_terminal_manager.create_terminal 返回 False，无法创建Web终端连接')
            emit('terminal_error', {
                'instance_id': instance_id,
                'error': '无法创建Web终端连接'
            })
            
    except Exception as e:
        logger.error(f'连接Web终端失败: {str(e)}')
        emit('terminal_error', {
            'instance_id': instance_id,
            'error': str(e)
        })

@socketio.on('leave_terminal')
def handle_leave_terminal(data):
    """离开Web终端房间"""
    instance_id = data.get('instance_id')
    if not instance_id:
        emit('error', {'message': '缺少实例ID'})
        return
    
    logger.info(f'客户端离开Web终端房间: terminal_{instance_id}')
    leave_room(f'terminal_{instance_id}')
    
    # 清理Web终端连接
    from app.services.web_terminal import web_terminal_manager
    web_terminal_manager.terminate_terminal(instance_id)
    
    emit('terminal_disconnected', {'instance_id': instance_id})

@socketio.on('terminal_input')
def handle_terminal_input(data):
    """处理Web终端输入"""
    try:
        instance_id = data.get('instance_id')
        input_data = data.get('input', '')
        
        if not instance_id:
            emit('terminal_error', {
                'instance_id': instance_id,
                'error': '缺少实例ID'
            })
            return
        
        from app.services.web_terminal import web_terminal_manager
        
        success = web_terminal_manager.send_input(instance_id, input_data)
        
        if not success:
            emit('terminal_error', {
                'instance_id': instance_id,
                'error': 'Web终端输入发送失败'
            })
            
    except Exception as e:
        logger.error(f'处理Web终端输入失败: {str(e)}')
        emit('terminal_error', {
            'instance_id': instance_id,
            'error': str(e)
        })

@socketio.on('terminal_resize')
def handle_terminal_resize(data):
    """处理Web终端大小调整"""
    try:
        instance_id = data.get('instance_id')
        rows = data.get('rows')
        cols = data.get('cols')
        
        if not instance_id or not rows or not cols:
            logger.error(f'终端大小调整参数不完整: {data}')
            return
        
        from app.services.web_terminal import web_terminal_manager
        
        success = web_terminal_manager.resize_terminal(instance_id, rows, cols)
        
        if success:
            logger.info(f'终端大小已调整: {instance_id} -> {cols}x{rows}')
        else:
            logger.warning(f'终端大小调整失败: {instance_id}')
            
    except Exception as e:
        logger.error(f'处理终端大小调整失败: {str(e)}')

@socketio.on('terminal_detach')
def handle_terminal_detach(data):
    """分离Web终端（保持tmux会话运行）"""
    try:
        instance_id = data.get('instance_id')
        
        if not instance_id:
            emit('terminal_error', {
                'instance_id': instance_id,
                'error': '缺少实例ID'
            })
            return
        
        from app.services.web_terminal import web_terminal_manager
        
        success = web_terminal_manager.detach_terminal(instance_id)
        
        if success:
            emit('terminal_disconnected', {
                'instance_id': instance_id,
                'message': 'tmux会话已分离，继续在后台运行'
            })
            logger.info(f'Web终端已分离: {instance_id}')
        else:
            emit('terminal_error', {
                'instance_id': instance_id,
                'error': '分离Web终端失败'
            })
            
    except Exception as e:
        logger.error(f'分离Web终端失败: {str(e)}')
        emit('terminal_error', {
            'instance_id': instance_id,
            'error': str(e)
        })

@socketio.on('terminal_terminate')
def handle_terminal_terminate(data):
    """终止Web终端连接"""
    try:
        instance_id = data.get('instance_id')
        
        if not instance_id:
            emit('terminal_error', {
                'instance_id': instance_id,
                'error': '缺少实例ID'
            })
            return
        
        from app.services.web_terminal import web_terminal_manager
        
        success = web_terminal_manager.terminate_terminal(instance_id)
        
        if success:
            emit('terminal_disconnected', {
                'instance_id': instance_id,
                'message': 'Web终端连接已终止'
            })
            logger.info(f'Web终端连接已终止: {instance_id}')
        else:
            emit('terminal_error', {
                'instance_id': instance_id,
                'error': '终止Web终端连接失败'
            })
            
    except Exception as e:
        logger.error(f'终止Web终端连接失败: {str(e)}')
        emit('terminal_error', {
            'instance_id': instance_id,
            'error': str(e)
        })
            
    except Exception as e:
        logger.error(f'Web终端输入处理失败: {str(e)}')
        emit('error', {'message': f'Web终端输入处理失败: {str(e)}'})

@socketio.on('terminal_resize')
def handle_terminal_resize(data):
    """处理Web终端大小调整"""
    try:
        instance_id = data.get('instance_id')
        rows = data.get('rows', 24)
        cols = data.get('cols', 80)
        
        if not instance_id:
            emit('error', {'message': '缺少实例ID'})
            return
        
        from app.services.web_terminal import web_terminal_manager
        
        success = web_terminal_manager.resize_terminal(instance_id, rows, cols)
        
        if success:
            logger.info(f'Web终端大小已调整: {instance_id} ({rows}x{cols})')
        else:
            emit('error', {'message': 'Web终端大小调整失败'})
            
    except Exception as e:
        logger.error(f'Web终端大小调整失败: {str(e)}')
        emit('error', {'message': f'Web终端大小调整失败: {str(e)}'})

@socketio.on('disconnect')
def handle_disconnect():
    """客户端断开连接时清理Web终端"""
    logger.info('客户端已断开连接，清理Web终端资源')
    
    try:
        from app.services.web_terminal import web_terminal_manager
        # 注意：这里不能清理所有终端，因为可能有多个客户端
        # 实际应用中需要跟踪每个客户端的终端连接
    except Exception as e:
        logger.error(f'清理Web终端资源失败: {str(e)}')
