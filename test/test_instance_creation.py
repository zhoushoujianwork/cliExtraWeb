#!/usr/bin/env python3
"""
测试实例创建功能
"""

import requests
import json
import time
import sys

def test_instance_creation():
    """测试实例创建功能"""
    base_url = "http://localhost:5000"
    
    print("🧪 开始测试实例创建功能...")
    
    # 1. 测试获取实例列表
    print("\n1. 测试获取实例列表...")
    try:
        response = requests.get(f"{base_url}/api/instances")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 获取实例列表成功")
            print(f"   当前实例数量: {len(data.get('instances', []))}")
            for instance in data.get('instances', []):
                print(f"   - {instance.get('id', 'unknown')}: {instance.get('status', 'unknown')}")
        else:
            print(f"❌ 获取实例列表失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 获取实例列表异常: {e}")
        return False
    
    # 2. 测试创建实例
    print("\n2. 测试创建实例...")
    test_data = {
        "namespace": "default",
        "name": "test-web-instance",
        "role": "fullstack",
        "path": "/Users/mikas/github/cliExtraWeb",
        "path_type": "local"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/start-with-config",
            headers={"Content-Type": "application/json"},
            data=json.dumps(test_data)
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"✅ 实例创建请求成功")
                print(f"   实例ID: {result.get('instance_id')}")
                print(f"   消息: {result.get('message')}")
            else:
                print(f"❌ 实例创建失败: {result.get('error')}")
                return False
        else:
            print(f"❌ 实例创建请求失败: {response.status_code}")
            print(f"   响应: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 实例创建异常: {e}")
        return False
    
    # 3. 等待实例创建完成
    print("\n3. 等待实例创建完成...")
    time.sleep(5)
    
    # 4. 再次检查实例列表
    print("\n4. 检查实例是否创建成功...")
    try:
        response = requests.get(f"{base_url}/api/instances")
        if response.status_code == 200:
            data = response.json()
            instances = data.get('instances', [])
            
            # 查找我们创建的实例
            test_instance = None
            for instance in instances:
                if instance.get('id') == 'test-web-instance':
                    test_instance = instance
                    break
            
            if test_instance:
                print(f"✅ 实例创建成功!")
                print(f"   实例ID: {test_instance.get('id')}")
                print(f"   状态: {test_instance.get('status')}")
                print(f"   Namespace: {test_instance.get('namespace')}")
                print(f"   路径: {test_instance.get('path')}")
                return True
            else:
                print(f"❌ 未找到创建的实例 'test-web-instance'")
                print(f"   当前实例列表:")
                for instance in instances:
                    print(f"   - {instance.get('id')}: {instance.get('status')}")
                return False
        else:
            print(f"❌ 获取实例列表失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 检查实例异常: {e}")
        return False

def cleanup_test_instance():
    """清理测试实例"""
    print("\n🧹 清理测试实例...")
    import subprocess
    try:
        result = subprocess.run(
            ['cliExtra', 'stop', 'test-web-instance'],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            print("✅ 测试实例已停止")
        else:
            print(f"⚠️  停止测试实例失败: {result.stderr}")
    except Exception as e:
        print(f"⚠️  清理测试实例异常: {e}")

def main():
    """主函数"""
    print("🎯 cliExtra Web 实例创建功能测试")
    print("="*50)
    
    try:
        success = test_instance_creation()
        
        if success:
            print("\n✅ 所有测试通过!")
            print("实例创建功能正常工作")
        else:
            print("\n❌ 测试失败!")
            print("实例创建功能存在问题")
        
        # 清理测试实例
        cleanup_test_instance()
        
        return 0 if success else 1
        
    except KeyboardInterrupt:
        print("\n\n🛑 测试被用户中断")
        cleanup_test_instance()
        return 1
    except Exception as e:
        print(f"\n❌ 测试异常: {e}")
        cleanup_test_instance()
        return 1

if __name__ == "__main__":
    sys.exit(main())
