// Terminal window renderer
let sessionId = null;
let terminalDiv = document.getElementById('terminal');
let input = document.getElementById('input');

// Listen for session ID from main process
window.electronAPI.onSetSessionId((id) => {
  sessionId = id;
  terminalDiv.textContent = `Session ${id} connected\n--- Claude output ---\n`;
});

// Listen for output
window.electronAPI.onTerminalOutput((id, data) => {
  if (id === sessionId) {
    terminalDiv.textContent += data;
    terminalDiv.scrollTop = terminalDiv.scrollHeight;
  }
});

// Handle input
input.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter' && sessionId) {
    const cmd = input.value + '\n';
    await window.electronAPI.terminalWrite(sessionId, cmd);
    input.value = '';
  }
});

// Focus input when clicking terminal
terminalDiv.addEventListener('click', () => {
  input.focus();
});
