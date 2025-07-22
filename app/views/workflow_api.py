"""
Workflow API 接口
提供 namespace workflow 管理的 Web API
"""

from flask import Blueprint, jsonify, request
import subprocess
import json
import yaml
from app.utils.logger import get_logger

logger = get_logger(__name__)
bp = Blueprint('workflow_api', __name__, url_prefix='/api/workflow')

@bp.route('/<namespace>', methods=['GET'])
def get_workflow(namespace):
    """获取指定 namespace 的 workflow 配置"""
    try:
        # 调用 cliExtra workflow show 命令
        result = subprocess.run(
            ['cliExtra', 'workflow', 'show', namespace],
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
        # 获取所有 namespace
        from app.services.instance_manager import InstanceManager
        manager = InstanceManager()
        namespaces = manager.get_available_namespaces()
        
        workflows = []
        for ns_info in namespaces:
            namespace = ns_info['name']
            try:
                # 尝试获取每个 namespace 的 workflow
                result = subprocess.run(
                    ['cliExtra', 'workflow', 'show', namespace],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if result.returncode == 0:
                    workflows.append({
                        'namespace': namespace,
                        'has_workflow': True,
                        'instance_count': ns_info.get('count', 0)
                    })
                else:
                    workflows.append({
                        'namespace': namespace,
                        'has_workflow': False,
                        'instance_count': ns_info.get('count', 0)
                    })
            except:
                workflows.append({
                    'namespace': namespace,
                    'has_workflow': False,
                    'instance_count': ns_info.get('count', 0)
                })
        
        return jsonify({
            'success': True,
            'workflows': workflows
        })
        
    except Exception as e:
        logger.error(f"获取 workflow 列表异常: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'获取 workflow 列表异常: {str(e)}'
        }), 500

@bp.route('/help', methods=['GET'])
def get_workflow_help():
    """获取 workflow 帮助信息"""
    try:
        result = subprocess.run(
            ['cliExtra', 'workflow', 'help'],
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
