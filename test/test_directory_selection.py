#!/usr/bin/env python3
"""
测试目录选择功能
"""

import requests
import json
import sys
import os

def test_directory_validation(base_url="http://localhost:5001"):
    """测试目录验证API"""
    print("🧪 测试目录验证API")
    print("="*40)
    
    # 测试用例
    test_cases = [
        {
            'name': '当前目录',
            'path': '.',
            'should_succeed': True
        },
        {
            'name': '绝对路径',
            'path': '/Users/mikas/github/cliExtraWeb',
            'should_succeed': True
        },
        {
            'name': '用户主目录符号',
            'path': '~',
            'should_succeed': True
        },
        {
            'name': '相对路径',
            'path': '../',
            'should_succeed': True
        },
        {
            'name': '不存在的路径',
            'path': '/nonexistent/path/12345',
            'should_succeed': False
        },
        {
            'name': '空路径',
            'path': '',
            'should_succeed': False
        },
        {
            'name': '文件路径（不是目录）',
            'path': '/etc/hosts',
            'should_succeed': False
        }
    ]
    
    success_count = 0
    
    for case in test_cases:
        print(f"\n📋 测试: {case['name']}")
        print(f"   路径: {case['path']}")
        
        try:
            response = requests.post(
                f"{base_url}/api/directory/validate",
                json={'path': case['path']},
                timeout=10
            )
            
            result = response.json()
            
            if case['should_succeed']:
                if response.status_code == 200 and result.get('success'):
                    print(f"   ✅ 验证成功")
                    print(f"   绝对路径: {result.get('path')}")
                    print(f"   目录名: {result.get('directory_name')}")
                    success_count += 1
                else:
                    print(f"   ❌ 预期成功但失败: {result.get('error')}")
            else:
                if response.status_code != 200 or not result.get('success'):
                    print(f"   ✅ 预期失败且确实失败: {result.get('error')}")
                    success_count += 1
                else:
                    print(f"   ❌ 预期失败但成功了")
                    
        except Exception as e:
            print(f"   ❌ 请求异常: {e}")
    
    print(f"\n📊 测试结果: {success_count}/{len(test_cases)} 通过")
    return success_count == len(test_cases)

def test_directory_selection_api(base_url="http://localhost:5001"):
    """测试目录选择API（需要手动交互）"""
    print("\n🎯 测试目录选择API")
    print("="*40)
    
    print("注意: 这个测试需要手动交互，会打开系统目录选择对话框")
    
    user_input = input("是否继续测试目录选择功能? (y/N): ")
    if user_input.lower() != 'y':
        print("跳过目录选择测试")
        return True
    
    try:
        print("正在调用目录选择API...")
        response = requests.post(
            f"{base_url}/api/directory/select",
            timeout=60  # 给用户足够时间选择
        )
        
        result = response.json()
        
        if response.status_code == 200 and result.get('success'):
            print("✅ 目录选择成功")
            print(f"   选择的路径: {result.get('path')}")
            print(f"   目录名: {result.get('directory_name')}")
            print(f"   父目录: {result.get('parent_path')}")
            return True
        else:
            if result.get('cancelled'):
                print("ℹ️  用户取消了选择")
                return True
            else:
                print(f"❌ 目录选择失败: {result.get('error')}")
                return False
                
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return False

def test_path_conversion():
    """测试路径转换逻辑"""
    print("\n🔧 测试路径转换逻辑")
    print("="*40)
    
    test_paths = [
        ('~', os.path.expanduser('~')),
        ('.', os.path.abspath('.')),
        ('..', os.path.abspath('..')),
        ('/tmp', '/tmp'),
        ('~/Documents', os.path.expanduser('~/Documents'))
    ]
    
    success_count = 0
    
    for input_path, expected_pattern in test_paths:
        print(f"\n测试路径: {input_path}")
        
        # 模拟路径处理逻辑
        expanded = os.path.expanduser(input_path)
        absolute = os.path.abspath(expanded)
        
        print(f"   展开后: {expanded}")
        print(f"   绝对路径: {absolute}")
        
        if input_path == '~':
            if absolute == expected_pattern:
                print("   ✅ 用户目录展开正确")
                success_count += 1
            else:
                print("   ❌ 用户目录展开错误")
        elif input_path in ['.', '..']:
            if os.path.exists(absolute):
                print("   ✅ 相对路径转换正确")
                success_count += 1
            else:
                print("   ❌ 相对路径转换错误")
        else:
            if absolute == expected_pattern:
                print("   ✅ 路径处理正确")
                success_count += 1
            else:
                print("   ❌ 路径处理错误")
    
    print(f"\n📊 路径转换测试: {success_count}/{len(test_paths)} 通过")
    return success_count == len(test_paths)

def test_api_endpoints(base_url="http://localhost:5001"):
    """测试所有目录相关的API端点"""
    print("\n🌐 测试API端点")
    print("="*40)
    
    endpoints = [
        {
            'name': '目录验证',
            'url': '/api/directory/validate',
            'method': 'POST',
            'data': {'path': '.'}
        }
    ]
    
    success_count = 0
    
    for endpoint in endpoints:
        print(f"\n测试端点: {endpoint['name']}")
        print(f"URL: {endpoint['url']}")
        
        try:
            if endpoint['method'] == 'POST':
                response = requests.post(
                    f"{base_url}{endpoint['url']}",
                    json=endpoint.get('data', {}),
                    timeout=10
                )
            else:
                response = requests.get(
                    f"{base_url}{endpoint['url']}",
                    timeout=10
                )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print("   ✅ 端点正常工作")
                    success_count += 1
                else:
                    print(f"   ❌ 端点返回失败: {result.get('error')}")
            else:
                print(f"   ❌ HTTP错误: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ 请求异常: {e}")
    
    print(f"\n📊 API端点测试: {success_count}/{len(endpoints)} 通过")
    return success_count == len(endpoints)

def main():
    """主函数"""
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = "http://localhost:5001"
    
    print(f"🎯 测试服务器: {base_url}")
    
    # 执行各项测试
    validation_success = test_directory_validation(base_url)
    conversion_success = test_path_conversion()
    api_success = test_api_endpoints(base_url)
    selection_success = test_directory_selection_api(base_url)
    
    # 总结
    print(f"\n📋 测试总结:")
    print(f"   目录验证: {'✅' if validation_success else '❌'}")
    print(f"   路径转换: {'✅' if conversion_success else '❌'}")
    print(f"   API端点: {'✅' if api_success else '❌'}")
    print(f"   目录选择: {'✅' if selection_success else '❌'}")
    
    overall_success = all([validation_success, conversion_success, api_success, selection_success])
    
    if overall_success:
        print("\n🎉 所有测试通过！目录选择功能正常工作")
        return 0
    else:
        print("\n❌ 部分测试失败，请检查相关功能")
        return 1

if __name__ == "__main__":
    sys.exit(main())
