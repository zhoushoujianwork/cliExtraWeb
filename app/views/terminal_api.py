# -*- coding: utf-8 -*-
"""
Terminal API for cliExtra log file streaming with scroll loading
"""
import subprocess
import threading
import time
import os
import glob
from flask import Blueprint, jsonify, request
from flask_socketio import emit
from app import socketio

bp = Blueprint('terminal_api', __name__)

# 存储活跃的tail进程
active_tail_processes = {}

# cliExtra日志目录
CLIEXTRA_LOG_BASE = os.path.expanduser("~/Library/Application Support/cliExtra/namespaces")

@bp.route('/api/terminal/output/<instance_id>')
def get_terminal_output(instance_id):
    """获取终端输出，支持分页和滚动加载"""
    try:
        # 获取查询参数
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 100))
        direction = request.args.get('direction', 'forward')  # forward/backward
        from_line = int(request.args.get('from_line', 0))
        
        from app.services.instance_manager import InstanceManager
        manager = InstanceManager()
        
        # 获取完整的输出历史
        result = manager.get_terminal_output_with_pagination(
            instance_id, page, page_size, direction, from_line
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/terminal/history/<instance_id>')
def get_terminal_history(instance_id):
    """获取终端历史记录统计信息"""
    try:
        from app.services.instance_manager import InstanceManager
        manager = InstanceManager()
        
        result = manager.get_terminal_history_info(instance_id)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/terminal/search/<instance_id>')
def search_terminal_output(instance_id):
    """搜索终端输出内容"""
    try:
        query = request.args.get('q', '')
        max_results = int(request.args.get('max_results', 50))
        
        if not query:
            return jsonify({'error': 'Search query is required'}), 400
            
        from app.services.instance_manager import InstanceManager
        manager = InstanceManager()
        
        result = manager.search_terminal_output(instance_id, query, max_results)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/terminal/start_tail/<instance_id>')
def start_tail(instance_id):
    """开始tail cliExtra实例日志文件"""
    try:
        # 查找对应的日志文件
        log_file = find_instance_log_file(instance_id)
        if not log_file:
            return jsonify({'error': 'Log file not found for instance {}'.format(instance_id)}), 404
        
        # 启动tail进程
        start_tail_process(instance_id, log_file)
        
        return jsonify({
            'status': 'success', 
            'message': 'Started monitoring instance {}'.format(instance_id),
            'log_file': log_file
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/terminal/stop_tail/<instance_id>')
def stop_tail(instance_id):
    """停止tail日志文件"""
    try:
        if instance_id in active_tail_processes:
            process = active_tail_processes[instance_id]
            process.terminate()
            del active_tail_processes[instance_id]
            
        return jsonify({'status': 'success', 'message': 'Stopped monitoring instance {}'.format(instance_id)})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def find_instance_log_file(instance_id):
    """查找实例对应的日志文件"""
    try:
        # 搜索所有namespace下的日志文件
        pattern = os.path.join(CLIEXTRA_LOG_BASE, "*/logs/instance_*{}_*_tmux.log".format(instance_id))
        log_files = glob.glob(pattern)
        
        if log_files:
            # 返回最新的日志文件
            return max(log_files, key=os.path.getmtime)
        
        # 如果没找到，尝试更宽泛的搜索
        pattern = os.path.join(CLIEXTRA_LOG_BASE, "*/logs/*{}*.log".format(instance_id))
        log_files = glob.glob(pattern)
        
        if log_files:
            return max(log_files, key=os.path.getmtime)
            
        return None
        
    except Exception as e:
        print("Error finding log file for {}: {}".format(instance_id, str(e)))
        return None

def start_tail_process(instance_id, log_file):
    """启动tail进程监听日志文件"""
    def tail_worker():
        try:
            # 发送开始监控的消息
            socketio.emit('terminal_output', {
                'instance_id': instance_id,
                'data': '\x1b[32mStarting to monitor log file: {}\x1b[0m\r\n'.format(log_file)
            })
            
            # 使用tail -f命令持续监听日志文件，添加参数确保正确处理
            cmd = ['tail', '-f', '-n', '50', log_file]  # 先显示最后50行
            
            # 启动tail进程
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=False,  # 使用二进制模式
                bufsize=0  # 无缓冲
            )
            
            # 存储进程引用
            active_tail_processes[instance_id] = process
            
            # 读取输出
            while instance_id in active_tail_processes and process.poll() is None:
                try:
                    # 读取原始字节数据
                    data = process.stdout.read(1024)
                    if data:
                        try:
                            # 尝试UTF-8解码
                            text = data.decode('utf-8', errors='replace')
                            # 确保每行都有正确的换行符
                            if text and not text.endswith('\n'):
                                text = text.replace('\n', '\r\n')
                            else:
                                text = text.replace('\n', '\r\n')
                            
                            socketio.emit('terminal_output', {
                                'instance_id': instance_id,
                                'data': text
                            })
                        except UnicodeDecodeError:
                            # 如果UTF-8解码失败，尝试其他编码
                            try:
                                text = data.decode('gbk', errors='replace')
                                text = text.replace('\n', '\r\n')
                                socketio.emit('terminal_output', {
                                    'instance_id': instance_id,
                                    'data': text
                                })
                            except:
                                # 最后的备用方案
                                socketio.emit('terminal_output', {
                                    'instance_id': instance_id,
                                    'data': '[Binary data]\r\n'
                                })
                    else:
                        time.sleep(0.1)
                        
                except Exception as e:
                    socketio.emit('terminal_error', {
                        'instance_id': instance_id,
                        'error': 'Error reading log: {}'.format(str(e))
                    })
                    break
                    
        except Exception as e:
            socketio.emit('terminal_error', {
                'instance_id': instance_id,
                'error': 'Failed to start tail process: {}'.format(str(e))
            })
        finally:
            # 清理进程
            if instance_id in active_tail_processes:
                try:
                    process = active_tail_processes[instance_id]
                    process.terminate()
                    process.wait(timeout=5)
                except:
                    pass
                del active_tail_processes[instance_id]
    
    # 停止已存在的进程
    if instance_id in active_tail_processes:
        try:
            active_tail_processes[instance_id].terminate()
        except:
            pass
        del active_tail_processes[instance_id]
    
    # 启动新的线程
    thread = threading.Thread(target=tail_worker, daemon=True)
    thread.start()

@socketio.on('start_terminal_monitoring')
def handle_start_monitoring(data):
    """WebSocket处理开始监听终端"""
    instance_id = data.get('instance_id')
    if instance_id:
        log_file = find_instance_log_file(instance_id)
        if log_file:
            start_tail_process(instance_id, log_file)
            emit('terminal_status', {
                'status': 'started', 
                'instance_id': instance_id,
                'log_file': log_file
            })
        else:
            emit('terminal_error', {
                'instance_id': instance_id,
                'error': 'Log file not found'
            })

@socketio.on('stop_terminal_monitoring')
def handle_stop_monitoring(data):
    """WebSocket处理停止监听终端"""
    instance_id = data.get('instance_id')
    if instance_id and instance_id in active_tail_processes:
        try:
            process = active_tail_processes[instance_id]
            process.terminate()
            del active_tail_processes[instance_id]
            emit('terminal_status', {'status': 'stopped', 'instance_id': instance_id})
        except Exception as e:
            emit('terminal_error', {
                'instance_id': instance_id,
                'error': 'Error stopping monitoring: {}'.format(str(e))
            })
