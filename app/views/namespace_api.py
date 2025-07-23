"""
Namespace管理API
"""

import subprocess
import json
import logging
from flask import Blueprint, jsonify

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

@namespace_api_bp.route('/api/namespaces/<namespace_name>', methods=['GET'])
def get_namespace_detail(namespace_name):
    """获取特定namespace的详细信息"""
    try:
        # 获取所有namespace
        result = subprocess.run(
            ['qq', 'ns', 'show', '-o', 'json'],
            capture_output=True, text=True, timeout=10
        )
        
        if result.returncode != 0:
            return jsonify({
                'success': False,
                'error': f'获取namespace失败: {result.stderr}'
            }), 500
        
        namespace_data = json.loads(result.stdout)
        namespaces = namespace_data.get('namespaces', [])
        
        # 查找指定的namespace
        target_namespace = None
        if namespace_name == '' or namespace_name == 'all':
            # 处理"全部"的情况
            all_instances = []
            total_count = 0
            for ns in namespaces:
                all_instances.extend(ns.get('instances', []))
                total_count += ns.get('instance_count', 0)
            
            target_namespace = {
                'name': '',
                'display_name': '全部',
                'instance_count': total_count,
                'instances': all_instances
            }
        else:
            # 查找特定namespace
            for ns in namespaces:
                if ns.get('name') == namespace_name:
                    target_namespace = {
                        'name': ns.get('name', ''),
                        'display_name': ns.get('name', ''),
                        'instance_count': ns.get('instance_count', 0),
                        'instances': ns.get('instances', [])
                    }
                    break
        
        if target_namespace is None:
            return jsonify({
                'success': False,
                'error': f'Namespace "{namespace_name}" 不存在'
            }), 404
        
        return jsonify({
            'success': True,
            'namespace': target_namespace
        })
        
    except Exception as e:
        logger.error(f'获取namespace详情失败: {e}')
        return jsonify({
            'success': False,
            'error': f'获取namespace详情失败: {str(e)}'
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
            'empty_namespaces': len([ns for ns in namespaces if ns.get('instance_count', 0) == 0]),
            'namespace_distribution': {}
        }
        
        # 构建分布统计
        for ns in namespaces:
            name = ns.get('name', '')
            count = ns.get('instance_count', 0)
            stats['namespace_distribution'][name] = count
        
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
