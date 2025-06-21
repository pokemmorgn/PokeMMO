// loaderOverlay.js

(function () {
  // Création du DOM loader une seule fois
  let overlay = null;

  function createOverlay(text) {
    overlay = document.createElement('div');
    overlay.id = 'global-loading-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(20,22,30,0.93)';
    overlay.style.zIndex = 99999;
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.flexDirection = 'column';
    overlay.style.transition = 'opacity 0.2s';

    // Spinner
    const spinner = document.createElement('div');
    spinner.style.width = '64px';
    spinner.style.height = '64px';
    spinner.style.border = '8px solid #444';
    spinner.style.borderTop = '8px solid #4299e1';
    spinner.style.borderRadius = '50%';
    spinner.style.animation = 'spin 1s linear infinite';
    spinner.style.marginBottom = '32px';

    // Message
    const msg = document.createElement('div');
    msg.innerText = text || 'Chargement...';
    msg.style.color = '#fff';
    msg.style.fontSize = '1.3em';
    msg.style.fontFamily = 'Arial, sans-serif';
    msg.style.textAlign = 'center';

    overlay.appendChild(spinner);
    overlay.appendChild(msg);

    // Animation CSS (spinner)
    if (!document.getElementById('loader-overlay-css')) {
      const style = document.createElement('style');
      style.id = 'loader-overlay-css';
      style.innerHTML = `
        @keyframes spin { 0% { transform: rotate(0deg);} 100% {transform: rotate(360deg);}}
      `;
      document.head.appendChild(style);
    }
    document.body.appendChild(overlay);
  }

  window.showLoadingOverlay = function (text) {
    if (!overlay) createOverlay(text);
    else overlay.style.display = 'flex';
    if (text && overlay) overlay.children[1].innerText = text;
  };

  window.hideLoadingOverlay = function () {
    if (overlay) overlay.style.display = 'none';
  };
})();
