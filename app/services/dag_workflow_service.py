# -*- coding: utf-8 -*-
"""
DAG 工作流服务
提供DAG工作流的数据结构管理和状态跟踪功能
"""
import json
import os
import subprocess
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)

class NodeType(Enum):
    """节点类型枚举"""
    START = "start"
    TASK = "task" 
    DECISION = "decision"
    END = "end"

class NodeStatus(Enum):
    """节点状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

@dataclass
class DAGNode:
    """DAG节点数据结构"""
    id: str
    type: NodeType
    name: str
    description: str = ""
    role: Optional[str] = None
    instance_id: Optional[str] = None
    status: NodeStatus = NodeStatus.PENDING
    position: Dict[str, float] = None
    config: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.position is None:
            self.position = {"x": 0, "y": 0}
        if self.config is None:
            self.config = {}

@dataclass
class DAGEdge:
    """DAG边数据结构"""
    id: str
    source: str
    target: str
    condition: Optional[str] = None
    label: str = ""
    
@dataclass
class DAGWorkflow:
    """DAG工作流数据结构"""
    id: str
    name: str
    description: str
    namespace: str
    nodes: List[DAGNode]
    edges: List[DAGEdge]
    current_node: Optional[str] = None
    status: str = "inactive"
    created_at: str = ""
    updated_at: str = ""
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if not self.updated_at:
            self.updated_at = datetime.now().isoformat()

class DAGWorkflowService:
    """DAG工作流服务类"""
    
    def __init__(self):
        self.config_dir = os.path.expanduser("~/.cliExtra")
        self.workflows_dir = os.path.join(self.config_dir, "workflows")
        os.makedirs(self.workflows_dir, exist_ok=True)
        
    def get_workflow_config_path(self, namespace: str = "default") -> str:
        """获取工作流配置文件路径"""
        return os.path.join(self.workflows_dir, f"{namespace}.json")
    
    def load_workflow_from_cliextra(self, namespace: str = "default") -> Optional[Dict]:
        """从cliExtra配置加载工作流"""
        try:
            # 使用正确的命令格式: qq workflow show <namespace> -o json
            cmd = ["qq", "workflow", "show", namespace, "-o", "json"]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0 and result.stdout.strip():
                # 解析输出，提取JSON部分
                output = result.stdout.strip()
                
                # 查找JSON开始位置
                json_start = output.find('{')
                if json_start != -1:
                    json_str = output[json_start:]
                    try:
                        workflow_data = json.loads(json_str)
                        logger.info(f"成功加载 {namespace} 的workflow配置")
                        return workflow_data
                    except json.JSONDecodeError as e:
                        logger.warning(f"无法解析workflow配置JSON: {str(e)}")
                        logger.debug(f"JSON内容: {json_str[:200]}...")
                        return None
                else:
                    logger.warning(f"在输出中未找到JSON: {output[:200]}...")
                    return None
            else:
                logger.info(f"Namespace {namespace} 没有workflow配置或命令执行失败")
                logger.debug(f"Command: {' '.join(cmd)}")
                logger.debug(f"Return code: {result.returncode}")
                logger.debug(f"stderr: {result.stderr}")
                return None
                
        except subprocess.TimeoutExpired:
            logger.error("执行 qq workflow show 超时")
            return None
        except FileNotFoundError:
            logger.error("qq 命令不存在，请确保cliExtra已安装")
            return None
        except Exception as e:
            logger.error(f"加载workflow配置失败: {str(e)}")
            return None
    
    def convert_cliextra_to_dag(self, workflow_config: Dict, namespace: str) -> DAGWorkflow:
        """将cliExtra工作流配置转换为DAG结构"""
        nodes = []
        edges = []
        
        # 解析v2.0格式的workflow配置
        workflow_nodes = workflow_config.get("nodes", {})
        workflow_edges = workflow_config.get("edges", [])
        roles_config = workflow_config.get("roles", {})
        
        # 转换节点
        for node_id, node_config in workflow_nodes.items():
            node_type = node_config.get("type", "task")
            
            # 映射节点类型
            if node_type == "decision":
                node_type_enum = NodeType.DECISION
            elif node_type == "start":
                node_type_enum = NodeType.START
            elif node_type == "end":
                node_type_enum = NodeType.END
            else:
                node_type_enum = NodeType.TASK
            
            # 获取角色信息
            owner = node_config.get("owner")
            role_info = roles_config.get(owner, {}) if owner else {}
            
            node = DAGNode(
                id=node_id,
                type=node_type_enum,
                name=node_config.get("title", node_id),
                description=node_config.get("description", ""),
                role=owner,
                position=node_config.get("position", {"x": 200, "y": 200}),
                config={
                    "deliverables": node_config.get("deliverables", []),
                    "completion_trigger": node_config.get("completion_trigger", {}),
                    "role_info": role_info,
                    "options": node_config.get("options", [])  # for decision nodes
                }
            )
            nodes.append(node)
        
        # 转换边
        for edge_config in workflow_edges:
            edge = DAGEdge(
                id=f"{edge_config['from']}-{edge_config['to']}",
                source=edge_config["from"],
                target=edge_config["to"],
                condition=edge_config.get("condition"),
                label=edge_config.get("label", "")
            )
            edges.append(edge)
        
        # 创建DAG工作流
        metadata = workflow_config.get("metadata", {})
        dag_workflow = DAGWorkflow(
            id=workflow_config.get("id", f"workflow-{namespace}"),
            name=metadata.get("name", f"{namespace} 工作流"),
            description=metadata.get("description", ""),
            namespace=namespace,
            nodes=nodes,
            edges=edges
        )
        
        return dag_workflow
    
    def get_dag_structure(self, namespace: str = "default") -> Dict:
        """获取DAG结构"""
        try:
            # 从cliExtra加载工作流配置
            workflow_config = self.load_workflow_from_cliextra(namespace)
            
            if workflow_config:
                # 转换为DAG结构
                dag_workflow = self.convert_cliextra_to_dag(workflow_config, namespace)
                
                return {
                    "success": True,
                    "dag": {
                        "id": dag_workflow.id,
                        "name": dag_workflow.name,
                        "description": dag_workflow.description,
                        "namespace": dag_workflow.namespace,
                        "nodes": [asdict(node) for node in dag_workflow.nodes],
                        "edges": [asdict(edge) for edge in dag_workflow.edges],
                        "current_node": dag_workflow.current_node,
                        "status": dag_workflow.status
                    }
                }
            else:
                # 返回默认的空DAG结构
                return self.get_default_dag_structure(namespace)
                
        except Exception as e:
            logger.error(f"获取DAG结构失败: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_default_dag_structure(self, namespace: str) -> Dict:
        """获取默认DAG结构"""
        return {
            "success": True,
            "dag": {
                "id": f"default-{namespace}",
                "name": f"{namespace} 默认工作流",
                "description": "默认工作流结构",
                "namespace": namespace,
                "nodes": [
                    {
                        "id": "start",
                        "type": "start",
                        "name": "开始",
                        "description": "工作流开始",
                        "role": None,
                        "instance_id": None,
                        "status": "pending",
                        "position": {"x": 100, "y": 100},
                        "config": {}
                    },
                    {
                        "id": "backend_dev",
                        "type": "task",
                        "name": "后端开发",
                        "description": "后端API开发任务",
                        "role": "backend",
                        "instance_id": None,
                        "status": "pending",
                        "position": {"x": 300, "y": 100},
                        "config": {
                            "deliverables": ["API接口", "接口文档", "测试数据"],
                            "tools": ["code", "test", "document"]
                        }
                    },
                    {
                        "id": "frontend_dev",
                        "type": "task", 
                        "name": "前端开发",
                        "description": "前端界面开发任务",
                        "role": "frontend",
                        "instance_id": None,
                        "status": "pending",
                        "position": {"x": 500, "y": 100},
                        "config": {
                            "deliverables": ["前端页面", "接口集成", "功能测试"],
                            "tools": ["code", "test", "ui"]
                        }
                    },
                    {
                        "id": "deployment",
                        "type": "task",
                        "name": "部署上线",
                        "description": "应用部署任务",
                        "role": "devops",
                        "instance_id": None,
                        "status": "pending",
                        "position": {"x": 400, "y": 250},
                        "config": {
                            "deliverables": ["部署完成", "环境验证", "监控配置"],
                            "tools": ["deploy", "monitor", "verify"]
                        }
                    },
                    {
                        "id": "end",
                        "type": "end",
                        "name": "结束",
                        "description": "工作流结束",
                        "role": None,
                        "instance_id": None,
                        "status": "pending",
                        "position": {"x": 400, "y": 350},
                        "config": {}
                    }
                ],
                "edges": [
                    {
                        "id": "start-backend_dev",
                        "source": "start",
                        "target": "backend_dev",
                        "condition": None,
                        "label": "开始开发"
                    },
                    {
                        "id": "backend_dev-frontend_dev",
                        "source": "backend_dev",
                        "target": "frontend_dev",
                        "condition": None,
                        "label": "API完成"
                    },
                    {
                        "id": "frontend_dev-deployment",
                        "source": "frontend_dev",
                        "target": "deployment",
                        "condition": None,
                        "label": "前端完成"
                    },
                    {
                        "id": "deployment-end",
                        "source": "deployment",
                        "target": "end",
                        "condition": None,
                        "label": "部署完成"
                    }
                ],
                "current_node": None,
                "status": "inactive"
            }
        }
    
    def get_workflow_status(self, namespace: str = "default") -> Dict:
        """获取工作流执行状态"""
        try:
            # 尝试执行 workflow-engine status 命令
            result = subprocess.run(
                ["workflow-engine", "status", namespace],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                try:
                    status_data = json.loads(result.stdout)
                    return {
                        "success": True,
                        "status": status_data
                    }
                except json.JSONDecodeError:
                    # 如果不是JSON格式，解析文本输出
                    return {
                        "success": True,
                        "status": {
                            "namespace": namespace,
                            "current_node": None,
                            "completed_nodes": [],
                            "active_instances": {},
                            "raw_output": result.stdout
                        }
                    }
            else:
                return {
                    "success": False,
                    "error": result.stderr or "获取状态失败"
                }
                
        except subprocess.TimeoutExpired:
            logger.error("执行 workflow-engine status 超时")
            return {"success": False, "error": "命令执行超时"}
        except FileNotFoundError:
            logger.error("workflow-engine 命令不存在")
            return {"success": False, "error": "workflow-engine 命令不存在"}
        except Exception as e:
            logger.error(f"获取工作流状态失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def complete_task(self, task_id: str, namespace: str = "default", deliverables: str = "") -> Dict:
        """完成任务节点"""
        try:
            # 执行 workflow-engine complete 命令
            cmd = ["workflow-engine", "complete", task_id, namespace]
            if deliverables:
                cmd.append(deliverables)
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                return {
                    "success": True,
                    "message": f"任务 {task_id} 完成成功",
                    "output": result.stdout
                }
            else:
                return {
                    "success": False,
                    "error": result.stderr or "任务完成失败"
                }
                
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "命令执行超时"}
        except FileNotFoundError:
            return {"success": False, "error": "workflow-engine 命令不存在"}
        except Exception as e:
            logger.error(f"完成任务失败: {str(e)}")
            return {"success": False, "error": str(e)}

# 全局服务实例
dag_workflow_service = DAGWorkflowService()
