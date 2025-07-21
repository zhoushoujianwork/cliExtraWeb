#!/usr/bin/env python3
"""
测试namespace功能的完整性
"""
import requests
import subprocess
import json
import time

def test_namespace_api():
    """测试namespace API功能"""
    print("=== 测试Namespace API ===")
    
    base_url = "http://localhost:5001/api"
    
    # 1. 测试获取namespace列表
    print("1. 测试获取namespace列表...")
    response = requests.get(f"{base_url}/namespaces")
    if response.status_code == 200:
        data = response.json()
        if data['success']:
            print(f"✅ 获取成功，发现 {len(data['namespaces'])} 个namespace")
            for ns in data['namespaces']:
                print(f"   - {ns['name']}: {ns['instance_count']} 实例")
        else:
            print(f"❌ 获取失败: {data['error']}")
    else:
        print(f"❌ API请求失败: {response.status_code}")
    
    # 2. 测试创建namespace
    print("\n2. 测试创建namespace...")
    test_ns_name = f"test-ns-{int(time.time())}"
    response = requests.post(f"{base_url}/namespaces", json={"name": test_ns_name})
    if response.status_code == 200:
        data = response.json()
        if data['success']:
            print(f"✅ 创建namespace '{test_ns_name}' 成功")
        else:
            print(f"❌ 创建失败: {data['error']}")
    else:
        print(f"❌ 创建请求失败: {response.status_code}")
    
    # 3. 测试在新namespace中创建实例
    print(f"\n3. 测试在namespace '{test_ns_name}' 中创建实例...")
    instance_data = {
        "name": f"test-instance-{int(time.time())}",
        "namespace": test_ns_name,
        "role": "backend"
    }
    response = requests.post(f"{base_url}/instances", json=instance_data)
    if response.status_code == 200:
        data = response.json()
        if data['success']:
            instance_id = data.get('instance_id', instance_data['name'])
            print(f"✅ 在namespace '{test_ns_name}' 中创建实例 '{instance_id}' 成功")
            
            # 4. 测试修改实例namespace
            print(f"\n4. 测试修改实例namespace...")
            new_ns_name = "backend"  # 假设backend namespace存在
            response = requests.put(f"{base_url}/instances/{instance_id}/namespace", 
                                  json={"namespace": new_ns_name})
            if response.status_code == 200:
                data = response.json()
                if data['success']:
                    print(f"✅ 修改实例 '{instance_id}' 的namespace到 '{new_ns_name}' 成功")
                else:
                    print(f"❌ 修改失败: {data['error']}")
            else:
                print(f"❌ 修改请求失败: {response.status_code}")
            
            # 清理测试实例
            print(f"\n5. 清理测试实例...")
            try:
                subprocess.run(['cliExtra', 'stop', instance_id], capture_output=True)
                print(f"✅ 测试实例 '{instance_id}' 已清理")
            except Exception as e:
                print(f"⚠️  清理实例失败: {e}")
        else:
            print(f"❌ 创建实例失败: {data['error']}")
    else:
        print(f"❌ 创建实例请求失败: {response.status_code}")
    
    # 6. 测试删除namespace
    print(f"\n6. 测试删除namespace '{test_ns_name}'...")
    response = requests.delete(f"{base_url}/namespaces/{test_ns_name}")
    if response.status_code == 200:
        data = response.json()
        if data['success']:
            print(f"✅ 删除namespace '{test_ns_name}' 成功")
        else:
            print(f"❌ 删除失败: {data['error']}")
    else:
        print(f"❌ 删除请求失败: {response.status_code}")

def test_cliextra_ns_commands():
    """测试cliExtra的namespace命令"""
    print("\n=== 测试cliExtra Namespace命令 ===")
    
    # 1. 测试显示namespace
    print("1. 测试显示namespace...")
    try:
        result = subprocess.run(['cliExtra', 'ns', 'show', '--json'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            data = json.loads(result.stdout.strip())
            namespaces = data.get('namespaces', [])
            print(f"✅ 发现 {len(namespaces)} 个namespace:")
            for ns in namespaces:
                print(f"   - {ns['name']}: {ns['instance_count']} 实例")
        else:
            print(f"❌ 命令失败: {result.stderr}")
    except Exception as e:
        print(f"❌ 命令异常: {e}")
    
    # 2. 测试创建namespace
    print("\n2. 测试创建namespace...")
    test_ns = f"cli-test-{int(time.time())}"
    try:
        result = subprocess.run(['cliExtra', 'ns', 'create', test_ns], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ 创建namespace '{test_ns}' 成功")
            
            # 3. 测试在namespace中创建实例
            print(f"\n3. 测试在namespace '{test_ns}' 中创建实例...")
            instance_name = f"cli-instance-{int(time.time())}"
            result = subprocess.run(['cliExtra', 'start', '--name', instance_name, '--ns', test_ns], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ 在namespace '{test_ns}' 中创建实例 '{instance_name}' 成功")
                
                # 清理实例
                time.sleep(1)
                subprocess.run(['cliExtra', 'stop', instance_name], capture_output=True)
                print(f"✅ 测试实例 '{instance_name}' 已清理")
            else:
                print(f"❌ 创建实例失败: {result.stderr}")
            
            # 4. 测试删除namespace
            print(f"\n4. 测试删除namespace '{test_ns}'...")
            result = subprocess.run(['cliExtra', 'ns', 'delete', test_ns], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ 删除namespace '{test_ns}' 成功")
            else:
                print(f"❌ 删除namespace失败: {result.stderr}")
        else:
            print(f"❌ 创建namespace失败: {result.stderr}")
    except Exception as e:
        print(f"❌ 命令异常: {e}")

def test_web_interface():
    """测试Web界面功能"""
    print("\n=== 测试Web界面 ===")
    
    # 测试主页面是否正常加载
    try:
        response = requests.get("http://localhost:5001")
        if response.status_code == 200:
            print("✅ Web界面正常加载")
            
            # 检查是否包含namespace相关元素
            content = response.text
            if 'currentNamespaceSelect' in content:
                print("✅ 发现namespace选择器")
            else:
                print("❌ 未发现namespace选择器")
            
            if 'namespaceManageModal' in content:
                print("✅ 发现namespace管理模态框")
            else:
                print("❌ 未发现namespace管理模态框")
        else:
            print(f"❌ Web界面加载失败: {response.status_code}")
    except Exception as e:
        print(f"❌ Web界面测试异常: {e}")

def main():
    """主测试函数"""
    print("🧪 开始Namespace功能完整性测试\n")
    
    # 检查服务状态
    try:
        response = requests.get("http://localhost:5001", timeout=5)
        if response.status_code != 200:
            print("❌ Web服务未运行，请先启动服务")
            return
    except:
        print("❌ 无法连接到Web服务，请确保服务正在运行")
        return
    
    # 运行测试
    test_cliextra_ns_commands()
    test_namespace_api()
    test_web_interface()
    
    print("\n✅ 所有测试完成！")
    print("\n📝 Namespace功能使用说明:")
    print("1. 右上角选择namespace进行切换")
    print("2. 点击设置图标管理namespace")
    print("3. 创建实例时可选择namespace")
    print("4. 切换namespace会自动过滤实例和清空聊天记录")

if __name__ == "__main__":
    main()
