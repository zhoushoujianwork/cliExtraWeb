"""
Workflow DAG 数据模型定义
支持拖拽式工作流编辑器的数据结构
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import uuid
import json

class NodeType(Enum):
    """节点类型枚举"""
    START = "start"           # 开始节点
    END = "end"              # 结束节点
    TASK = "task"            # 任务节点
    DECISION = "decision"     # 决策节点
    PARALLEL = "parallel"     # 并行节点
    MERGE = "merge"          # 合并节点
    CONDITION = "condition"   # 条件节点

class NodeStatus(Enum):
    """节点状态枚举"""
    PENDING = "pending"       # 等待中
    RUNNING = "running"       # 运行中
    COMPLETED = "completed"   # 已完成
    FAILED = "failed"         # 失败
    SKIPPED = "skipped"       # 跳过

class Priority(Enum):
    """优先级枚举"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class Position:
    """节点位置信息"""
    x: float
    y: float

@dataclass
class NodeStyle:
    """节点样式配置"""
    width: int = 200
    height: int = 80
    background_color: str = "#ffffff"
    border_color: str = "#d1d5db"
    text_color: str = "#374151"
    border_width: int = 2
    border_radius: int = 8

@dataclass
class EdgeStyle:
    """连线样式配置"""
    color: str = "#6b7280"
    width: int = 2
    style: str = "solid"  # solid, dashed, dotted
    arrow_size: int = 8

@dataclass
class WorkflowNode:
    """工作流节点定义"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    type: NodeType = NodeType.TASK
    name: str = ""
    description: str = ""
    
    # 位置和样式
    position: Position = field(default_factory=lambda: Position(0, 0))
    style: NodeStyle = field(default_factory=NodeStyle)
    
    # 执行相关
    owner: str = ""  # 负责人角色
    estimated_duration: int = 0  # 预估时长(分钟)
    priority: Priority = Priority.MEDIUM
    
    # 任务配置
    tools: List[str] = field(default_factory=list)
    responsibilities: List[str] = field(default_factory=list)
    deliverables: List[str] = field(default_factory=list)
    
    # 条件配置 (用于决策节点)
    conditions: Dict[str, Any] = field(default_factory=dict)
    
    # 运行时状态
    status: NodeStatus = NodeStatus.PENDING
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    error_message: Optional[str] = None
    
    # 扩展属性
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class WorkflowEdge:
    """工作流连线定义"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    source_node_id: str = ""
    target_node_id: str = ""
    
    # 连接点配置
    source_handle: str = "output"  # 源节点的连接点
    target_handle: str = "input"   # 目标节点的连接点
    
    # 样式配置
    style: EdgeStyle = field(default_factory=EdgeStyle)
    
    # 条件配置
    condition: Optional[str] = None  # 连线触发条件
    label: str = ""  # 连线标签
    
    # 扩展属性
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class CollaborationRule:
    """协作规则定义"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    from_role: str = ""
    to_role: str = ""
    trigger: str = ""
    action: str = ""
    message_template: str = ""
    priority: Priority = Priority.MEDIUM
    auto_execute: bool = True

@dataclass
class WorkflowDefinition:
    """完整的工作流定义"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    description: str = ""
    version: str = "1.0.0"
    
    # 项目信息
    project_name: str = ""
    project_description: str = ""
    repository: str = ""
    
    # 节点和连线
    nodes: List[WorkflowNode] = field(default_factory=list)
    edges: List[WorkflowEdge] = field(default_factory=list)
    
    # 角色定义
    roles: List[Dict[str, Any]] = field(default_factory=list)
    
    # 协作规则
    collaboration_rules: List[CollaborationRule] = field(default_factory=list)
    
    # 通知配置
    notifications: Dict[str, Any] = field(default_factory=dict)
    
    # 画布配置
    canvas_config: Dict[str, Any] = field(default_factory=lambda: {
        "width": 2000,
        "height": 1500,
        "zoom": 1.0,
        "pan_x": 0,
        "pan_y": 0
    })
    
    # 元数据
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "project_name": self.project_name,
            "project_description": self.project_description,
            "repository": self.repository,
            "nodes": [self._node_to_dict(node) for node in self.nodes],
            "edges": [self._edge_to_dict(edge) for edge in self.edges],
            "roles": self.roles,
            "collaboration_rules": [self._collaboration_to_dict(rule) for rule in self.collaboration_rules],
            "notifications": self.notifications,
            "canvas_config": self.canvas_config,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "created_by": self.created_by
        }
    
    def _node_to_dict(self, node: WorkflowNode) -> Dict[str, Any]:
        """节点转字典"""
        return {
            "id": node.id,
            "type": node.type.value,
            "name": node.name,
            "description": node.description,
            "position": {"x": node.position.x, "y": node.position.y},
            "style": {
                "width": node.style.width,
                "height": node.style.height,
                "background_color": node.style.background_color,
                "border_color": node.style.border_color,
                "text_color": node.style.text_color,
                "border_width": node.style.border_width,
                "border_radius": node.style.border_radius
            },
            "owner": node.owner,
            "estimated_duration": node.estimated_duration,
            "priority": node.priority.value,
            "tools": node.tools,
            "responsibilities": node.responsibilities,
            "deliverables": node.deliverables,
            "conditions": node.conditions,
            "status": node.status.value,
            "start_time": node.start_time,
            "end_time": node.end_time,
            "error_message": node.error_message,
            "metadata": node.metadata
        }
    
    def _edge_to_dict(self, edge: WorkflowEdge) -> Dict[str, Any]:
        """连线转字典"""
        return {
            "id": edge.id,
            "source_node_id": edge.source_node_id,
            "target_node_id": edge.target_node_id,
            "source_handle": edge.source_handle,
            "target_handle": edge.target_handle,
            "style": {
                "color": edge.style.color,
                "width": edge.style.width,
                "style": edge.style.style,
                "arrow_size": edge.style.arrow_size
            },
            "condition": edge.condition,
            "label": edge.label,
            "metadata": edge.metadata
        }
    
    def _collaboration_to_dict(self, rule: CollaborationRule) -> Dict[str, Any]:
        """协作规则转字典"""
        return {
            "id": rule.id,
            "from_role": rule.from_role,
            "to_role": rule.to_role,
            "trigger": rule.trigger,
            "action": rule.action,
            "message_template": rule.message_template,
            "priority": rule.priority.value,
            "auto_execute": rule.auto_execute
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'WorkflowDefinition':
        """从字典创建工作流定义"""
        workflow = cls(
            id=data.get("id", str(uuid.uuid4())),
            name=data.get("name", ""),
            description=data.get("description", ""),
            version=data.get("version", "1.0.0"),
            project_name=data.get("project_name", ""),
            project_description=data.get("project_description", ""),
            repository=data.get("repository", ""),
            roles=data.get("roles", []),
            notifications=data.get("notifications", {}),
            canvas_config=data.get("canvas_config", {}),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
            created_by=data.get("created_by", "")
        )
        
        # 解析节点
        for node_data in data.get("nodes", []):
            node = WorkflowNode(
                id=node_data.get("id", str(uuid.uuid4())),
                type=NodeType(node_data.get("type", "task")),
                name=node_data.get("name", ""),
                description=node_data.get("description", ""),
                position=Position(
                    x=node_data.get("position", {}).get("x", 0),
                    y=node_data.get("position", {}).get("y", 0)
                ),
                owner=node_data.get("owner", ""),
                estimated_duration=node_data.get("estimated_duration", 0),
                priority=Priority(node_data.get("priority", "medium")),
                tools=node_data.get("tools", []),
                responsibilities=node_data.get("responsibilities", []),
                deliverables=node_data.get("deliverables", []),
                conditions=node_data.get("conditions", {}),
                status=NodeStatus(node_data.get("status", "pending")),
                start_time=node_data.get("start_time"),
                end_time=node_data.get("end_time"),
                error_message=node_data.get("error_message"),
                metadata=node_data.get("metadata", {})
            )
            
            # 设置样式
            style_data = node_data.get("style", {})
            node.style = NodeStyle(
                width=style_data.get("width", 200),
                height=style_data.get("height", 80),
                background_color=style_data.get("background_color", "#ffffff"),
                border_color=style_data.get("border_color", "#d1d5db"),
                text_color=style_data.get("text_color", "#374151"),
                border_width=style_data.get("border_width", 2),
                border_radius=style_data.get("border_radius", 8)
            )
            
            workflow.nodes.append(node)
        
        # 解析连线
        for edge_data in data.get("edges", []):
            edge = WorkflowEdge(
                id=edge_data.get("id", str(uuid.uuid4())),
                source_node_id=edge_data.get("source_node_id", ""),
                target_node_id=edge_data.get("target_node_id", ""),
                source_handle=edge_data.get("source_handle", "output"),
                target_handle=edge_data.get("target_handle", "input"),
                condition=edge_data.get("condition"),
                label=edge_data.get("label", ""),
                metadata=edge_data.get("metadata", {})
            )
            
            # 设置样式
            style_data = edge_data.get("style", {})
            edge.style = EdgeStyle(
                color=style_data.get("color", "#6b7280"),
                width=style_data.get("width", 2),
                style=style_data.get("style", "solid"),
                arrow_size=style_data.get("arrow_size", 8)
            )
            
            workflow.edges.append(edge)
        
        # 解析协作规则
        for rule_data in data.get("collaboration_rules", []):
            rule = CollaborationRule(
                id=rule_data.get("id", str(uuid.uuid4())),
                from_role=rule_data.get("from_role", ""),
                to_role=rule_data.get("to_role", ""),
                trigger=rule_data.get("trigger", ""),
                action=rule_data.get("action", ""),
                message_template=rule_data.get("message_template", ""),
                priority=Priority(rule_data.get("priority", "medium")),
                auto_execute=rule_data.get("auto_execute", True)
            )
            workflow.collaboration_rules.append(rule)
        
        return workflow
    
    def validate(self) -> List[str]:
        """验证工作流定义的有效性"""
        errors = []
        
        # 检查基本信息
        if not self.name:
            errors.append("工作流名称不能为空")
        
        # 检查节点
        if not self.nodes:
            errors.append("工作流必须包含至少一个节点")
        
        node_ids = {node.id for node in self.nodes}
        
        # 检查连线
        for edge in self.edges:
            if edge.source_node_id not in node_ids:
                errors.append(f"连线 {edge.id} 的源节点 {edge.source_node_id} 不存在")
            if edge.target_node_id not in node_ids:
                errors.append(f"连线 {edge.id} 的目标节点 {edge.target_node_id} 不存在")
        
        # 检查是否有环路 (简单检查)
        if self._has_cycle():
            errors.append("工作流中存在环路，这在 DAG 中是不允许的")
        
        return errors
    
    def _has_cycle(self) -> bool:
        """检查是否存在环路"""
        # 构建邻接表
        graph = {}
        for node in self.nodes:
            graph[node.id] = []
        
        for edge in self.edges:
            if edge.source_node_id in graph:
                graph[edge.source_node_id].append(edge.target_node_id)
        
        # DFS 检查环路
        visited = set()
        rec_stack = set()
        
        def dfs(node_id):
            visited.add(node_id)
            rec_stack.add(node_id)
            
            for neighbor in graph.get(node_id, []):
                if neighbor not in visited:
                    if dfs(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True
            
            rec_stack.remove(node_id)
            return False
        
        for node_id in graph:
            if node_id not in visited:
                if dfs(node_id):
                    return True
        
        return False

# 预定义的节点模板
NODE_TEMPLATES = {
    "start": {
        "type": NodeType.START,
        "name": "开始",
        "description": "工作流开始节点",
        "style": {
            "background_color": "#10b981",
            "border_color": "#059669",
            "text_color": "#ffffff"
        }
    },
    "end": {
        "type": NodeType.END,
        "name": "结束",
        "description": "工作流结束节点",
        "style": {
            "background_color": "#ef4444",
            "border_color": "#dc2626",
            "text_color": "#ffffff"
        }
    },
    "task": {
        "type": NodeType.TASK,
        "name": "任务节点",
        "description": "执行具体任务",
        "style": {
            "background_color": "#3b82f6",
            "border_color": "#2563eb",
            "text_color": "#ffffff"
        }
    },
    "decision": {
        "type": NodeType.DECISION,
        "name": "决策节点",
        "description": "根据条件进行决策",
        "style": {
            "background_color": "#f59e0b",
            "border_color": "#d97706",
            "text_color": "#ffffff"
        }
    }
}
