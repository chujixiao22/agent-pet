#!/usr/bin/env python3
"""
动画测试脚本
用于测试 Minimax 生成的动画帧
"""

import os
import json
import requests
import time
from pathlib import Path


def test_api_connection():
    """测试 Minimax API 连接"""
    print("=== 测试 Minimax API 连接 ===")

    # 测试 API 端点
    url = "https://api.minimax.chat/v1/chat/completions"
    headers = {
        "Authorization": "Bearer sk-cp-Q0OT0DXTp2na1JIBuEzml3b4t9vYXIy8e1llu-yp0J9WKZD1qVnaVSUBXlnLsLo5yKmqph7bhGHm_QysA2kywuZygQSwHfPP9qegB53UOi7kgJA4WtE-8Fs",
        "Content-Type": "application/json"
    }

    data = {
        "model": "abab6.5-chat",
        "messages": [
            {"role": "user", "content": "Hello, can you hear me?"}
        ]
    }

    try:
        response = requests.post(url, json=data, headers=headers, timeout=10)
        if response.status_code == 200:
            print("✅ API 连接成功")
            return True
        else:
            print(f"❌ API 连接失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API 连接错误: {e}")
        return False


def generate_test_frame():
    """生成一个测试帧"""
    print("\n=== 生成测试帧 ===")

    url = "https://api.minimax.chat/v1/image_generation"
    headers = {
        "Authorization": "Bearer sk-cp-Q0OT0DXTp2na1JIBuEzml3b4t9vYXIy8e1llu-yp0J9WKZD1qVnaVSUBXlnLsLo5yKmqph7bhGHm_QysA2kywuZygQSwHfPP9qegB53UOi7kgJA4WtE-8Fs",
        "Content-Type": "application/json"
    }

    data = {
        "model": "image-01",
        "prompt": "A cute fox-cat sitting idle, fluffy orange fur with white belly, large sparkling eyes, fluffy tail wagging gently, Q-style cartoon, pastel colors, transparent background, looking cute and relaxed",
        "width": 200,
        "height": 200,
        "quality": "standard"
    }

    try:
        response = requests.post(url, json=data, headers=headers, timeout=30)

        if response.status_code == 200:
            result = response.json()
            if "base64_image" in result:
                # 保存测试帧
                import base64
                image_data = base64.b64decode(result["base64_image"])

                test_dir = Path("./sprites/test")
                test_dir.mkdir(parents=True, exist_ok=True)

                with open(test_dir / "test_frame.png", "wb") as f:
                    f.write(image_data)

                print("✅ 测试帧生成成功: sprites/test/test_frame.png")
                return True
            else:
                print(f"❌ API 响应格式错误: {result}")
                return False
        else:
            print(f"❌ API 请求失败: {response.status_code}")
            print(f"响应内容: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 生成测试帧失败: {e}")
        return False


def create_test_animation_manifest():
    """创建测试动画清单"""
    print("\n=== 创建测试动画清单 ===")

    manifest = {
        "version": "1.0.0",
        "totalFrames": 4,
        "states": {
            "idle": {
                "frameCount": 4,
                "duration": 250,
                "frames": [
                    {"path": "test/frame_001.png", "width": 180, "height": 180},
                    {"path": "test/frame_002.png", "width": 180, "height": 180},
                    {"path": "test/frame_003.png", "width": 180, "height": 180},
                    {"path": "test/frame_004.png", "width": 180, "height": 180}
                ]
            }
        }
    }

    # 保存清单
    with open("./sprites/test/animation_manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print("✅ 测试动画清单已创建: sprites/test/animation_manifest.json")
    return True


def create_placeholder_frames():
    """创建占位帧用于测试"""
    print("\n=== 创建占位帧用于测试 ===")

    try:
        from PIL import Image, ImageDraw

        # 创建占位帧目录
        frames_dir = Path("./sprites/test")
        frames_dir.mkdir(parents=True, exist_ok=True)

        # 为每个状态创建占位帧
        states = ["idle", "idle_long", "working", "thinking", "success", "error"]

        for state in states:
            state_dir = frames_dir / state
            state_dir.mkdir(exist_ok=True)

            # 为每个状态创建 4 帧占位图
            for i in range(1, 5):
                img = Image.new('RGBA', (180, 180), (0, 0, 0, 0))
                draw = ImageDraw.Draw(img)

                # 绘制简单形状表示状态
                if state == "idle":
                    # 坐着的圆形
                    draw.ellipse((30, 40, 150, 160), fill="#FF8C42", outline="#E67E22", width=2)
                    draw.ellipse((70, 60, 110, 80), fill="#FFFFFF")  # 眼白
                    draw.ellipse((75, 65, 85, 75), fill="#000000")  # 眼珠
                elif state == "working":
                    # 站着的方形
                    draw.rectangle((40, 50, 140, 150), fill="#FF8C42", outline="#E67E22", width=2)
                    draw.text((70, 90), "WORK", fill="#FFFFFF", font=None)
                elif state == "success":
                    # 星形
                    draw.polygon([(90, 30), (100, 60), (130, 60), (110, 80), (120, 110), (90, 95), (60, 110), (70, 80), (50, 60), (80, 60)], fill="#FFD700")
                elif state == "error":
                    # X形
                    draw.line((50, 50), (130, 130), fill="#FF0000", width=10)
                    draw.line((130, 50), (50, 130), fill="#FF0000", width=10)
                elif state == "thinking":
                    # 问号
                    draw.text((80, 70), "?", fill="#4169E1", font=None)
                else:  # idle_long
                    # Z形
                    draw.text((70, 80), "Z", fill="#808080", font=None)

                # 添加帧编号
                draw.text((10, 10), f"{i}", fill="#000000", font=None)

                # 保存帧
                img.save(state_dir / f"frame_{i:03d}.png")
                print(f"  创建 {state}/frame_{i:03d}.png")

        print("✅ 所有占位帧创建完成")
        return True

    except ImportError:
        print("❌ PIL 未安装，无法创建占位帧")
        return False


def main():
    print("=== 电子宠物动画测试 ===\n")

    # 1. 测试 API 连接
    if not test_api_connection():
        print("API 连接失败，跳过图片生成")

    # 2. 尝试生成测试帧
    if os.path.exists("./generate_minimax_images.py"):
        generate_test_frame()

    # 3. 创建占位帧（用于测试）
    create_placeholder_frames()

    # 4. 创建测试动画清单
    create_test_animation_manifest()

    print("\n=== 测试完成 ===")
    print("现在可以运行 electron 客户端测试动画效果")
    print("命令: npm start")

    print("\n测试步骤:")
    print("1. 确保 sprites/ 目录存在")
    print("2. 启动 electron 客户端")
    print("3. 检查控制台日志是否加载了精灵图")
    print("4. 切换不同状态看动画效果")


if __name__ == "__main__":
    main()