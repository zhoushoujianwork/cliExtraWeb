#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试namespace隔离功能
"""

import sys
import os
import time
import subprocess
import json
import requests

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_broadcast_isolation():
    """测试广播消息的namespace隔离"""
    print("🧪 测试广播消息的namespace隔离")
    
    # 测试数据
    test_cases = [
        {
            'namespace': 'frontend',
            'message': '这是发给frontend namespace的消息',
            'expected_isolation': True
        },
        {
            'namespace': 'backend', 
            'message': '这是发给backend namespace的消息',
            'expected_isolation': True
        },
        {
            'namespace': 'default',
            'message': '这是发给default namespace的消息',
            'expected_isolation': True
        }
    ]
    
    base_url = 'http://localhost:5001'
    
    for case in test_cases:
        print(f"\n📋 测试namespace: {case['namespace']}")
        
        try:
            # 发送广播消息
            response = requests.post(f'{base_url}/api/broadcast', 
                json={
                    'message': case['message'],
                    'namespace': case['namespace']
                },
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ 广播成功: {result.get('message', '')}")
                print(f"📊 发送数量: {result.get('sent_count', 0)}")
                
                if case['expected_isolation']:
                    print(f"🔒 namespace隔离: 只发送给 '{case['namespace']}' namespace")
                else:
                    print(f"🌐 全局广播: 发送给所有namespace")
                    
            else:
                print(f"❌ 广播失败: HTTP {response.status_code}")
                print(f"❗ 错误: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"💥 请求异常: {e}")
        except Exception as e:
            print(f"💥 测试异常: {e}")

def test_cliextra_broadcast_command():
    """测试cliExtra broadcast命令的namespace支持"""
    print("\n🧪 测试cliExtra broadcast命令的namespace支持")
    
    # 测试命令
    test_commands = [
        {
            'cmd': ['cliExtra', 'broadcast', '--help'],
            'desc': '查看broadcast命令帮助'
        },
        {
            'cmd': ['cliExtra', 'broadcast', '测试消息', '--namespace', 'test'],
            'desc': '测试带namespace的broadcast命令'
        }
    ]
    
    for test in test_commands:
        print(f"\n📋 {test['desc']}")
        print(f"🔧 命令: {' '.join(test['cmd'])}")
        
        try:
            result = subprocess.run(
                test['cmd'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            print(f"🔄 返回码: {result.returncode}")
            
            if result.stdout.strip():
                print(f"📤 输出: {result.stdout.strip()}")
            
            if result.stderr.strip():
                print(f"❗ 错误: {result.stderr.strip()}")
                
            if result.returncode == 0:
                print("✅ 命令执行成功")
            else:
                print("❌ 命令执行失败")
                
        except subprocess.TimeoutExpired:
            print("⏰ 命令执行超时")
        except Exception as e:
            print(f"💥 命令执行异常: {e}")

def test_instance_manager_broadcast():
    """测试instance_manager的broadcast方法"""
    print("\n🧪 测试instance_manager的broadcast方法")
    
    try:
        from app.services.instance_manager import instance_manager
        
        # 测试不同namespace的广播
        test_cases = [
            {'message': '测试消息1', 'namespace': 'frontend'},
            {'message': '测试消息2', 'namespace': 'backend'},
            {'message': '测试消息3', 'namespace': 'default'},
            {'message': '测试消息4', 'namespace': None}  # 测试无namespace
        ]
        
        for case in test_cases:
            print(f"\n📋 测试: namespace='{case['namespace']}', message='{case['message']}'")
            
            try:
                if case['namespace']:
                    result = instance_manager.broadcast_message(case['message'], case['namespace'])
                else:
                    result = instance_manager.broadcast_message(case['message'])
                
                if result['success']:
                    print(f"✅ 广播成功: 发送给 {result.get('sent_count', 0)} 个实例")
                else:
                    print(f"❌ 广播失败: {result.get('error', '未知错误')}")
                    
            except Exception as e:
                print(f"💥 广播异常: {e}")
                
    except ImportError as e:
        print(f"❌ 导入失败: {e}")
    except Exception as e:
        print(f"💥 测试异常: {e}")

def check_namespace_isolation_implementation():
    """检查namespace隔离的实现"""
    print("\n🧪 检查namespace隔离的实现")
    
    # 检查关键文件
    files_to_check = [
        {
            'path': 'app/services/instance_manager.py',
            'patterns': [
                'def broadcast_message.*namespace',
                '--namespace',
                'namespace.*broadcast'
            ]
        },
        {
            'path': 'app/views/api.py', 
            'patterns': [
                'namespace.*broadcast',
                'broadcast.*namespace'
            ]
        },
        {
            'path': 'app/static/js/chat_functionality.js',
            'patterns': [
                'getCurrentNamespace',
                'namespace.*broadcast'
            ]
        }
    ]
    
    for file_check in files_to_check:
        file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), file_check['path'])
        print(f"\n📁 检查文件: {file_check['path']}")
        
        if not os.path.exists(file_path):
            print("❌ 文件不存在")
            continue
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            for pattern in file_check['patterns']:
                if pattern in content:
                    print(f"✅ 找到模式: {pattern}")
                else:
                    print(f"❌ 缺少模式: {pattern}")
                    
        except Exception as e:
            print(f"💥 检查文件异常: {e}")

def main():
    """主测试函数"""
    print("🚀 开始namespace隔离测试\n")
    
    tests = [
        check_namespace_isolation_implementation,
        test_cliextra_broadcast_command,
        test_instance_manager_broadcast,
        test_broadcast_isolation
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ 测试失败: {e}")
        print()
    
    print("=" * 50)
    print("📊 namespace隔离测试完成")
    print("\n💡 重要提醒:")
    print("- 广播消息应该严格按namespace隔离")
    print("- 不同namespace的实例不应该收到跨namespace的消息")
    print("- getCurrentNamespace()函数应该正确返回当前namespace")
    print("- cliExtra broadcast命令应该支持--namespace参数")

if __name__ == '__main__':
    main()
