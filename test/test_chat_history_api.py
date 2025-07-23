#!/usr/bin/env python3
"""
测试聊天历史API的namespace切换功能
"""

import requests
import json
import sys
import time

def test_chat_history_api(base_url="http://localhost:5001"):
    """测试聊天历史API"""
    print("🧪 测试聊天历史API的namespace切换功能")
    print("="*60)
    
    # 测试不同的namespace
    test_namespaces = ['box', 'default', 'q_cli']
    
    results = {}
    
    for namespace in test_namespaces:
        print(f"\n📋 测试namespace: {namespace}")
        
        try:
            url = f"{base_url}/api/chat/history"
            params = {
                'limit': 10,
                'namespace': namespace
            }
            
            print(f"请求URL: {url}")
            print(f"参数: {params}")
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success'):
                    history = data.get('history', [])
                    print(f"✅ 成功获取历史记录: {len(history)} 条")
                    
                    # 记录结果用于比较
                    results[namespace] = {
                        'count': len(history),
                        'messages': history[:3] if history else [],  # 只保存前3条用于比较
                        'success': True
                    }
                    
                    # 显示前几条记录的摘要
                    if history:
                        print("📝 历史记录摘要:")
                        for i, msg in enumerate(history[:3]):
                            sender = msg.get('sender', 'unknown')
                            message = msg.get('message', '')[:50] + '...' if len(msg.get('message', '')) > 50 else msg.get('message', '')
                            timestamp = msg.get('timestamp', '')
                            print(f"  {i+1}. [{sender}] {message} ({timestamp})")
                        
                        if len(history) > 3:
                            print(f"  ... 还有 {len(history) - 3} 条记录")
                    else:
                        print("📝 该namespace没有历史记录")
                        
                else:
                    print(f"❌ API返回失败: {data.get('error')}")
                    results[namespace] = {'success': False, 'error': data.get('error')}
                    
            else:
                print(f"❌ HTTP请求失败: {response.status_code}")
                results[namespace] = {'success': False, 'error': f'HTTP {response.status_code}'}
                
        except Exception as e:
            print(f"❌ 请求异常: {e}")
            results[namespace] = {'success': False, 'error': str(e)}
        
        # 添加延迟，避免请求过快
        time.sleep(1)
    
    # 分析结果
    print("\n🔍 结果分析:")
    print("-" * 40)
    
    successful_results = {k: v for k, v in results.items() if v.get('success')}
    
    if len(successful_results) < 2:
        print("⚠️  成功的请求少于2个，无法比较差异")
        return results
    
    # 检查是否所有结果都相同（这是bug的表现）
    first_namespace = list(successful_results.keys())[0]
    first_result = successful_results[first_namespace]
    
    all_same = True
    for namespace, result in successful_results.items():
        if namespace == first_namespace:
            continue
            
        # 比较消息数量和内容
        if (result['count'] != first_result['count'] or 
            result['messages'] != first_result['messages']):
            all_same = False
            break
    
    if all_same and len(successful_results) > 1:
        print("❌ 发现问题：所有namespace返回相同的数据！")
        print("   这表明namespace切换功能存在bug")
        
        print(f"\n📊 所有namespace都返回了相同的数据:")
        print(f"   消息数量: {first_result['count']}")
        if first_result['messages']:
            print(f"   第一条消息: {first_result['messages'][0].get('message', '')[:100]}...")
    else:
        print("✅ namespace切换功能正常：不同namespace返回不同的数据")
        
        for namespace, result in successful_results.items():
            print(f"   {namespace}: {result['count']} 条消息")
    
    return results

def test_multiple_requests():
    """测试多次请求同一namespace是否一致"""
    print("\n🔄 测试多次请求一致性...")
    
    namespace = 'default'
    base_url = "http://localhost:5001"
    
    results = []
    
    for i in range(3):
        try:
            response = requests.get(
                f"{base_url}/api/chat/history",
                params={'limit': 5, 'namespace': namespace},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    history = data.get('history', [])
                    results.append(len(history))
                    print(f"  请求 {i+1}: {len(history)} 条记录")
                else:
                    print(f"  请求 {i+1}: 失败 - {data.get('error')}")
            else:
                print(f"  请求 {i+1}: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"  请求 {i+1}: 异常 - {e}")
        
        time.sleep(0.5)
    
    if results and all(count == results[0] for count in results):
        print("✅ 多次请求结果一致")
    else:
        print("❌ 多次请求结果不一致")
        print(f"   结果: {results}")

def main():
    """主函数"""
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = "http://localhost:5001"
    
    print(f"🎯 测试服务器: {base_url}")
    
    # 测试namespace切换
    results = test_chat_history_api(base_url)
    
    # 测试多次请求一致性
    test_multiple_requests()
    
    # 总结
    print(f"\n📋 测试总结:")
    successful_count = sum(1 for r in results.values() if r.get('success'))
    print(f"   成功请求: {successful_count}/{len(results)}")
    
    if successful_count == len(results):
        print("✅ 所有API请求都成功")
        return 0
    else:
        print("❌ 部分API请求失败")
        return 1

if __name__ == "__main__":
    sys.exit(main())
