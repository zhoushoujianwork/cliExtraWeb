"""
Workflow API 接口
提供 namespace workflow 管理的 Web API
"""

from flask import Blueprint, jsonify, request
import subprocess
import json
import yaml
import logging

logger = logging.getLogger(__name__)
bp = Blueprint('workflow_api', __name__, url_prefix='/api/workflow')

@bp.route('/<namespace>', methods=['GET'])
def get_workflow(namespace):
    """获取指定 namespace 的 workflow 配置"""
    try:
        # 调用 qq workflow show 命令
        result = subprocess.run(
            ['qq', 'workflow', 'show', namespace],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            logger.error(f"获取 workflow 失败: {result.stderr}")
            return jsonify({
                'success': False,
                'error': f'获取 workflow 失败: {result.stderr.strip()}'
            }), 500
        
        # 解析 YAML 输出
        try:
            # 移除标题行，只保留 YAML 内容
            yaml_content = result.stdout
            if yaml_content.startswith('=== Namespace:'):
                lines = yaml_content.split('\n')
                yaml_start = 1
                for i, line in enumerate(lines):
                    if line.strip() and not line.startswith('==='):
                        yaml_start = i
                        break
                yaml_content = '\n'.join(lines[yaml_start:])
            
            workflow_data = yaml.safe_load(yaml_content)
            
            return jsonify({
                'success': True,
                'namespace': namespace,
                'workflow': workflow_data
            })
            
        except yaml.YAMLError as e:
            logger.error(f"解析 workflow YAML 失败: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'解析 workflow 配置失败: {str(e)}'
            }), 500
            
    except subprocess.TimeoutExpired:
        logger.error("获取 workflow 超时")
        return jsonify({
            'success': False,
            'error': '获取 workflow 超时'
        }), 500
    except Exception as e:
        logger.error(f"获取 workflow 异常: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'获取 workflow 异常: {str(e)}'
        }), 500

@bp.route('/list', methods=['GET'])
def list_workflows():
    """获取所有可用的 workflow"""
    try:
        # 使用新的 workflow list 命令
        result = subprocess.run(
            ['qq', 'workflow', 'list'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            logger.error(f"获取 workflow 列表失败: {result.stderr}")
            return jsonify({
                'success': False,
                'error': f'获取列表失败: {result.stderr.strip()}'
            }), 500
        
        # 解析输出
        workflows = []
        lines = result.stdout.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if line.startswith('✅') or line.startswith('❌'):
                # 解析格式：✅ q_cli - workflow.yaml exists
                parts = line.split(' - ')
                if len(parts) >= 2:
                    status_and_name = parts[0].strip()
                    description = parts[1].strip()
                    
                    # 提取 namespace 名称
                    namespace = status_and_name[2:].strip()  # 去掉 ✅ 或 ❌
                    has_workflow = line.startswith('✅')
                    
                    # 获取实例数量（如果需要的话）
                    instance_count = 0
                    try:
                        from app.services.instance_manager import InstanceManager
                        manager = InstanceManager()
                        instances = manager.get_instances_by_namespace(namespace)
                        instance_count = len(instances)
                    except:
                        pass
                    
                    workflows.append({
                        'namespace': namespace,
                        'has_workflow': has_workflow,
                        'description': description,
                        'instance_count': instance_count
                    })
        
        return jsonify({
            'success': True,
            'workflows': workflows
        })
        
    except Exception as e:
        logger.error(f"获取 workflow 列表异常: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'获取列表异常: {str(e)}'
        }), 500

@bp.route('/info', methods=['GET'])
def get_workflow_info():
    """获取 workflow 系统信息"""
    try:
        result = subprocess.run(
            ['qq', 'workflow', 'info'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            logger.error(f"获取 workflow 信息失败: {result.stderr}")
            return jsonify({
                'success': False,
                'error': f'获取信息失败: {result.stderr.strip()}'
            }), 500
        
        return jsonify({
            'success': True,
            'info': result.stdout
        })
        
    except Exception as e:
        logger.error(f"获取 workflow 信息异常: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'获取信息异常: {str(e)}'
        }), 500

@bp.route('/help', methods=['GET'])
def get_workflow_help():
    """获取 workflow 帮助信息"""
    try:
        result = subprocess.run(
            ['qq', 'workflow', 'help'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            logger.error(f"获取 workflow 帮助失败: {result.stderr}")
            return jsonify({
                'success': False,
                'error': f'获取帮助信息失败: {result.stderr.strip()}'
            }), 500
        
        return jsonify({
            'success': True,
            'help': result.stdout
        })
        
    except Exception as e:
        logger.error(f"获取 workflow 帮助异常: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'获取帮助信息异常: {str(e)}'
        }), 500
