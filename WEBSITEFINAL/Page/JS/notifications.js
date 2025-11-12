// Lightweight page notification helper
window.pushNotification = function (message, type = 'info', duration = 3000) {
  try {
    const container = document.getElementById('notificationContainer');
    if (!container) {
      // fallback: alert
      console.info('Notification:', message);
      return;
    }

    const node = document.createElement('div');
    node.className = `notification ${type}`;
    node.textContent = message;
    container.appendChild(node);

    // animate in
    requestAnimationFrame(() => node.classList.add('show'));

    // show indicator dot on the bell
    try {
      const dot = document.querySelector('.notify-indicator .dot');
      if (dot) dot.style.display = 'block';
    } catch (e) {}

    // remove after duration
    setTimeout(() => {
      node.classList.remove('show');
      setTimeout(() => {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 300);
    }, duration);
  } catch (e) {
    console.error('pushNotification failed', e);
  }
};

// Optional helper for the UI bell: toggle a simple message if none exist
window.notifyToggle = function () {
  const container = document.getElementById('notificationContainer');
  if (!container) return;
  if (container.children.length === 0) {
    window.pushNotification('No new notifications', 'info', 1800);
  } else {
    // briefly highlight the most recent notification
    const last = container.children[container.children.length - 1];
    last.classList.add('show');
    setTimeout(() => last.classList.remove('show'), 1200);
    // clicking the bell clears the visual indicator
    try { const dot = document.querySelector('.notify-indicator .dot'); if (dot) dot.style.display = 'none'; } catch(e){}
  }
};
