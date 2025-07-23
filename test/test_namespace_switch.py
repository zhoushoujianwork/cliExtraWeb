#!/usr/bin/env python3
"""
测试namespace切换时的页面刷新功能
"""

import requests
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

def test_api_consistency(base_url="http://localhost:5001"):
    """测试API在namespace切换时的一致性"""
    print("🧪 测试namespace切换时的API一致性")
    print("="*50)
    
    # 测试的API端点
    api_endpoints = [
        '/api/instances',
        '/api/namespaces',
        '/api/namespaces/stats',
        '/api/chat/history?limit=5&namespace=default',
        '/api/chat/history?limit=5&namespace=box',
        '/api/chat/history?limit=5&namespace=q_cli'
    ]
    
    results = {}
    
    for endpoint in api_endpoints:
        print(f"\n📋 测试端点: {endpoint}")
        
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success', True):  # 有些API没有success字段
                    print(f"✅ 请求成功")
                    
                    # 记录关键信息用于分析
                    if 'instances' in data:
                        count = len(data['instances'])
                        print(f"   实例数量: {count}")
                        results[endpoint] = {'type': 'instances', 'count': count}
                    elif 'namespaces' in data:
                        count = len(data['namespaces'])
                        print(f"   namespace数量: {count}")
                        results[endpoint] = {'type': 'namespaces', 'count': count}
                    elif 'history' in data:
                        count = len(data['history'])
                        print(f"   历史记录数量: {count}")
                        results[endpoint] = {'type': 'history', 'count': count}
                    elif 'stats' in data:
                        stats = data['stats']
                        print(f"   统计信息: {stats.get('total_instances', 0)} 实例")
                        results[endpoint] = {'type': 'stats', 'data': stats}
                    else:
                        print(f"   响应数据: {str(data)[:100]}...")
                        results[endpoint] = {'type': 'other', 'data': data}
                else:
                    print(f"❌ API返回失败: {data.get('error')}")
                    results[endpoint] = {'type': 'error', 'error': data.get('error')}
            else:
                print(f"❌ HTTP请求失败: {response.status_code}")
                results[endpoint] = {'type': 'http_error', 'status': response.status_code}
                
        except Exception as e:
            print(f"❌ 请求异常: {e}")
            results[endpoint] = {'type': 'exception', 'error': str(e)}
        
        time.sleep(0.5)  # 避免请求过快
    
    return results

def test_concurrent_requests(base_url="http://localhost:5001"):
    """测试并发请求的一致性"""
    print("\n🔄 测试并发请求一致性")
    print("-" * 30)
    
    # 同时请求不同namespace的历史记录
    namespaces = ['default', 'box', 'q_cli']
    
    def fetch_history(namespace):
        try:
            response = requests.get(
                f"{base_url}/api/chat/history",
                params={'limit': 10, 'namespace': namespace},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    return {
                        'namespace': namespace,
                        'count': len(data.get('history', [])),
                        'success': True
                    }
            
            return {
                'namespace': namespace,
                'success': False,
                'error': f'HTTP {response.status_code}'
            }
            
        except Exception as e:
            return {
                'namespace': namespace,
                'success': False,
                'error': str(e)
            }
    
    # 并发执行请求
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(fetch_history, ns) for ns in namespaces]
        results = []
        
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            
            if result['success']:
                print(f"✅ {result['namespace']}: {result['count']} 条记录")
            else:
                print(f"❌ {result['namespace']}: {result['error']}")
    
    return results

def test_rapid_namespace_switching(base_url="http://localhost:5001"):
    """模拟快速切换namespace"""
    print("\n⚡ 测试快速namespace切换")
    print("-" * 30)
    
    namespaces = ['default', 'box', 'q_cli', 'default', 'box']
    results = []
    
    for i, namespace in enumerate(namespaces):
        print(f"切换到 {namespace} (第{i+1}次)...")
        
        try:
            # 请求实例列表
            instances_response = requests.get(f"{base_url}/api/instances", timeout=5)
            
            # 请求历史记录
            history_response = requests.get(
                f"{base_url}/api/chat/history",
                params={'limit': 3, 'namespace': namespace},
                timeout=5
            )
            
            if instances_response.status_code == 200 and history_response.status_code == 200:
                instances_data = instances_response.json()
                history_data = history_response.json()
                
                instance_count = len(instances_data.get('instances', []))
                history_count = len(history_data.get('history', []))
                
                result = {
                    'namespace': namespace,
                    'instance_count': instance_count,
                    'history_count': history_count,
                    'success': True
                }
                
                print(f"  ✅ 实例: {instance_count}, 历史: {history_count}")
                
            else:
                result = {
                    'namespace': namespace,
                    'success': False,
                    'error': 'HTTP请求失败'
                }
                print(f"  ❌ 请求失败")
            
            results.append(result)
            
        except Exception as e:
            result = {
                'namespace': namespace,
                'success': False,
                'error': str(e)
            }
            results.append(result)
            print(f"  ❌ 异常: {e}")
        
        time.sleep(0.2)  # 快速切换间隔
    
    return results

def analyze_results(api_results, concurrent_results, switching_results):
    """分析测试结果"""
    print("\n📊 测试结果分析")
    print("="*50)
    
    # 分析API一致性
    successful_apis = sum(1 for r in api_results.values() if r.get('type') != 'error')
    total_apis = len(api_results)
    
    print(f"API一致性测试: {successful_apis}/{total_apis} 成功")
    
    # 分析并发请求
    successful_concurrent = sum(1 for r in concurrent_results if r.get('success'))
    total_concurrent = len(concurrent_results)
    
    print(f"并发请求测试: {successful_concurrent}/{total_concurrent} 成功")
    
    # 分析快速切换
    successful_switching = sum(1 for r in switching_results if r.get('success'))
    total_switching = len(switching_results)
    
    print(f"快速切换测试: {successful_switching}/{total_switching} 成功")
    
    # 总体评估
    overall_success_rate = (successful_apis + successful_concurrent + successful_switching) / (total_apis + total_concurrent + total_switching)
    
    print(f"\n🎯 总体成功率: {overall_success_rate:.1%}")
    
    if overall_success_rate >= 0.9:
        print("✅ namespace切换功能运行良好")
        return True
    elif overall_success_rate >= 0.7:
        print("⚠️  namespace切换功能基本正常，但有一些问题")
        return False
    else:
        print("❌ namespace切换功能存在严重问题")
        return False

def main():
    """主函数"""
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = "http://localhost:5001"
    
    print(f"🎯 测试服务器: {base_url}")
    print(f"🕒 开始时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # 执行各项测试
        api_results = test_api_consistency(base_url)
        concurrent_results = test_concurrent_requests(base_url)
        switching_results = test_rapid_namespace_switching(base_url)
        
        # 分析结果
        success = analyze_results(api_results, concurrent_results, switching_results)
        
        return 0 if success else 1
        
    except KeyboardInterrupt:
        print("\n⚠️  测试被用户中断")
        return 1
    except Exception as e:
        print(f"\n❌ 测试执行异常: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
