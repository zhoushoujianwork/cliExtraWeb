"""
Chat Manager Service - 支持对话记录持久化
"""
import re
import os
import json
from typing import List, Dict, Tuple
from datetime import datetime, timezone, timezone
from collections import deque

from app.models.instance import ChatMessage
from config.config import Config

class ChatManager:
    """聊天管理器 - 支持对话记录持久化"""
    
    def __init__(self):
        self.config = Config()
        self.chat_history = deque(maxlen=self.config.MAX_CHAT_HISTORY)
        self.system_logs = deque(maxlen=self.config.MAX_SYSTEM_LOGS)
        self.namespace_cache_loaded = False
    
    def _normalize_datetime(self, dt):
        """标准化datetime对象，确保都是UTC时区"""
        if dt is None:
            return datetime.now(timezone.utc)
        
        if dt.tzinfo is None:
            # 如果没有时区信息，假设是UTC
            return dt.replace(tzinfo=timezone.utc)
        else:
            # 如果有时区信息，转换为UTC
            return dt.astimezone(timezone.utc)
    
    def add_chat_message(self, sender: str, message: str, instance_id: str = None):
        """添加聊天消息并保存到持久化存储"""
        chat_msg = ChatMessage(
            sender=sender,
            message=message,
            timestamp=self._normalize_datetime(datetime.now()),
            instance_id=instance_id,
            message_type='chat'
        )
        self.chat_history.append(chat_msg)
        
        # 如果有实例ID，保存到对话记录
        if instance_id:
            self._save_to_persistent_storage(sender, message, instance_id)
    
    def _save_to_persistent_storage(self, sender: str, message: str, instance_id: str):
        """保存消息到持久化存储"""
        try:
            from app.services.instance_manager import instance_manager
            instance_manager.save_conversation_message(instance_id, sender, message)
        except Exception as e:
            # 如果保存失败，记录到系统日志但不影响主流程
            self.add_system_log('保存对话记录失败: {}'.format(str(e)))
    
    def add_system_log(self, message: str):
        """添加系统日志"""
        log_msg = ChatMessage(
            sender='system',
            message=message,
            timestamp=self._normalize_datetime(datetime.now()),
            message_type='system'
        )
        self.system_logs.append(log_msg)
    
    def load_namespace_cache_history(self, namespace: str = 'q_cli'):
        """从 namespace 缓存文件加载历史记录"""
        # 检查是否是同一个namespace，如果是则避免重复加载
        if (self.namespace_cache_loaded and 
            getattr(self, 'current_namespace', None) == namespace):
            return
            
        try:
            # 构建缓存文件路径
            cache_file = os.path.expanduser(
                '~/Library/Application Support/cliExtra/namespaces/{}/namespace_cache.json'.format(namespace)
            )
            
            print('尝试加载缓存文件: {}'.format(cache_file))
            
            # 清空现有历史记录，准备加载新namespace的数据
            self.chat_history.clear()
            
            if not os.path.exists(cache_file):
                self.add_system_log('Namespace 缓存文件不存在: {}'.format(cache_file))
                print('缓存文件不存在: {}'.format(cache_file))
                self.namespace_cache_loaded = True  # 标记为已加载，即使是空的
                return
            
            with open(cache_file, 'r') as f:
                cache_data = json.load(f)
            
            print('缓存文件加载成功，数据键: {}'.format(list(cache_data.keys())))
            
            # 加载消息历史
            message_history = cache_data.get('message_history', [])
            print('找到 {} 条历史消息'.format(len(message_history)))
            
            # 转换为 ChatMessage 对象并添加到历史记录
            loaded_count = 0
            for i, msg_data in enumerate(message_history):
                try:
                    # 解析时间戳
                    timestamp_str = msg_data.get('timestamp', '')
                    if timestamp_str:
                        # 处理 ISO 格式的时间戳
                        if timestamp_str.endswith('Z'):
                            timestamp_str = timestamp_str[:-1] + '+00:00'
                        try:
                            timestamp = datetime.fromisoformat(timestamp_str)
                        except:
                            # 如果解析失败，尝试其他格式
                            timestamp = datetime.strptime(timestamp_str.replace('Z', ''), '%Y-%m-%dT%H:%M:%S')
                            timestamp = timestamp.replace(tzinfo=timezone.utc)
                    else:
                        timestamp = datetime.now(timezone.utc)
                    
                    # 标准化时间戳
                    timestamp = self._normalize_datetime(timestamp)
                    
                    # 创建聊天消息对象
                    chat_msg = ChatMessage(
                        sender=msg_data.get('instance_id', 'unknown'),
                        message=msg_data.get('message', ''),
                        timestamp=timestamp,
                        instance_id=msg_data.get('instance_id'),
                        message_type='chat'
                    )
                    
                    # 添加到历史记录（如果不重复）
                    if not self._is_duplicate_message(chat_msg):
                        self.chat_history.append(chat_msg)
                        loaded_count += 1
                        
                    if i < 3:  # 打印前3条消息用于调试
                        print('消息 {}: {} - {}'.format(i+1, msg_data.get('instance_id', 'unknown'), msg_data.get('message', '')[:50]))
                        
                except Exception as e:
                    print('解析消息 {} 失败: {}'.format(i, str(e)))
                    self.add_system_log('解析消息失败: {}'.format(str(e)))
                    continue
            
            self.namespace_cache_loaded = True
            success_msg = '从 namespace 缓存加载了 {} 条历史消息'.format(loaded_count)
            self.add_system_log(success_msg)
            print(success_msg)
            
        except Exception as e:
            error_msg = '加载 namespace 缓存失败: {}'.format(str(e))
            self.add_system_log(error_msg)
            print(error_msg)
            import traceback
            traceback.print_exc()
    
    def _is_duplicate_message(self, new_msg: ChatMessage) -> bool:
        """检查是否为重复消息"""
        for existing_msg in self.chat_history:
            if (existing_msg.instance_id == new_msg.instance_id and 
                existing_msg.message == new_msg.message):
                
                # 标准化时间戳后再比较
                existing_time = self._normalize_datetime(existing_msg.timestamp)
                new_time = self._normalize_datetime(new_msg.timestamp)
                
                if abs((existing_time - new_time).total_seconds()) < 1:
                    return True
        return False
    
    def get_chat_history(self, limit: int = None, namespace: str = 'q_cli') -> List[Dict]:
        """获取聊天历史，支持动态切换namespace"""
        # 检查是否需要重新加载不同namespace的缓存
        if not self.namespace_cache_loaded or getattr(self, 'current_namespace', None) != namespace:
            self.load_namespace_cache_history(namespace)
            self.current_namespace = namespace  # 记录当前加载的namespace
        
        if limit:
            history = list(self.chat_history)[-limit:]
        else:
            history = list(self.chat_history)
        
        # 按时间排序
        history.sort(key=lambda msg: msg.timestamp)
        
        return [msg.to_dict() for msg in history]
    
    def get_persistent_chat_history(self, instance_id: str, namespace: str = None) -> List[Dict]:
        """从持久化存储获取聊天历史"""
        try:
            from app.services.instance_manager import instance_manager
            return instance_manager.get_conversation_history(instance_id, namespace)
        except Exception as e:
            self.add_system_log('获取持久化聊天历史失败: {}'.format(str(e)))
            return []
    
    def get_namespace_chat_history(self, namespace: str, limit: int = 100) -> List[Dict]:
        """获取namespace级别的聊天历史"""
        try:
            from app.services.instance_manager import instance_manager
            return instance_manager.get_namespace_conversation_history(namespace, limit)
        except Exception as e:
            self.add_system_log('获取namespace聊天历史失败: {}'.format(str(e)))
            return []
    
    def get_system_logs(self, limit: int = None) -> List[Dict]:
        """获取系统日志"""
        if limit:
            logs = list(self.system_logs)[-limit:]
        else:
            logs = list(self.system_logs)
        
        return [msg.to_dict() for msg in logs]
    
    def parse_at_mentions(self, message: str) -> Tuple[List[str], str]:
        """解析@提及
        
        Args:
            message: 原始消息，如 "@实例1 @实例2 你好世界"
            
        Returns:
            Tuple[List[str], str]: (实例ID列表, 清理后的消息)
        """
        # 匹配@实例ID的模式
        pattern = r'@实例(\w+)'
        matches = re.findall(pattern, message)
        
        # 移除@提及，获取纯净消息
        clean_message = re.sub(r'@实例\w+\s*', '', message).strip()
        
        return matches, clean_message
    
    def clear_chat_history(self):
        """清空聊天历史"""
        self.chat_history.clear()
        self.namespace_cache_loaded = False
    
    def clear_system_logs(self):
        """清空系统日志"""
        self.system_logs.clear()
    
    def refresh_cache_history(self, namespace: str = 'q_cli'):
        """刷新缓存历史记录"""
        self.namespace_cache_loaded = False
        self.load_namespace_cache_history(namespace)

# 全局聊天管理器
chat_manager = ChatManager()
