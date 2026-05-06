#!/usr/bin/env bash
# Claude Code hooks script for desktop pet task tracking
# Receives hook event JSON on stdin, updates task-events.json

set -euo pipefail

EVENTS_FILE="f:/codes/claw-pet/pets/pet-desktop/task-events.json"

# Read stdin (hook input JSON)
INPUT=$(cat)

# Extract fields using jq
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
CWD=$(echo "$INPUT" | jq -r '.cwd // ""')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Initialize events file if missing
if [ ! -f "$EVENTS_FILE" ]; then
  echo '{"tasks":[]}' > "$EVENTS_FILE"
fi

# Determine event type: if tool_name exists, it's PreToolUse; otherwise Stop
if [ -n "$TOOL_NAME" ] && [ "$TOOL_NAME" != "null" ]; then
  # PreToolUse - update or create task
  # Build tool summary
  SUMMARY=""
  case "$TOOL_NAME" in
    Bash)
      CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""' | head -c 60)
      SUMMARY="Bash: $CMD"
      ;;
    Edit|Write)
      FP=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
      SUMMARY="$TOOL_NAME: $FP"
      ;;
    Read)
      FP=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
      SUMMARY="Read: $FP"
      ;;
    Agent)
      DESC=$(echo "$INPUT" | jq -r '.tool_input.description // ""' | head -c 50)
      SUMMARY="Agent: $DESC"
      ;;
    *)
      SUMMARY="$TOOL_NAME"
      ;;
  esac

  # Update using jq: upsert task by session_id
  jq --arg sid "$SESSION_ID" \
     --arg cwd "$CWD" \
     --arg ts "$TIMESTAMP" \
     --arg tool "$TOOL_NAME" \
     --arg summary "$SUMMARY" \
     '
     # Remove completed tasks older than 30 seconds
     .tasks |= map(select(
       if .status == "completed" and .completedAt then
         ((now - (.completedAt | sub("\\.[0-9]+Z$"; "Z") | strptime("%Y-%m-%dT%H:%M:%SZ") | mktime)) < 30)
       else true end
     )) |
     # Upsert task
     .tasks |= (
       if any(.id == $sid) then
         map(if .id == $sid then
           .status = "working"
           | .lastActivity = $ts
           | .toolCount = (.toolCount + 1)
           | .lastTool = $tool
           | .lastToolSummary = $summary
           | .completedAt = null
         else . end)
       else
         . + [{
           id: $sid,
           cwd: $cwd,
           status: "working",
           startedAt: $ts,
           lastActivity: $ts,
           toolCount: 1,
           lastTool: $tool,
           lastToolSummary: $summary,
           completedAt: null
         }]
       end
     ) |
     # Keep max 10 tasks
     .tasks |= (sort_by(if .status == "working" then 0 else 1 end, -.lastActivity) | .[0:10])
     ' "$EVENTS_FILE" > "${EVENTS_FILE}.tmp" && mv "${EVENTS_FILE}.tmp" "$EVENTS_FILE"

else
  # Stop event - mark task as completed
  jq --arg sid "$SESSION_ID" \
     --arg ts "$TIMESTAMP" \
     '
     .tasks |= map(
       if .id == $sid then
         .status = "completed"
         | .completedAt = $ts
         | .lastActivity = $ts
       else . end
     )
     ' "$EVENTS_FILE" > "${EVENTS_FILE}.tmp" && mv "${EVENTS_FILE}.tmp" "$EVENTS_FILE"
fi
