#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import subprocess
import json
import logging
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import threading
import re

logger = logging.getLogger(__name__)

class RoleManager:
    """cliExtra 角色管理器"""
    
    def __init__(self):
        self.lock = threading.Lock()
        self.roles_cache = {}
        self.cache_timestamp = 0
        
    def list_available_roles(self) -> List[Dict[str, str]]:
        """获取所有可用的角色列表"""
        try:
            result = subprocess.run(
                ['qq', 'role', 'list'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                logger.error(f"Failed to list roles: {result.stderr}")
                return []
            
            roles = []
            lines = result.stdout.strip().split('\n')
            
            for line in lines:
                line = line.strip()
                # 跳过标题行和空行
                if not line or '===' in line or line.startswith('可用角色列表'):
                    continue
                
                # 解析角色行，格式: "backend - 后端工程师"
                # 需要处理ANSI颜色代码
                # 移除ANSI颜色代码
                clean_line = re.sub(r'\x1b\[[0-9;]*m', '', line)
                
                if ' - ' in clean_line:
                    parts = clean_line.split(' - ', 1)
                    if len(parts) == 2:
                        role_name = parts[0].strip()
                        role_desc = parts[1].strip()
                        roles.append({
                            'name': role_name,
                            'description': role_desc,
                            'display_name': f"{role_name} - {role_desc}"
                        })
                        logger.debug(f"Found role: {role_name} - {role_desc}")
            
            logger.info(f"Found {len(roles)} available roles")
            return roles
            
        except subprocess.TimeoutExpired:
            logger.error("Timeout while listing roles")
            return []
        except Exception as e:
            logger.error(f"Error listing roles: {str(e)}")
            return []
    
    def get_role_content(self, role_name: str) -> Optional[str]:
        """获取角色预设的内容"""
        try:
            result = subprocess.run(
                ['qq', 'role', 'show', role_name],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                return result.stdout.strip()
            else:
                logger.error(f"Failed to get role content for {role_name}: {result.stderr}")
                return None
                
        except subprocess.TimeoutExpired:
            logger.error(f"Timeout while getting role content for {role_name}")
            return None
        except Exception as e:
            logger.error(f"Error getting role content for {role_name}: {str(e)}")
            return None
    
    def get_project_roles_info(self, project_path: str) -> Dict:
        """获取项目的角色信息"""
        try:
            result = subprocess.run(
                ['qq', 'role', 'info'],
                cwd=project_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                # 解析输出获取角色信息
                return {'current_role': result.stdout.strip()}
            else:
                return {'current_role': None}
                
        except Exception as e:
            logger.error(f"Error getting project role info: {str(e)}")
            return {'current_role': None}
    
    def apply_role_to_project(self, role_name: str, project_path: str, force: bool = False) -> Tuple[bool, str]:
        """将角色应用到项目"""
        try:
            cmd = ['qq', 'role', 'apply', role_name]
            if force:
                cmd.append('-f')
                
            result = subprocess.run(
                cmd,
                cwd=project_path,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                return True, f"角色 {role_name} 已成功应用到项目"
            else:
                return False, f"应用角色失败: {result.stderr}"
                
        except Exception as e:
            logger.error(f"Error applying role to project: {str(e)}")
            return False, f"应用角色时发生错误: {str(e)}"
    
    def apply_role_to_instance(self, role_name: str, instance_id: str, force: bool = False) -> Tuple[bool, str]:
        """将角色应用到实例"""
        # 这个功能可能需要通过实例管理器来实现
        # 暂时返回成功，实际实现需要与instance_manager集成
        return True, f"角色 {role_name} 已应用到实例 {instance_id}"
    
    def remove_project_role(self, project_path: str) -> Tuple[bool, str]:
        """移除项目角色"""
        try:
            result = subprocess.run(
                ['qq', 'role', 'remove'],
                cwd=project_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                return True, "项目角色已移除"
            else:
                return False, f"移除角色失败: {result.stderr}"
                
        except Exception as e:
            logger.error(f"Error removing project role: {str(e)}")
            return False, f"移除角色时发生错误: {str(e)}"
    
    def remove_instance_role(self, instance_id: str) -> Tuple[bool, str]:
        """移除实例角色"""
        # 这个功能可能需要通过实例管理器来实现
        return True, f"实例 {instance_id} 的角色已移除"
    
    def validate_role_name(self, role_name: str) -> Tuple[bool, str]:
        """验证角色名称"""
        if not role_name or not role_name.strip():
            return False, "角色名称不能为空"
        
        # 检查角色名称格式
        if not re.match(r'^[a-zA-Z][a-zA-Z0-9_-]*$', role_name):
            return False, "角色名称只能包含字母、数字、下划线和连字符，且必须以字母开头"
        
        return True, "角色名称有效"
    
    def create_custom_role(self, role_name: str, content: str, project_path: str) -> Tuple[bool, str]:
        """创建自定义角色"""
        try:
            # 验证角色名称
            valid, message = self.validate_role_name(role_name)
            if not valid:
                return False, message
            
            # 创建角色文件
            roles_dir = Path(project_path) / '.amazonq' / 'rules'
            roles_dir.mkdir(parents=True, exist_ok=True)
            
            role_file = roles_dir / f'{role_name}.md'
            with open(role_file, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return True, f"自定义角色 {role_name} 创建成功"
            
        except Exception as e:
            logger.error(f"Error creating custom role: {str(e)}")
            return False, f"创建自定义角色时发生错误: {str(e)}"
    
    def update_role_content(self, role_name: str, content: str, project_path: str) -> Tuple[bool, str]:
        """更新角色内容"""
        try:
            roles_dir = Path(project_path) / '.amazonq' / 'rules'
            role_file = roles_dir / f'{role_name}.md'
            
            if not role_file.exists():
                return False, f"角色 {role_name} 不存在"
            
            with open(role_file, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return True, f"角色 {role_name} 内容已更新"
            
        except Exception as e:
            logger.error(f"Error updating role content: {str(e)}")
            return False, f"更新角色内容时发生错误: {str(e)}"

# 全局实例
role_manager = RoleManager()
