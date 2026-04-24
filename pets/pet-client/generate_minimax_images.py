#!/usr/bin/env python3
"""
Minimax Image-01 API 电子宠物动画帧图片生成脚本
用于生成电子宠物6个状态的动画帧图片

作者: Claude Code Pet Team
创建日期: 2026-04-14
"""

import os
import requests
import json
import time
import logging
from datetime import datetime
from typing import List, Dict, Any
import argparse

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('image_generation.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class MinimaxImageGenerator:
    """Minimax Image-01 API 图片生成器"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.minimax.chat/v1/image_generation"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

    def generate_image(self, prompt: str, width: int = 200, height: int = 200) -> Dict[str, Any]:
        """
        使用 Minimax Image-01 API 生成图片

        Args:
            prompt: 图片生成提示词
            width: 图片宽度
            height: 图片高度

        Returns:
            API 响应数据
        """
        payload = {
            "prompt": prompt,
            "model": "image-01",
            "width": width,
            "height": height
        }

        try:
            response = requests.post(self.base_url, headers=self.headers, json=payload)
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"API 请求失败: {e}")
            return {"error": str(e)}

    def save_image(self, response_data: Dict[str, Any], filepath: str) -> bool:
        """
        保存图片到文件

        Args:
            response_data: API 响应数据
            filepath: 保存路径

        Returns:
            是否保存成功
        """
        if "error" in response_data:
            logger.error(f"图片生成失败: {response_data['error']}")
            return False

        try:
            # 获取图片 URL
            if "base64_image" in response_data:
                import base64
                # 解码 base64 图片
                image_data = base64.b64decode(response_data["base64_image"])

                # 确保目录存在
                os.makedirs(os.path.dirname(filepath), exist_ok=True)

                # 保存图片
                with open(filepath, "wb") as f:
                    f.write(image_data)

                logger.info(f"图片保存成功: {filepath}")
                return True

            elif "image_url" in response_data:
                # 如果返回的是 URL，下载图片
                import base64
                import io

                image_response = requests.get(response_data["image_url"])
                if image_response.status_code == 200:
                    # 确保目录存在
                    os.makedirs(os.path.dirname(filepath), exist_ok=True)

                    # 保存图片
                    with open(filepath, "wb") as f:
                        f.write(image_response.content)

                    logger.info(f"图片下载保存成功: {filepath}")
                    return True

            else:
                logger.error(f"API 响应格式不正确: {response_data}")
                return False

        except Exception as e:
            logger.error(f"保存图片失败: {e}")
            return False

    def generate_state_frames(self, state_name: str, prompt_template: str, frame_count: int) -> List[str]:
        """
        生成指定状态的所有动画帧

        Args:
            state_name: 状态名称
            prompt_template: 提示词模板
            frame_count: 帧数

        Returns:
            生成的文件路径列表
        """
        generated_files = []

        for frame_idx in range(frame_count):
            # 为每帧创建略有变化的提示词
            if state_name == "Working":
                # 工作状态：添加不同的工作动作描述
                action_variations = [
                    "typing with paws",
                    "pressing keys gently",
                    "focusing intensely",
                    "working diligently"
                ]
                action = action_variations[frame_idx % len(action_variations)]
                prompt = prompt_template.replace("typing with paws", action)

            elif state_name == "Thinking":
                # 思考状态：添加不同的思考表情
                thinking_variations = [
                    "curious expression",
                    "puzzled look",
                    "deep thought",
                    "wondering"
                ]
                thinking = thinking_variations[frame_idx % len(thinking_variations)]
                prompt = prompt_template.replace("curious expression", thinking)

            elif state_name == "Success":
                # 成功状态：添加不同的庆祝动作
                success_variations = [
                    "jumping with joy",
                    "celebrating happily",
                    "dancing excitedly",
                    "cheering with glee"
                ]
                success = success_variations[frame_idx % len(success_variations)]
                prompt = prompt_template.replace("jumping with joy", success)

            else:
                # 其他状态使用基础提示词
                prompt = prompt_template

            # 添加帧编号信息
            frame_info = f"Frame {frame_idx + 1}/{frame_count}"
            prompt += f", {frame_info}"

            # 生成文件名
            filename = f"state_{state_name}_frame_{frame_idx + 1:02d}.png"
            filepath = os.path.join("sprites", filename)

            # 生成图片
            logger.info(f"生成 {state_name} 状态第 {frame_idx + 1} 帧...")

            # 重试机制
            max_retries = 3
            for attempt in range(max_retries):
                response = self.generate_image(prompt)

                if "error" not in response:
                    if self.save_image(response, filepath):
                        generated_files.append(filepath)
                        break
                else:
                    logger.warning(f"第 {attempt + 1} 次尝试失败: {response.get('error')}")
                    if attempt < max_retries - 1:
                        time.sleep(2)  # 等待2秒后重试
                    else:
                        logger.error(f"生成 {filename} 失败，已达到最大重试次数")

            # 生成间隔，避免API限制
            if frame_idx < frame_count - 1:
                time.sleep(1)

        return generated_files

def main():
    """主函数"""
    # API Key (实际使用中建议从环境变量或配置文件中读取)
    API_KEY = "sk-cp-Q0OT0DXTp2na1JIBuEzml3b4t9vYXIy8e1llu-yp0J9WKZD1qVnaVSUBXlnLsLo5yKmqph7bhGHm_QysA2kywuZygQSwHfPP9qegB53UOi7kgJA4WtE-8Fs"

    # 创建生成器实例
    generator = MinimaxImageGenerator(API_KEY)

    # 定义6个状态的配置
    states_config = {
        "Idle": {
            "prompt": "A cute fox-cat sitting idle, fluffy orange fur with white belly, large sparkling eyes, fluffy tail wagging gently, Q-style cartoon, pastel colors, transparent background, looking cute and relaxed",
            "frame_count": 4
        },
        "Idle_Long": {
            "prompt": "A sleepy fox-cat with Z bubbles above head, sitting position head drooping, drowsy expression, Q-style cartoon, soft orange and white colors, transparent background",
            "frame_count": 4
        },
        "Working": {
            "prompt": "A focused fox-cat typing with paws on invisible keyboard, intense concentration, small glowing effects around paws, Q-style cartoon, determined expression, transparent background",
            "frame_count": 5
        },
        "Thinking": {
            "prompt": "A curious fox-cat thinking with paw on chin, question bubble above head, head tilted, big curious eyes, Q-style cartoon, soft lighting, transparent background",
            "frame_count": 5
        },
        "Success": {
            "prompt": "A happy fox-cat jumping with joy, surrounded by sparkling stars, big smile, celebrating pose, bright expressions, Q-style cartoon, warm glow effects, transparent background",
            "frame_count": 6
        },
        "Error": {
            "prompt": "A sad fox-cat with tears, looking down drooping ears, tear drops, disappointed expression, Q-style cartoon, dim lighting, transparent background",
            "frame_count": 4
        }
    }

    # 记录开始时间
    start_time = datetime.now()
    logger.info("=" * 50)
    logger.info("开始生成电子宠物动画帧图片")
    logger.info(f"开始时间: {start_time}")
    logger.info("=" * 50)

    # 创建 sprites 目录
    os.makedirs("sprites", exist_ok=True)
    logger.info("创建 sprites 目录")

    # 生成所有状态的图片
    all_generated_files = []

    for state_name, config in states_config.items():
        logger.info(f"\n开始生成 {state_name} 状态图片...")
        logger.info(f"提示词: {config['prompt']}")
        logger.info(f"帧数: {config['frame_count']}")

        # 生成该状态的所有帧
        generated_files = generator.generate_state_frames(
            state_name=state_name,
            prompt_template=config["prompt"],
            frame_count=config["frame_count"]
        )

        all_generated_files.extend(generated_files)

        logger.info(f"{state_name} 状态完成，生成 {len(generated_files)} 帧")

    # 记录完成时间
    end_time = datetime.now()
    duration = end_time - start_time

    # 生成总结报告
    logger.info("\n" + "=" * 50)
    logger.info("图片生成完成总结")
    logger.info(f"总耗时: {duration}")
    logger.info(f"生成状态数: {len(states_config)}")
    logger.info(f"生成图片总数: {len(all_generated_files)}")
    logger.info(f"成功生成数: {len(all_generated_files)}")

    if all_generated_files:
        logger.info("\n生成的文件列表:")
        for file_path in all_generated_files:
            file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
            logger.info(f"  - {file_path} ({file_size} bytes)")

    logger.info("=" * 50)

    # 返回结果
    return {
        "success": True,
        "total_files": len(all_generated_files),
        "files": all_generated_files,
        "duration": str(duration),
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat()
    }

if __name__ == "__main__":
    # 解析命令行参数
    parser = argparse.ArgumentParser(description="生成电子宠物动画帧图片")
    parser.add_argument("--api-key", help="Minimax API Key")
    parser.add_argument("--output-dir", default="sprites", help="输出目录")
    args = parser.parse_args()

    # 执行主函数
    result = main()

    # 输出结果
    if result["success"]:
        print(f"\n✅ 图片生成完成!")
        print(f"📁 生成目录: sprites/")
        print(f"📄 生成文件数: {result['total_files']}")
        print(f"⏱️  总耗时: {result['duration']}")

        if result['files']:
            print(f"\n📋 生成的文件:")
            for file_path in result['files'][:5]:  # 只显示前5个文件
                print(f"   - {file_path}")
            if len(result['files']) > 5:
                print(f"   ... 还有 {len(result['files']) - 5} 个文件")
    else:
        print(f"\n❌ 图片生成失败!")
        print(f"错误信息: {result.get('error', '未知错误')}")