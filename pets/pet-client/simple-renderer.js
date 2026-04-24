const electronAPI = window.electronAPI;

let currentStatus = 'idle';
let petSprite = document.getElementById('petSprite');
let message = document.getElementById('message');

// Update pet animation based on status
function updatePetStatus(status) {
  currentStatus = status.toLowerCase();

  // Remove all animation classes
  petSprite.classList.remove('happy', 'working');

  // Update appearance based on status
  switch(currentStatus) {
    case 'idle':
      petSprite.style.background = '#FF8C42';
      petSprite.style.transform = 'scale(1)';
      break;
    case 'idle_long':
      petSprite.style.background = '#FFB088';
      petSprite.style.animation = 'breathe 3s ease-in-out infinite';
      break;
    case 'working':
      petSprite.classList.add('working');
      petSprite.style.background = '#FFA500';
      break;
    case 'thinking':
      petSprite.style.background = '#FF6B35';
      petSprite.style.transform = 'rotate(5deg)';
      break;
    case 'success':
      petSprite.classList.add('happy');
      petSprite.style.background = '#FFD700';
      break;
    case 'error':
      petSprite.style.background = '#CD5C5C';
      petSprite.style.transform = 'scale(0.95)';
      break;
    default:
      petSprite.style.background = '#FF8C42';
  }
}

// Get initial status
const initialStatus = electronAPI.getStatus();
updatePetStatus(initialStatus);

// Listen for status changes (simulated)
setInterval(() => {
  const statuses = ['idle', 'working', 'thinking', 'success', 'error', 'idle_long'];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  updatePetStatus(randomStatus);

  // Show message
  const messages = {
    idle: '...',
    working: 'Working hard!',
    thinking: 'Hmm...',
    success: 'Yay! 🎉',
    error: 'Oops!',
    idle_long: 'Zzz...'
  };

  message.textContent = messages[randomStatus];
  message.classList.add('show');

  setTimeout(() => {
    message.classList.remove('show');
  }, 2000);
}, 5000);

// Pet click handler
document.getElementById('pet').addEventListener('click', () => {
  const config = electronAPI.getConfig();
  message.textContent = `I'm ${config.name}!`;
  message.classList.add('show');

  setTimeout(() => {
    message.classList.remove('show');
  }, 2000);
});

// Right-click context menu
document.getElementById('pet').addEventListener('contextmenu', (e) => {
  e.preventDefault();

  const menu = document.createElement('div');
  menu.style.position = 'fixed';
  menu.style.background = 'white';
  menu.style.border = '1px solid #ccc';
  menu.style.padding = '5px';
  menu.style.zIndex = '1000';
  menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';

  const items = ['Show', 'Hide', 'Exit'];
  items.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.textContent = item;
    menuItem.style.padding = '5px 10px';
    menuItem.style.cursor = 'pointer';
    menuItem.addEventListener('click', () => {
      if (item === 'Exit') {
        window.electronAPI.exit();
      } else {
        message.textContent = `${item}ing...`;
        message.classList.add('show');
      }
      menu.remove();
    });
    menu.appendChild(menuItem);
  });

  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';
  document.body.appendChild(menu);

  // Remove menu when clicking outside
  setTimeout(() => {
    document.addEventListener('click', function removeMenu() {
      menu.remove();
      document.removeEventListener('click', removeMenu);
    });
  }, 0);
});