// ==UserScript==
// @name         Crunchyroll Utilities
// @namespace    http://tampermonkey.net/
// @version      6.0.5
// @description  Architecture modulaire sécurisée - Local-First & Cloud Sync.
// @author       Symswag
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
// @require      https://raw.githubusercontent.com/Symswag/crunchyroll-utilities/main/src/ui.js
// @require      https://raw.githubusercontent.com/Symswag/crunchyroll-utilities/main/src/skip.js
// ==/UserScript==

(function() {
    'use strict';

    // Raccourci vers notre espace global
    const CR = window.CRUtil;

    // Sécurité : on attend que les modules soient bien chargés par Tampermonkey
    if (!CR || !CR.UI || !CR.VideoPlayer || !CR.DataManager) {
        console.error("[CR Utilities] Erreur : Les modules externes ne se sont pas chargés correctement.");
        return;
    }

    // 1. On injecte le CSS immédiatement
    CR.UI.injectCSS();
    
    let lastEpisodeId = null;

    // 2. Clic extérieur pour fermer le menu
    window.addEventListener('pointerdown', (e) => {
        const m = document.getElementById('cr-skip-menu');
        const b = document.getElementById('cr-skip-btn');
        if (m?.style.display === 'block' && !m.contains(e.target) && !b?.contains(e.target)) {
            m.style.display = 'none';
        }
    }, true);

    // 3. Boucle de survie (vérifie la présence du lecteur chaque seconde)
    setInterval(() => {
        // On initialise le lecteur (détection de la balise <video>)
        CR.VideoPlayer.init();
        
        // Si on n'a pas encore de container pour injecter l'UI, on s'arrête là
        if (!CR.VideoPlayer.container) return;

        const currentEpId = CR.DataManager.getEpisodeId();
        
        // Changement d'épisode détecté
        if (currentEpId && currentEpId !== lastEpisodeId) {
            lastEpisodeId = currentEpId; 
            if(CR.UI.resetAutoFill) CR.UI.resetAutoFill();
            CR.UI.updateList(); 
            if(CR.UI.drawHighlights) CR.UI.drawHighlights();
        }

        // On s'assure que le menu et le bouton existent (sinon on les recrée)
        CR.UI.buildMenu();
        CR.UI.buildButton();
        
        // On rafraîchit les barres de skip
        if (CR.VideoPlayer.element && CR.UI.drawHighlights) CR.UI.drawHighlights();
        
    }, 1000);

})();