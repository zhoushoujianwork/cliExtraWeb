#!/usr/bin/env python3
"""
测试namespace管理功能
"""

import requests
import json
import sys
import time

def test_create_namespace(base_url="http://localhost:5001"):
    """测试创建namespace"""
    print("🧪 测试创建namespace")
    print("="*40)
    
    # 测试用例
    test_cases = [
        {
            'name': '有效namespace',
            'data': {'name': 'test_ns_001', 'description': '测试namespace'},
            'should_succeed': True
        },
        {
            'name': '空名称',
            'data': {'name': '', 'description': '空名称测试'},
            'should_succeed': False
        },
        {
            'name': '无效字符',
            'data': {'name': 'test@namespace', 'description': '包含特殊字符'},
            'should_succeed': False
        },
        {
            'name': '只有数字和字母',
            'data': {'name': 'test123', 'description': '数字字母组合'},
            'should_succeed': True
        },
        {
            'name': '包含下划线和连字符',
            'data': {'name': 'test_ns-001', 'description': '下划线连字符'},
            'should_succeed': True
        }
    ]
    
    created_namespaces = []
    success_count = 0
    
    for case in test_cases:
        print(f"\n📋 测试: {case['name']}")
        print(f"   数据: {case['data']}")
        
        try:
            response = requests.post(
                f"{base_url}/api/namespaces",
                json=case['data'],
                timeout=30
            )
            
            result = response.json()
            
            if case['should_succeed']:
                if response.status_code == 200 and result.get('success'):
                    print(f"   ✅ 创建成功: {result.get('message')}")
                    created_namespaces.append(case['data']['name'])
                    success_count += 1
                else:
                    print(f"   ❌ 预期成功但失败: {result.get('error')}")
            else:
                if response.status_code != 200 or not result.get('success'):
                    print(f"   ✅ 预期失败且确实失败: {result.get('error')}")
                    success_count += 1
                else:
                    print(f"   ❌ 预期失败但成功了")
                    created_namespaces.append(case['data']['name'])
                    
        except Exception as e:
            print(f"   ❌ 请求异常: {e}")
    
    print(f"\n📊 创建测试结果: {success_count}/{len(test_cases)} 通过")
    print(f"📝 已创建的namespace: {created_namespaces}")
    
    return success_count == len(test_cases), created_namespaces

def test_duplicate_namespace(base_url="http://localhost:5001"):
    """测试重复创建namespace"""
    print("\n🔄 测试重复创建namespace")
    print("="*40)
    
    namespace_name = "duplicate_test"
    
    # 第一次创建
    print("第一次创建...")
    try:
        response = requests.post(
            f"{base_url}/api/namespaces",
            json={'name': namespace_name, 'description': '重复测试'},
            timeout=30
        )
        
        result = response.json()
        
        if response.status_code == 200 and result.get('success'):
            print("✅ 第一次创建成功")
            
            # 第二次创建（应该失败）
            print("第二次创建（应该失败）...")
            response2 = requests.post(
                f"{base_url}/api/namespaces",
                json={'name': namespace_name, 'description': '重复测试2'},
                timeout=30
            )
            
            result2 = response2.json()
            
            if response2.status_code != 200 or not result2.get('success'):
                print(f"✅ 第二次创建正确失败: {result2.get('error')}")
                return True, [namespace_name]
            else:
                print("❌ 第二次创建应该失败但成功了")
                return False, [namespace_name]
        else:
            print(f"❌ 第一次创建失败: {result.get('error')}")
            return False, []
            
    except Exception as e:
        print(f"❌ 测试异常: {e}")
        return False, []

def test_delete_namespace(base_url="http://localhost:5001", namespaces_to_delete=None):
    """测试删除namespace"""
    print("\n🗑️  测试删除namespace")
    print("="*40)
    
    if not namespaces_to_delete:
        print("没有需要删除的namespace")
        return True
    
    success_count = 0
    
    for namespace in namespaces_to_delete:
        print(f"\n删除namespace: {namespace}")
        
        try:
            response = requests.delete(
                f"{base_url}/api/namespaces/{namespace}",
                timeout=30
            )
            
            result = response.json()
            
            if response.status_code == 200 and result.get('success'):
                print(f"✅ 删除成功: {result.get('message')}")
                success_count += 1
            else:
                print(f"❌ 删除失败: {result.get('error')}")
                
        except Exception as e:
            print(f"❌ 删除异常: {e}")
    
    print(f"\n📊 删除测试结果: {success_count}/{len(namespaces_to_delete)} 成功")
    return success_count == len(namespaces_to_delete)

def test_get_namespaces(base_url="http://localhost:5001"):
    """测试获取namespace列表"""
    print("\n📋 测试获取namespace列表")
    print("="*40)
    
    try:
        response = requests.get(f"{base_url}/api/namespaces", timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get('success'):
                namespaces = result.get('namespaces', [])
                print(f"✅ 获取成功，共 {len(namespaces)} 个namespace")
                
                for ns in namespaces:
                    name = ns.get('name', 'unknown')
                    count = ns.get('instance_count', 0)
                    print(f"   - {name} ({count} 个实例)")
                
                return True, namespaces
            else:
                print(f"❌ API返回失败: {result.get('error')}")
                return False, []
        else:
            print(f"❌ HTTP请求失败: {response.status_code}")
            return False, []
            
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return False, []

def test_error_handling(base_url="http://localhost:5001"):
    """测试错误处理"""
    print("\n🛠️  测试错误处理")
    print("="*40)
    
    tests = [
        {
            'name': '无效JSON数据',
            'method': 'POST',
            'url': f"{base_url}/api/namespaces",
            'data': "invalid json",
            'headers': {'Content-Type': 'application/json'}
        },
        {
            'name': '空请求体',
            'method': 'POST',
            'url': f"{base_url}/api/namespaces",
            'data': None,
            'headers': {'Content-Type': 'application/json'}
        },
        {
            'name': '删除不存在的namespace',
            'method': 'DELETE',
            'url': f"{base_url}/api/namespaces/nonexistent_namespace_12345",
            'data': None,
            'headers': {}
        }
    ]
    
    success_count = 0
    
    for test in tests:
        print(f"\n测试: {test['name']}")
        
        try:
            if test['method'] == 'POST':
                response = requests.post(
                    test['url'],
                    data=test['data'],
                    headers=test['headers'],
                    timeout=10
                )
            elif test['method'] == 'DELETE':
                response = requests.delete(test['url'], timeout=10)
            
            # 错误处理测试，期望返回错误状态码
            if response.status_code >= 400:
                print(f"✅ 正确返回错误状态码: {response.status_code}")
                success_count += 1
            else:
                print(f"❌ 应该返回错误但返回了: {response.status_code}")
                
        except Exception as e:
            print(f"❌ 请求异常: {e}")
    
    print(f"\n📊 错误处理测试: {success_count}/{len(tests)} 通过")
    return success_count == len(tests)

def main():
    """主函数"""
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = "http://localhost:5001"
    
    print(f"🎯 测试服务器: {base_url}")
    print(f"🕒 开始时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # 1. 测试获取namespace列表
        get_success, existing_namespaces = test_get_namespaces(base_url)
        
        # 2. 测试创建namespace
        create_success, created_namespaces = test_create_namespace(base_url)
        
        # 3. 测试重复创建
        duplicate_success, duplicate_namespaces = test_duplicate_namespace(base_url)
        
        # 4. 测试错误处理
        error_success = test_error_handling(base_url)
        
        # 5. 清理：删除测试创建的namespace
        all_test_namespaces = list(set(created_namespaces + duplicate_namespaces))
        delete_success = test_delete_namespace(base_url, all_test_namespaces)
        
        # 总结
        print(f"\n📋 测试总结:")
        print(f"   获取namespace: {'✅' if get_success else '❌'}")
        print(f"   创建namespace: {'✅' if create_success else '❌'}")
        print(f"   重复创建检查: {'✅' if duplicate_success else '❌'}")
        print(f"   错误处理: {'✅' if error_success else '❌'}")
        print(f"   删除namespace: {'✅' if delete_success else '❌'}")
        
        overall_success = all([get_success, create_success, duplicate_success, error_success, delete_success])
        
        if overall_success:
            print("\n🎉 所有测试通过！namespace管理功能正常")
            return 0
        else:
            print("\n❌ 部分测试失败")
            return 1
            
    except KeyboardInterrupt:
        print("\n⚠️  测试被用户中断")
        return 1
    except Exception as e:
        print(f"\n❌ 测试执行异常: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
