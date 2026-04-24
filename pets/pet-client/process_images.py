#!/usr/bin/env python3
"""
图片压缩与序列帧处理工具
用于处理 Minimax API 生成的动画帧图片
"""

import os
import json
import shutil
from pathlib import Path
from PIL import Image
import imagehash


def ensure_directory(path):
    """确保目录存在"""
    Path(path).mkdir(parents=True, exist_ok=True)


def compress_image(input_path, output_path, quality=85, max_size=(180, 180)):
    """
    压缩图片并调整尺寸
    :param input_path: 输入图片路径
    :param output_path: 输出图片路径
    :param quality: JPEG 质量 (1-100)
    :param max_size: 最大尺寸 (width, height)
    """
    try:
        with Image.open(input_path) as img:
            # 转换为 RGBA 模式以保持透明度
            if img.mode != 'RGBA':
                img = img.convert('RGBA')

            # 调整尺寸
            img.thumbnail(max_size, Image.Resampling.LANCZOS)

            # 保存压缩后的图片
            img.save(output_path, optimize=True, quality=quality)
            print(f"压缩完成: {input_path} -> {output_path}")
            return True
    except Exception as e:
        print(f"压缩图片失败: {e}")
        return False


def check_duplicate_images(sprites_dir):
    """检查并删除重复的图片"""
    duplicates = []
    image_files = list(Path(sprites_dir).glob("*.png"))

    # 使用感知哈希检测相似图片
    hash_dict = {}

    for img_file in image_files:
        try:
            with Image.open(img_file) as img:
                hash = imagehash.average_hash(img, hash_size=8)

                if hash in hash_dict:
                    # 发现重复图片
                    duplicates.append((img_file, hash_dict[hash]))
                    print(f"发现重复图片: {img_file} 与 {hash_dict[hash]}")
                else:
                    hash_dict[hash] = img_file
        except Exception as e:
            print(f"处理图片 {img_file} 时出错: {e}")

    # 删除重复图片
    for dup_file, orig_file in duplicates:
        dup_file.unlink()
        print(f"删除重复图片: {dup_file}")

    return len(duplicates)


def create_animation_manifest(sprites_dir):
    """创建动画清单文件"""
    manifest = {
        "version": "1.0.0",
        "totalFrames": 0,
        "states": {}
    }

    # 遍历每个状态的图片
    for state_dir in Path(sprites_dir).iterdir():
        if state_dir.is_dir():
            state_name = state_dir.name
            frame_files = sorted(list(state_dir.glob("frame_*.png")))

            state_info = {
                "frameCount": len(frame_files),
                "frames": [],
                "duration": 1000  # 默认每帧 1000ms (1秒)
            }

            # 添加帧信息
            for frame_file in frame_files:
                relative_path = frame_file.relative_to(sprites_dir)
                frame_info = {
                    "path": str(relative_path),
                    "width": 180,
                    "height": 180
                }
                state_info["frames"].append(frame_info)

            manifest["states"][state_name] = state_info
            manifest["totalFrames"] += len(frame_files)

    # 保存清单
    manifest_path = Path(sprites_dir) / "animation_manifest.json"
    with manifest_path.open('w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"动画清单已保存: {manifest_path}")
    return manifest


def optimize_sprites():
    """优化精灵图集（可选功能）"""
    sprites_dir = Path("./sprites")
    if not sprites_dir.exists():
        print("sprites 目录不存在")
        return

    print("开始优化精灵图集...")

    # 创建优化的输出目录
    optimized_dir = Path("./sprites_optimized")
    ensure_directory(optimized_dir)

    # 将所有图片合并成图集（如果需要）
    # 这里可以添加图集打包逻辑

    print(f"精灵图集优化完成，输出目录: {optimized_dir}")


def main():
    sprites_dir = "./sprites"

    print("=== 图片压缩与序列帧处理工具 ===\n")

    # 1. 检查输入目录
    if not Path(sprites_dir).exists():
        print("错误: sprites 目录不存在，请先生成图片")
        return

    # 2. 创建压缩后的目录
    compressed_dir = "./sprites_compressed"
    ensure_directory(compressed_dir)

    # 3. 处理每个状态
    states = ["idle", "idle_long", "working", "thinking", "success", "error"]

    for state in states:
        state_dir = Path(sprites_dir) / state
        if not state_dir.exists():
            print(f"警告: {state} 目录不存在")
            continue

        compressed_state_dir = Path(compressed_dir) / state
        ensure_directory(compressed_state_dir)

        # 处理该状态的所有帧
        frame_files = sorted(list(state_dir.glob("frame_*.png")))

        if not frame_files:
            print(f"警告: {state} 目录中没有帧图片")
            continue

        print(f"\n处理状态: {state} ({len(frame_files)} 帧)")

        for i, frame_file in enumerate(frame_files, 1):
            # 输出文件名：frame_001.png, frame_002.png, etc.
            output_filename = f"frame_{i:03d}.png"
            output_path = compressed_state_dir / output_filename

            # 压缩图片
            if compress_image(frame_file, output_path):
                print(f"  ✓ 帧 {i}/{len(frame_files)} 处理完成")
            else:
                print(f"  ✗ 帧 {i} 处理失败")

        # 复制处理后的文件回原目录（覆盖）
        for frame_file in compressed_state_dir.glob("frame_*.png"):
            shutil.copy2(frame_file, state_dir)

        print(f"✓ {state} 状态处理完成")

    # 4. 检查并删除重复图片
    print("\n检查重复图片...")
    removed_count = check_duplicate_images(sprites_dir)
    if removed_count > 0:
        print(f"删除了 {removed_count} 张重复图片")

    # 5. 创建动画清单
    print("\n创建动画清单...")
    manifest = create_animation_manifest(sprites_dir)

    print(f"\n✓ 处理完成！总共生成 {manifest['totalFrames']} 帧动画")
    print(f"✓ 动画清单: sprites/animation_manifest.json")


if __name__ == "__main__":
    main()