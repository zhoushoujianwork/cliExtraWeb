# -*- coding: utf-8 -*-
"""
实例映射服务
管理角色与实例的映射关系，支持智能匹配和动态分配
"""
import json
import subprocess
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from app.services.instance_manager import instance_manager

logger = logging.getLogger(__name__)

@dataclass
class RoleMapping:
    """角色映射数据结构"""
    role: str
    instances: List[str]
    preferred_instance: Optional[str] = None
    auto_assign: bool = True

class InstanceMappingService:
    """实例映射服务类"""
    
    def __init__(self):
        self.role_keywords = {
            "backend": ["backend", "api", "server", "后端", "服务端"],
            "frontend": ["frontend", "web", "ui", "前端", "界面"],
            "devops": ["devops", "ops", "deploy", "运维", "部署"],
            "test": ["test", "qa", "测试", "质量"],
            "fullstack": ["fullstack", "full", "全栈"],
            "reviewer": ["review", "审查", "代码审查"]
        }
    
    def get_instances_list(self, namespace: str = None) -> List[Dict]:
        """获取实例列表"""
        try:
            # 使用实例管理器获取实例列表
            instances = instance_manager.get_instances()
            
            # 如果指定了namespace，进行过滤
            if namespace:
                instances = [inst for inst in instances if inst.get('namespace') == namespace]
            
            return instances
            
        except Exception as e:
            logger.error(f"获取实例列表失败: {str(e)}")
            return []
    
    def get_instances_from_cliextra(self) -> List[Dict]:
        """从cliExtra命令获取实例列表"""
        try:
            # 执行 qq list -o json 命令
            result = subprocess.run(
                ["qq", "list", "-o", "json"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0 and result.stdout.strip():
                try:
                    instances_data = json.loads(result.stdout)
                    return instances_data.get("instances", [])
                except json.JSONDecodeError:
                    logger.warning(f"无法解析实例列表JSON: {result.stdout}")
                    return []
            else:
                logger.info("没有活跃的实例")
                return []
                
        except subprocess.TimeoutExpired:
            logger.error("执行 qq list 超时")
            return []
        except FileNotFoundError:
            logger.error("qq 命令不存在")
            return []
        except Exception as e:
            logger.error(f"获取cliExtra实例列表失败: {str(e)}")
            return []
    
    def match_instance_to_role(self, instance_id: str, instance_info: Dict) -> Optional[str]:
        """根据实例信息匹配角色"""
        instance_name = instance_id.lower()
        instance_role = instance_info.get("role", "").lower()
        
        # 优先使用实例配置中的角色信息
        if instance_role:
            for role, keywords in self.role_keywords.items():
                if instance_role in keywords:
                    return role
        
        # 根据实例名称匹配角色
        for role, keywords in self.role_keywords.items():
            for keyword in keywords:
                if keyword in instance_name:
                    return role
        
        # 默认返回通用角色
        return "general"
    
    def get_role_instance_mapping(self, namespace: str = None) -> Dict[str, RoleMapping]:
        """获取角色实例映射"""
        try:
            # 获取实例列表
            instances = self.get_instances_list(namespace)
            cliextra_instances = self.get_instances_from_cliextra()
            
            # 合并实例信息
            all_instances = {}
            
            # 添加本地实例管理器的实例
            for inst in instances:
                instance_id = inst.get("id")
                if instance_id:
                    all_instances[instance_id] = {
                        "id": instance_id,
                        "status": inst.get("status", "unknown"),
                        "namespace": inst.get("namespace", "default"),
                        "role": inst.get("role", ""),
                        "source": "local"
                    }
            
            # 添加cliExtra的实例
            for inst in cliextra_instances:
                instance_id = inst.get("id") or inst.get("name")
                if instance_id:
                    all_instances[instance_id] = {
                        "id": instance_id,
                        "status": inst.get("status", "active"),
                        "namespace": inst.get("namespace", "default"),
                        "role": inst.get("role", ""),
                        "source": "cliextra"
                    }
            
            # 按角色分组实例
            role_mappings = {}
            
            for instance_id, instance_info in all_instances.items():
                # 匹配角色
                role = self.match_instance_to_role(instance_id, instance_info)
                
                if role not in role_mappings:
                    role_mappings[role] = RoleMapping(
                        role=role,
                        instances=[],
                        auto_assign=True
                    )
                
                role_mappings[role].instances.append(instance_id)
                
                # 设置首选实例（状态为active的实例）
                if (instance_info.get("status") == "active" and 
                    not role_mappings[role].preferred_instance):
                    role_mappings[role].preferred_instance = instance_id
            
            return role_mappings
            
        except Exception as e:
            logger.error(f"获取角色实例映射失败: {str(e)}")
            return {}
    
    def get_instance_for_role(self, role: str, namespace: str = None) -> Optional[str]:
        """为指定角色获取可用实例"""
        try:
            role_mappings = self.get_role_instance_mapping(namespace)
            
            if role in role_mappings:
                role_mapping = role_mappings[role]
                
                # 返回首选实例
                if role_mapping.preferred_instance:
                    return role_mapping.preferred_instance
                
                # 返回第一个可用实例
                if role_mapping.instances:
                    return role_mapping.instances[0]
            
            # 如果没有找到对应角色的实例，尝试通用实例
            if "general" in role_mappings and role_mappings["general"].instances:
                return role_mappings["general"].instances[0]
            
            return None
            
        except Exception as e:
            logger.error(f"获取角色实例失败: {str(e)}")
            return None
    
    def assign_instance_to_role(self, role: str, instance_id: str, namespace: str = None) -> bool:
        """手动分配实例到角色"""
        try:
            # 这里可以实现持久化存储分配关系
            # 目前只是记录日志
            logger.info(f"分配实例 {instance_id} 到角色 {role} (namespace: {namespace})")
            return True
            
        except Exception as e:
            logger.error(f"分配实例到角色失败: {str(e)}")
            return False
    
    def get_available_roles(self) -> List[str]:
        """获取可用角色列表"""
        return list(self.role_keywords.keys())
    
    def get_instance_details(self, instance_id: str) -> Optional[Dict]:
        """获取实例详细信息"""
        try:
            # 从本地实例管理器获取
            instances = instance_manager.get_instances()
            for inst in instances:
                if inst.get("id") == instance_id:
                    return inst
            
            # 从cliExtra获取
            cliextra_instances = self.get_instances_from_cliextra()
            for inst in cliextra_instances:
                if inst.get("id") == instance_id or inst.get("name") == instance_id:
                    return inst
            
            return None
            
        except Exception as e:
            logger.error(f"获取实例详情失败: {str(e)}")
            return None

# 全局服务实例
instance_mapping_service = InstanceMappingService()
