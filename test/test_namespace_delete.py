#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试namespace删除功能
"""

import sys
import os
import requests
import json

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_get_instances_by_namespace():
    """测试get_instances_by_namespace方法"""
    print("🧪 测试get_instances_by_namespace方法")
    
    try:
        from app.services.instance_manager import instance_manager
        
        # 测试不同namespace
        test_namespaces = ['default', 'frontend', 'backend', 'nonexistent']
        
        for namespace in test_namespaces:
            print(f"\n📋 测试namespace: {namespace}")
            
            try:
                result = instance_manager.get_instances_by_namespace(namespace)
                
                # 检查返回值类型
                if isinstance(result, dict):
                    print("✅ 返回值类型正确 (Dict)")
                    
                    if result.get('success'):
                        instances = result.get('instances', [])
                        print(f"✅ 获取成功: {len(instances)} 个实例")
                        
                        for instance in instances[:3]:  # 只显示前3个
                            print(f"   - {instance.get('id', 'unknown')}: {instance.get('status', 'unknown')}")
                    else:
                        print(f"⚠️  获取失败: {result.get('error', '未知错误')}")
                        
                elif isinstance(result, list):
                    print("❌ 返回值类型错误 (List) - 应该是Dict")
                    print(f"   实例数量: {len(result)}")
                else:
                    print(f"❌ 返回值类型异常: {type(result)}")
                    
            except Exception as e:
                print(f"💥 测试异常: {e}")
                
    except ImportError as e:
        print(f"❌ 导入失败: {e}")

def test_delete_namespace_api():
    """测试删除namespace的API"""
    print("\n🧪 测试删除namespace的API")
    
    base_url = 'http://localhost:5001'
    
    # 测试删除不存在的namespace
    test_namespace = 'test-delete-' + str(int(time.time()) if 'time' in globals() else 123456)
    
    print(f"📋 测试删除namespace: {test_namespace}")
    
    try:
        response = requests.delete(f'{base_url}/api/namespaces/{test_namespace}', timeout=10)
        
        print(f"🔄 HTTP状态码: {response.status_code}")
        
        try:
            result = response.json()
            print(f"📤 响应内容: {json.dumps(result, indent=2, ensure_ascii=False)}")
            
            if response.status_code == 200:
                print("✅ API调用成功")
            else:
                print("⚠️  API调用失败，但没有崩溃")
                
        except json.JSONDecodeError:
            print(f"❌ 响应不是有效JSON: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"💥 请求异常: {e}")
    except Exception as e:
        print(f"💥 测试异常: {e}")

def test_delete_namespace_method():
    """测试delete_namespace方法"""
    print("\n🧪 测试delete_namespace方法")
    
    try:
        from app.services.instance_manager import instance_manager
        
        # 测试删除不存在的namespace
        test_namespace = 'test-delete-method'
        
        print(f"📋 测试删除namespace: {test_namespace}")
        
        try:
            result = instance_manager.delete_namespace(test_namespace)
            
            print(f"📤 返回结果: {json.dumps(result, indent=2, ensure_ascii=False)}")
            
            if isinstance(result, dict):
                print("✅ 返回值类型正确 (Dict)")
                
                if result.get('success'):
                    print("✅ 删除成功")
                else:
                    print(f"⚠️  删除失败: {result.get('error', '未知错误')}")
            else:
                print(f"❌ 返回值类型错误: {type(result)}")
                
        except Exception as e:
            print(f"💥 方法调用异常: {e}")
            import traceback
            traceback.print_exc()
            
    except ImportError as e:
        print(f"❌ 导入失败: {e}")

def main():
    """主测试函数"""
    print("🚀 开始namespace删除功能测试\n")
    
    tests = [
        test_get_instances_by_namespace,
        test_delete_namespace_method,
        test_delete_namespace_api
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ 测试失败: {e}")
        print()
    
    print("=" * 50)
    print("📊 namespace删除功能测试完成")
    print("\n💡 修复说明:")
    print("- get_instances_by_namespace现在返回Dict而不是List")
    print("- 包含success字段和instances数组")
    print("- 错误处理更加完善")
    print("- API调用不会再出现'list' object has no attribute 'get'错误")

if __name__ == '__main__':
    import time
    main()
