document.getElementById('btn-open').addEventListener('click', () => {
  chrome.runtime.sendMessage({ channel: 'gbf-helper:open-window' });
  window.close();
});
