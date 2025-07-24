#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试namespace删除修复
"""

import sys
import os
import requests
import json
import time
import subprocess

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_qq_ns_delete_command():
    """测试qq ns delete命令"""
    print("🧪 测试qq ns delete命令")
    
    # 创建测试namespace
    test_namespace = f'test-api-delete-{int(time.time())}'
    
    print(f"📋 创建测试namespace: {test_namespace}")
    
    try:
        # 创建namespace
        result = subprocess.run(
            ['qq', 'ns', 'create', test_namespace],
            capture_output=True, text=True, timeout=30
        )
        
        if result.returncode == 0:
            print("✅ 测试namespace创建成功")
            
            # 删除namespace
            print(f"📋 删除测试namespace: {test_namespace}")
            
            result = subprocess.run(
                ['qq', 'ns', 'delete', test_namespace],
                capture_output=True, text=True, timeout=30
            )
            
            if result.returncode == 0:
                print("✅ 命令行删除成功")
                print(f"📤 输出: {result.stdout.strip()}")
                return True
            else:
                print("❌ 命令行删除失败")
                print(f"❗ 错误: {result.stderr.strip()}")
                return False
        else:
            print("❌ 测试namespace创建失败")
            print(f"❗ 错误: {result.stderr.strip()}")
            return False
            
    except Exception as e:
        print(f"💥 测试异常: {e}")
        return False

def test_instance_manager_delete():
    """测试instance_manager的delete方法"""
    print("\n🧪 测试instance_manager的delete方法")
    
    try:
        from app.services.instance_manager import instance_manager
        
        # 创建测试namespace
        test_namespace = f'test-manager-delete-{int(time.time())}'
        
        print(f"📋 创建测试namespace: {test_namespace}")
        
        # 先用命令行创建
        result = subprocess.run(
            ['qq', 'ns', 'create', test_namespace],
            capture_output=True, text=True, timeout=30
        )
        
        if result.returncode == 0:
            print("✅ 测试namespace创建成功")
            
            # 使用instance_manager删除
            print(f"📋 使用instance_manager删除: {test_namespace}")
            
            delete_result = instance_manager.delete_namespace(test_namespace)
            
            print(f"📤 删除结果: {json.dumps(delete_result, indent=2, ensure_ascii=False)}")
            
            if delete_result.get('success'):
                print("✅ instance_manager删除成功")
                
                # 验证是否真的删除了
                verify_result = subprocess.run(
                    ['qq', 'ns', 'show', test_namespace],
                    capture_output=True, text=True, timeout=10
                )
                
                if verify_result.returncode != 0:
                    print("✅ 验证删除成功：namespace不存在")
                    return True
                else:
                    print("❌ 验证失败：namespace仍然存在")
                    return False
            else:
                print(f"❌ instance_manager删除失败: {delete_result.get('error')}")
                return False
        else:
            print("❌ 测试namespace创建失败")
            return False
            
    except Exception as e:
        print(f"💥 测试异常: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_api_delete():
    """测试API删除"""
    print("\n🧪 测试API删除")
    
    base_url = 'http://localhost:5001'
    
    # 创建测试namespace
    test_namespace = f'test-api-delete-{int(time.time())}'
    
    print(f"📋 创建测试namespace: {test_namespace}")
    
    try:
        # 先用命令行创建
        result = subprocess.run(
            ['qq', 'ns', 'create', test_namespace],
            capture_output=True, text=True, timeout=30
        )
        
        if result.returncode == 0:
            print("✅ 测试namespace创建成功")
            
            # 使用API删除
            print(f"📋 使用API删除: {test_namespace}")
            
            response = requests.delete(f'{base_url}/api/namespaces/{test_namespace}', timeout=30)
            
            print(f"🔄 HTTP状态码: {response.status_code}")
            
            try:
                api_result = response.json()
                print(f"📤 API响应: {json.dumps(api_result, indent=2, ensure_ascii=False)}")
                
                if response.status_code == 200 and api_result.get('success'):
                    print("✅ API删除成功")
                    
                    # 验证是否真的删除了
                    verify_result = subprocess.run(
                        ['qq', 'ns', 'show', test_namespace],
                        capture_output=True, text=True, timeout=10
                    )
                    
                    if verify_result.returncode != 0:
                        print("✅ 验证删除成功：namespace不存在")
                        return True
                    else:
                        print("❌ 验证失败：namespace仍然存在")
                        # 清理残留的namespace
                        subprocess.run(['qq', 'ns', 'delete', test_namespace], capture_output=True)
                        return False
                else:
                    print(f"❌ API删除失败")
                    return False
                    
            except json.JSONDecodeError:
                print(f"❌ API响应不是有效JSON: {response.text}")
                return False
        else:
            print("❌ 测试namespace创建失败")
            return False
            
    except Exception as e:
        print(f"💥 测试异常: {e}")
        return False

def main():
    """主测试函数"""
    print("🚀 开始namespace删除修复测试\n")
    
    tests = [
        ("命令行删除测试", test_qq_ns_delete_command),
        ("instance_manager删除测试", test_instance_manager_delete),
        ("API删除测试", test_api_delete)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"🔧 {test_name}")
        try:
            result = test_func()
            results.append(result)
            if result:
                print(f"✅ {test_name} 通过")
            else:
                print(f"❌ {test_name} 失败")
        except Exception as e:
            print(f"💥 {test_name} 异常: {e}")
            results.append(False)
        print()
    
    # 总结
    passed = sum(results)
    total = len(results)
    
    print("=" * 50)
    print(f"📊 测试结果: {passed}/{total} 通过")
    
    if passed == total:
        print("🎉 namespace删除功能修复成功！")
        print("\n💡 修复内容:")
        print("- 使用正确的 'qq ns delete' 命令")
        print("- 后台真正执行删除操作")
        print("- API调用与实际删除保持一致")
        return True
    else:
        print("⚠️  部分测试失败，需要进一步检查")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
