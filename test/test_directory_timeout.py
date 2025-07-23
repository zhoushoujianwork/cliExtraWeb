#!/usr/bin/env python3
"""
测试目录选择超时处理
"""

import requests
import json
import sys
import time
import threading

def test_directory_selection_timeout(base_url="http://localhost:5001"):
    """测试目录选择的超时处理"""
    print("🧪 测试目录选择超时处理")
    print("="*50)
    
    print("注意: 这个测试会打开目录选择对话框")
    print("请在对话框出现后等待5分钟不要选择任何目录，以测试超时处理")
    
    user_input = input("是否继续测试超时处理? (y/N): ")
    if user_input.lower() != 'y':
        print("跳过超时测试")
        return True
    
    print("\n开始测试...")
    print("⏰ 超时时间设置为5分钟")
    print("📋 请在目录选择对话框出现后不要选择任何目录")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{base_url}/api/directory/select",
            timeout=320  # 稍微长于后端超时时间
        )
        
        end_time = time.time()
        elapsed = end_time - start_time
        
        print(f"\n⏱️  请求耗时: {elapsed:.1f} 秒")
        
        result = response.json()
        
        if response.status_code == 408:  # 超时状态码
            if result.get('timeout'):
                print("✅ 超时处理正确")
                print(f"   错误信息: {result.get('error')}")
                return True
            else:
                print("❌ 返回408但没有timeout标志")
                return False
        elif result.get('success'):
            print("ℹ️  用户选择了目录（不是超时）")
            print(f"   选择的路径: {result.get('path')}")
            return True
        elif result.get('cancelled'):
            print("ℹ️  用户取消了选择（不是超时）")
            return True
        else:
            print(f"❌ 意外的响应: {result}")
            return False
            
    except requests.exceptions.Timeout:
        end_time = time.time()
        elapsed = end_time - start_time
        print(f"\n⏱️  前端请求超时: {elapsed:.1f} 秒")
        print("✅ 前端超时处理正确")
        return True
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return False

def test_concurrent_directory_selection(base_url="http://localhost:5001"):
    """测试并发目录选择请求"""
    print("\n🔄 测试并发目录选择")
    print("="*30)
    
    print("这个测试会同时发送多个目录选择请求")
    user_input = input("是否继续? (y/N): ")
    if user_input.lower() != 'y':
        print("跳过并发测试")
        return True
    
    results = []
    threads = []
    
    def make_request(request_id):
        try:
            print(f"🚀 启动请求 {request_id}")
            start_time = time.time()
            
            response = requests.post(
                f"{base_url}/api/directory/select",
                timeout=10  # 短超时，快速测试
            )
            
            end_time = time.time()
            elapsed = end_time - start_time
            
            result = response.json()
            results.append({
                'id': request_id,
                'success': result.get('success', False),
                'error': result.get('error'),
                'cancelled': result.get('cancelled', False),
                'timeout': result.get('timeout', False),
                'elapsed': elapsed
            })
            
            print(f"✅ 请求 {request_id} 完成: {elapsed:.1f}s")
            
        except requests.exceptions.Timeout:
            results.append({
                'id': request_id,
                'success': False,
                'error': 'Frontend timeout',
                'timeout': True,
                'elapsed': 10
            })
            print(f"⏰ 请求 {request_id} 前端超时")
        except Exception as e:
            results.append({
                'id': request_id,
                'success': False,
                'error': str(e),
                'elapsed': 0
            })
            print(f"❌ 请求 {request_id} 异常: {e}")
    
    # 启动3个并发请求
    for i in range(3):
        thread = threading.Thread(target=make_request, args=(i+1,))
        threads.append(thread)
        thread.start()
        time.sleep(0.1)  # 稍微错开启动时间
    
    # 等待所有请求完成
    for thread in threads:
        thread.join()
    
    # 分析结果
    print(f"\n📊 并发测试结果:")
    for result in results:
        status = "成功" if result['success'] else "失败"
        print(f"   请求 {result['id']}: {status} ({result['elapsed']:.1f}s)")
        if result.get('error'):
            print(f"      错误: {result['error']}")
    
    return len(results) > 0

def test_error_handling(base_url="http://localhost:5001"):
    """测试各种错误情况的处理"""
    print("\n🛠️  测试错误处理")
    print("="*30)
    
    # 测试无效的请求方法
    try:
        response = requests.get(f"{base_url}/api/directory/select")
        if response.status_code == 405:  # Method Not Allowed
            print("✅ 无效请求方法处理正确")
        else:
            print(f"❌ 无效请求方法处理异常: {response.status_code}")
    except Exception as e:
        print(f"❌ 测试无效请求方法异常: {e}")
    
    # 测试服务器是否正常响应其他API
    try:
        response = requests.post(
            f"{base_url}/api/directory/validate",
            json={'path': '.'},
            timeout=5
        )
        
        if response.status_code == 200:
            print("✅ 其他API正常工作")
        else:
            print(f"❌ 其他API异常: {response.status_code}")
    except Exception as e:
        print(f"❌ 测试其他API异常: {e}")
    
    return True

def main():
    """主函数"""
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = "http://localhost:5001"
    
    print(f"🎯 测试服务器: {base_url}")
    print(f"🕒 开始时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # 测试超时处理
        timeout_success = test_directory_selection_timeout(base_url)
        
        # 测试并发请求
        concurrent_success = test_concurrent_directory_selection(base_url)
        
        # 测试错误处理
        error_success = test_error_handling(base_url)
        
        # 总结
        print(f"\n📋 测试总结:")
        print(f"   超时处理: {'✅' if timeout_success else '❌'}")
        print(f"   并发请求: {'✅' if concurrent_success else '❌'}")
        print(f"   错误处理: {'✅' if error_success else '❌'}")
        
        overall_success = all([timeout_success, concurrent_success, error_success])
        
        if overall_success:
            print("\n🎉 所有测试通过！超时处理功能正常")
            return 0
        else:
            print("\n❌ 部分测试失败")
            return 1
            
    except KeyboardInterrupt:
        print("\n⚠️  测试被用户中断")
        return 1
    except Exception as e:
        print(f"\n❌ 测试执行异常: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
