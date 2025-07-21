"""
Web终端服务
支持在浏览器中直接接管tmux会话
"""
import pexpect
import threading
import time
import logging
import os
import signal
import subprocess
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class WebTerminal:
    """Web终端类，管理单个tmux会话的Web接管"""
    
    def __init__(self, instance_id: str, session_name: str):
        self.instance_id = instance_id
        self.session_name = session_name
        self.process: Optional[pexpect.spawn] = None
        self.is_active = False
        self.output_callback = None
        self.read_thread = None
        
    def start(self, output_callback):
        """启动Web终端，接管tmux会话"""
        try:
            self.output_callback = output_callback
            
            # 使用pexpect接管tmux会话
            cmd = f'tmux attach-session -t {self.session_name}'
            self.process = pexpect.spawn(cmd, encoding='utf-8', timeout=1)
            
            # 设置窗口大小
            self.process.setwinsize(24, 80)
            
            self.is_active = True
            
            # 启动读取线程
            self.read_thread = threading.Thread(target=self._read_output, daemon=True)
            self.read_thread.start()
            
            logger.info(f"Web终端已启动，接管tmux会话: {self.session_name}")
            return True
            
        except Exception as e:
            logger.error(f"启动Web终端失败: {e}")
            return False
    
    def _read_output(self):
        """读取tmux输出的线程"""
        while self.is_active and self.process and self.process.isalive():
            try:
                # 非阻塞读取
                output = self.process.read_nonblocking(size=1024, timeout=0.1)
                if output and self.output_callback:
                    self.output_callback(self.instance_id, output)
            except pexpect.TIMEOUT:
                continue
            except pexpect.EOF:
                logger.info(f"tmux会话 {self.session_name} 已结束")
                break
            except Exception as e:
                logger.error(f"读取tmux输出失败: {e}")
                break
        
        self.is_active = False
        if self.output_callback:
            self.output_callback(self.instance_id, "\r\n[会话已断开]\r\n")
    
    def send_input(self, data: str):
        """发送输入到tmux会话"""
        if self.process and self.process.isalive():
            try:
                self.process.send(data)
                return True
            except Exception as e:
                logger.error(f"发送输入失败: {e}")
                return False
        return False
    
    def resize(self, rows: int, cols: int):
        """调整终端大小"""
        if self.process and self.process.isalive():
            try:
                self.process.setwinsize(rows, cols)
                return True
            except Exception as e:
                logger.error(f"调整终端大小失败: {e}")
                return False
        return False
    
    def detach(self):
        """分离tmux会话（Ctrl+B, D）"""
        if self.process and self.process.isalive():
            try:
                # 发送tmux分离命令
                self.process.send('\x02d')  # Ctrl+B, D
                time.sleep(0.5)
                return True
            except Exception as e:
                logger.error(f"分离tmux会话失败: {e}")
                return False
        return False
    
    def terminate(self):
        """终止Web终端连接"""
        self.is_active = False
        
        if self.process and self.process.isalive():
            try:
                # 先尝试分离
                self.detach()
                time.sleep(1)
                
                # 如果还在运行，强制终止
                if self.process.isalive():
                    self.process.terminate()
                    
            except Exception as e:
                logger.error(f"终止Web终端失败: {e}")
        
        if self.read_thread and self.read_thread.is_alive():
            self.read_thread.join(timeout=2)
        
        logger.info(f"Web终端已终止: {self.session_name}")

class WebTerminalManager:
    """Web终端管理器"""
    
    def __init__(self):
        self.terminals: Dict[str, WebTerminal] = {}
        self._lock = threading.Lock()
    
    def create_terminal(self, instance_id: str, output_callback) -> bool:
        """创建Web终端"""
        with self._lock:
            if instance_id in self.terminals:
                return False
            
            # 从cliExtra获取实际的session名称
            session_name = self._get_tmux_session_name(instance_id)
            if not session_name:
                logger.error(f"无法获取实例 {instance_id} 的tmux会话名称")
                return False
            
            # 检查tmux会话是否存在
            if not self._check_tmux_session(session_name):
                logger.error(f"tmux会话 {session_name} 不存在")
                return False
            
            terminal = WebTerminal(instance_id, session_name)
            if terminal.start(output_callback):
                self.terminals[instance_id] = terminal
                return True
            
            return False
    
    def _get_tmux_session_name(self, instance_id: str) -> Optional[str]:
        """从cliExtra获取tmux会话名称"""
        try:
            result = subprocess.run(['cliExtra', 'list', instance_id, '--json'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                import json
                data = json.loads(result.stdout.strip())
                
                # 单个实例查询的格式是 {"instance": {...}}
                instance_data = data.get('instance', {})
                if instance_data:
                    session = instance_data.get('session', '')
                    if session:
                        return session
                    
                    # 如果没有session字段，尝试从commands.attach解析
                    commands = data.get('commands', {})
                    attach_command = commands.get('attach', '')
                    if 'tmux attach-session -t ' in attach_command:
                        return attach_command.replace('tmux attach-session -t ', '').strip()
            
            return None
        except Exception as e:
            logger.error(f"获取tmux会话名称失败: {e}")
            return None
    
    def _check_tmux_session(self, session_name: str) -> bool:
        """检查tmux会话是否存在"""
        try:
            result = subprocess.run(['tmux', 'list-sessions'], capture_output=True, text=True)
            return session_name in result.stdout
        except Exception:
            return False
    
    def send_input(self, instance_id: str, data: str) -> bool:
        """发送输入到指定终端"""
        with self._lock:
            terminal = self.terminals.get(instance_id)
            if terminal:
                return terminal.send_input(data)
            return False
    
    def resize_terminal(self, instance_id: str, rows: int, cols: int) -> bool:
        """调整终端大小"""
        with self._lock:
            terminal = self.terminals.get(instance_id)
            if terminal:
                return terminal.resize(rows, cols)
            return False
    
    def detach_terminal(self, instance_id: str) -> bool:
        """分离终端（保持tmux会话运行）"""
        with self._lock:
            terminal = self.terminals.get(instance_id)
            if terminal:
                success = terminal.detach()
                if success:
                    terminal.terminate()
                    del self.terminals[instance_id]
                return success
            return False
    
    def terminate_terminal(self, instance_id: str) -> bool:
        """终止终端连接"""
        with self._lock:
            terminal = self.terminals.get(instance_id)
            if terminal:
                terminal.terminate()
                del self.terminals[instance_id]
                return True
            return False
    
    def get_active_terminals(self) -> list:
        """获取活跃的终端列表"""
        with self._lock:
            return list(self.terminals.keys())
    
    def cleanup_all(self):
        """清理所有终端"""
        with self._lock:
            for terminal in self.terminals.values():
                terminal.terminate()
            self.terminals.clear()

# 全局Web终端管理器
web_terminal_manager = WebTerminalManager()
