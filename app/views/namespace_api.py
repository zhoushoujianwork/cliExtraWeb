"""
Namespace管理API
"""

import subprocess
import json
import logging
import re
from flask import Blueprint, jsonify, request

logger = logging.getLogger(__name__)

namespace_api_bp = Blueprint('namespace_api', __name__)

@namespace_api_bp.route('/api/namespaces', methods=['GET'])
def get_namespaces():
    """获取所有namespace信息"""
    try:
        # 执行 qq ns show -o json 命令
        result = subprocess.run(
            ['qq', 'ns', 'show', '-o', 'json'],
            capture_output=True, text=True, timeout=10
        )
        
        if result.returncode != 0:
            logger.error(f'获取namespace失败: {result.stderr}')
            return jsonify({
                'success': False,
                'error': f'获取namespace失败: {result.stderr}'
            }), 500
        
        # 解析JSON输出
        try:
            namespace_data = json.loads(result.stdout)
            namespaces = namespace_data.get('namespaces', [])
            
            # 计算总实例数
            total_instances = sum(ns.get('instance_count', 0) for ns in namespaces)
            
            # 构建namespace列表（不包含"全部"选项）
            complete_namespaces = []
            
            # 只添加实际的namespace
            for ns in namespaces:
                complete_namespaces.append({
                    'name': ns.get('name', ''),
                    'display_name': ns.get('name', ''),
                    'instance_count': ns.get('instance_count', 0),
                    'instances': ns.get('instances', [])
                })
            
            return jsonify({
                'success': True,
                'namespaces': complete_namespaces,
                'total_instances': total_instances,
                'namespace_count': len(namespaces)
            })
            
        except json.JSONDecodeError as e:
            logger.error(f'解析namespace JSON失败: {e}')
            return jsonify({
                'success': False,
                'error': f'解析namespace数据失败: {str(e)}'
            }), 500
            
    except subprocess.TimeoutExpired:
        logger.error('获取namespace超时')
        return jsonify({
            'success': False,
            'error': '获取namespace超时'
        }), 500
    except Exception as e:
        logger.error(f'获取namespace异常: {e}')
        return jsonify({
            'success': False,
            'error': f'获取namespace失败: {str(e)}'
        }), 500

@namespace_api_bp.route('/api/namespaces', methods=['POST'])
def create_namespace():
    """创建新的namespace"""
    try:
        # 获取请求数据
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': '请求数据为空'
            }), 400
        
        name = data.get('name', '').strip()
        description = data.get('description', '').strip()
        
        # 验证namespace名称
        if not name:
            return jsonify({
                'success': False,
                'error': 'Namespace名称不能为空'
            }), 400
        
        # 验证名称格式
        if not re.match(r'^[a-zA-Z0-9_-]+$', name):
            return jsonify({
                'success': False,
                'error': 'Namespace名称只能包含字母、数字、下划线和连字符'
            }), 400
        
        # 检查namespace是否已存在
        try:
            result = subprocess.run(
                ['qq', 'ns', 'show', '-o', 'json'],
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode == 0:
                namespace_data = json.loads(result.stdout)
                existing_names = [ns.get('name', '') for ns in namespace_data.get('namespaces', [])]
                if name in existing_names:
                    return jsonify({
                        'success': False,
                        'error': f'Namespace "{name}" 已存在'
                    }), 400
        except Exception as e:
            logger.warning(f'检查现有namespace失败: {e}')
        
        # 创建namespace
        logger.info(f'开始创建namespace: {name}')
        result = subprocess.run(
            ['qq', 'ns', 'create', name],
            capture_output=True, text=True, timeout=30
        )
        
        if result.returncode == 0:
            logger.info(f'成功创建namespace: {name}')
            return jsonify({
                'success': True,
                'message': f'Namespace "{name}" 创建成功',
                'namespace': {
                    'name': name,
                    'description': description,
                    'instance_count': 0
                }
            })
        else:
            error_msg = result.stderr.strip() if result.stderr else result.stdout.strip()
            if not error_msg:
                error_msg = '创建失败，未知错误'
            
            logger.error(f'创建namespace失败: {error_msg}')
            return jsonify({
                'success': False,
                'error': f'创建失败: {error_msg}'
            }), 500
            
    except subprocess.TimeoutExpired:
        logger.error('创建namespace超时')
        return jsonify({
            'success': False,
            'error': '创建namespace超时'
        }), 500
    except json.JSONDecodeError as e:
        logger.error(f'解析JSON数据失败: {e}')
        return jsonify({
            'success': False,
            'error': '请求数据格式错误'
        }), 400
    except Exception as e:
        logger.error(f'创建namespace异常: {e}')
        return jsonify({
            'success': False,
            'error': f'创建namespace失败: {str(e)}'
        }), 500

@namespace_api_bp.route('/api/namespaces/<namespace_name>', methods=['DELETE'])
def delete_namespace(namespace_name):
    """删除指定的namespace"""
    try:
        if not namespace_name or namespace_name.strip() == '':
            return jsonify({
                'success': False,
                'error': 'Namespace名称不能为空'
            }), 400
        
        namespace_name = namespace_name.strip()
        
        # 检查namespace是否存在
        try:
            result = subprocess.run(
                ['qq', 'ns', 'show', '-o', 'json'],
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode == 0:
                namespace_data = json.loads(result.stdout)
                existing_names = [ns.get('name', '') for ns in namespace_data.get('namespaces', [])]
                if namespace_name not in existing_names:
                    return jsonify({
                        'success': False,
                        'error': f'Namespace "{namespace_name}" 不存在'
                    }), 404
        except Exception as e:
            logger.warning(f'检查namespace是否存在失败: {e}')
        
        # 删除namespace
        logger.info(f'开始删除namespace: {namespace_name}')
        result = subprocess.run(
            ['qq', 'ns', 'delete', namespace_name],
            capture_output=True, text=True, timeout=30
        )
        
        if result.returncode == 0:
            logger.info(f'成功删除namespace: {namespace_name}')
            return jsonify({
                'success': True,
                'message': f'Namespace "{namespace_name}" 删除成功'
            })
        else:
            error_msg = result.stderr.strip() if result.stderr else result.stdout.strip()
            if not error_msg:
                error_msg = '删除失败，未知错误'
            
            logger.error(f'删除namespace失败: {error_msg}')
            return jsonify({
                'success': False,
                'error': f'删除失败: {error_msg}'
            }), 500
            
    except subprocess.TimeoutExpired:
        logger.error('删除namespace超时')
        return jsonify({
            'success': False,
            'error': '删除namespace超时'
        }), 500
    except Exception as e:
        logger.error(f'删除namespace异常: {e}')
        return jsonify({
            'success': False,
            'error': f'删除namespace失败: {str(e)}'
        }), 500

@namespace_api_bp.route('/api/namespaces/stats', methods=['GET'])
def get_namespace_stats():
    """获取namespace统计信息"""
    try:
        result = subprocess.run(
            ['qq', 'ns', 'show', '-o', 'json'],
            capture_output=True, text=True, timeout=10
        )
        
        if result.returncode != 0:
            return jsonify({
                'success': False,
                'error': f'获取namespace统计失败: {result.stderr}'
            }), 500
        
        namespace_data = json.loads(result.stdout)
        namespaces = namespace_data.get('namespaces', [])
        
        # 计算统计信息
        stats = {
            'total_namespaces': len(namespaces),
            'total_instances': sum(ns.get('instance_count', 0) for ns in namespaces),
            'active_namespaces': len([ns for ns in namespaces if ns.get('instance_count', 0) > 0]),
            'empty_namespaces': len([ns for ns in namespaces if ns.get('instance_count', 0) == 0])
        }
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        logger.error(f'获取namespace统计失败: {e}')
        return jsonify({
            'success': False,
            'error': f'获取namespace统计失败: {str(e)}'
        }), 500
