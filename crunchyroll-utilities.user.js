// ==UserScript==
// @name         Crunchyroll Utilities
// @namespace    http://tampermonkey.net/
// @version      6.0.0
// @description  Couteau suisse pour Crunchyroll : Architecture Modulaire.
// @author       Toi & Gemini
// @match        *://*.crunchyroll.com/watch/*
// @match        *://*.crunchyroll.com/*/watch/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      api.jsonbin.io
// @require      https://raw.githubusercontent.com/Symswag/crunchyroll-utilities/main/src/config.js
// @require      https://raw.githubusercontent.com/Symswag/crunchyroll-utilities/main/src/utils.js
// @require      https://raw.githubusercontent.com/Symswag/crunchyroll-utilities/main/src/data.js
// @require      https://raw.githubusercontent.com/Symswag/crunchyroll-utilities/main/src/skip.js
// @require      https://raw.githubusercontent.com/Symswag/crunchyroll-utilities/main/src/ui.js
// ==/UserScript==

(function() {
    'use strict';

    // Raccourci vers notre Espace Global
    const CR = window.CRUtil;

    // 1. Initialisation de l'interface
    CR.UI.injectCSS();
    let lastEpisodeId = null;

    // 2. Événement de fermeture du menu
    window.addEventListener('pointerdown', (e) => {
        const m = document.getElementById('cr-skip-menu');
        const b = document.getElementById('cr-skip-btn');
        if (m?.style.display === 'block' && !m.contains(e.target) && !b?.contains(e.target)) m.style.display = 'none';
    }, true);

    // 3. Boucle principale
    setInterval(() => {
        CR.VideoPlayer.init();
        if (!CR.VideoPlayer.container) return;

        const currentEpId = CR.DataManager.getEpisodeId();
        
        if (currentEpId && currentEpId !== lastEpisodeId) {
            lastEpisodeId = currentEpId; 
            CR.UI.resetAutoFill();
            CR.UI.updateList(); 
            CR.UI.drawHighlights();
        }

        CR.UI.buildMenu();
        CR.UI.buildButton();
        if (CR.VideoPlayer.element) CR.UI.drawHighlights();
        
    }, 1000);

})();