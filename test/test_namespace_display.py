#!/usr/bin/env python3
"""
测试namespace显示功能
"""

import subprocess
import json
import sys

def get_cliextra_instances():
    """获取cliExtra实例列表"""
    try:
        result = subprocess.run(
            ['cliExtra', 'list', '-o', 'json'],
            capture_output=True, text=True, timeout=10
        )
        
        if result.returncode == 0:
            try:
                instances = json.loads(result.stdout)
                return instances
            except json.JSONDecodeError:
                # 如果不是JSON格式，解析文本输出
                lines = result.stdout.strip().split('\n')
                instances = []
                for line in lines:
                    if line.strip():
                        instances.append({
                            'id': line.strip(),
                            'namespace': None,  # 文本格式无法获取namespace
                            'status': 'Unknown'
                        })
                return instances
        else:
            print(f"获取实例列表失败: {result.stderr}")
            return []
            
    except Exception as e:
        print(f"获取实例列表异常: {e}")
        return []

def analyze_namespace_distribution(instances):
    """分析namespace分布"""
    namespace_stats = {}
    
    for instance in instances:
        # 处理字符串类型的实例ID（文本格式输出）
        if isinstance(instance, str):
            ns = ''  # 文本格式无法获取namespace，默认为空
        else:
            # 处理字典类型的实例数据（JSON格式输出）
            ns = instance.get('namespace') or ''  # 空namespace用空字符串表示
        
        if ns in namespace_stats:
            namespace_stats[ns] += 1
        else:
            namespace_stats[ns] = 1
    
    return namespace_stats

def test_namespace_display():
    """测试namespace显示"""
    print("🧪 测试namespace显示功能")
    print("="*50)
    
    # 获取实例列表
    instances = get_cliextra_instances()
    print(f"📊 总实例数: {len(instances)}")
    
    if not instances:
        print("⚠️  没有找到实例")
        return
    
    # 分析namespace分布
    namespace_stats = analyze_namespace_distribution(instances)
    
    print("\n📈 Namespace分布:")
    for ns, count in sorted(namespace_stats.items()):
        if ns == '':
            print(f"  全部 ({len(instances)})")
            print(f"  (空namespace) ({count})")
        else:
            print(f"  {ns} ({count})")
    
    print("\n📋 实例详情:")
    for instance in instances:
        if isinstance(instance, str):
            # 文本格式的实例ID
            print(f"  - {instance} | ns: (未知) | status: (未知)")
        else:
            # 字典格式的实例数据
            ns = instance.get('namespace') or '(无namespace)'
            status = instance.get('status', 'Unknown')
            print(f"  - {instance['id']} | ns: {ns} | status: {status}")
    
    # 验证修复效果
    print("\n✅ 修复验证:")
    
    # 检查是否有空namespace的实例
    empty_ns_count = namespace_stats.get('', 0)
    if empty_ns_count > 0:
        print(f"  ✓ 发现 {empty_ns_count} 个空namespace实例")
        print("  ✓ 这些实例应该在'全部'选项中显示")
    else:
        print("  ℹ️  没有空namespace实例")
    
    # 检查namespace选择器应该显示的选项
    print("\n🎯 选择器应该显示:")
    print(f"  - 全部 ({len(instances)})")
    
    for ns, count in sorted(namespace_stats.items()):
        if ns != '':  # 跳过空namespace，因为已经包含在"全部"中
            print(f"  - {ns} ({count})")
    
    return namespace_stats

def create_test_instances():
    """创建测试实例（如果需要）"""
    print("\n🔧 创建测试实例...")
    
    test_configs = [
        {'name': 'test-no-ns', 'ns': None},
        {'name': 'test-default-ns', 'ns': 'default'},
        {'name': 'test-frontend-ns', 'ns': 'frontend'},
    ]
    
    for config in test_configs:
        try:
            cmd = ['cliExtra', 'start', '--name', config['name']]
            if config['ns']:
                cmd.extend(['--ns', config['ns']])
            
            print(f"  创建实例: {config['name']} (ns: {config['ns'] or '无'})")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                print(f"  ✅ {config['name']} 创建成功")
            else:
                print(f"  ❌ {config['name']} 创建失败: {result.stderr}")
                
        except Exception as e:
            print(f"  ❌ {config['name']} 创建异常: {e}")

def cleanup_test_instances():
    """清理测试实例"""
    print("\n🧹 清理测试实例...")
    
    test_names = ['test-no-ns', 'test-default-ns', 'test-frontend-ns']
    
    for name in test_names:
        try:
            result = subprocess.run(
                ['cliExtra', 'stop', name],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                print(f"  ✅ {name} 已停止")
            else:
                print(f"  ⚠️  {name} 停止失败或不存在")
        except Exception as e:
            print(f"  ❌ {name} 停止异常: {e}")

def main():
    """主函数"""
    if len(sys.argv) > 1:
        if sys.argv[1] == 'create':
            create_test_instances()
            return 0
        elif sys.argv[1] == 'cleanup':
            cleanup_test_instances()
            return 0
    
    # 默认执行测试
    namespace_stats = test_namespace_display()
    
    if not namespace_stats:
        print("\n💡 提示: 运行 'python test_namespace_display.py create' 创建测试实例")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
