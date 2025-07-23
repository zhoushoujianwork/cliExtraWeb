#!/usr/bin/env python3
"""
测试namespace API功能
"""

import subprocess
import json
import sys
import requests

def test_qq_ns_command():
    """测试qq ns show -o json命令"""
    print("🧪 测试qq ns show -o json命令...")
    
    try:
        result = subprocess.run(
            ['qq', 'ns', 'show', '-o', 'json'],
            capture_output=True, text=True, timeout=10
        )
        
        if result.returncode == 0:
            print("✅ qq ns命令执行成功")
            
            try:
                data = json.loads(result.stdout)
                print("✅ JSON解析成功")
                
                namespaces = data.get('namespaces', [])
                print(f"📊 发现 {len(namespaces)} 个namespace:")
                
                total_instances = 0
                for ns in namespaces:
                    name = ns.get('name', '')
                    count = ns.get('instance_count', 0)
                    instances = ns.get('instances', [])
                    total_instances += count
                    
                    print(f"  - {name}: {count} 个实例")
                    if instances:
                        for instance in instances[:3]:  # 只显示前3个
                            print(f"    * {instance}")
                        if len(instances) > 3:
                            print(f"    * ... 还有 {len(instances) - 3} 个")
                
                print(f"📈 总实例数: {total_instances}")
                return data
                
            except json.JSONDecodeError as e:
                print(f"❌ JSON解析失败: {e}")
                print(f"原始输出: {result.stdout}")
                return None
        else:
            print(f"❌ qq ns命令执行失败: {result.stderr}")
            return None
            
    except subprocess.TimeoutExpired:
        print("❌ qq ns命令执行超时")
        return None
    except Exception as e:
        print(f"❌ qq ns命令执行异常: {e}")
        return None

def test_namespace_api():
    """测试namespace API"""
    print("\n🧪 测试namespace API...")
    
    base_url = "http://localhost:5000"
    
    try:
        # 测试获取所有namespace
        response = requests.get(f"{base_url}/api/namespaces", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ namespace API调用成功")
                
                namespaces = data.get('namespaces', [])
                total_instances = data.get('total_instances', 0)
                namespace_count = data.get('namespace_count', 0)
                
                print(f"📊 API返回数据:")
                print(f"  - 总namespace数: {namespace_count}")
                print(f"  - 总实例数: {total_instances}")
                print(f"  - 包含'全部'选项的namespace数: {len(namespaces)}")
                
                print(f"\n📋 Namespace列表:")
                for ns in namespaces:
                    name = ns.get('name', '')
                    display_name = ns.get('display_name', '')
                    count = ns.get('instance_count', 0)
                    
                    if name == '':
                        print(f"  - {display_name} ({count}) [全部选项]")
                    else:
                        print(f"  - {display_name} ({count})")
                
                return data
            else:
                print(f"❌ API返回失败: {data.get('error')}")
                return None
        else:
            print(f"❌ API请求失败: {response.status_code}")
            if response.text:
                print(f"响应内容: {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ API请求异常: {e}")
        return None

def test_namespace_stats_api():
    """测试namespace统计API"""
    print("\n🧪 测试namespace统计API...")
    
    base_url = "http://localhost:5000"
    
    try:
        response = requests.get(f"{base_url}/api/namespaces/stats", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ namespace统计API调用成功")
                
                stats = data.get('stats', {})
                print(f"📈 统计信息:")
                print(f"  - 总namespace数: {stats.get('total_namespaces', 0)}")
                print(f"  - 总实例数: {stats.get('total_instances', 0)}")
                print(f"  - 活跃namespace数: {stats.get('active_namespaces', 0)}")
                print(f"  - 空namespace数: {stats.get('empty_namespaces', 0)}")
                
                distribution = stats.get('namespace_distribution', {})
                if distribution:
                    print(f"\n📊 分布详情:")
                    for ns, count in distribution.items():
                        print(f"  - {ns or '(空)'}: {count}")
                
                return data
            else:
                print(f"❌ 统计API返回失败: {data.get('error')}")
                return None
        else:
            print(f"❌ 统计API请求失败: {response.status_code}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ 统计API请求异常: {e}")
        return None

def compare_results(qq_data, api_data):
    """比较qq命令和API的结果"""
    print("\n🔍 比较结果...")
    
    if not qq_data or not api_data:
        print("❌ 无法比较，缺少数据")
        return False
    
    qq_namespaces = qq_data.get('namespaces', [])
    api_namespaces = api_data.get('namespaces', [])
    
    # 过滤掉API中的"全部"选项
    api_real_namespaces = [ns for ns in api_namespaces if ns.get('name') != '']
    
    print(f"qq命令返回: {len(qq_namespaces)} 个namespace")
    print(f"API返回: {len(api_real_namespaces)} 个实际namespace (不含'全部')")
    
    if len(qq_namespaces) != len(api_real_namespaces):
        print("❌ namespace数量不匹配")
        return False
    
    # 比较每个namespace的实例数
    qq_stats = {ns.get('name', ''): ns.get('instance_count', 0) for ns in qq_namespaces}
    api_stats = {ns.get('name', ''): ns.get('instance_count', 0) for ns in api_real_namespaces}
    
    matches = True
    for name, qq_count in qq_stats.items():
        api_count = api_stats.get(name, -1)
        if qq_count != api_count:
            print(f"❌ namespace '{name}' 实例数不匹配: qq={qq_count}, api={api_count}")
            matches = False
        else:
            print(f"✅ namespace '{name}': {qq_count} 个实例")
    
    if matches:
        print("✅ 所有数据匹配")
        return True
    else:
        print("❌ 数据不匹配")
        return False

def main():
    """主函数"""
    print("🎯 Namespace API测试")
    print("="*50)
    
    # 测试qq命令
    qq_data = test_qq_ns_command()
    
    # 测试API
    api_data = test_namespace_api()
    
    # 测试统计API
    stats_data = test_namespace_stats_api()
    
    # 比较结果
    if qq_data and api_data:
        success = compare_results(qq_data, api_data)
        return 0 if success else 1
    else:
        print("\n❌ 测试失败，无法获取完整数据")
        return 1

if __name__ == "__main__":
    sys.exit(main())
