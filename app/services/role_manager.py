#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import subprocess
import json
import logging
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import threading

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
                ['cliExtra', 'role', 'list'],
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
                if line and not line.startswith('Available roles:'):
                    # 解析角色行，格式可能是 "- frontend: 前端工程师"
                    if line.startswith('- '):
                        parts = line[2:].split(':', 1)
                        if len(parts) == 2:
                            role_name = parts[0].strip()
                            role_desc = parts[1].strip()
                            roles.append({
                                'name': role_name,
                                'description': role_desc,
                                'filename': f"{role_name}-engineer.md"
                            })
                        else:
                            # 只有角色名，没有描述
                            role_name = parts[0].strip()
                            roles.append({
                                'name': role_name,
                                'description': f"{role_name.title()} Engineer",
                                'filename': f"{role_name}-engineer.md"
                            })
            
            return roles
            
        except subprocess.TimeoutExpired:
            logger.error("Timeout while listing roles")
            return []
        except Exception as e:
            logger.error(f"Error listing roles: {e}")
            return []
    
    def get_role_content(self, role_name: str) -> Optional[str]:
        """获取角色预设的内容"""
        try:
            result = subprocess.run(
                ['cliExtra', 'role', 'show', role_name],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                logger.error(f"Failed to get role content for {role_name}: {result.stderr}")
                return None
            
            return result.stdout.strip()
            
        except subprocess.TimeoutExpired:
            logger.error(f"Timeout while getting role content for {role_name}")
            return None
        except Exception as e:
            logger.error(f"Error getting role content for {role_name}: {e}")
            return None
    
    def get_project_role(self, project_path: str = ".") -> Optional[str]:
        """获取项目当前应用的角色"""
        try:
            result = subprocess.run(
                ['cliExtra', 'role', 'show', project_path],
                capture_output=True,
                text=True,
                timeout=10,
                cwd=project_path if project_path != "." else None
            )
            
            if result.returncode != 0:
                # 没有角色或其他错误
                return None
            
            # 输出应该只是角色名
            role_name = result.stdout.strip()
            return role_name if role_name else None
            
        except subprocess.TimeoutExpired:
            logger.error(f"Timeout while getting project role for {project_path}")
            return None
        except Exception as e:
            logger.error(f"Error getting project role for {project_path}: {e}")
            return None
    
    def apply_role_to_project(self, role_name: str, project_path: str = ".", force: bool = False) -> Tuple[bool, str]:
        """将角色应用到项目"""
        try:
            cmd = ['cliExtra', 'role', 'apply', role_name]
            if force:
                cmd.append('-f')
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30,
                cwd=project_path if project_path != "." else None
            )
            
            if result.returncode == 0:
                return True, f"Successfully applied role '{role_name}' to project"
            else:
                return False, f"Failed to apply role: {result.stderr}"
                
        except subprocess.TimeoutExpired:
            return False, "Timeout while applying role"
        except Exception as e:
            return False, f"Error applying role: {e}"
    
    def apply_role_to_instance(self, role_name: str, instance_name: str, force: bool = False) -> Tuple[bool, str]:
        """将角色应用到实例"""
        try:
            cmd = ['cliExtra', 'role', 'apply', role_name, instance_name]
            if force:
                cmd.append('-f')
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                return True, f"Successfully applied role '{role_name}' to instance '{instance_name}'"
            else:
                return False, f"Failed to apply role: {result.stderr}"
                
        except subprocess.TimeoutExpired:
            return False, "Timeout while applying role"
        except Exception as e:
            return False, f"Error applying role: {e}"
    
    def remove_project_role(self, project_path: str = ".") -> Tuple[bool, str]:
        """移除项目的角色预设"""
        try:
            result = subprocess.run(
                ['cliExtra', 'role', 'remove'],
                capture_output=True,
                text=True,
                timeout=10,
                cwd=project_path if project_path != "." else None
            )
            
            if result.returncode == 0:
                return True, "Successfully removed role from project"
            else:
                return False, f"Failed to remove role: {result.stderr}"
                
        except subprocess.TimeoutExpired:
            return False, "Timeout while removing role"
        except Exception as e:
            return False, f"Error removing role: {e}"
    
    def remove_instance_role(self, instance_name: str) -> Tuple[bool, str]:
        """移除实例的角色预设"""
        try:
            result = subprocess.run(
                ['cliExtra', 'role', 'remove', instance_name],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                return True, f"Successfully removed role from instance '{instance_name}'"
            else:
                return False, f"Failed to remove role: {result.stderr}"
                
        except subprocess.TimeoutExpired:
            return False, "Timeout while removing role"
        except Exception as e:
            return False, f"Error removing role: {e}"
    
    def get_role_file_path(self, role_name: str, project_path: str = ".") -> Optional[str]:
        """获取角色文件的路径"""
        amazonq_dir = Path(project_path) / ".amazonq" / "rules"
        role_file = amazonq_dir / f"{role_name}-engineer.md"
        
        if role_file.exists():
            return str(role_file)
        return None
    
    def create_custom_role(self, role_name: str, content: str, project_path: str = ".") -> Tuple[bool, str]:
        """创建自定义角色文件"""
        try:
            amazonq_dir = Path(project_path) / ".amazonq" / "rules"
            amazonq_dir.mkdir(parents=True, exist_ok=True)
            
            role_file = amazonq_dir / f"{role_name}-engineer.md"
            
            with open(role_file, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return True, f"Successfully created custom role '{role_name}'"
            
        except Exception as e:
            return False, f"Error creating custom role: {e}"
    
    def update_role_content(self, role_name: str, content: str, project_path: str = ".") -> Tuple[bool, str]:
        """更新角色内容"""
        try:
            role_file_path = self.get_role_file_path(role_name, project_path)
            if not role_file_path:
                return False, f"Role file for '{role_name}' not found"
            
            with open(role_file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return True, f"Successfully updated role '{role_name}'"
            
        except Exception as e:
            return False, f"Error updating role: {e}"
    
    def get_project_roles_info(self, project_path: str = ".") -> Dict:
        """获取项目角色信息的综合视图"""
        info = {
            'current_role': self.get_project_role(project_path),
            'available_roles': self.list_available_roles(),
            'project_path': os.path.abspath(project_path),
            'amazonq_exists': os.path.exists(os.path.join(project_path, '.amazonq'))
        }
        
        # 如果有当前角色，获取其内容
        if info['current_role']:
            info['current_role_content'] = self.get_role_content(info['current_role'])
        
        return info
    
    def validate_role_name(self, role_name: str) -> Tuple[bool, str]:
        """验证角色名称"""
        if not role_name:
            return False, "Role name cannot be empty"
        
        if not role_name.replace('-', '').replace('_', '').isalnum():
            return False, "Role name can only contain letters, numbers, hyphens and underscores"
        
        if len(role_name) > 50:
            return False, "Role name is too long (max 50 characters)"
        
        return True, "Valid role name"

# 全局实例
role_manager = RoleManager()
