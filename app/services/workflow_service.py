"""
Workflow 服务管理器
处理工作流的创建、编辑、执行和管理
"""

import os
import json
import yaml
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

from app.models.workflow_models import (
    WorkflowDefinition, WorkflowNode, WorkflowEdge, 
    NodeType, NodeStatus, Priority, Position, NodeStyle, EdgeStyle,
    NODE_TEMPLATES
)

logger = logging.getLogger(__name__)

class WorkflowService:
    """工作流服务管理器"""
    
    def __init__(self, data_dir: str = None):
        """初始化工作流服务"""
        self.data_dir = data_dir or os.path.join(os.getcwd(), '.amazonq', 'workflows')
        self.ensure_data_dir()
    
    def ensure_data_dir(self):
        """确保数据目录存在"""
        os.makedirs(self.data_dir, exist_ok=True)
    
    def get_workflow_file_path(self, namespace: str, workflow_id: str) -> str:
        """获取工作流文件路径"""
        namespace_dir = os.path.join(self.data_dir, namespace)
        os.makedirs(namespace_dir, exist_ok=True)
        return os.path.join(namespace_dir, f"{workflow_id}.json")
    
    def list_workflows(self, namespace: str = "default") -> List[Dict[str, Any]]:
        """获取指定 namespace 下的所有工作流"""
        try:
            namespace_dir = os.path.join(self.data_dir, namespace)
            if not os.path.exists(namespace_dir):
                return []
            
            workflows = []
            for filename in os.listdir(namespace_dir):
                if filename.endswith('.json'):
                    workflow_id = filename[:-5]  # 移除 .json 后缀
                    try:
                        workflow = self.load_workflow(namespace, workflow_id)
                        if workflow:
                            workflows.append({
                                'id': workflow.id,
                                'name': workflow.name,
                                'description': workflow.description,
                                'version': workflow.version,
                                'created_at': workflow.created_at,
                                'updated_at': workflow.updated_at,
                                'node_count': len(workflow.nodes),
                                'edge_count': len(workflow.edges)
                            })
                    except Exception as e:
                        logger.error(f"加载工作流 {workflow_id} 失败: {e}")
                        continue
            
            return sorted(workflows, key=lambda x: x.get('updated_at', ''), reverse=True)
        
        except Exception as e:
            logger.error(f"获取工作流列表失败: {e}")
            return []
    
    def load_workflow(self, namespace: str, workflow_id: str) -> Optional[WorkflowDefinition]:
        """加载指定的工作流"""
        try:
            file_path = self.get_workflow_file_path(namespace, workflow_id)
            if not os.path.exists(file_path):
                return None
            
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            return WorkflowDefinition.from_dict(data)
        
        except Exception as e:
            logger.error(f"加载工作流失败: {e}")
            return None
    
    def save_workflow(self, namespace: str, workflow: WorkflowDefinition) -> bool:
        """保存工作流"""
        try:
            # 更新时间戳
            now = datetime.now().isoformat()
            if not workflow.created_at:
                workflow.created_at = now
            workflow.updated_at = now
            
            file_path = self.get_workflow_file_path(namespace, workflow.id)
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(workflow.to_dict(), f, ensure_ascii=False, indent=2)
            
            logger.info(f"工作流 {workflow.id} 保存成功")
            return True
        
        except Exception as e:
            logger.error(f"保存工作流失败: {e}")
            return False
    
    def create_workflow(self, namespace: str, name: str, description: str = "") -> WorkflowDefinition:
        """创建新的工作流"""
        workflow = WorkflowDefinition(
            name=name,
            description=description,
            created_by="system"
        )
        
        # 添加默认的开始和结束节点
        start_node = self.create_node_from_template("start", Position(100, 200))
        end_node = self.create_node_from_template("end", Position(500, 200))
        
        workflow.nodes = [start_node, end_node]
        
        # 保存工作流
        if self.save_workflow(namespace, workflow):
            return workflow
        else:
            raise Exception("创建工作流失败")
    
    def delete_workflow(self, namespace: str, workflow_id: str) -> bool:
        """删除工作流"""
        try:
            file_path = self.get_workflow_file_path(namespace, workflow_id)
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"工作流 {workflow_id} 删除成功")
                return True
            return False
        
        except Exception as e:
            logger.error(f"删除工作流失败: {e}")
            return False
    
    def create_node_from_template(self, template_name: str, position: Position) -> WorkflowNode:
        """从模板创建节点"""
        template = NODE_TEMPLATES.get(template_name, NODE_TEMPLATES["task"])
        
        node = WorkflowNode(
            type=template["type"],
            name=template["name"],
            description=template["description"],
            position=position
        )
        
        # 应用模板样式
        style_data = template.get("style", {})
        node.style = NodeStyle(
            background_color=style_data.get("background_color", "#ffffff"),
            border_color=style_data.get("border_color", "#d1d5db"),
            text_color=style_data.get("text_color", "#374151")
        )
        
        return node
    
    def add_node(self, namespace: str, workflow_id: str, node_data: Dict[str, Any]) -> Optional[WorkflowNode]:
        """向工作流添加节点"""
        try:
            workflow = self.load_workflow(namespace, workflow_id)
            if not workflow:
                return None
            
            # 创建新节点
            node = WorkflowNode(
                type=NodeType(node_data.get("type", "task")),
                name=node_data.get("name", "新节点"),
                description=node_data.get("description", ""),
                position=Position(
                    x=node_data.get("position", {}).get("x", 0),
                    y=node_data.get("position", {}).get("y", 0)
                ),
                owner=node_data.get("owner", ""),
                tools=node_data.get("tools", []),
                responsibilities=node_data.get("responsibilities", []),
                deliverables=node_data.get("deliverables", [])
            )
            
            # 应用样式
            style_data = node_data.get("style", {})
            if style_data:
                node.style = NodeStyle(
                    width=style_data.get("width", 200),
                    height=style_data.get("height", 80),
                    background_color=style_data.get("background_color", "#ffffff"),
                    border_color=style_data.get("border_color", "#d1d5db"),
                    text_color=style_data.get("text_color", "#374151")
                )
            
            workflow.nodes.append(node)
            
            if self.save_workflow(namespace, workflow):
                return node
            return None
        
        except Exception as e:
            logger.error(f"添加节点失败: {e}")
            return None
    
    def update_node(self, namespace: str, workflow_id: str, node_id: str, node_data: Dict[str, Any]) -> bool:
        """更新节点"""
        try:
            workflow = self.load_workflow(namespace, workflow_id)
            if not workflow:
                return False
            
            # 查找节点
            node = None
            for n in workflow.nodes:
                if n.id == node_id:
                    node = n
                    break
            
            if not node:
                return False
            
            # 更新节点属性
            if "name" in node_data:
                node.name = node_data["name"]
            if "description" in node_data:
                node.description = node_data["description"]
            if "owner" in node_data:
                node.owner = node_data["owner"]
            if "tools" in node_data:
                node.tools = node_data["tools"]
            if "responsibilities" in node_data:
                node.responsibilities = node_data["responsibilities"]
            if "deliverables" in node_data:
                node.deliverables = node_data["deliverables"]
            if "position" in node_data:
                node.position.x = node_data["position"]["x"]
                node.position.y = node_data["position"]["y"]
            
            # 更新样式
            if "style" in node_data:
                style_data = node_data["style"]
                node.style.width = style_data.get("width", node.style.width)
                node.style.height = style_data.get("height", node.style.height)
                node.style.background_color = style_data.get("background_color", node.style.background_color)
                node.style.border_color = style_data.get("border_color", node.style.border_color)
                node.style.text_color = style_data.get("text_color", node.style.text_color)
            
            return self.save_workflow(namespace, workflow)
        
        except Exception as e:
            logger.error(f"更新节点失败: {e}")
            return False
    
    def delete_node(self, namespace: str, workflow_id: str, node_id: str) -> bool:
        """删除节点"""
        try:
            workflow = self.load_workflow(namespace, workflow_id)
            if not workflow:
                return False
            
            # 删除节点
            workflow.nodes = [n for n in workflow.nodes if n.id != node_id]
            
            # 删除相关的连线
            workflow.edges = [e for e in workflow.edges 
                            if e.source_node_id != node_id and e.target_node_id != node_id]
            
            return self.save_workflow(namespace, workflow)
        
        except Exception as e:
            logger.error(f"删除节点失败: {e}")
            return False
    
    def add_edge(self, namespace: str, workflow_id: str, edge_data: Dict[str, Any]) -> Optional[WorkflowEdge]:
        """添加连线"""
        try:
            workflow = self.load_workflow(namespace, workflow_id)
            if not workflow:
                return None
            
            # 创建新连线
            edge = WorkflowEdge(
                source_node_id=edge_data["source_node_id"],
                target_node_id=edge_data["target_node_id"],
                source_handle=edge_data.get("source_handle", "output"),
                target_handle=edge_data.get("target_handle", "input"),
                label=edge_data.get("label", ""),
                condition=edge_data.get("condition")
            )
            
            # 应用样式
            style_data = edge_data.get("style", {})
            if style_data:
                edge.style = EdgeStyle(
                    color=style_data.get("color", "#6b7280"),
                    width=style_data.get("width", 2),
                    style=style_data.get("style", "solid")
                )
            
            workflow.edges.append(edge)
            
            if self.save_workflow(namespace, workflow):
                return edge
            return None
        
        except Exception as e:
            logger.error(f"添加连线失败: {e}")
            return None
    
    def delete_edge(self, namespace: str, workflow_id: str, edge_id: str) -> bool:
        """删除连线"""
        try:
            workflow = self.load_workflow(namespace, workflow_id)
            if not workflow:
                return False
            
            # 删除连线
            workflow.edges = [e for e in workflow.edges if e.id != edge_id]
            
            return self.save_workflow(namespace, workflow)
        
        except Exception as e:
            logger.error(f"删除连线失败: {e}")
            return False
    
    def validate_workflow(self, namespace: str, workflow_id: str) -> List[str]:
        """验证工作流"""
        workflow = self.load_workflow(namespace, workflow_id)
        if not workflow:
            return ["工作流不存在"]
        
        return workflow.validate()
    
    def export_workflow(self, namespace: str, workflow_id: str, format: str = "json") -> Optional[str]:
        """导出工作流"""
        try:
            workflow = self.load_workflow(namespace, workflow_id)
            if not workflow:
                return None
            
            if format == "json":
                return json.dumps(workflow.to_dict(), ensure_ascii=False, indent=2)
            elif format == "yaml":
                return yaml.dump(workflow.to_dict(), allow_unicode=True, default_flow_style=False)
            else:
                return None
        
        except Exception as e:
            logger.error(f"导出工作流失败: {e}")
            return None
    
    def import_workflow(self, namespace: str, data: str, format: str = "json") -> Optional[WorkflowDefinition]:
        """导入工作流"""
        try:
            if format == "json":
                workflow_data = json.loads(data)
            elif format == "yaml":
                workflow_data = yaml.safe_load(data)
            else:
                return None
            
            workflow = WorkflowDefinition.from_dict(workflow_data)
            
            if self.save_workflow(namespace, workflow):
                return workflow
            return None
        
        except Exception as e:
            logger.error(f"导入工作流失败: {e}")
            return None
    
    def get_node_templates(self) -> Dict[str, Any]:
        """获取节点模板"""
        return NODE_TEMPLATES
    
    def update_canvas_config(self, namespace: str, workflow_id: str, config: Dict[str, Any]) -> bool:
        """更新画布配置"""
        try:
            workflow = self.load_workflow(namespace, workflow_id)
            if not workflow:
                return False
            
            workflow.canvas_config.update(config)
            return self.save_workflow(namespace, workflow)
        
        except Exception as e:
            logger.error(f"更新画布配置失败: {e}")
            return False

# 全局工作流服务实例
workflow_service = WorkflowService()
