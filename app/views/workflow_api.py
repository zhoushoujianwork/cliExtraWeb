"""
Workflow DAG API 接口
提供拖拽式工作流编辑器的后端支持
"""

from flask import Blueprint, request, jsonify
import logging
import json

logger = logging.getLogger(__name__)

bp = Blueprint('workflow_api', __name__, url_prefix='/api/workflow')

@bp.route('/templates', methods=['GET'])
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

@bp.route('/<namespace>/<workflow_id>', methods=['GET'])
def get_workflow(namespace, workflow_id):
    """获取工作流数据"""
    try:
        # 临时返回示例数据，后续连接真实服务
        sample_workflow = {
            "id": workflow_id,
            "name": "示例工作流",
            "description": "这是一个示例工作流",
            "nodes": [
                {
                    "id": "start-1",
                    "type": "start",
                    "data": {
                        "label": "开始",
                        "description": "工作流开始"
                    },
                    "position": {"x": 100, "y": 100},
                    "style": {
                        "backgroundColor": "#10b981",
                        "color": "#ffffff"
                    }
                },
                {
                    "id": "task-1", 
                    "type": "task",
                    "data": {
                        "label": "需求分析",
                        "description": "分析用户需求和技术可行性",
                        "owner": "any"
                    },
                    "position": {"x": 300, "y": 100},
                    "style": {
                        "backgroundColor": "#3b82f6",
                        "color": "#ffffff"
                    }
                },
                {
                    "id": "end-1",
                    "type": "end",
                    "data": {
                        "label": "结束", 
                        "description": "工作流结束"
                    },
                    "position": {"x": 500, "y": 100},
                    "style": {
                        "backgroundColor": "#ef4444",
                        "color": "#ffffff"
                    }
                }
            ],
            "edges": [
                {
                    "id": "edge-1",
                    "source": "start-1",
                    "target": "task-1",
                    "type": "smoothstep"
                },
                {
                    "id": "edge-2", 
                    "source": "task-1",
                    "target": "end-1",
                    "type": "smoothstep"
                }
            ]
        }
        
        return jsonify({
            'success': True,
            'workflow': sample_workflow
        })
        
    except Exception as e:
        logger.error(f"获取工作流失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/<namespace>/<workflow_id>', methods=['PUT'])
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
