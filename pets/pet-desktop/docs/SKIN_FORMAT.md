# Skin Format Specification

This document explains how to create custom skins for the Desktop Pet application.

## Overview

The Desktop Pet supports customizable skins that can change the pet's appearance and animation timing. Skins are stored in the `assets/skins/` directory.

## Global Configuration

Skins can be configured globally without modifying the application package.

### Configuration File

Global config location: `C:\Users\<用户名>\.claw-pet\skin-config.json`

```json
{
  "skin": "my-custom-skin"
}
```

### Global Skins Directory

Custom skins can be placed in: `C:\Users\<用户名>\.claw-pet\skins\{skin-name}\`

### Priority Order

1. CLI argument `--skin` (highest priority)
2. Global config `~/.claw-pet/skin-config.json`
3. Built-in default skin (lowest priority)

### Example: Setting a Global Skin

1. Create skin config file:
```bash
echo {"skin":"my-cat"} > %USERPROFILE%\.claw-pet\skin-config.json
```

2. Place your skin at:
```
C:\Users\<用户名>\.claw-pet\skins\my-cat\
├── manifest.json
└── idle/frame_001.svg ...
```

3. Run the app - it will automatically use your skin

### Switching Skins at Runtime

You can also switch skins using command line:
```bash
DesktopPet.exe --skin my-custom-skin
```

## Directory Structure

### Built-in Skins

```
DesktopPet/
└── assets/
    └── skins/
        └── {skin-name}/
            ├── manifest.json
            └── {state}/
                ├── frame_001.svg
                ├── frame_002.svg
                └── ...
```

### Global (Custom) Skins

Users can install custom skins globally without modifying the app:

```
~/.claw-pet/
├── skin-config.json    # {"skin": "my-skin"}
└── skins/
    └── my-skin/
        ├── manifest.json
        └── {state}/
            ├── frame_001.svg
            └── ...
```

## Manifest Format

The `manifest.json` file defines the skin's metadata and animation configuration:

```json
{
  "name": "skin-name",
  "displayName": "显示名称",
  "states": {
    "idle": { "fps": 8, "frames": 12, "loop": true },
    "idle_long": { "fps": 4, "frames": 8, "loop": true },
    "working": { "fps": 10, "frames": 10, "loop": true },
    "thinking": { "fps": 6, "frames": 9, "loop": true },
    "success": { "fps": 8, "frames": 8, "loop": false },
    "error": { "fps": 8, "frames": 10, "loop": false }
  }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Internal skin identifier (should match directory name) |
| `displayName` | string | Display name shown in logs |
| `states` | object | Animation configuration for each state |

### State Configuration

Each state object supports the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fps` | number | Yes | Frames per second for the animation |
| `frames` | number | Yes | Total number of frames in the animation |
| `loop` | boolean | Yes | Whether the animation loops continuously |

### States

| State | Description | Default FPS | Default Frames | Loop |
|-------|-------------|------------|----------------|------|
| `idle` | Default idle animation | 8 | 12 | true |
| `idle_long` | Long idle animation (shown after ~20s of inactivity) | 4 | 8 | true |
| `working` | Active task working state | 10 | 10 | true |
| `thinking` | Heavy workload thinking state | 6 | 9 | true |
| `success` | Task completed success animation | 8 | 8 | false |
| `error` | Error or interrupted state animation | 8 | 10 | false |

## Frame Naming Convention

Frames must be named following the pattern: `frame_XXX.svg` where `XXX` is a 3-digit zero-padded number starting from 001.

Example: `frame_001.svg`, `frame_002.svg`, ..., `frame_012.svg`

## Sprite Requirements

- Format: SVG (Scalable Vector Graphics)
- Recommended size: 200x200 pixels
- Background: Should be transparent (not white or any color)
- The pet should be centered in the frame

## Example: Creating a Custom Skin

### Step 1: Create the skin directory

```
DesktopPet/assets/skins/my-custom-skin/
```

### Step 2: Create the manifest.json

```json
{
  "name": "my-custom-skin",
  "displayName": "My Custom Skin",
  "states": {
    "idle": { "fps": 8, "frames": 12, "loop": true },
    "idle_long": { "fps": 4, "frames": 8, "loop": true },
    "working": { "fps": 10, "frames": 10, "loop": true },
    "thinking": { "fps": 6, "frames": 9, "loop": true },
    "success": { "fps": 8, "frames": 8, "loop": false },
    "error": { "fps": 8, "frames": 10, "loop": false }
  }
}
```

### Step 3: Create state directories and add sprites

```
DesktopPet/assets/skins/my-custom-skin/
├── manifest.json
├── idle/
│   ├── frame_001.svg
│   ├── frame_002.svg
│   └── ... (12 frames total)
├── idle_long/
│   ├── frame_001.svg
│   └── ... (8 frames total)
├── working/
│   └── ... (10 frames total)
├── thinking/
│   └── ... (9 frames total)
├── success/
│   └── ... (8 frames total)
└── error/
    └── ... (10 frames total)
```

## Loading a Custom Skin

### Priority Order

Skin loading follows this priority (highest to lowest):

1. **CLI argument** `--skin`: `./DesktopPet --skin my-custom-skin`
2. **Global config** `~/.claw-pet/skin-config.json`: `{"skin": "my-custom-skin"}`
3. **Built-in default skin** (lowest priority)

### Command Line

Use the `--skin` argument when starting the application:

```bash
./DesktopPet --skin my-custom-skin
```

### Global Configuration File

Create `~/.claw-pet/skin-config.json` to set a skin without modifying the app:

```json
{
  "skin": "my-custom-skin"
}
```

### Configuration File (pets.config)

If your application supports configuration files, you can set:

```json
{
  "pets": {
    "skin": "my-custom-skin"
  }
}
```

## Fallback Behavior

If a skin or specific state is missing:

1. The application will fall back to the `default` skin
2. Missing states within a valid skin will use default animation parameters
3. If sprite files fail to load, the previous valid frame will be kept

## Default Skin

The `default` skin uses the built-in sprites located at:

```
DesktopPet/assets/sprites/
```

This skin cannot be removed and always works as the final fallback.

## Testing Your Skin

1. Place your skin in `assets/skins/{your-skin-name}/`
2. Run the application with `--skin {your-skin-name}`
3. Check the console output for skin loading confirmation
4. Verify all animations play correctly

## Troubleshooting

### Skin not loading

- Check that `manifest.json` exists and is valid JSON
- Verify the skin directory name matches what you pass to `--skin`
- Check the console for error messages

### Missing animations

- Ensure all required states have sprite frames
- Verify frame count matches the `frames` value in manifest
- Check that sprite files are named correctly (`frame_001.svg`, etc.)

### Animation timing issues

- Adjust `fps` value in the manifest
- Higher fps = faster animation
- Ensure `loop` is set correctly for non-repeating animations