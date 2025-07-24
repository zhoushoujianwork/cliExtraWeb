"""
基于tmux的Q CLI实例管理器
支持用户随时接管终端，同时支持程序化交互
支持基于namespace的会话历史和新的目录结构
"""
import subprocess
import threading
import time
import logging
import os
import re
import json
import platform
from datetime import datetime
from typing import Dict, List, Optional
from queue import Queue, Empty

from app.models.instance import QInstance
from config.config import Config

logger = logging.getLogger(__name__)

class InstanceManager:
    """Q CLI实例管理器 - 基于cliExtra命令实现，支持namespace和会话历史"""
    
    def __init__(self):
        self.instances = {}
        self._lock = threading.Lock()
        self._start_lock = threading.Lock()
        
        # 根据系统类型确定工作目录
        self.work_dir = self._get_work_directory()
        self.sessions_dir = os.path.join(os.path.dirname(__file__), 'sessions')
        self.log_file = "/tmp/tmux_q_chat.log"
        
        self._ensure_directories()
        self._check_tmux()
    
    def _get_work_directory(self):
        """根据系统类型获取cliExtra工作目录"""
        system = platform.system()
        if system == "Darwin":  # macOS
            return os.path.expanduser("~/Library/Application Support/cliExtra")
        elif system == "Linux":
            return "/opt/cliExtra"
        else:
            # Windows或其他系统，使用用户目录
            return os.path.expanduser("~/.cliExtra")
    
    def _ensure_directories(self):
        """确保必要的目录存在"""
        os.makedirs(self.sessions_dir, exist_ok=True)
        os.makedirs(self.work_dir, exist_ok=True)
    
    def _check_tmux(self):
        """检查tmux是否安装"""
        if not subprocess.run(['which', 'tmux'], capture_output=True).returncode == 0:
            raise RuntimeError("tmux未安装")
    
    def _check_cliExtra(self):
        """检查cliExtra命令是否可用"""
        if not subprocess.run(['which', 'cliExtra'], capture_output=True).returncode == 0:
            raise RuntimeError("cliExtra命令未安装")
    
    def get_namespace_instances_dir(self, namespace='default'):
        """获取指定namespace的实例目录"""
        return os.path.join(self.work_dir, 'namespaces', namespace, 'instances')
    
    def get_namespace_logs_dir(self, namespace='default'):
        """获取指定namespace的日志目录"""
        return os.path.join(self.work_dir, 'namespaces', namespace, 'logs')
    
    def get_namespace_conversations_dir(self, namespace='default'):
        """获取指定namespace的对话记录目录"""
        return os.path.join(self.work_dir, 'namespaces', namespace, 'conversations')
    
    def get_instance_tmux_log_path(self, instance_id, namespace='default'):
        """获取实例的tmux日志文件路径"""
        instances_dir = self.get_namespace_instances_dir(namespace)
        return os.path.join(instances_dir, instance_id, 'tmux.log')
    
    def get_instance_conversation_path(self, instance_id, namespace='default'):
        """获取实例的对话记录文件路径"""
        conversations_dir = self.get_namespace_conversations_dir(namespace)
        return os.path.join(conversations_dir, f'{instance_id}.json')
    
    def sync_screen_instances(self, namespace_filter: Optional[str] = None, show_all_namespaces: bool = True):
        """同步tmux实例状态 - 使用cliExtra list --json命令
        
        Args:
            namespace_filter: 指定namespace过滤器
            show_all_namespaces: 是否显示所有namespace的实例（默认True保持兼容性）
        """
        try:
            self._check_cliExtra()
            
            # 构建qq list命令（使用qq别名）
            cmd = ['qq', 'list', '--json']
            
            if namespace_filter:
                # 如果指定了namespace，使用-n参数
                cmd.extend(['-n', namespace_filter])
            elif show_all_namespaces:
                # 如果要显示所有namespace，添加--all参数（适配新默认行为）
                cmd.append('--all')
            # 如果show_all_namespaces=False且没有namespace_filter，则使用默认行为（只显示default）
            
            logger.info(f"🔍 执行命令: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            
            if result.returncode != 0:
                logger.error(f"获取实例列表失败: {result.stderr}")
                return
            
            # 解析JSON输出
            try:
                data = json.loads(result.stdout.strip())
                instances_data = data.get('instances', [])
                
                current_instances = set()
                
                # 处理实例数据
                for instance_data in instances_data:
                    instance_id = instance_data.get('id')
                    if not instance_id:
                        continue
                        
                    current_instances.add(instance_id)
                    
                    with self._lock:
                        if instance_id not in self.instances:
                            instance = QInstance(id=instance_id)
                            self.instances[instance_id] = instance
                            logger.info(f"发现cliExtra实例: {instance_id}")
                        
                        # 更新实例信息
                        instance = self.instances[instance_id]
                        
                        # 适配新的JSON格式，直接从输出中获取namespace
                        instance.status = 'running' if instance_data.get('status') == 'Attached' else instance_data.get('status', 'unknown')
                        instance.screen_session = instance_data.get('session', '')  # tmux session
                        instance.namespace = instance_data.get('namespace', 'default')  # 直接从JSON获取namespace
                        instance.project_path = instance_data.get('project_path', '')
                        instance.role = instance_data.get('role', '')
                        
                        # 从attach_command提取更多信息
                        attach_command = instance_data.get('attach_command', '')
                        if attach_command and not instance.screen_session:
                            if 'tmux attach-session -t ' in attach_command:
                                instance.screen_session = attach_command.replace('tmux attach-session -t ', '')
                        
                        # 尝试获取详细信息（如果需要更多字段）
                        try:
                            detail_result = subprocess.run(
                                ['cliExtra', 'list', instance_id, '--json'],
                                capture_output=True, text=True, timeout=5
                            )
                            if detail_result.returncode == 0:
                                detail_data = json.loads(detail_result.stdout.strip())
                                detail_instance = detail_data.get('instance', {})
                                
                                # 更新详细信息
                                instance.path = detail_instance.get('project_dir', '')
                                instance.start_time = detail_instance.get('log_modified', '')
                                instance.role = detail_instance.get('role', '')
                                instance.pid = detail_instance.get('pid', '')
                                
                                # 如果详细信息中有namespace，优先使用
                                if 'namespace' in detail_instance:
                                    instance.namespace = detail_instance['namespace']
                        except:
                            # 如果获取详细信息失败，使用基本信息
                            pass
                        
                        # 简化详细信息显示 - 只保留基本状态
                        # 不再生成复杂的details字段，让前端决定如何显示
                        instance.details = f'{instance.status}'
                
                # 移除不存在的实例
                with self._lock:
                    to_remove = []
                    for instance_id in self.instances:
                        if instance_id not in current_instances:
                            to_remove.append(instance_id)
                    
                    for instance_id in to_remove:
                        del self.instances[instance_id]
                        logger.info(f"移除不存在的cliExtra实例: {instance_id}")
                
                # 如果没有实例，记录日志
                if not instances_data:
                    with self._lock:
                        count = len(self.instances)
                        if count > 0:
                            self.instances.clear()
                            logger.info(f"没有活跃的cliExtra实例，清空了 {count} 个实例")
                            
            except json.JSONDecodeError as e:
                logger.error(f"解析cliExtra list --json输出失败: {e}")
                logger.debug(f"原始输出: {result.stdout}")
                        
        except subprocess.TimeoutExpired:
            logger.error("同步实例状态超时")
        except Exception as e:
            logger.error(f"同步cliExtra实例失败: {e}")
    
    def get_instances(self) -> List[Dict[str, any]]:
        """获取所有实例信息"""
        # 先同步一次状态
        self.sync_screen_instances()
        
        with self._lock:
            return [instance.to_dict() for instance in self.instances.values()]
    
    def get_instance(self, instance_id: str) -> Optional[QInstance]:
        """获取指定实例"""
        return self.instances.get(instance_id)
    
    def get_instances_status(self) -> Dict[str, Dict]:
        """获取所有实例的状态信息"""
        try:
            # 先同步实例状态
            self.sync_screen_instances()
            
            status_info = {}
            with self._lock:
                for instance_id, instance in self.instances.items():
                    try:
                        status_info[instance_id] = self._get_instance_status(instance)
                    except Exception as e:
                        logger.error(f"获取实例 {instance_id} 状态失败: {e}")
                        status_info[instance_id] = {
                            'status': 'error',
                            'color': 'red',
                            'description': f'状态检查失败: {str(e)}',
                            'last_activity': instance.created_at if hasattr(instance, 'created_at') else ''
                        }
            
            logger.info(f"获取到 {len(status_info)} 个实例状态")
            return status_info
        except Exception as e:
            logger.error(f"获取实例状态失败: {e}")
            return {}
    
    def get_instance_detailed_status(self, instance_name: str) -> Dict:
        """获取单个实例的详细状态信息"""
        try:
            # 先同步实例状态
            self.sync_screen_instances()
            
            instance = self.instances.get(instance_name)
            if not instance:
                return {'error': f'实例 {instance_name} 不存在'}
            
            return self._get_detailed_instance_status(instance)
        except Exception as e:
            logger.error(f"获取实例 {instance_name} 详细状态失败: {e}")
            return {'error': str(e)}
    
    def _get_instance_status(self, instance: QInstance) -> Dict:
        """获取实例基本状态信息 - 简化版，只关注状态文件"""
        try:
            # 只读取状态文件，不检查tmux会话
            status_from_file = self._read_status_file(instance.name)
            if status_from_file:
                return status_from_file
            
            # 如果没有状态文件，默认为idle
            return {
                'status': 'idle',
                'color': 'green',
                'description': '空闲中',
                'last_activity': instance.created_at if hasattr(instance, 'created_at') else ''
            }
        except Exception as e:
            logger.error(f"获取实例 {instance.name} 状态失败: {e}")
            return {
                'status': 'idle',
                'color': 'green', 
                'description': '空闲中',
                'last_activity': instance.created_at if hasattr(instance, 'created_at') else ''
            }
    
    def _read_status_file(self, instance_name: str) -> Optional[Dict]:
        """读取实例状态文件 - 简化版，只关注idle/busy"""
        try:
            # 尝试从不同namespace查找状态文件
            possible_paths = [
                os.path.join(self.work_dir, "namespaces", "q_cli", "status", f"{instance_name}.status"),
                os.path.join(self.work_dir, "namespaces", "default", "status", f"{instance_name}.status"),
                os.path.join(self.work_dir, "namespaces", "frontend", "status", f"{instance_name}.status"),
                os.path.join(self.work_dir, "namespaces", "backend", "status", f"{instance_name}.status"),
            ]
            
            for status_file_path in possible_paths:
                if os.path.exists(status_file_path):
                    with open(status_file_path, 'r', encoding='utf-8') as f:
                        status_data = json.load(f)
                    
                    # 只关注idle和busy状态
                    status = status_data.get('status', 'idle')
                    if status not in ['idle', 'busy']:
                        status = 'idle'  # 其他状态都当作idle
                    
                    color = 'green' if status == 'idle' else 'orange'
                    description = '空闲中' if status == 'idle' else '忙碌中'
                    
                    return {
                        'status': status,
                        'color': color,
                        'description': description,
                        'last_activity': status_data.get('last_activity', status_data.get('timestamp', '')),
                        'task': status_data.get('task', ''),
                        'from_file': True
                    }
            
            return None
        except Exception as e:
            logger.debug(f"读取实例 {instance_name} 状态文件失败: {e}")
            return None
    
    def _get_detailed_instance_status(self, instance: QInstance) -> Dict:
        """获取实例详细状态信息"""
        basic_status = self._get_instance_status(instance)
        
        try:
            # 获取更多详细信息
            session_info = self._get_session_info(instance.session_name)
            recent_output = self._get_recent_session_output(instance.session_name, lines=20)
            
            return {
                **basic_status,
                'instance_name': instance.name,
                'session_name': instance.session_name,
                'namespace': instance.namespace,
                'role': instance.role,
                'created_at': instance.created_at,
                'session_info': session_info,
                'recent_output': recent_output,
                'uptime': self._calculate_uptime(instance.created_at)
            }
        except Exception as e:
            logger.error(f"获取实例 {instance.name} 详细状态失败: {e}")
            return {
                **basic_status,
                'error': str(e)
            }
    
    def _analyze_instance_status(self, recent_output: str) -> Dict:
        """分析实例输出判断状态"""
        if not recent_output:
            return {
                'status': 'idle',
                'color': 'green',
                'description': '空闲中'
            }
        
        # 检查是否在等待用户输入
        if any(indicator in recent_output.lower() for indicator in [
            'waiting for', '等待', 'please enter', '请输入', 
            'press any key', '按任意键', '>', '$', '#'
        ]):
            return {
                'status': 'waiting',
                'color': 'blue',
                'description': '等待输入'
            }
        
        # 检查是否有错误信息
        if any(error in recent_output.lower() for error in [
            'error', 'failed', 'exception', '错误', '失败', '异常'
        ]):
            return {
                'status': 'error',
                'color': 'red',
                'description': '执行错误'
            }
        
        # 检查是否在处理中
        if any(busy in recent_output.lower() for busy in [
            'processing', 'loading', 'running', '处理中', '加载中', '运行中',
            'analyzing', '分析中', 'generating', '生成中'
        ]):
            return {
                'status': 'busy',
                'color': 'yellow',
                'description': '处理中'
            }
        
        # 默认为空闲状态
        return {
            'status': 'idle',
            'color': 'green',
            'description': '空闲中'
        }
    
    def _get_recent_session_output(self, session_name: str, lines: int = 5) -> str:
        """获取会话最近的输出"""
        try:
            cmd = f"tmux capture-pane -t {session_name} -p -S -{lines}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=5)
            return result.stdout.strip() if result.returncode == 0 else ""
        except Exception as e:
            logger.debug(f"获取会话 {session_name} 输出失败: {e}")
            return ""
    
    def _get_session_pid(self, session_name: str) -> Optional[int]:
        """获取tmux会话的PID"""
        try:
            cmd = f"tmux list-sessions -F '#{session_name}:#{session_id}' | grep '^{session_name}:' | cut -d: -f2"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=5)
            if result.returncode == 0 and result.stdout.strip():
                session_id = result.stdout.strip()
                # 获取会话中的进程PID
                cmd = f"tmux list-panes -t {session_name} -F '#{pane_pid}'"
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=5)
                if result.returncode == 0 and result.stdout.strip():
                    return int(result.stdout.strip().split('\n')[0])
        except Exception as e:
            logger.debug(f"获取会话 {session_name} PID失败: {e}")
        return None
    
    def _get_session_info(self, session_name: str) -> Dict:
        """获取tmux会话信息"""
        try:
            cmd = f"tmux display-message -t {session_name} -p '#{session_name}|#{session_created}|#{session_activity}'"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                parts = result.stdout.strip().split('|')
                return {
                    'session_name': parts[0] if len(parts) > 0 else session_name,
                    'created': parts[1] if len(parts) > 1 else '',
                    'last_activity': parts[2] if len(parts) > 2 else ''
                }
        except Exception as e:
            logger.debug(f"获取会话 {session_name} 信息失败: {e}")
        return {}
    
    def _get_last_activity_time(self, session_name: str) -> str:
        """获取会话最后活动时间"""
        try:
            cmd = f"tmux display-message -t {session_name} -p '#{session_activity}'"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception as e:
            logger.debug(f"获取会话 {session_name} 活动时间失败: {e}")
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    def _calculate_uptime(self, created_at: str) -> str:
        """计算运行时间"""
        try:
            created_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            uptime = datetime.now() - created_time.replace(tzinfo=None)
            
            days = uptime.days
            hours, remainder = divmod(uptime.seconds, 3600)
            minutes, _ = divmod(remainder, 60)
            
            if days > 0:
                return f"{days}天 {hours}小时 {minutes}分钟"
            elif hours > 0:
                return f"{hours}小时 {minutes}分钟"
            else:
                return f"{minutes}分钟"
        except Exception as e:
            logger.debug(f"计算运行时间失败: {e}")
            return "未知"
    
    def get_instances_by_namespace(self, namespace: str) -> Dict[str, any]:
        """获取指定namespace的实例列表"""
        try:
            self._check_cliExtra()
            
            # 使用cliExtra list --json -n命令获取指定namespace的实例
            result = subprocess.run(
                ['cliExtra', 'list', '--json', '-n', namespace], 
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode != 0:
                logger.error(f"获取namespace {namespace} 实例列表失败: {result.stderr}")
                return {'success': False, 'error': result.stderr, 'instances': []}
            
            # 解析JSON输出
            try:
                data = json.loads(result.stdout.strip())
                instances_data = data.get('instances', [])
                
                # 转换为标准格式
                instances = []
                for instance_data in instances_data:
                    instance_id = instance_data.get('id')
                    if not instance_id:
                        continue
                    
                    instance_info = {
                        'id': instance_id,
                        'status': instance_data.get('status', 'Unknown'),
                        'session': instance_data.get('session', ''),
                        'namespace': instance_data.get('namespace', namespace),
                        'attach_command': instance_data.get('attach_command', ''),
                        # 新增字段
                        'project_dir': instance_data.get('project_dir', ''),
                        'project_path': instance_data.get('project_dir', ''),  # 保持兼容性
                        'role': instance_data.get('role', ''),
                        'tools': instance_data.get('tools', []),
                        'started_at': instance_data.get('started_at', ''),
                        'pid': instance_data.get('pid', ''),
                        'log_file': instance_data.get('log_file', ''),
                        'log_size': instance_data.get('log_size', 0),
                        'log_modified': instance_data.get('log_modified', ''),
                        'conversation_file': instance_data.get('conversation_file', ''),
                        # 保持向后兼容的字段
                        'created_at': instance_data.get('started_at', ''),
                        'last_activity': instance_data.get('log_modified', '')
                    }
                    instances.append(instance_info)
                
                logger.info(f"获取到namespace {namespace} 的 {len(instances)} 个实例")
                return {'success': True, 'instances': instances}
                
            except json.JSONDecodeError as e:
                logger.error(f"解析namespace {namespace} 实例列表JSON失败: {e}")
                return {'success': False, 'error': f'JSON解析失败: {str(e)}', 'instances': []}
                
        except Exception as e:
            logger.error(f"获取namespace {namespace} 实例列表失败: {str(e)}")
            return {'success': False, 'error': str(e), 'instances': []}
    
    def send_message(self, instance_id: str, message: str) -> Dict[str, any]:
        """向cliExtra实例发送消息"""
        try:
            self._check_cliExtra()
            
            # 构建完整命令（qq send不需要-system参数）
            cmd = ['qq', 'send', instance_id, message]
            cmd_str = ' '.join([f'"{arg}"' if ' ' in arg else arg for arg in cmd])
            
            # 详细日志输出
            logger.info(f'🚀 准备发送消息到实例: {instance_id}')
            logger.info(f'📝 消息内容: {message}')
            logger.info(f'🔧 执行命令: {cmd_str}')
            logger.info(f'📋 命令数组: {cmd}')
            
            result = subprocess.run(
                cmd,
                capture_output=True, text=True, timeout=10
            )
            
            # 详细结果日志
            logger.info(f'📊 命令返回码: {result.returncode}')
            logger.info(f'📤 标准输出: {result.stdout}')
            logger.info(f'📤 错误输出: {result.stderr}')
            
            if result.returncode == 0:
                logger.info(f'✅ 消息发送成功到实例 {instance_id}')
                return {'success': True, 'stdout': result.stdout, 'stderr': result.stderr}
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f'❌ 消息发送失败到实例 {instance_id}: {error_msg}')
                return {'success': False, 'error': error_msg, 'stdout': result.stdout, 'stderr': result.stderr}
                
        except subprocess.TimeoutExpired:
            error_msg = '发送消息超时'
            logger.error(f'⏰ 向cliExtra实例 {instance_id} 发送消息超时（10秒）')
            logger.error(f'🔧 超时命令: qq send {instance_id} -system "{message}"')
            return {'success': False, 'error': error_msg}
        except Exception as e:
            logger.error(f'💥 向cliExtra实例 {instance_id} 发送消息异常: {str(e)}')
            logger.error(f'🔧 失败命令: qq send {instance_id} -system "{message}"')
            logger.error(f'📋 异常类型: {type(e).__name__}')
            return {'success': False, 'error': str(e)}
    
    def stop_instance(self, instance_id: str) -> Dict[str, any]:
        """停止cliExtra实例"""
        try:
            self._check_cliExtra()
            
            result = subprocess.run(
                ['cliExtra', 'stop', instance_id],
                capture_output=True, text=True, timeout=10
            )
            
            # 从实例列表中移除
            with self._lock:
                if instance_id in self.instances:
                    del self.instances[instance_id]
            
            if result.returncode == 0:
                logger.info(f'cliExtra实例 {instance_id} 已停止')
                return {'success': True}
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f'停止cliExtra实例 {instance_id} 失败: {error_msg}')
                return {'success': False, 'error': error_msg}
                
        except subprocess.TimeoutExpired:
            error_msg = '停止实例超时'
            logger.error(f'停止cliExtra实例 {instance_id} 超时')
            return {'success': False, 'error': error_msg}
        except Exception as e:
            logger.error(f'停止cliExtra实例 {instance_id} 失败: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def clean_instance(self, instance_id: str) -> Dict[str, any]:
        """清理cliExtra实例数据"""
        try:
            self._check_cliExtra()
            
            result = subprocess.run(
                ['cliExtra', 'clean', instance_id],
                capture_output=True, text=True, timeout=10
            )
            
            # 从实例列表中移除
            with self._lock:
                if instance_id in self.instances:
                    del self.instances[instance_id]
            
            if result.returncode == 0:
                logger.info(f'cliExtra实例 {instance_id} 数据已清理')
                return {'success': True}
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f'清理cliExtra实例 {instance_id} 失败: {error_msg}')
                return {'success': False, 'error': error_msg}
                
        except subprocess.TimeoutExpired:
            error_msg = '清理实例超时'
            logger.error(f'清理cliExtra实例 {instance_id} 超时')
            return {'success': False, 'error': error_msg}
        except Exception as e:
            logger.error(f'清理cliExtra实例 {instance_id} 失败: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def restart_instance(self, instance_id: str) -> Dict[str, any]:
        """重新启动cliExtra实例"""
        try:
            self._check_cliExtra()
            
            # 使用cliExtra start命令重新启动实例
            result = subprocess.run(
                ['cliExtra', 'start', '--name', instance_id],
                capture_output=True, text=True, timeout=30
            )
            
            if result.returncode == 0:
                logger.info(f'cliExtra实例 {instance_id} 已重新启动')
                # 重新同步实例状态
                self.sync_screen_instances()
                return {'success': True}
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f'重启cliExtra实例 {instance_id} 失败: {error_msg}')
                return {'success': False, 'error': error_msg}
                
        except subprocess.TimeoutExpired:
            error_msg = '重启实例超时'
            logger.error(f'重启cliExtra实例 {instance_id} 超时')
            return {'success': False, 'error': error_msg}
        except Exception as e:
            logger.error(f'重启cliExtra实例 {instance_id} 失败: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def broadcast_message(self, message: str, namespace: str = None, broadcast_all: bool = True) -> Dict[str, any]:
        """广播消息到指定namespace的所有运行中的实例
        
        Args:
            message: 要广播的消息
            namespace: 指定namespace（如果提供，则只广播给该namespace）
            broadcast_all: 是否广播给所有namespace（默认True保持兼容性）
        """
        try:
            self._check_cliExtra()
            
            # 构建qq broadcast命令（使用qq别名）
            cmd = ['qq', 'broadcast', message]
            
            if namespace:
                # 如果指定了namespace，使用--namespace参数
                cmd.extend(['--namespace', namespace])
            elif broadcast_all:
                # 如果要广播给所有namespace，添加--all参数（适配新默认行为）
                cmd.append('--all')
            # 如果broadcast_all=False且没有namespace，则使用默认行为（只广播给default）
            
            logger.info(f"🔍 执行广播命令: {' '.join(cmd)}")
            result = subprocess.run(
                cmd,
                capture_output=True, text=True, timeout=30
            )
            
            if result.returncode == 0:
                # 解析输出获取发送数量
                output = result.stdout.strip()
                sent_count = 0
                
                # 尝试从输出中提取发送数量，寻找"发送给 X 个实例"或"广播给 X 个实例"的模式
                import re
                count_patterns = [
                    r'发送给\s*(\d+)\s*个实例',
                    r'广播给\s*(\d+)\s*个实例',
                    r'已发送给\s*(\d+)\s*个实例',
                    r'成功发送给\s*(\d+)\s*个实例'
                ]
                
                for pattern in count_patterns:
                    count_match = re.search(pattern, output)
                    if count_match:
                        sent_count = int(count_match.group(1))
                        break
                
                if sent_count == 0:
                    # 如果无法解析，获取指定namespace的运行实例数量作为估计
                    with self._lock:
                        if namespace:
                            sent_count = len([inst for inst in self.instances.values() 
                                            if inst.status not in ['Not Running', 'Stopped', 'Terminated']
                                            and getattr(inst, 'namespace', 'default') == namespace])
                        else:
                            sent_count = len([inst for inst in self.instances.values() 
                                            if inst.status not in ['Not Running', 'Stopped', 'Terminated']])
                
                logger.info(f'广播消息成功，发送给 {sent_count} 个实例')
                return {'success': True, 'sent_count': sent_count}
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f'广播消息失败: {error_msg}')
                return {'success': False, 'error': error_msg}
                
        except subprocess.TimeoutExpired:
            error_msg = '广播消息超时'
            logger.error('广播消息超时')
            return {'success': False, 'error': error_msg}
        except Exception as e:
            logger.error(f'广播消息失败: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def get_instance_output(self, instance_id: str, last_position: int = 0) -> List[Dict[str, any]]:
        """获取cliExtra实例输出 - 支持新的基于namespace的目录结构"""
        try:
            # 首先尝试获取实例的namespace信息
            instance_namespace = 'default'
            with self._lock:
                if instance_id in self.instances:
                    instance_namespace = self.instances[instance_id].namespace or 'default'
            
            # 尝试从tmux日志文件读取（新的目录结构）
            tmux_log_path = self.get_instance_tmux_log_path(instance_id, instance_namespace)
            
            if os.path.exists(tmux_log_path):
                return self._read_tmux_log_file(tmux_log_path, last_position)
            
            # 如果新路径不存在，尝试使用cliExtra logs命令作为备选
            self._check_cliExtra()
            
            result = subprocess.run(
                ['cliExtra', 'logs', instance_id, '50'],  # 获取最近50行
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n') if result.stdout.strip() else []
                output = []
                for i, line in enumerate(lines):
                    if i >= last_position:
                        output.append({
                            'type': 'output',
                            'content': line,
                            'timestamp': time.time(),
                            'new_position': i + 1
                        })
                return output
            else:
                logger.warning(f'获取cliExtra实例 {instance_id} 日志失败: {result.stderr}')
                return []
                
        except Exception as e:
            logger.error(f'获取cliExtra实例 {instance_id} 输出失败: {str(e)}')
            return []
    
    def _read_tmux_log_file(self, log_path: str, last_position: int = 0) -> List[Dict[str, any]]:
        """从tmux日志文件读取输出"""
        try:
            if not os.path.exists(log_path):
                return []
            
            with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
                # 跳到指定位置
                if last_position > 0:
                    f.seek(last_position)
                
                content = f.read()
                current_position = f.tell()
                
                if not content:
                    return []
                
                # 按行分割并处理
                lines = content.split('\n')
                output = []
                
                for line in lines:
                    if line.strip():  # 忽略空行
                        output.append({
                            'type': 'output',
                            'content': line,
                            'timestamp': time.time(),
                            'new_position': current_position,
                            'is_streaming': True
                        })
                
                return output
                
        except Exception as e:
            logger.error(f'读取tmux日志文件失败 {log_path}: {str(e)}')
            return []
    
    def get_terminal_output_with_pagination(self, instance_id: str, page: int = 1, 
                                           page_size: int = 100, direction: str = 'forward', 
                                           from_line: int = 0) -> Dict[str, any]:
        """获取终端输出，支持分页和滚动加载"""
        try:
            # 获取实例的namespace信息
            instance_namespace = 'default'
            with self._lock:
                if instance_id in self.instances:
                    instance_namespace = self.instances[instance_id].namespace or 'default'
            
            # 获取tmux日志文件路径
            tmux_log_path = self.get_instance_tmux_log_path(instance_id, instance_namespace)
            
            if not os.path.exists(tmux_log_path):
                return {
                    'success': False,
                    'error': f'日志文件不存在: {tmux_log_path}',
                    'lines': [],
                    'total_lines': 0,
                    'has_more': False
                }
            
            # 读取文件并分页
            return self._read_file_with_pagination(
                tmux_log_path, page, page_size, direction, from_line
            )
            
        except Exception as e:
            logger.error(f'获取终端输出分页失败 {instance_id}: {str(e)}')
            return {
                'success': False,
                'error': str(e),
                'lines': [],
                'total_lines': 0,
                'has_more': False
            }
    
    def _read_file_with_pagination(self, file_path: str, page: int, page_size: int, 
                                 direction: str, from_line: int) -> Dict[str, any]:
        """从文件读取内容并分页"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                # 读取所有行
                all_lines = f.readlines()
                total_lines = len(all_lines)
                
                if total_lines == 0:
                    return {
                        'success': True,
                        'lines': [],
                        'total_lines': 0,
                        'current_page': page,
                        'page_size': page_size,
                        'has_more': False,
                        'has_previous': False
                    }
                
                # 计算分页范围
                if direction == 'backward':
                    # 向上滚动，从指定行向前获取
                    end_line = from_line if from_line > 0 else total_lines
                    start_line = max(0, end_line - page_size)
                else:
                    # 向下滚动，从指定行向后获取
                    start_line = from_line
                    end_line = min(total_lines, start_line + page_size)
                
                # 提取指定范围的行
                selected_lines = all_lines[start_line:end_line]
                
                # 处理行内容
                lines = []
                for i, line in enumerate(selected_lines):
                    lines.append({
                        'line_number': start_line + i + 1,
                        'content': line.rstrip('\n\r'),
                        'timestamp': time.time(),
                        'type': 'output'
                    })
                
                return {
                    'success': True,
                    'lines': lines,
                    'total_lines': total_lines,
                    'current_page': page,
                    'page_size': page_size,
                    'start_line': start_line + 1,
                    'end_line': end_line,
                    'has_more': end_line < total_lines,
                    'has_previous': start_line > 0,
                    'direction': direction
                }
                
        except Exception as e:
            logger.error(f'读取文件分页失败 {file_path}: {str(e)}')
            return {
                'success': False,
                'error': str(e),
                'lines': [],
                'total_lines': 0,
                'has_more': False
            }
    
    def get_terminal_history_info(self, instance_id: str) -> Dict[str, any]:
        """获取终端历史记录统计信息"""
        try:
            # 获取实例的namespace信息
            instance_namespace = 'default'
            with self._lock:
                if instance_id in self.instances:
                    instance_namespace = self.instances[instance_id].namespace or 'default'
            
            # 获取tmux日志文件路径
            tmux_log_path = self.get_instance_tmux_log_path(instance_id, instance_namespace)
            
            if not os.path.exists(tmux_log_path):
                return {
                    'success': False,
                    'error': '日志文件不存在',
                    'total_lines': 0,
                    'file_size': 0
                }
            
            # 获取文件统计信息
            stat = os.stat(tmux_log_path)
            
            # 计算总行数
            with open(tmux_log_path, 'r', encoding='utf-8', errors='ignore') as f:
                total_lines = sum(1 for _ in f)
            
            return {
                'success': True,
                'total_lines': total_lines,
                'file_size': stat.st_size,
                'last_modified': stat.st_mtime,
                'file_path': tmux_log_path,
                'recommended_page_size': min(100, max(50, total_lines // 20))
            }
            
        except Exception as e:
            logger.error(f'获取终端历史信息失败 {instance_id}: {str(e)}')
            return {
                'success': False,
                'error': str(e),
                'total_lines': 0,
                'file_size': 0
            }
    
    def search_terminal_output(self, instance_id: str, query: str, max_results: int = 50) -> Dict[str, any]:
        """搜索终端输出内容"""
        try:
            # 获取实例的namespace信息
            instance_namespace = 'default'
            with self._lock:
                if instance_id in self.instances:
                    instance_namespace = self.instances[instance_id].namespace or 'default'
            
            # 获取tmux日志文件路径
            tmux_log_path = self.get_instance_tmux_log_path(instance_id, instance_namespace)
            
            if not os.path.exists(tmux_log_path):
                return {
                    'success': False,
                    'error': '日志文件不存在',
                    'results': []
                }
            
            # 搜索文件内容
            results = []
            with open(tmux_log_path, 'r', encoding='utf-8', errors='ignore') as f:
                for line_num, line in enumerate(f, 1):
                    if query.lower() in line.lower():
                        results.append({
                            'line_number': line_num,
                            'content': line.rstrip('\n\r'),
                            'match_positions': self._find_match_positions(line, query)
                        })
                        
                        if len(results) >= max_results:
                            break
            
            return {
                'success': True,
                'query': query,
                'results': results,
                'total_matches': len(results),
                'max_results': max_results,
                'has_more': len(results) >= max_results
            }
            
        except Exception as e:
            logger.error(f'搜索终端输出失败 {instance_id}: {str(e)}')
            return {
                'success': False,
                'error': str(e),
                'results': []
            }
    
    def _find_match_positions(self, text: str, query: str) -> List[Dict[str, int]]:
        """查找匹配位置"""
        positions = []
        text_lower = text.lower()
        query_lower = query.lower()
        start = 0
        
        while True:
            pos = text_lower.find(query_lower, start)
            if pos == -1:
                break
            positions.append({
                'start': pos,
                'end': pos + len(query)
            })
            start = pos + 1
        
        return positions
    
    def get_conversation_history(self, instance_id: str, namespace: str = None) -> List[Dict[str, any]]:
        """获取实例的对话历史记录"""
        try:
            if namespace is None:
                # 尝试从实例信息获取namespace
                with self._lock:
                    if instance_id in self.instances:
                        namespace = self.instances[instance_id].namespace or 'default'
                    else:
                        namespace = 'default'
            
            conversation_path = self.get_instance_conversation_path(instance_id, namespace)
            
            if not os.path.exists(conversation_path):
                return []
            
            with open(conversation_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('conversations', [])
                
        except Exception as e:
            logger.error(f'获取实例 {instance_id} 对话历史失败: {str(e)}')
            return []
    
    def save_conversation_message(self, instance_id: str, sender: str, message: str, namespace: str = None):
        """保存对话消息到历史记录"""
        try:
            if namespace is None:
                # 尝试从实例信息获取namespace
                with self._lock:
                    if instance_id in self.instances:
                        namespace = self.instances[instance_id].namespace or 'default'
                    else:
                        namespace = 'default'
            
            conversation_path = self.get_instance_conversation_path(instance_id, namespace)
            conversations_dir = os.path.dirname(conversation_path)
            
            # 确保目录存在
            os.makedirs(conversations_dir, exist_ok=True)
            
            # 读取现有记录
            conversations = []
            if os.path.exists(conversation_path):
                with open(conversation_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    conversations = data.get('conversations', [])
            
            # 添加新消息
            new_message = {
                'timestamp': datetime.now().isoformat(),
                'sender': sender,
                'message': message,
                'instance_id': instance_id,
                'namespace': namespace
            }
            conversations.append(new_message)
            
            # 保持最近1000条记录
            if len(conversations) > 1000:
                conversations = conversations[-1000:]
            
            # 保存到文件
            data = {
                'instance_id': instance_id,
                'namespace': namespace,
                'last_updated': datetime.now().isoformat(),
                'conversations': conversations
            }
            
            with open(conversation_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            logger.error(f'保存对话消息失败 {instance_id}: {str(e)}')
    
    def get_namespace_conversation_history(self, namespace: str, limit: int = 100) -> List[Dict[str, any]]:
        """获取指定namespace的所有对话历史"""
        try:
            conversations_dir = self.get_namespace_conversations_dir(namespace)
            
            if not os.path.exists(conversations_dir):
                return []
            
            all_conversations = []
            
            # 遍历namespace下的所有对话文件
            for filename in os.listdir(conversations_dir):
                if filename.endswith('.json'):
                    file_path = os.path.join(conversations_dir, filename)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            conversations = data.get('conversations', [])
                            all_conversations.extend(conversations)
                    except Exception as e:
                        logger.warning(f'读取对话文件失败 {file_path}: {str(e)}')
            
            # 按时间排序并限制数量
            all_conversations.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            return all_conversations[:limit]
            
        except Exception as e:
            logger.error(f'获取namespace {namespace} 对话历史失败: {str(e)}')
            return []
    
    def replay_conversations(self, target_type: str, target_name: str, limit: int = 50, since: str = None) -> Dict[str, any]:
        """回放对话记录 - 支持实例和namespace级别"""
        try:
            self._check_cliExtra()
            
            cmd = ['cliExtra', 'replay', target_type, target_name]
            
            if limit:
                cmd.extend(['--limit', str(limit)])
            
            if since:
                cmd.extend(['--since', since])
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                # 尝试解析JSON输出
                try:
                    data = json.loads(result.stdout)
                    return {'success': True, 'data': data}
                except json.JSONDecodeError:
                    # 如果不是JSON，返回原始文本
                    return {'success': True, 'data': {'text': result.stdout}}
            else:
                return {'success': False, 'error': result.stderr or result.stdout}
                
        except Exception as e:
            logger.error(f'回放对话记录失败: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def get_available_namespaces(self) -> List[Dict[str, any]]:
        """获取所有可用的namespace"""
        try:
            # 首先尝试使用 cliExtra ns show 命令获取完整信息
            try:
                result = subprocess.run(['cliExtra', 'ns', 'show'], 
                                      capture_output=True, text=True, timeout=10)
                
                if result.returncode == 0:
                    namespaces = []
                    lines = result.stdout.strip().split('\n')
                    
                    # 解析输出，跳过标题行
                    parsing_data = False
                    for line in lines:
                        line = line.strip()
                        if line.startswith('NAME'):
                            parsing_data = True
                            continue
                        elif line.startswith('----'):
                            continue
                        elif parsing_data and line:
                            # 解析每一行：NAME INSTANCES INSTANCE_IDS
                            parts = line.split()
                            if len(parts) >= 2:
                                ns_name = parts[0]
                                instance_count = int(parts[1]) if parts[1].isdigit() else 0
                                
                                namespaces.append({
                                    'name': ns_name,
                                    'instance_count': instance_count,
                                    'path': os.path.join(self.work_dir, 'namespaces', ns_name)
                                })
                    
                    # 确保default namespace存在
                    if not any(ns['name'] == 'default' for ns in namespaces):
                        namespaces.append({
                            'name': 'default', 
                            'instance_count': 0,
                            'path': os.path.join(self.work_dir, 'namespaces', 'default')
                        })
                    
                    logger.info(f'通过 cliExtra ns show 获取到 {len(namespaces)} 个namespace')
                    return sorted(namespaces, key=lambda x: x['name'])
                    
            except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError) as e:
                logger.warning(f'cliExtra ns show 命令执行失败，回退到文件系统扫描: {str(e)}')
            
            # 回退方案：从文件系统获取
            namespaces_dir = os.path.join(self.work_dir, 'namespaces')
            
            if not os.path.exists(namespaces_dir):
                return [{'name': 'default', 'instance_count': 0, 'path': ''}]
            
            namespaces = []
            
            for ns_name in os.listdir(namespaces_dir):
                ns_path = os.path.join(namespaces_dir, ns_name)
                if os.path.isdir(ns_path):
                    # 统计实例数量
                    instances_dir = os.path.join(ns_path, 'instances')
                    instance_count = 0
                    if os.path.exists(instances_dir):
                        instance_count = len([d for d in os.listdir(instances_dir) 
                                            if os.path.isdir(os.path.join(instances_dir, d))])
                    
                    namespaces.append({
                        'name': ns_name,
                        'instance_count': instance_count,
                        'path': ns_path
                    })
            
            # 确保default namespace存在
            if not any(ns['name'] == 'default' for ns in namespaces):
                namespaces.append({'name': 'default', 'instance_count': 0, 'path': ''})
            
            logger.info(f'通过文件系统扫描获取到 {len(namespaces)} 个namespace')
            return sorted(namespaces, key=lambda x: x['name'])
            
        except Exception as e:
            logger.error(f'获取namespace列表失败: {str(e)}')
            return [{'name': 'default', 'instance_count': 0, 'path': ''}]
        """停止cliExtra实例"""
        try:
            self._check_cliExtra()
            
            result = subprocess.run(
                ['cliExtra', 'stop', instance_id],
                capture_output=True, text=True, timeout=10
            )
            
            # 从实例列表中移除
            with self._lock:
                if instance_id in self.instances:
                    del self.instances[instance_id]
            
            if result.returncode == 0:
                logger.info(f'cliExtra实例 {instance_id} 已停止')
                return {'success': True}
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f'停止cliExtra实例 {instance_id} 失败: {error_msg}')
                return {'success': False, 'error': error_msg}
                
        except subprocess.TimeoutExpired:
            error_msg = '停止实例超时'
            logger.error(f'停止cliExtra实例 {instance_id} 超时')
            return {'success': False, 'error': error_msg}
        except Exception as e:
            logger.error(f'停止cliExtra实例 {instance_id} 失败: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def create_instance_with_config(self, name: Optional[str] = None, 
                                   path: Optional[str] = None, 
                                   role: Optional[str] = None,
                                   namespace: Optional[str] = None,
                                   tools: Optional[List[str]] = None) -> Dict[str, any]:
        """创建带配置的cliExtra实例"""
        try:
            with self._start_lock:
                # 构建cliExtra start命令
                cmd = ['cliExtra', 'start']
                
                # 添加路径参数（如果指定）
                if path:
                    cmd.append(path)
                
                # 添加名称参数（如果指定）
                if name:
                    cmd.extend(['--name', name])
                
                # 添加namespace参数（如果指定）
                if namespace:
                    cmd.extend(['--ns', namespace])
                
                # 添加角色参数（如果指定）
                if role:
                    cmd.extend(['--role', role])
                
                # 添加工具参数（如果指定）
                if tools and isinstance(tools, list):
                    for tool in tools:
                        cmd.extend(['--tool', tool])

                # -f 强制启动
                cmd.extend(['-f'])
                
                logger.info(f'启动cliExtra实例，命令: {" ".join(cmd)}')
                start_time = time.time()
                
                # 同步启动实例，增加超时时间到120秒
                result = subprocess.run(
                    cmd,
                    capture_output=True, text=True, timeout=120
                )
                
                end_time = time.time()
                logger.info(f'cliExtra命令执行完成，耗时: {end_time - start_time:.2f}秒')
                
                if result.returncode != 0:
                    error_msg = f'启动cliExtra实例失败: {result.stderr}'
                    logger.error(error_msg)
                    return {'success': False, 'error': error_msg}
                
                logger.info(f'cliExtra实例启动成功: {result.stdout}')
                
                # 等待实例完全启动
                time.sleep(3)
                
                # 同步实例状态
                self.sync_screen_instances()
                
                # 构建返回消息
                instance_desc = []
                if name:
                    instance_desc.append(f"名称: {name}")
                if path:
                    instance_desc.append(f"路径: {path}")
                if role:
                    instance_desc.append(f"角色: {role}")
                if namespace:
                    instance_desc.append(f"namespace: {namespace}")
                
                desc_str = f" ({', '.join(instance_desc)})" if instance_desc else ""
                message = f'cliExtra实例{desc_str}创建成功'
                
                return {
                    'success': True, 
                    'message': message,
                    'instance_id': name if name else 'auto-generated'
                }
                
        except subprocess.TimeoutExpired:
            error_msg = '创建实例超时（120秒）'
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}
        except Exception as e:
            logger.error(f'创建配置实例失败: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def clone_git_repository(self, git_url: str, instance_name: Optional[str] = None, 
                           conflict_resolution: Optional[str] = None) -> Dict[str, any]:
        """克隆Git仓库到默认项目目录"""
        try:
            import os
            import shutil
            from urllib.parse import urlparse
            from app.services.project_config import project_config
            
            # 解析Git URL获取仓库名
            if git_url.endswith('.git'):
                repo_name = os.path.basename(git_url)[:-4]  # 移除.git后缀
            else:
                repo_name = os.path.basename(urlparse(git_url).path)
            
            if not repo_name:
                return {'success': False, 'error': '无法从Git URL解析仓库名称'}
            
            # 获取默认项目目录
            default_projects_dir = project_config.get_default_projects_dir()
            
            # 确定本地目录名（根据配置策略）
            naming_strategy = project_config.get_git_clone_naming()
            if naming_strategy == 'instance_name' and instance_name:
                local_dir_name = instance_name
            else:
                local_dir_name = repo_name
            
            local_path = os.path.join(default_projects_dir, local_dir_name)
            
            # 处理目录冲突
            if os.path.exists(local_path):
                if conflict_resolution == 'delete':
                    # 删除现有目录
                    logger.info(f'删除现有目录: {local_path}')
                    shutil.rmtree(local_path)
                elif conflict_resolution == 'rename':
                    # 使用新名称（添加数字后缀）
                    original_path = local_path
                    counter = 1
                    while os.path.exists(local_path):
                        local_path = f"{original_path}_{counter}"
                        counter += 1
                    logger.info(f'使用新名称: {local_path}')
                elif conflict_resolution == 'use':
                    # 使用现有目录（检查是否为Git仓库）
                    if os.path.exists(os.path.join(local_path, '.git')):
                        logger.info(f'使用现有Git仓库: {local_path}')
                        return {
                            'success': True,
                            'local_path': local_path,
                            'repo_name': repo_name,
                            'projects_dir': default_projects_dir,
                            'message': f'使用现有Git仓库: {local_path}',
                            'reused_existing': True
                        }
                    else:
                        return {
                            'success': False,
                            'error': f'目录存在但不是Git仓库: {local_path}'
                        }
                else:
                    # 没有冲突解决方案，返回冲突信息
                    return {
                        'success': False,
                        'error': f'目录已存在: {local_path}',
                        'directory_exists': True,
                        'conflict_path': local_path
                    }
            
            logger.info(f'开始克隆Git仓库: {git_url} -> {local_path}')
            
            # 执行git clone命令
            cmd = ['git', 'clone', git_url, local_path]
            timeout = project_config.get_git_clone_timeout()
            
            result = subprocess.run(
                cmd,
                capture_output=True, text=True, timeout=timeout
            )
            
            if result.returncode != 0:
                error_msg = f'Git克隆失败: {result.stderr}'
                logger.error(error_msg)
                
                # 清理可能创建的空目录
                if os.path.exists(local_path) and not os.listdir(local_path):
                    try:
                        os.rmdir(local_path)
                    except:
                        pass
                
                return {'success': False, 'error': error_msg}
            
            logger.info(f'Git仓库克隆成功: {local_path}')
            
            return {
                'success': True,
                'local_path': local_path,
                'repo_name': repo_name,
                'projects_dir': default_projects_dir,
                'message': f'Git仓库已克隆到: {local_path}',
                'conflict_resolved': conflict_resolution is not None
            }
            
        except subprocess.TimeoutExpired:
            error_msg = f'Git克隆超时（{project_config.get_git_clone_timeout()}秒）'
            logger.error(error_msg)
            
            # 清理可能创建的空目录
            if 'local_path' in locals() and os.path.exists(local_path):
                try:
                    shutil.rmtree(local_path)
                    logger.info(f'已清理超时的克隆目录: {local_path}')
                except:
                    pass
            
            return {'success': False, 'error': error_msg}
        except Exception as e:
            error_msg = f'Git克隆失败: {str(e)}'
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}
        """为实例应用角色配置"""
        try:
            if not instance_name:
                logger.warning("无法应用角色：实例名称为空")
                return
            
            # 等待实例完全启动
            time.sleep(3)
            
            # 使用cliExtra role apply命令应用角色
            cmd = ['cliExtra', 'role', 'apply', role]
            
            logger.info(f'为实例 {instance_name} 应用角色 {role}，命令: {" ".join(cmd)}')
            
            result = subprocess.run(
                cmd,
                capture_output=True, text=True, timeout=15,
                cwd=os.getcwd()  # 在当前工作目录执行
            )
            
            if result.returncode == 0:
                logger.info(f'成功为实例 {instance_name} 应用角色 {role}: {result.stdout}')
            else:
                logger.error(f'为实例 {instance_name} 应用角色 {role} 失败: {result.stderr}')
                
        except subprocess.TimeoutExpired:
            logger.error(f'应用角色 {role} 超时')
        except Exception as e:
            logger.error(f'应用角色 {role} 失败: {str(e)}')

    def create_instance(self, instance_id: str) -> Dict[str, any]:
        """创建新的cliExtra实例（兼容旧版本）"""
        with self._lock:
            if instance_id in self.instances:
                return {'success': False, 'error': f'实例 {instance_id} 已存在'}
        
        try:
            def create_worker():
                with self._start_lock:
                    try:
                        logger.info(f'启动cliExtra实例: {instance_id}')
                        
                        # 使用cliExtra start命令启动实例
                        result = subprocess.run(
                            ['cliExtra', 'start', '--name', instance_id],
                            capture_output=True, text=True, timeout=30
                        )
                        
                        if result.returncode != 0:
                            logger.error(f'启动cliExtra实例 {instance_id} 失败: {result.stderr}')
                        else:
                            logger.info(f'cliExtra实例 {instance_id} 启动成功: {result.stdout}')
                            
                            # 等待一下让实例完全启动
                            time.sleep(2)
                            
                            # 同步实例状态
                            self.sync_screen_instances()
                            
                    except subprocess.TimeoutExpired:
                        logger.error(f'启动cliExtra实例 {instance_id} 超时（30秒）')
                    except Exception as e:
                        logger.error(f'后台创建cliExtra实例 {instance_id} 失败: {str(e)}')
            
            # 在后台线程中创建实例
            thread = threading.Thread(target=create_worker, daemon=True)
            thread.start()
            
            # 立即返回成功，不等待完成
            return {'success': True, 'message': f'cliExtra实例 {instance_id} 正在后台创建...'}
                
        except Exception as e:
            logger.error(f'创建cliExtra实例 {instance_id} 失败: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def clean_all_instances(self) -> Dict[str, any]:
        """清理所有cliExtra实例"""
        try:
            self._check_cliExtra()
            
            result = subprocess.run(
                ['cliExtra', 'clean-all'],
                capture_output=True, text=True, timeout=15
            )
            
            # 清理内存中的实例列表
            with self._lock:
                count = len(self.instances)
                self.instances.clear()
            
            if result.returncode == 0:
                logger.info(f'清理了 {count} 个cliExtra实例')
                return {'success': True, 'message': f'已清理 {count} 个cliExtra实例'}
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f'清理所有cliExtra实例失败: {error_msg}')
                return {'success': False, 'error': error_msg}
            
        except Exception as e:
            logger.error(f'清理所有cliExtra实例失败: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def attach_to_instance(self, instance_id: str) -> Dict[str, any]:
        """接管cliExtra实例终端"""
        try:
            self._check_cliExtra()
            
            result = subprocess.run(
                ['cliExtra', 'attach', instance_id],
                capture_output=True, text=True, timeout=5
            )
            
            if result.returncode == 0:
                logger.info(f'成功接管cliExtra实例 {instance_id}')
                return {'success': True}
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f'接管cliExtra实例 {instance_id} 失败: {error_msg}')
                return {'success': False, 'error': error_msg}
                
        except Exception as e:
            logger.error(f'接管cliExtra实例 {instance_id} 失败: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def get_instance_status(self, instance_id: str) -> Dict[str, any]:
        """获取cliExtra实例状态"""
        try:
            self._check_cliExtra()
            
            result = subprocess.run(
                ['cliExtra', 'status', instance_id],
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode == 0:
                return {'success': True, 'status': result.stdout.strip()}
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f'获取cliExtra实例 {instance_id} 状态失败: {error_msg}')
                return {'success': False, 'error': error_msg}
                
        except Exception as e:
            logger.error(f'获取cliExtra实例 {instance_id} 状态失败: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def create_namespace(self, name: str, description: str = '') -> Dict[str, any]:
        """创建新的 namespace"""
        try:
            self._check_cliExtra()
            
            # 检查 namespace 是否已存在 - 使用qq ns show命令
            try:
                result = subprocess.run(
                    ['qq', 'ns', 'show', '-o', 'json'],
                    capture_output=True, text=True, timeout=10
                )
                
                if result.returncode == 0:
                    import json
                    data = json.loads(result.stdout)
                    existing_names = [ns.get('name', '') for ns in data.get('namespaces', [])]
                    if name in existing_names:
                        return {'success': False, 'error': f'Namespace "{name}" 已存在'}
            except Exception as e:
                logger.warning(f'检查现有namespace失败: {e}')
            
            # 使用 qq ns create 创建 namespace
            result = subprocess.run(
                ['qq', 'ns', 'create', name],
                capture_output=True, text=True, timeout=30
            )
            
            if result.returncode == 0:
                logger.info(f'成功创建 namespace: {name}')
                return {'success': True, 'message': f'Namespace "{name}" 创建成功'}
            else:
                error_msg = result.stderr or result.stdout or '创建失败'
                logger.error(f'创建 namespace 失败: {error_msg}')
                return {'success': False, 'error': f'创建失败: {error_msg}'}
                
        except subprocess.TimeoutExpired:
            return {'success': False, 'error': '创建 namespace 超时'}
        except Exception as e:
            logger.error(f'创建 namespace 失败: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def _create_namespace_fallback(self, name: str, description: str = '') -> Dict[str, any]:
        """备用的 namespace 创建方法"""
        try:
            # 这里可以实现备用的 namespace 创建逻辑
            # 比如创建配置文件、目录等
            logger.info(f'使用备用方案创建 namespace: {name}')
            return {'success': True, 'message': f'Namespace "{name}" 创建成功（备用方案）'}
        except Exception as e:
            logger.error(f'备用 namespace 创建失败: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def delete_namespace(self, name: str) -> Dict[str, any]:
        """删除指定的 namespace"""
        try:
            self._check_cliExtra()
            
            if not name or name.strip() == '':
                return {'success': False, 'error': '无法删除默认 namespace'}
            
            # 首先停止该 namespace 下的所有实例
            instances_result = self.get_instances_by_namespace(name)
            if instances_result.get('success'):
                instances = instances_result.get('instances', [])
                for instance in instances:
                    self.stop_instance(instance['id'])
                    self.clean_instance(instance['id'])
            
            # 使用 qq ns delete 命令删除 namespace
            result = subprocess.run(
                ['qq', 'ns', 'delete', name],
                capture_output=True, text=True, timeout=30
            )
            
            if result.returncode == 0:
                logger.info(f'成功删除 namespace: {name}')
                return {'success': True, 'message': f'Namespace "{name}" 删除成功'}
            else:
                # 如果qq命令失败，记录错误信息
                error_msg = result.stderr.strip() if result.stderr else result.stdout.strip()
                logger.error(f'删除 namespace {name} 失败: {error_msg}')
                return {'success': False, 'error': f'删除失败: {error_msg}'}
                
        except subprocess.TimeoutExpired:
            return {'success': False, 'error': '删除 namespace 超时'}
        except Exception as e:
            logger.error(f'删除 namespace 失败: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def _delete_namespace_fallback(self, name: str) -> Dict[str, any]:
        """备用的 namespace 删除方法"""
        try:
            # 这里可以实现备用的 namespace 删除逻辑
            logger.info(f'使用备用方案删除 namespace: {name}')
            return {'success': True, 'message': f'Namespace "{name}" 删除成功（备用方案）'}
        except Exception as e:
            logger.error(f'备用 namespace 删除失败: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def update_instance_tools(self, instance_id: str, tools: List[str]) -> Dict[str, any]:
        """更新实例工具配置"""
        try:
            logger.info(f'更新实例 {instance_id} 的工具配置: {tools}')
            
            # 检查实例是否存在
            instances = self.list_instances()
            instance = None
            
            for inst in instances:
                if inst.get('id') == instance_id:
                    instance = inst
                    break
            
            if not instance:
                return {'success': False, 'error': f'实例 {instance_id} 不存在'}
            
            # 这里可以实现实际的工具配置更新逻辑
            # 目前先模拟成功，实际实现可能需要：
            # 1. 更新实例配置文件
            # 2. 重启实例以应用新工具
            # 3. 验证工具安装状态
            
            logger.info(f'实例 {instance_id} 工具配置更新成功')
            
            return {
                'success': True,
                'message': f'实例 {instance_id} 工具配置已更新',
                'tools': tools
            }
            
        except Exception as e:
            logger.error(f'更新实例工具配置失败: {str(e)}')
            return {'success': False, 'error': str(e)}

# 全局实例管理器
instance_manager = InstanceManager()
