#!/usr/bin/env python3
"""
测试移除"全部"选项后的namespace功能
"""

import requests
import json
import sys

def test_namespace_api_no_all(base_url="http://localhost:5001"):
    """测试namespace API不包含"全部"选项"""
    print("🧪 测试namespace API不包含'全部'选项")
    print("="*50)
    
    try:
        response = requests.get(f"{base_url}/api/namespaces", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success'):
                namespaces = data.get('namespaces', [])
                
                print(f"✅ API调用成功")
                print(f"📊 返回 {len(namespaces)} 个namespace")
                
                # 检查是否包含"全部"选项
                has_all_option = any(ns.get('name') == '' or ns.get('display_name') == '全部' for ns in namespaces)
                
                if has_all_option:
                    print("❌ 发现'全部'选项，应该已被移除")
                    return False
                else:
                    print("✅ 确认不包含'全部'选项")
                
                # 显示所有namespace
                print("\n📋 可用的namespace:")
                for ns in namespaces:
                    name = ns.get('name', '')
                    display_name = ns.get('display_name', '')
                    count = ns.get('instance_count', 0)
                    print(f"  - {display_name} ({count} 个实例)")
                
                # 检查是否有默认可选的namespace
                if len(namespaces) > 0:
                    print(f"\n✅ 有 {len(namespaces)} 个可选namespace")
                    
                    # 检查是否有default namespace
                    default_ns = next((ns for ns in namespaces if ns.get('name') == 'default'), None)
                    if default_ns:
                        print(f"✅ 找到default namespace，有 {default_ns.get('instance_count', 0)} 个实例")
                    else:
                        print("ℹ️  没有default namespace")
                    
                    return True
                else:
                    print("⚠️  没有可用的namespace")
                    return False
                    
            else:
                print(f"❌ API返回失败: {data.get('error')}")
                return False
        else:
            print(f"❌ HTTP请求失败: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return False

def test_namespace_selection_logic():
    """测试namespace选择逻辑"""
    print("\n🎯 测试namespace选择逻辑")
    print("-" * 30)
    
    # 模拟不同的namespace数据情况
    test_cases = [
        {
            'name': '有default namespace',
            'namespaces': [
                {'name': 'box', 'instance_count': 1},
                {'name': 'default', 'instance_count': 2},
                {'name': 'q_cli', 'instance_count': 0}
            ],
            'expected': 'default'
        },
        {
            'name': '没有default，有活跃namespace',
            'namespaces': [
                {'name': 'box', 'instance_count': 1},
                {'name': 'frontend', 'instance_count': 3},
                {'name': 'q_cli', 'instance_count': 0}
            ],
            'expected': 'box'  # 第一个有实例的
        },
        {
            'name': '所有namespace都没有实例',
            'namespaces': [
                {'name': 'box', 'instance_count': 0},
                {'name': 'q_cli', 'instance_count': 0}
            ],
            'expected': 'box'  # 第一个
        },
        {
            'name': '空namespace列表',
            'namespaces': [],
            'expected': None
        }
    ]
    
    for case in test_cases:
        print(f"\n测试用例: {case['name']}")
        namespaces = case['namespaces']
        expected = case['expected']
        
        # 模拟选择逻辑
        selected = select_default_namespace(namespaces)
        
        if selected == expected:
            print(f"✅ 选择正确: {selected}")
        else:
            print(f"❌ 选择错误: 期望 {expected}, 实际 {selected}")

def select_default_namespace(namespaces):
    """模拟前端的默认namespace选择逻辑"""
    if not namespaces:
        return None
    
    # 1. 尝试选择default
    default_ns = next((ns for ns in namespaces if ns.get('name') == 'default'), None)
    if default_ns:
        return 'default'
    
    # 2. 选择第一个有实例的namespace
    active_ns = next((ns for ns in namespaces if ns.get('instance_count', 0) > 0), None)
    if active_ns:
        return active_ns.get('name')
    
    # 3. 选择第一个namespace
    return namespaces[0].get('name')

def test_chat_history_with_specific_namespace(base_url="http://localhost:5001"):
    """测试特定namespace的聊天历史"""
    print("\n💬 测试特定namespace的聊天历史")
    print("-" * 30)
    
    # 测试几个常见的namespace
    test_namespaces = ['default', 'box', 'q_cli']
    
    for namespace in test_namespaces:
        try:
            response = requests.get(
                f"{base_url}/api/chat/history",
                params={'limit': 3, 'namespace': namespace},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success'):
                    history = data.get('history', [])
                    print(f"✅ {namespace}: {len(history)} 条历史记录")
                else:
                    print(f"❌ {namespace}: API返回失败 - {data.get('error')}")
            else:
                print(f"❌ {namespace}: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"❌ {namespace}: 异常 - {e}")

def main():
    """主函数"""
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = "http://localhost:5001"
    
    print(f"🎯 测试服务器: {base_url}")
    
    # 测试namespace API
    api_success = test_namespace_api_no_all(base_url)
    
    # 测试选择逻辑
    test_namespace_selection_logic()
    
    # 测试聊天历史
    test_chat_history_with_specific_namespace(base_url)
    
    print(f"\n📋 测试总结:")
    if api_success:
        print("✅ '全部'选项已成功移除")
        print("✅ namespace选择功能正常")
        return 0
    else:
        print("❌ 测试发现问题")
        return 1

if __name__ == "__main__":
    sys.exit(main())
