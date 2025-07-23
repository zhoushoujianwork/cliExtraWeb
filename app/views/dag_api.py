# -*- coding: utf-8 -*-
"""
DAG 工作流 API 接口
提供DAG工作流可视化的后端API支持
"""
from flask import Blueprint, request, jsonify
import logging
from app.services.dag_workflow_service import dag_workflow_service
from app.services.instance_mapping_service import instance_mapping_service

logger = logging.getLogger(__name__)

bp = Blueprint('dag_api', __name__)

@bp.route('/api/workflow/dag', methods=['GET'])
def get_dag_structure():
    """获取DAG结构
    
    Query Parameters:
        namespace (str): 命名空间，默认为 'default'
    
    Returns:
        JSON: DAG结构数据
    """
    try:
        namespace = request.args.get('namespace', 'default')
        logger.info(f"获取DAG结构，namespace: {namespace}")
        
        # 获取DAG结构
        result = dag_workflow_service.get_dag_structure(namespace)
        
        if result.get("success"):
            # 获取角色实例映射并更新节点信息
            role_mappings = instance_mapping_service.get_role_instance_mapping(namespace)
            
            # 更新节点的实例分配信息
            dag_data = result["dag"]
            for node in dag_data["nodes"]:
                if node.get("role"):
                    role = node["role"]
                    if role in role_mappings:
                        role_mapping = role_mappings[role]
                        node["available_instances"] = role_mapping.instances
                        node["preferred_instance"] = role_mapping.preferred_instance
                        
                        # 如果没有分配实例，自动分配首选实例
                        if not node.get("instance_id") and role_mapping.preferred_instance:
                            node["instance_id"] = role_mapping.preferred_instance
            
            return jsonify(result)
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"获取DAG结构失败: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@bp.route('/api/workflow/status', methods=['GET'])
def get_workflow_status():
    """获取工作流执行状态
    
    Query Parameters:
        namespace (str): 命名空间，默认为 'default'
    
    Returns:
        JSON: 工作流状态信息
    """
    try:
        namespace = request.args.get('namespace', 'default')
        logger.info(f"获取工作流状态，namespace: {namespace}")
        
        # 获取工作流状态
        result = dag_workflow_service.get_workflow_status(namespace)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"获取工作流状态失败: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@bp.route('/api/workflow/complete', methods=['POST'])
def complete_task():
    """完成任务节点
    
    Request Body:
        {
            "task_id": "任务ID",
            "namespace": "命名空间",
            "deliverables": "交付物描述"
        }
    
    Returns:
        JSON: 任务完成结果
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "请求数据不能为空"
            }), 400
        
        task_id = data.get('task_id')
        namespace = data.get('namespace', 'default')
        deliverables = data.get('deliverables', '')
        
        if not task_id:
            return jsonify({
                "success": False,
                "error": "task_id 参数必须提供"
            }), 400
        
        logger.info(f"完成任务: {task_id}, namespace: {namespace}")
        
        # 完成任务
        result = dag_workflow_service.complete_task(task_id, namespace, deliverables)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"完成任务失败: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@bp.route('/api/instances/mapping', methods=['GET'])
def get_instances_mapping():
    """获取角色实例映射
    
    Query Parameters:
        namespace (str): 命名空间，默认为 None (所有命名空间)
    
    Returns:
        JSON: 角色实例映射信息
    """
    try:
        namespace = request.args.get('namespace')
        logger.info(f"获取实例映射，namespace: {namespace}")
        
        # 获取角色实例映射
        role_mappings = instance_mapping_service.get_role_instance_mapping(namespace)
        
        # 转换为JSON可序列化的格式
        mappings_data = {}
        for role, mapping in role_mappings.items():
            mappings_data[role] = {
                "role": mapping.role,
                "instances": mapping.instances,
                "preferred_instance": mapping.preferred_instance,
                "auto_assign": mapping.auto_assign
            }
        
        return jsonify({
            "success": True,
            "mappings": mappings_data,
            "namespace": namespace
        })
        
    except Exception as e:
        logger.error(f"获取实例映射失败: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@bp.route('/api/instances/assign', methods=['POST'])
def assign_instance():
    """分配实例到角色
    
    Request Body:
        {
            "role": "角色名称",
            "instance_id": "实例ID",
            "namespace": "命名空间"
        }
    
    Returns:
        JSON: 分配结果
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "请求数据不能为空"
            }), 400
        
        role = data.get('role')
        instance_id = data.get('instance_id')
        namespace = data.get('namespace')
        
        if not role or not instance_id:
            return jsonify({
                "success": False,
                "error": "role 和 instance_id 参数必须提供"
            }), 400
        
        logger.info(f"分配实例: {instance_id} -> {role}, namespace: {namespace}")
        
        # 分配实例到角色
        success = instance_mapping_service.assign_instance_to_role(role, instance_id, namespace)
        
        if success:
            return jsonify({
                "success": True,
                "message": f"实例 {instance_id} 已分配到角色 {role}"
            })
        else:
            return jsonify({
                "success": False,
                "error": "分配失败"
            }), 500
        
    except Exception as e:
        logger.error(f"分配实例失败: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@bp.route('/api/instances/details/<instance_id>', methods=['GET'])
def get_instance_details(instance_id):
    """获取实例详细信息
    
    Path Parameters:
        instance_id (str): 实例ID
    
    Returns:
        JSON: 实例详细信息
    """
    try:
        logger.info(f"获取实例详情: {instance_id}")
        
        # 获取实例详情
        instance_details = instance_mapping_service.get_instance_details(instance_id)
        
        if instance_details:
            return jsonify({
                "success": True,
                "instance": instance_details
            })
        else:
            return jsonify({
                "success": False,
                "error": f"实例 {instance_id} 不存在"
            }), 404
        
    except Exception as e:
        logger.error(f"获取实例详情失败: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@bp.route('/api/workflow/roles', methods=['GET'])
def get_available_roles():
    """获取可用角色列表
    
    Returns:
        JSON: 角色列表
    """
    try:
        roles = instance_mapping_service.get_available_roles()
        
        return jsonify({
            "success": True,
            "roles": roles
        })
        
    except Exception as e:
        logger.error(f"获取角色列表失败: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@bp.route('/api/workflow/dag/validate', methods=['POST'])
def validate_dag():
    """验证DAG结构
    
    Request Body:
        {
            "nodes": [...],
            "edges": [...]
        }
    
    Returns:
        JSON: 验证结果
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "请求数据不能为空"
            }), 400
        
        nodes = data.get('nodes', [])
        edges = data.get('edges', [])
        
        # 基本验证
        validation_errors = []
        
        # 检查是否有开始节点
        start_nodes = [n for n in nodes if n.get('type') == 'start']
        if len(start_nodes) != 1:
            validation_errors.append("必须有且仅有一个开始节点")
        
        # 检查是否有结束节点
        end_nodes = [n for n in nodes if n.get('type') == 'end']
        if len(end_nodes) != 1:
            validation_errors.append("必须有且仅有一个结束节点")
        
        # 检查节点ID唯一性
        node_ids = [n.get('id') for n in nodes]
        if len(node_ids) != len(set(node_ids)):
            validation_errors.append("节点ID必须唯一")
        
        # 检查边的有效性
        for edge in edges:
            source = edge.get('source')
            target = edge.get('target')
            
            if source not in node_ids:
                validation_errors.append(f"边的源节点 {source} 不存在")
            
            if target not in node_ids:
                validation_errors.append(f"边的目标节点 {target} 不存在")
        
        if validation_errors:
            return jsonify({
                "success": False,
                "valid": False,
                "errors": validation_errors
            })
        else:
            return jsonify({
                "success": True,
                "valid": True,
                "message": "DAG结构验证通过"
            })
        
    except Exception as e:
        logger.error(f"DAG验证失败: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
