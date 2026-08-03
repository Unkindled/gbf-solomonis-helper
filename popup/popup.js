// popup — i18n applied on load (language follows the window's stored choice)
I18N && document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('popup-title').textContent = I18N.t('popup.title');
  document.getElementById('btn-open').textContent = I18N.t('popup.openWindow');
  document.getElementById('popup-hint').textContent = I18N.t('popup.hint');
});

document.getElementById('btn-open').addEventListener('click', () => {
  // == shared/protocol.js MSG_OPEN_WINDOW (plain script — cannot import)
  chrome.runtime.sendMessage({ channel: 'gbf-helper:open-window' });
  window.close();
});
