"""
基于tmux的Q CLI实例管理器
支持用户随时接管终端，同时支持程序化交互
"""
import subprocess
import threading
import time
import logging
import os
import re
from datetime import datetime
from typing import Dict, List, Optional
from queue import Queue, Empty

from app.models.instance import QInstance
from config.config import Config

logger = logging.getLogger(__name__)

class InstanceManager:
    """Q CLI实例管理器 - 基于cliExtra命令实现"""
    
    def __init__(self):
        self.instances = {}
        self._lock = threading.Lock()
        self._start_lock = threading.Lock()
        self.sessions_dir = os.path.join(os.path.dirname(__file__), 'sessions')
        self.log_file = "/tmp/tmux_q_chat.log"
        self._ensure_directories()
        self._check_tmux()
    
    def _ensure_directories(self):
        """确保必要的目录存在"""
        os.makedirs(self.sessions_dir, exist_ok=True)
    
    def _check_tmux(self):
        """检查tmux是否安装"""
        if not subprocess.run(['which', 'tmux'], capture_output=True).returncode == 0:
            raise RuntimeError("tmux未安装")
    
    def _check_cliExtra(self):
        """检查cliExtra命令是否可用"""
        if not subprocess.run(['which', 'cliExtra'], capture_output=True).returncode == 0:
            raise RuntimeError("cliExtra命令未安装")
    
    def sync_screen_instances(self):
        """同步tmux实例状态 - 使用cliExtra list --json命令"""
        try:
            self._check_cliExtra()
            
            # 使用cliExtra list --json命令获取实例列表
            result = subprocess.run(['cliExtra', 'list', '--json'], capture_output=True, text=True, timeout=10)
            
            if result.returncode != 0:
                logger.error(f"获取实例列表失败: {result.stderr}")
                return
            
            # 解析JSON输出
            import json
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
                        
                        # 构建详细信息显示
                        details = [f'cliExtra实例: {instance_id}']
                        if instance.status:
                            details.append(f'状态: {instance.status}')
                        if instance.namespace and instance.namespace != 'default':
                            details.append(f'命名空间: {instance.namespace}')
                        if instance.path:
                            details.append(f'路径: {instance.path}')
                        if instance.role:
                            details.append(f'角色: {instance.role}')
                        if instance.start_time:
                            details.append(f'启动时间: {instance.start_time}')
                        if instance.screen_session:
                            details.append(f'tmux会话: {instance.screen_session}')
                        
                        instance.details = ' | '.join(details)
                
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
    
    def send_message(self, instance_id: str, message: str) -> Dict[str, any]:
        """向cliExtra实例发送消息"""
        try:
            self._check_cliExtra()
            
            result = subprocess.run(
                ['cliExtra', 'send', instance_id, message],
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode == 0:
                logger.info(f'向cliExtra实例 {instance_id} 发送消息: {message[:50]}...')
                return {'success': True}
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f'向cliExtra实例 {instance_id} 发送消息失败: {error_msg}')
                return {'success': False, 'error': error_msg}
                
        except subprocess.TimeoutExpired:
            error_msg = '发送消息超时'
            logger.error(f'向cliExtra实例 {instance_id} 发送消息超时')
            return {'success': False, 'error': error_msg}
        except Exception as e:
            logger.error(f'向cliExtra实例 {instance_id} 发送消息失败: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def get_instance_output(self, instance_id: str, last_position: int = 0) -> List[Dict[str, any]]:
        """获取cliExtra实例输出 - 使用cliExtra logs命令"""
        try:
            self._check_cliExtra()
            
            # 使用cliExtra logs命令获取日志
            result = subprocess.run(
                ['cliExtra', 'logs', instance_id, '50'],  # 获取最近50行
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                output = []
                for i, line in enumerate(lines):
                    if i >= last_position:
                        output.append({
                            'type': 'output',
                            'content': line,
                            'timestamp': time.time()
                        })
                return output
            else:
                logger.error(f'获取cliExtra实例 {instance_id} 日志失败: {result.stderr}')
                return []
                
        except Exception as e:
            logger.error(f'获取cliExtra实例 {instance_id} 输出失败: {str(e)}')
            return []
    
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
    
    def create_instance_with_config(self, name: Optional[str] = None, 
                                   path: Optional[str] = None, 
                                   role: Optional[str] = None,
                                   namespace: Optional[str] = None) -> Dict[str, any]:
        """创建带配置的cliExtra实例"""
        try:
            def create_worker():
                with self._start_lock:
                    try:
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
                        
                        logger.info(f'启动cliExtra实例，命令: {" ".join(cmd)}')
                        
                        # 启动实例
                        result = subprocess.run(
                            cmd,
                            capture_output=True, text=True, timeout=30
                        )
                        
                        if result.returncode != 0:
                            logger.error(f'启动cliExtra实例失败: {result.stderr}')
                            return
                        
                        logger.info(f'cliExtra实例启动成功: {result.stdout}')
                        
                        # 等待实例启动
                        time.sleep(2)
                        
                        # 如果指定了角色但没有在命令行中应用，单独应用角色配置
                        if role and '--role' not in cmd:
                            self._apply_role_to_instance(name, role)
                        
                        # 同步实例状态
                        self.sync_screen_instances()
                        
                    except subprocess.TimeoutExpired:
                        logger.error(f'启动cliExtra实例超时（30秒）')
                    except Exception as e:
                        logger.error(f'后台创建cliExtra实例失败: {str(e)}')
            
            # 在后台线程中创建实例
            thread = threading.Thread(target=create_worker, daemon=True)
            thread.start()
            
            # 构建返回消息
            instance_desc = []
            if name:
                instance_desc.append(f"名称: {name}")
            if path:
                instance_desc.append(f"路径: {path}")
            if role:
                instance_desc.append(f"角色: {role}")
            
            desc_str = f" ({', '.join(instance_desc)})" if instance_desc else ""
            message = f'cliExtra实例{desc_str}正在后台创建...'
            
            return {
                'success': True, 
                'message': message,
                'instance_id': name if name else 'auto-generated'
            }
                
        except Exception as e:
            logger.error(f'创建配置实例失败: {str(e)}')
            return {'success': False, 'error': str(e)}
    
    def _apply_role_to_instance(self, instance_name: Optional[str], role: str):
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

# 全局实例管理器
instance_manager = InstanceManager()
