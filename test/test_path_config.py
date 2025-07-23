#!/usr/bin/env python3
"""
测试路径配置功能
"""

import sys
import os
import requests
import subprocess

def test_cliextra_config():
    """测试cliExtra配置获取"""
    print("🧪 测试cliExtra配置获取...")
    
    try:
        result = subprocess.run(
            ['cliExtra', 'config', 'show'],
            capture_output=True, text=True, timeout=10
        )
        
        if result.returncode == 0:
            print("✅ cliExtra配置获取成功")
            
            # 解析Projects目录
            lines = result.stdout.split('\n')
            projects_dir = None
            for line in lines:
                if line.startswith('Projects:'):
                    projects_dir = line.split(':', 1)[1].strip()
                    break
            
            if projects_dir:
                print(f"   Projects目录: {projects_dir}")
                print(f"   是否存在: {os.path.exists(projects_dir)}")
                print(f"   是否绝对路径: {os.path.isabs(projects_dir)}")
                return projects_dir
            else:
                print("❌ 未找到Projects目录配置")
                return None
        else:
            print(f"❌ cliExtra配置获取失败: {result.stderr}")
            return None
            
    except Exception as e:
        print(f"❌ cliExtra配置获取异常: {e}")
        return None

def test_web_api_config():
    """测试Web API配置获取"""
    print("\n🧪 测试Web API配置获取...")
    
    base_url = "http://localhost:5000"
    
    try:
        # 测试projects-dir API
        response = requests.get(f"{base_url}/api/config/projects-dir", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                projects_dir = data.get('projects_dir')
                print("✅ Web API配置获取成功")
                print(f"   Projects目录: {projects_dir}")
                print(f"   是否存在: {data.get('exists')}")
                print(f"   是否可写: {data.get('writable')}")
                print(f"   是否绝对路径: {data.get('is_absolute')}")
                return projects_dir
            else:
                print(f"❌ Web API返回失败: {data.get('error')}")
                return None
        else:
            print(f"❌ Web API请求失败: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Web API请求异常: {e}")
        return None

def test_cliextra_info_api():
    """测试cliExtra信息API"""
    print("\n🧪 测试cliExtra信息API...")
    
    base_url = "http://localhost:5000"
    
    try:
        response = requests.get(f"{base_url}/api/config/cliextra-info", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ cliExtra信息API获取成功")
                config = data.get('cliextra_config', {})
                for key, value in config.items():
                    print(f"   {key}: {value}")
                return data
            else:
                print(f"❌ cliExtra信息API返回失败: {data.get('error')}")
                return None
        else:
            print(f"❌ cliExtra信息API请求失败: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ cliExtra信息API请求异常: {e}")
        return None

def main():
    """主函数"""
    print("🎯 路径配置测试")
    print("="*50)
    
    # 测试cliExtra配置
    cliextra_projects_dir = test_cliextra_config()
    
    # 测试Web API配置
    web_api_projects_dir = test_web_api_config()
    
    # 测试cliExtra信息API
    cliextra_info = test_cliextra_info_api()
    
    # 比较结果
    print("\n📊 结果比较:")
    print(f"cliExtra配置: {cliextra_projects_dir}")
    print(f"Web API配置: {web_api_projects_dir}")
    
    if cliextra_projects_dir and web_api_projects_dir:
        if cliextra_projects_dir == web_api_projects_dir:
            print("✅ 配置一致")
            return 0
        else:
            print("❌ 配置不一致")
            return 1
    else:
        print("❌ 配置获取失败")
        return 1

if __name__ == "__main__":
    sys.exit(main())
