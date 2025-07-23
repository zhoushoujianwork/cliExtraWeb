#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试cliExtra启动性能
"""

import subprocess
import time
import sys
import os

def test_cliextra_start_performance():
    """测试cliExtra启动性能"""
    print("🧪 测试cliExtra启动性能")
    
    # 测试基本启动命令
    test_commands = [
        ['cliExtra', '--version'],
        ['cliExtra', 'list'],
        ['cliExtra', 'start', '--help']
    ]
    
    for cmd in test_commands:
        print(f"\n📋 测试命令: {' '.join(cmd)}")
        start_time = time.time()
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True, 
                text=True, 
                timeout=30
            )
            
            end_time = time.time()
            duration = end_time - start_time
            
            print(f"⏱️  执行时间: {duration:.2f}秒")
            print(f"🔄 返回码: {result.returncode}")
            
            if result.returncode == 0:
                print("✅ 命令执行成功")
                if result.stdout.strip():
                    print(f"📤 输出: {result.stdout.strip()[:100]}...")
            else:
                print("❌ 命令执行失败")
                if result.stderr.strip():
                    print(f"❗ 错误: {result.stderr.strip()[:100]}...")
                    
        except subprocess.TimeoutExpired:
            print("⏰ 命令执行超时（30秒）")
        except Exception as e:
            print(f"💥 命令执行异常: {e}")

def test_cliextra_start_with_path():
    """测试带路径的cliExtra启动"""
    print("\n🧪 测试带路径的cliExtra启动")
    
    # 使用当前目录作为测试路径
    test_path = os.getcwd()
    cmd = ['cliExtra', 'start', test_path, '--name', 'test-performance', '--dry-run']
    
    print(f"📋 测试命令: {' '.join(cmd)}")
    start_time = time.time()
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True, 
            text=True, 
            timeout=60
        )
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"⏱️  执行时间: {duration:.2f}秒")
        print(f"🔄 返回码: {result.returncode}")
        
        if result.returncode == 0:
            print("✅ 命令执行成功")
        else:
            print("❌ 命令执行失败")
            
        if result.stdout.strip():
            print(f"📤 输出: {result.stdout.strip()}")
        if result.stderr.strip():
            print(f"❗ 错误: {result.stderr.strip()}")
            
    except subprocess.TimeoutExpired:
        print("⏰ 命令执行超时（60秒）")
    except Exception as e:
        print(f"💥 命令执行异常: {e}")

def test_system_performance():
    """测试系统性能指标"""
    print("\n🧪 测试系统性能指标")
    
    # 测试磁盘IO
    test_path = "/tmp/cliextra_test"
    try:
        start_time = time.time()
        with open(test_path, 'w') as f:
            f.write("test" * 1000)
        
        with open(test_path, 'r') as f:
            content = f.read()
        
        os.remove(test_path)
        end_time = time.time()
        
        print(f"💾 磁盘IO测试: {(end_time - start_time) * 1000:.2f}ms")
        
    except Exception as e:
        print(f"❌ 磁盘IO测试失败: {e}")
    
    # 测试网络连接（如果需要）
    try:
        import socket
        start_time = time.time()
        socket.create_connection(("8.8.8.8", 53), timeout=5)
        end_time = time.time()
        print(f"🌐 网络连接测试: {(end_time - start_time) * 1000:.2f}ms")
    except Exception as e:
        print(f"❌ 网络连接测试失败: {e}")

def main():
    """主测试函数"""
    print("🚀 开始cliExtra性能测试\n")
    
    test_cliextra_start_performance()
    test_cliextra_start_with_path()
    test_system_performance()
    
    print("\n" + "=" * 50)
    print("📊 性能测试完成")
    print("\n💡 优化建议:")
    print("- 如果启动时间超过10秒，考虑增加超时时间")
    print("- 如果磁盘IO较慢，检查存储设备性能")
    print("- 如果网络较慢，Git克隆可能需要更长时间")

if __name__ == '__main__':
    main()
