<template>
  <div class="terminal-container">
    <div class="session-info">
      <span>Session: <span class="pid">{{ sessionId || 'Connecting...' }}</span></span>
      <span>Status: <span class="status" :class="{ exited: status === 'exited' || status === 'killed' }">{{ status }}</span></span>
      <span v-if="pid">PID: {{ pid }}</span>
    </div>
    <div ref="terminalRef" class="terminal-output"></div>
    <div class="terminal-input-line">
      <span class="prompt">$</span>
      <input
        ref="inputRef"
        class="terminal-input"
        v-model="input"
        @keydown.enter="sendCommand"
        placeholder="Type a command..."
        autofocus
      >
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

export default {
  name: 'App',
  setup() {
    const terminalRef = ref(null);
    const inputRef = ref(null);
    const sessionId = ref(null);
    const status = ref('connecting');
    const pid = ref(null);
    const input = ref('');

    let term = null;
    let fitAddon = null;
    let ws = null;

    const FRAME_PTY = 0x00;
    const FRAME_JSON = 0x01;

    function frame(type, data) {
      if (typeof data === 'string') {
        data = new TextEncoder().encode(data);
      }
      const header = new Uint8Array([type]);
      const body = new Uint8Array(data);
      const result = new Uint8Array(header.length + body.length);
      result.set(header, 0);
      result.set(body, header.length);
      return result;
    }

    function connect() {
      // Get session ID from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const urlSessionId = urlParams.get('session');

      const wsUrl = `ws://localhost:3456`;
      ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        console.log('Connected to terminal server');
        status.value = 'connecting';

        if (urlSessionId) {
          // Attach to existing session
          ws.send(frame(FRAME_JSON, JSON.stringify({ type: 'init', sessionId: urlSessionId })));
        } else {
          // Create new session in current directory
          ws.send(frame(FRAME_JSON, JSON.stringify({ type: 'create' })));
        }
      };

      ws.onmessage = (event) => {
        const buffer = new Uint8Array(event.data);
        const frameType = buffer[0];
        const data = buffer.slice(1);

        if (frameType === FRAME_PTY) {
          // PTY output
          const text = new TextDecoder().decode(data);
          if (term) {
            term.write(text);
          }
        } else if (frameType === FRAME_JSON) {
          const msg = JSON.parse(new TextDecoder().decode(data));
          handleMessage(msg);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from terminal server');
        status.value = 'disconnected';
        setTimeout(connect, 2000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };
    }

    function handleMessage(data) {
      switch (data.type) {
        case 'ready':
          sessionId.value = data.sessionId;
          status.value = 'running';
          pid.value = data.pid;
          // Wait for PTY output then fit
          setTimeout(() => fitAddon && fitAddon.fit(), 100);
          break;

        case 'exit':
          status.value = 'exited';
          if (term) {
            term.write(`\r\n[Process exited with code ${data.code}]\r\n`);
          }
          break;

        case 'error':
          status.value = 'error';
          if (term) {
            term.write(`\r\n[Error: ${data.message}]\r\n`);
          }
          break;
      }
    }

    function sendCommand() {
      if (!ws || ws.readyState !== WebSocket.OPEN || !input.value.trim()) return;

      const cmd = input.value + '\n';
      ws.send(frame(FRAME_PTY, cmd));
      input.value = '';
    }

    function handleResize() {
      if (fitAddon && term) {
        fitAddon.fit();
        if (ws && ws.readyState === WebSocket.OPEN && sessionId.value) {
          ws.send(frame(FRAME_JSON, JSON.stringify({
            type: 'resize',
            sessionId: sessionId.value,
            cols: term.cols,
            rows: term.rows
          })));
        }
      }
    }

    onMounted(() => {
      // Use nextTick + setTimeout to delay initialization, ensuring DOM is rendered
      nextTick(() => {
        setTimeout(() => {
          initTerminal();
        }, 50);
      });
    });

    function initTerminal() {
      if (!terminalRef.value) {
        console.warn('Terminal container not ready');
        return;
      }

      term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Consolas, Monaco, "Microsoft YaHei", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4'
        },
        unicode: '11',
        allowProposedApi: true
      });

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      const unicodeAddon = new Unicode11Addon();
      term.loadAddon(unicodeAddon);

      try {
        const webglAddon = new WebglAddon();
        term.loadAddon(webglAddon);
      } catch (e) {
        console.warn('WebGL addon failed, falling back to canvas:', e);
      }

      term.open(terminalRef.value);

      // Multiple fit calls to ensure it takes effect
      fitAddon.fit();
      // Call again after container renders to get correct dimensions
      setTimeout(() => fitAddon.fit(), 100);
      setTimeout(() => fitAddon.fit(), 300);

      term.onData((data) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(frame(FRAME_PTY, data));
        }
      });

      window.addEventListener('resize', handleResize);

      connect();

      if (inputRef.value) {
        inputRef.value.focus();
      }
    }

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
      if (ws) {
        ws.close();
      }
      if (term) {
        term.dispose();
      }
    });

    return {
      terminalRef,
      inputRef,
      sessionId,
      status,
      pid,
      input,
      sendCommand
    };
  }
};
</script>

<style>
.terminal-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.session-info {
  padding: 8px 12px;
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
  font-size: 12px;
  color: #888;
}
.session-info span {
  margin-right: 16px;
}
.session-info .pid {
  color: #569cd6;
}
.session-info .status {
  color: #4ec9b0;
}
.session-info .status.exited {
  color: #f14c4c;
}
.terminal-output {
  flex: 1;
  padding: 12px;
  overflow: hidden;
}
.terminal-input-line {
  display: flex;
  padding: 8px 12px;
  background: #2d2d2d;
  align-items: center;
}
.prompt {
  color: #569cd6;
  margin-right: 8px;
  font-weight: bold;
}
.terminal-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  outline: none;
}
</style>
