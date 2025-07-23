"""
Terminal API for tmux output streaming
"""
import subprocess
import threading
import time
from flask import Blueprint, jsonify, request
from flask_socketio import emit
from app import socketio

bp = Blueprint('terminal_api', __name__)

# 存储活跃的tail进程
active_tail_processes = {}

@bp.route('/api/terminal/start_tail/<instance_id>')
def start_tail(instance_id):
    """开始tail tmux会话输出"""
    try:
        # 检查实例是否存在
        result = subprocess.run(['cliExtra', 'list'], 
                              capture_output=True, text=True, timeout=10)
        
        if instance_id not in result.stdout:
            return jsonify({'error': 'Instance {} not found'.format(instance_id)}), 404
        
        # 启动tail进程
        start_tail_process(instance_id)
        
        return jsonify({'status': 'success', 'message': 'Started monitoring instance {}'.format(instance_id)})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/terminal/stop_tail/<instance_id>')
def stop_tail(instance_id):
    """停止tail tmux会话输出"""
    try:
        if instance_id in active_tail_processes:
            process = active_tail_processes[instance_id]
            process.terminate()
            del active_tail_processes[instance_id]
            
        return jsonify({'status': 'success', 'message': 'Stopped monitoring instance {}'.format(instance_id)})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def start_tail_process(instance_id):
    """启动tail进程监听tmux输出"""
    def tail_worker():
        try:
            # 获取tmux会话名
            session_name = "cliExtra_{}".format(instance_id)
            
            # 使用tmux capture-pane命令持续获取输出
            cmd = ['tmux', 'capture-pane', '-t', session_name, '-p']
            
            last_output = ""
            while instance_id in active_tail_processes:
                try:
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
                    if result.returncode == 0:
                        current_output = result.stdout
                        if current_output != last_output:
                            # 只发送新的内容
                            new_lines = current_output.split('\n')
                            last_lines = last_output.split('\n') if last_output else []
                            
                            # 找出新增的行
                            if len(new_lines) > len(last_lines):
                                new_content = '\n'.join(new_lines[len(last_lines):])
                                if new_content.strip():
                                    socketio.emit('terminal_output', {
                                        'instance_id': instance_id,
                                        'data': new_content
                                    })
                            
                            last_output = current_output
                    
                    time.sleep(1)  # 每秒检查一次
                    
                except subprocess.TimeoutExpired:
                    continue
                except Exception as e:
                    socketio.emit('terminal_error', {
                        'instance_id': instance_id,
                        'error': str(e)
                    })
                    break
                    
        except Exception as e:
                    socketio.emit('terminal_error', {
                        'instance_id': instance_id,
                        'error': 'Failed to start tail process: {}'.format(str(e))
                    })
        finally:
            if instance_id in active_tail_processes:
                del active_tail_processes[instance_id]
    
    # 停止已存在的进程
    if instance_id in active_tail_processes:
        active_tail_processes[instance_id].terminate()
    
    # 启动新的线程
    thread = threading.Thread(target=tail_worker, daemon=True)
    thread.start()
    active_tail_processes[instance_id] = thread

@socketio.on('start_terminal_monitoring')
def handle_start_monitoring(data):
    """WebSocket处理开始监听终端"""
    instance_id = data.get('instance_id')
    if instance_id:
        start_tail_process(instance_id)
        emit('terminal_status', {'status': 'started', 'instance_id': instance_id})

@socketio.on('stop_terminal_monitoring')
def handle_stop_monitoring(data):
    """WebSocket处理停止监听终端"""
    instance_id = data.get('instance_id')
    if instance_id and instance_id in active_tail_processes:
        process = active_tail_processes[instance_id]
        process.terminate()
        del active_tail_processes[instance_id]
        emit('terminal_status', {'status': 'stopped', 'instance_id': instance_id})
