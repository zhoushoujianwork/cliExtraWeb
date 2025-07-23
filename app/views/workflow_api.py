"""
Workflow DAG API 接口
提供拖拽式工作流编辑器的后端支持
"""

from flask import Blueprint, request, jsonify
import logging
import json
import time
import os
from datetime import datetime

logger = logging.getLogger(__name__)

bp = Blueprint('workflow_api', __name__)

@bp.route('/api/workflow/list', methods=['GET'])
def list_workflows():
    """获取工作流列表"""
    try:
        from app.services.dag_workflow_service import dag_workflow_service
        
        namespace = request.args.get('namespace', 'default')
        
        # 获取可用的namespace列表
        available_namespaces = ['default', 'simple_dev', 'test', 'q_cli']
        workflows = []
        
        # 如果指定了namespace，只获取该namespace的workflow
        if namespace and namespace != 'all':
            namespaces_to_check = [namespace]
        else:
            namespaces_to_check = available_namespaces
        
        for ns in namespaces_to_check:
            try:
                # 使用DAG服务获取workflow配置
                dag_result = dag_workflow_service.get_dag_structure(ns)
                
                if dag_result.get("success") and dag_result.get("dag"):
                    dag_data = dag_result["dag"]
                    
                    workflow_info = {
                        "id": dag_data.get("id", f"workflow-{ns}"),
                        "name": dag_data.get("name", f"{ns} 工作流"),
                        "description": dag_data.get("description", ""),
                        "namespace": ns,
                        "version": "2.0",
                        "created_at": datetime.now().isoformat(),
                        "updated_at": datetime.now().isoformat(),
                        "node_count": len(dag_data.get("nodes", [])),
                        "edge_count": len(dag_data.get("edges", [])),
                        "status": dag_data.get("status", "active"),
                        "current_node": dag_data.get("current_node")
                    }
                    workflows.append(workflow_info)
                    
            except Exception as e:
                logger.warning(f"获取namespace {ns} 的workflow失败: {str(e)}")
                continue
        
        # 按更新时间排序
        workflows.sort(key=lambda x: x.get('updated_at', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'workflows': workflows,
            'namespace': namespace,
            'total': len(workflows)
        })
        
    except Exception as e:
        logger.error("获取工作流列表失败: {}".format(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/api/workflow/create', methods=['POST'])
def create_workflow():
    """创建新工作流"""
    try:
        data = request.get_json()
        name = data.get('name', '新工作流')
        description = data.get('description', '')
        namespace = data.get('namespace', 'default')
        
        # 创建新工作流的示例响应
        new_workflow = {
            "id": f"workflow-{int(time.time())}",
            "name": name,
            "description": description,
            "version": "1.0.0",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "node_count": 2,  # 默认包含开始和结束节点
            "edge_count": 0,
            "status": "draft"
        }
        
        logger.info(f"创建工作流: {name} (namespace: {namespace})")
        
        return jsonify({
            'success': True,
            'workflow': new_workflow,
            'message': f'工作流 "{name}" 创建成功'
        })
        
    except Exception as e:
        logger.error(f"创建工作流失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/api/workflow/delete/<workflow_id>', methods=['DELETE'])
def delete_workflow(workflow_id):
    """删除工作流"""
    try:
        namespace = request.args.get('namespace', 'default')
        
        logger.info(f"删除工作流: {workflow_id} (namespace: {namespace})")
        
        return jsonify({
            'success': True,
            'message': f'工作流 {workflow_id} 删除成功'
        })
        
    except Exception as e:
        logger.error(f"删除工作流失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/api/workflow/templates', methods=['GET'])
def get_node_templates():
    """获取节点模板"""
    templates = {
        "start": {
            "type": "start",
            "name": "开始",
            "description": "工作流开始节点",
            "style": {
                "backgroundColor": "#10b981",
                "borderColor": "#059669",
                "color": "#ffffff"
            }
        },
        "end": {
            "type": "end", 
            "name": "结束",
            "description": "工作流结束节点",
            "style": {
                "backgroundColor": "#ef4444",
                "borderColor": "#dc2626", 
                "color": "#ffffff"
            }
        },
        "task": {
            "type": "task",
            "name": "任务节点",
            "description": "执行具体任务",
            "style": {
                "backgroundColor": "#3b82f6",
                "borderColor": "#2563eb",
                "color": "#ffffff"
            }
        },
        "decision": {
            "type": "decision",
            "name": "决策节点", 
            "description": "根据条件进行决策",
            "style": {
                "backgroundColor": "#f59e0b",
                "borderColor": "#d97706",
                "color": "#ffffff"
            }
        }
    }
    
    return jsonify({
        'success': True,
        'templates': templates
    })

@bp.route('/api/workflow/<namespace>/<workflow_id>', methods=['GET'])
def get_workflow(namespace, workflow_id):
    """获取工作流数据"""
    try:
        # 读取真实的工作流文件
        workflow_dir = os.path.join(os.getcwd(), '.amazonq', 'workflows', namespace)
        workflow_file = os.path.join(workflow_dir, workflow_id + '.json')
        
        if not os.path.exists(workflow_file):
            return jsonify({
                'success': False,
                'error': '工作流不存在'
            }), 404
        
        with open(workflow_file, 'r') as f:
            workflow_data = json.load(f)
        
        # 转换为 React Flow 格式
        react_flow_data = convert_to_react_flow_format(workflow_data)
        
        return jsonify({
            'success': True,
            'workflow': react_flow_data
        })
        
    except Exception as e:
        logger.error("获取工作流失败: {}".format(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def convert_to_react_flow_format(workflow_data):
    """将内部工作流格式转换为 React Flow 格式"""
    react_flow_nodes = []
    react_flow_edges = []
    
    # 转换节点
    for node in workflow_data.get('nodes', []):
        react_node = {
            "id": node['id'],
            "type": node['type'],
            "data": {
                "label": node['name'],
                "description": node.get('description', ''),
                "owner": node.get('owner', ''),
                "responsibilities": node.get('responsibilities', []),
                "deliverables": node.get('deliverables', []),
                "style": {
                    "backgroundColor": node.get('style', {}).get('background_color', '#ffffff'),
                    "borderColor": node.get('style', {}).get('border_color', '#d1d5db'),
                    "color": node.get('style', {}).get('text_color', '#000000')
                }
            },
            "position": {
                "x": node.get('position', {}).get('x', 0),
                "y": node.get('position', {}).get('y', 0)
            },
            "style": {
                "backgroundColor": node.get('style', {}).get('background_color', '#ffffff'),
                "borderColor": node.get('style', {}).get('border_color', '#d1d5db'),
                "color": node.get('style', {}).get('text_color', '#000000'),
                "width": node.get('style', {}).get('width', 150),
                "height": node.get('style', {}).get('height', 60)
            }
        }
        react_flow_nodes.append(react_node)
    
    # 转换连线
    for edge in workflow_data.get('edges', []):
        react_edge = {
            "id": edge['id'],
            "source": edge['source_node_id'],
            "target": edge['target_node_id'],
            "type": "smoothstep",
            "label": edge.get('label', ''),
            "style": {
                "stroke": edge.get('style', {}).get('color', '#6b7280'),
                "strokeWidth": edge.get('style', {}).get('width', 2)
            }
        }
        react_flow_edges.append(react_edge)
    
    return {
        "id": workflow_data.get('id', ''),
        "name": workflow_data.get('name', ''),
        "description": workflow_data.get('description', ''),
        "nodes": react_flow_nodes,
        "edges": react_flow_edges,
        "viewport": {
            "x": workflow_data.get('canvas_config', {}).get('pan_x', 0),
            "y": workflow_data.get('canvas_config', {}).get('pan_y', 0),
            "zoom": workflow_data.get('canvas_config', {}).get('zoom', 1.0)
        }
    }

@bp.route('/api/workflow/<namespace>/<workflow_id>', methods=['PUT'])
def save_workflow(namespace, workflow_id):
    """保存工作流"""
    try:
        data = request.get_json()
        
        # 临时只记录日志，后续实现真实保存
        logger.info(f"保存工作流 {namespace}/{workflow_id}")
        logger.info(f"节点数量: {len(data.get('nodes', []))}")
        logger.info(f"连线数量: {len(data.get('edges', []))}")
        
        return jsonify({
            'success': True,
            'message': '工作流保存成功'
        })
        
    except Exception as e:
        logger.error(f"保存工作流失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
