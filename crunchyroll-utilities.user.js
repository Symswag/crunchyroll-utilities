// ==UserScript==
// @name         Crunchyroll Utilities
// @namespace    http://tampermonkey.net/
// @version      6.17.2
// @description  Couteau suisse Crunchyroll : Ajout du raccourci intelligent (Intro ou Outro selon le temps).
// @author       Symswag
// @match        *://*.crunchyroll.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=crunchyroll.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      api.jsonbin.io
// ==/UserScript==

(function() {
    'use strict';

    // =====================================================================
    // 🌍 SYSTÈME DE TRADUCTION (i18n)
    // =====================================================================
    const i18n = {
        fr: {
            configTitle: "⚙️ Paramètres Avancés",
            configDesc: "Entrez vos identifiants JSONBin.io pour synchroniser vos skips entre vos appareils.",
            saveKeys: "Sauvegarder & Retour",
            autoSkip: "Skips automatiques :",
            type: "Type :",
            start: "Début :",
            end: "Fin :",
            saveBtn: "Enregistrer le segment",
            savedList: "Segments sauvegardés :",
            emptyList: "Rien pour cet épisode.",
            delete: "Supprimer",
            verify: "Vérification...",
            currTime: "Temps actuel",
            zeroTime: "Début de l'épisode",
            maxTime: "Fin de l'épisode",
            errMissing: "⚠️ Clés Cloud manquantes (⚙️)",
            errConn: "❌ Erreur de connexion Cloud",
            cloudCheck: "⬇️ Vérification Cloud...",
            cloudEmpty: "✅ Cloud vierge (Prêt pour la 1ère sauvegarde)",
            cloudPushOld: "⏳ Envoi des anciens épisodes...",
            cloudOk: "✅ À jour avec le Cloud",
            cloudSend: "⏳ Envoi vers le Cloud...",
            cloudSyncOk: "✅ Synchro Cloud OK",
            cloudDel: "⏳ Suppression Cloud...",
            hotkeysTitle: "⌨️ Raccourcis Clavier",
            forward: "Avancer",
            backward: "Reculer",
            addIntro: "Ajout rapide Intro",
            addOutro: "Ajout rapide Outro",
            addAuto: "Ajout intelligent (Intro/Outro)",
            openMenu: "Ouvrir le menu",
            togglePlay: "Lecture / Pause",
            toggleFullscreen: "Plein écran",
            reloadStream: "Recharger la vidéo",
            pressKey: "Appuyez...",
            unassigned: "Non assigné"
        },
        en: {
            configTitle: "⚙️ Advanced Settings",
            configDesc: "Enter your JSONBin.io credentials to sync your skips across devices.",
            saveKeys: "Save & Return",
            autoSkip: "Auto-Skips:",
            type: "Type:",
            start: "Start:",
            end: "End:",
            saveBtn: "Save Segment",
            savedList: "Saved Segments:",
            emptyList: "Nothing for this episode.",
            delete: "Delete",
            verify: "Verifying...",
            currTime: "Current time",
            zeroTime: "Start of episode",
            maxTime: "End of episode",
            errMissing: "⚠️ Missing Cloud Keys (⚙️)",
            errConn: "❌ Cloud Connection Error",
            cloudCheck: "⬇️ Checking Cloud...",
            cloudEmpty: "✅ Empty Cloud (Ready for 1st save)",
            cloudPushOld: "⏳ Uploading old episodes...",
            cloudOk: "✅ Up to date with Cloud",
            cloudSend: "⏳ Sending to Cloud...",
            cloudSyncOk: "✅ Cloud Sync OK",
            cloudDel: "⏳ Deleting from Cloud...",
            hotkeysTitle: "⌨️ Keyboard Shortcuts",
            forward: "Forward",
            backward: "Backward",
            addIntro: "Quick add Intro",
            addOutro: "Quick add Outro",
            addAuto: "Smart add (Intro/Outro)",
            openMenu: "Open menu",
            togglePlay: "Play / Pause",
            toggleFullscreen: "Toggle Fullscreen",
            reloadStream: "Reload Stream",
            pressKey: "Press...",
            unassigned: "Unassigned"
        }
    };

    const userLang = navigator.language.startsWith('fr') ? 'fr' : 'en';
    const t = (key) => i18n[userLang][key] || i18n['en'][key];

    // =====================================================================
    // ⚙️ LOGIQUE PRINCIPALE & SAUVEGARDES
    // =====================================================================

    const INTRO_OUTRO_LENGTH = 90;
    let videoElement = null;
    let playerContainer = null;
    let currentEpisodeId = null;
    
    let skipTypesEnabled = GM_getValue('cr_skip_types', { intro: true, outro: true, recap: true, preview: true });
    
    let hotkeysConfig = GM_getValue('cr_hotkeys_multi', {
        forward: [{ key: 'KeyS', time: 85 }],
        backward: [{ key: 'KeyQ', time: 85 }]
    });

    if (!hotkeysConfig.openIntro) hotkeysConfig.openIntro = { key: 'KeyI' };
    if (!hotkeysConfig.openOutro) hotkeysConfig.openOutro = { key: 'KeyO' };
    if (!hotkeysConfig.addAuto) hotkeysConfig.addAuto = { key: 'KeyU' }; // NOUVEAU RACCOURCI INTELLIGENT
    if (!hotkeysConfig.openMenu) hotkeysConfig.openMenu = { key: 'KeyM' }; 
    if (!hotkeysConfig.togglePlay) hotkeysConfig.togglePlay = { key: 'Space' }; 
    if (!hotkeysConfig.toggleFullscreen) hotkeysConfig.toggleFullscreen = { key: 'KeyF' };
    if (!hotkeysConfig.reloadStream) hotkeysConfig.reloadStream = { key: 'KeyR' };
    
    let isSkipping = false;
    let hasAutoFilled = false;
    let autoFillTimer = null;
    let localData = GM_getValue('cr_sync_data', {}); 

    const formatKeyDisplay = (code) => {
        if (!code || code === 'UNASSIGNED') return t('unassigned');
        return code.replace(/^(Key|Digit)/, '');
    };

    GM_addStyle(`
        #cr-skip-menu, #cr-config-menu { position: absolute; bottom: 85px; right: 15px; z-index: 2147483647; background: rgba(14, 15, 18, 0.95); color: #fff; padding: 18px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); width: 300px; font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.7); display: none; backdrop-filter: blur(5px); }
        .cr-menu-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .cr-menu-header h3 { margin: 0; color: #f47521; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
        .cr-header-actions { display: flex; gap: 12px; align-items: center; }
        .cr-icon-btn { background: transparent; color: #aaa; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; transition: color 0.2s; }
        .cr-icon-btn:hover { color: #fff; }
        #cr-close-menu, #cr-close-config { font-size: 18px; line-height: 1; }
        .cr-row { margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; font-size: 14px; }
        .cr-row label { color: #ddd; display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .cr-input-group { display: flex; align-items: center; gap: 3px; }
        .cr-row input[type="text"] { width: 75px; background: #2a2c33; color: #fff; border: 1px solid #444; padding: 6px; border-radius: 4px; text-align: center; font-family: monospace; }
        .cr-row input[type="text"]:focus { border-color: #f47521; outline: none; }
        .cr-row select { background: #2a2c33; color: #fff; border: 1px solid #444; padding: 6px; border-radius: 4px; width: 100px; cursor: pointer; }
        .cr-btn-time { background: transparent; color: #f47521; border: 1px solid rgba(244,117,33,0.3); padding: 5px 6px; cursor: pointer; border-radius: 4px; font-size: 13px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .cr-btn-time:hover { background: rgba(244,117,33,0.1); border-color: rgba(244,117,33,0.6); }
        .cr-btn-time svg { width: 16px; height: 16px; }
        .cr-btn-save { background: #f47521; color: white; border: none; width: 100%; padding: 10px; margin-top: 10px; font-weight: bold; cursor: pointer; border-radius: 4px; text-transform: uppercase; font-size: 13px; transition: background 0.2s; }
        .cr-btn-save:hover { background: #df6210; }
        .cr-input-full { background: #1e1f23; color: #aaa; border: 1px solid #333; padding: 8px; border-radius: 4px; width: 100%; font-family: monospace; font-size: 12px; margin-bottom: 8px; box-sizing: border-box; }
        .cr-input-full:focus { border-color: #f47521; outline: none; color: #fff;}
        #cr-saved-list { margin-top: 15px; font-size: 13px; }
        .cr-saved-title { margin-bottom: 8px; color:#888; font-style: italic; }
        .cr-saved-item { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 8px; margin-bottom: 6px; border-radius: 4px; border: 1px solid transparent; }
        .cr-saved-item:hover { border-color: rgba(255,255,255,0.1); }
        .cr-saved-item b { color: #f47521; }
        .cr-saved-item button { background: rgba(217, 83, 79, 0.1); border: 1px solid rgba(217, 83, 79, 0.3); color: #d9534f; border-radius: 4px; cursor: pointer; padding: 4px 8px; font-size: 11px; transition: all 0.2s; }
        .cr-saved-item button:hover { background: rgba(217, 83, 79, 0.2); border-color: rgba(217, 83, 79, 0.5); }
        .cr-types-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; font-size: 12px; }
        .cr-types-grid label { background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; cursor: pointer; transition: background 0.2s; }
        .cr-types-grid label:hover { background: rgba(255,255,255,0.1); }
        .cr-types-grid input { margin-right: 5px; cursor: pointer; accent-color: #f47521; }
        #cr-progress-overlay { position: absolute; left: 0; width: 100%; top: 50%; transform: translateY(-50%); height: 4px; pointer-events: none; z-index: 10; }
        .cr-highlight { position: absolute; height: 100%; opacity: 0.9; border-radius: 2px; }
        .cr-hl-intro { background-color: #28a745; }
        .cr-hl-outro { background-color: #dc3545; }
        .cr-hl-recap { background-color: #ffc107; }  
        .cr-hl-preview { background-color: #007bff; } 
        #cr-skip-btn:hover svg { fill: #f47521; }
        .cr-sync-status { font-size: 10px; text-align: center; margin-top: 10px; opacity: 0.5; color: #aaa; }
        
        .cr-hk-btn { font-weight: bold; background: rgba(244,117,33,0.1); color: #fff; width: 85px !important; }
        .cr-hk-btn.capturing { background: #dc3545; color: #fff; border-color: #dc3545; animation: pulse 1s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .cr-add-hk:hover { color: #fff !important; }
        .cr-hk-row { display: flex; justify-content: space-between; background: rgba(255,255,255,0.02); padding: 5px; border-radius: 4px; margin-bottom: 4px; align-items: center; }
        
        .cr-hk-time-wrapper { display: flex; align-items: center; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; transition: all 0.2s; }
        .cr-hk-time-wrapper:focus-within { border-color: #f47521; box-shadow: 0 0 5px rgba(244,117,33,0.2); }
        .cr-hk-time-input { width: 35px !important; background: transparent !important; color: #f47521 !important; border: none !important; padding: 4px 0 4px 6px !important; text-align: right; font-weight: bold; font-family: "Segoe UI", sans-serif; font-size: 13px; -moz-appearance: textfield; outline: none; }
        .cr-hk-time-input::-webkit-outer-spin-button, .cr-hk-time-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .cr-hk-time-label { color: #666; font-size: 11px; padding: 0 6px 0 2px; font-weight: bold; user-select: none; }
    `);

    // =====================================================================
    // 🌐 CLOUD & UTILITAIRES DE TEMPS
    // =====================================================================
    function syncCloud(method, data = null) {
        const binId = GM_getValue('cr_bin_id', '');
        const apiKey = GM_getValue('cr_api_key', '');
        if (!binId || !apiKey) return Promise.resolve(null);
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: method,
                url: `https://api.jsonbin.io/v3/b/${binId}`,
                headers: { "Content-Type": "application/json", "X-Master-Key": apiKey },
                data: data ? JSON.stringify(data) : null,
                onload: (res) => {
                    try { resolve(JSON.parse(res.responseText).record || null); } catch (e) { resolve(null); }
                },
                onerror: () => resolve(null)
            });
        });
    }

    async function pullFromCloudBackground() {
        const statusEl = document.getElementById('cr-sync-text');
        if (!GM_getValue('cr_bin_id', '') || !GM_getValue('cr_api_key', '')) {
            if (statusEl) statusEl.innerText = t('errMissing'); return;
        }
        if (statusEl) statusEl.innerText = t('cloudCheck');
        const cloud = await syncCloud("GET");
        if (!cloud) {
            if (statusEl) statusEl.innerText = t('errConn'); return;
        }
        if (cloud.init === "ok" && Object.keys(cloud).length === 1) {
            if (statusEl) statusEl.innerText = t('cloudEmpty'); return;
        }
        if (JSON.stringify(cloud) !== JSON.stringify(localData)) {
            let needPush = false;
            GM_listValues().forEach(key => {
                if (key.startsWith("cr_ep_")) {
                    const epId = key.replace("cr_ep_", "");
                    if (!cloud[epId]) { cloud[epId] = GM_getValue(key); needPush = true; }
                }
            });
            localData = cloud;
            GM_setValue('cr_sync_data', localData);
            if (needPush) {
                if (statusEl) statusEl.innerText = t('cloudPushOld');
                await syncCloud("PUT", localData);
            }
            updateMenuList(); drawHighlights();
        }
        if (statusEl) statusEl.innerText = t('cloudOk');
    }

    function timeToSeconds(timeStr) {
        if (!timeStr) return 0;
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return isNaN(parts[0]) ? 0 : parts[0];
    }

    function secondsToTime(seconds) {
        if (isNaN(seconds)) return "00:00";
        seconds = Math.max(0, seconds);
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function getEpisodeId() {
        const match = window.location.pathname.match(/\/watch\/([^\/]+)/);
        return match ? match[1] : null;
    }

    // =====================================================================
    // ⏭️ MOTEUR DE SKIP & RACCOURCIS
    // =====================================================================
    function forceJumpToTime(targetTime) {
        if (!videoElement) return;
        isSkipping = true; 
        const slider = document.querySelector('input.timeline-slider[type="range"]');
        if (slider) {
            slider.value = targetTime;
            slider.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            slider.dispatchEvent(new Event('input', { bubbles: true })); 
            slider.dispatchEvent(new Event('change', { bubbles: true }));
            slider.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        } else {
            videoElement.currentTime = targetTime;
        }
        setTimeout(() => { 
            isSkipping = false; 
        
            handleTimeUpdate();
        }, 200);
    }

    function handleTimeUpdate() {
        if (!videoElement || isSkipping) return;
        
        const data = localData[currentEpisodeId] || {}; 
        const currentTime = videoElement.currentTime;
        const duration = videoElement.duration; 

        for (const [type, segment] of Object.entries(data)) {
            if (!skipTypesEnabled[type]) continue; 
            if (currentTime >= segment.start && currentTime < segment.end - 0.5) {
                let targetTime = segment.end;
                if (!isNaN(duration) && targetTime > duration - 2) targetTime = duration - 2; 
                if (currentTime < targetTime) forceJumpToTime(targetTime);
                break;
            }
        }
    }

    function toggleMainMenu() {
        const menu = document.getElementById('cr-skip-menu');
        const configMenu = document.getElementById('cr-config-menu');
        if (!menu || !configMenu) return;

        const isAnyMenuOpen = menu.style.display === 'block' || configMenu.style.display === 'block';
        
        if (isAnyMenuOpen) {
            menu.style.display = 'none'; 
            configMenu.style.display = 'none';
        } else {
            menu.style.display = 'block';
            if (videoElement && !hasAutoFilled) {
                const ratio = videoElement.currentTime / videoElement.duration;
                let guessType = 'intro';
                if (ratio > 0.8) guessType = 'outro'; 
                if (ratio > 0.95) guessType = 'preview'; 
                if (ratio < 0.1 && videoElement.currentTime > 60) guessType = 'recap'; 

                document.getElementById('cr-type-sel').value = guessType;
                document.getElementById('cr-start-in').value = secondsToTime(videoElement.currentTime);
                
                const maxDur = videoElement.duration || 0;
                let predictedEnd = videoElement.currentTime + INTRO_OUTRO_LENGTH;
                if (predictedEnd > maxDur) predictedEnd = maxDur;
                document.getElementById('cr-end-in').value = secondsToTime(predictedEnd);
                
                hasAutoFilled = true;
                if (autoFillTimer) clearTimeout(autoFillTimer);
                autoFillTimer = setTimeout(() => { hasAutoFilled = false; }, 120000);
            }
        }
    }

    function openQuickMenu(type) {
        if (!videoElement) return;
        const menu = document.getElementById('cr-skip-menu');
        const configMenu = document.getElementById('cr-config-menu');
        if (!menu) return;

        menu.style.display = 'block';
        if (configMenu) configMenu.style.display = 'none';

        document.getElementById('cr-type-sel').value = type;
        document.getElementById('cr-start-in').value = secondsToTime(videoElement.currentTime);

        const maxDur = videoElement.duration || 0;
        let predictedEnd = videoElement.currentTime + INTRO_OUTRO_LENGTH;
        if (predictedEnd > maxDur) predictedEnd = maxDur;
        document.getElementById('cr-end-in').value = secondsToTime(predictedEnd);
        
        hasAutoFilled = true;
        if (autoFillTimer) clearTimeout(autoFillTimer);
        autoFillTimer = setTimeout(() => { hasAutoFilled = false; }, 120000);

        setTimeout(() => {
            const saveBtn = document.getElementById('cr-save-btn');
            if (saveBtn) saveBtn.click();
        }, 50);
    }

    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (!videoElement) return;

        // Lecture / Pause
        if (e.code === hotkeysConfig.togglePlay.key) {
            e.preventDefault(); 
            e.stopPropagation();
            if (videoElement.paused) videoElement.play();
            else videoElement.pause();
            return;
        }

        // Plein écran
        if (e.code === hotkeysConfig.toggleFullscreen.key) {
            e.preventDefault(); e.stopPropagation();
            if (!document.fullscreenElement) {
                const player = document.querySelector('.video-player') || playerContainer || document.documentElement;
                if (player.requestFullscreen) player.requestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
            return;
        }

        // Recharger le flux
        if (e.code === hotkeysConfig.reloadStream.key) {
            e.preventDefault(); e.stopPropagation();
            forceJumpToTime(videoElement.currentTime + 0.001);
            return;
        }

        // Ajout Rapide Intelligent (Intro/Outro)
        if (e.code === hotkeysConfig.addAuto.key) {
            e.preventDefault(); e.stopPropagation();
            if (videoElement.duration) {
                const ratio = videoElement.currentTime / videoElement.duration;
                if (ratio > 0.95) {
                    openQuickMenu('preview')
                } else {    
                    const type = (videoElement.currentTime < videoElement.duration / 2) ? 'intro' : 'outro';
                    openQuickMenu(type);
                }
            }
            return;
        }

        if (e.code === hotkeysConfig.openIntro.key) {
            e.preventDefault(); e.stopPropagation();
            openQuickMenu('intro');
            return;
        }

        if (e.code === hotkeysConfig.openOutro.key) {
            e.preventDefault(); e.stopPropagation();
            openQuickMenu('outro');
            return;
        }

        if (e.code === hotkeysConfig.openMenu.key) {
            e.preventDefault(); e.stopPropagation();
            toggleMainMenu();
            return;
        }

        let fwdMatch = hotkeysConfig.forward.find(h => h.key === e.code);
        if (fwdMatch) {
            e.preventDefault(); e.stopPropagation();
            let targetTime = Math.min(videoElement.duration, videoElement.currentTime + fwdMatch.time);
            forceJumpToTime(targetTime);
            return;
        }

        let bwdMatch = hotkeysConfig.backward.find(h => h.key === e.code);
        if (bwdMatch) {
            e.preventDefault(); e.stopPropagation();
            let targetTime = Math.max(0, videoElement.currentTime - bwdMatch.time);
            forceJumpToTime(targetTime);
            return;
        }
    }, true);

    function drawHighlights() {
        if (!videoElement) return;
        let sliderInput = document.querySelector('input.timeline-slider[type="range"]');
        let seekBarContainer = sliderInput ? sliderInput.parentElement : null;
        if (!seekBarContainer) return;

        let overlay = document.getElementById('cr-progress-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'cr-progress-overlay';
            seekBarContainer.appendChild(overlay);
        } else {
            overlay.innerHTML = '';
        }

        if (isNaN(videoElement.duration) || videoElement.duration === 0) return;
        const data = localData[currentEpisodeId] || {}; 
        const duration = videoElement.duration;

        ['intro', 'outro', 'recap', 'preview'].forEach(type => {
            if (data[type]) {
                const hl = document.createElement('div');
                hl.className = `cr-highlight cr-hl-${type}`;
                hl.style.left = `${(data[type].start / duration) * 100}%`;
                hl.style.width = `${((data[type].end - data[type].start) / duration) * 100}%`;
                overlay.appendChild(hl);
            }
        });
    }

    const CR_GEAR_PATH = `M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.05-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.12.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.73 8.87c-.11.2-.06.47.12.61l2.03 1.58c-.04.3-.06.62-.06.94s.02.64.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.12-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.11-.2.06-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z`;
    const CR_GEAR_SVG_MAIN = `<svg viewBox="0 0 24 24" fill="currentColor" class="kat:w-24 kat:h-24 kat:@lg:w-40 kat:@lg:h-40 kat:shrink-0"><path d="${CR_GEAR_PATH}"/></svg>`;
    const CR_GEAR_SVG_MINI = `<svg viewBox="0 0 24 24" fill="currentColor" style="width:18px;height:18px;"><path d="${CR_GEAR_PATH}"/></svg>`;
    const CR_CLOCK_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`;
    const CR_START_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>`;
    const CR_END_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>`;

    // =====================================================================
    // 🖥️ INTERFACE UTILISATEUR
    // =====================================================================
    function renderHotkeysSettings() {
        const container = document.getElementById('cr-hotkeys-container');
        if (!container) return;

        let html = `<div style="font-size: 13px; color: #ddd; margin-bottom: 12px;"><b>${t('hotkeysTitle')}</b></div>`;

        html += `
        <div style="margin-bottom: 15px; border-left: 2px solid #444; padding-left: 8px;">
            <div class="cr-hk-row" style="margin-bottom: 4px; background: transparent;">
                <label style="color:#aaa; font-size:12px;">${t('togglePlay')}</label>
                <button class="cr-btn-time cr-hk-btn cr-hk-single" data-action="togglePlay" title="Modifier la touche">${formatKeyDisplay(hotkeysConfig.togglePlay.key)}</button>
            </div>
            <div class="cr-hk-row" style="margin-bottom: 4px; background: transparent;">
                <label style="color:#aaa; font-size:12px;">${t('toggleFullscreen')}</label>
                <button class="cr-btn-time cr-hk-btn cr-hk-single" data-action="toggleFullscreen" title="Modifier la touche">${formatKeyDisplay(hotkeysConfig.toggleFullscreen.key)}</button>
            </div>
            <div class="cr-hk-row" style="margin-bottom: 4px; background: transparent;">
                <label style="color:#aaa; font-size:12px;">${t('reloadStream')}</label>
                <button class="cr-btn-time cr-hk-btn cr-hk-single" data-action="reloadStream" title="Modifier la touche">${formatKeyDisplay(hotkeysConfig.reloadStream.key)}</button>
            </div>
            <div class="cr-hk-row" style="margin-bottom: 4px; background: transparent;">
                <label style="color:#aaa; font-size:12px;">${t('openMenu')}</label>
                <button class="cr-btn-time cr-hk-btn cr-hk-single" data-action="openMenu" title="Modifier la touche">${formatKeyDisplay(hotkeysConfig.openMenu.key)}</button>
            </div>
            <div class="cr-hk-row" style="margin-bottom: 4px; background: transparent;">
                <label style="color:#aaa; font-size:12px; color:#f47521;"><b>${t('addAuto')}</b></label>
                <button class="cr-btn-time cr-hk-btn cr-hk-single" data-action="addAuto" title="Modifier la touche">${formatKeyDisplay(hotkeysConfig.addAuto.key)}</button>
            </div>
            <div class="cr-hk-row" style="margin-bottom: 4px; background: transparent;">
                <label style="color:#aaa; font-size:12px;">${t('addIntro')}</label>
                <button class="cr-btn-time cr-hk-btn cr-hk-single" data-action="openIntro" title="Modifier la touche">${formatKeyDisplay(hotkeysConfig.openIntro.key)}</button>
            </div>
            <div class="cr-hk-row" style="margin-bottom: 4px; background: transparent;">
                <label style="color:#aaa; font-size:12px;">${t('addOutro')}</label>
                <button class="cr-btn-time cr-hk-btn cr-hk-single" data-action="openOutro" title="Modifier la touche">${formatKeyDisplay(hotkeysConfig.openOutro.key)}</button>
            </div>
        </div>`;

        const renderDirection = (dir, label) => {
            let dirHtml = `<div style="margin-bottom: 15px; border-left: 2px solid #444; padding-left: 8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <span style="color:#aaa; font-size:12px;">${label}</span>
                    <button class="cr-icon-btn cr-add-hk" data-dir="${dir}" title="Ajouter" style="color:#f47521; font-size:18px;">+</button>
                </div>`;
            
            hotkeysConfig[dir].forEach((hk, index) => {
                dirHtml += `
                <div class="cr-hk-row">
                    <div class="cr-input-group" style="width:100%; justify-content: space-between;">
                        <div class="cr-hk-time-wrapper" title="Durée (secondes)">
                            <input type="number" class="cr-hk-time-input" data-dir="${dir}" data-idx="${index}" value="${hk.time}" min="1">
                            <span class="cr-hk-time-label">s</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:5px;">
                            <button class="cr-btn-time cr-hk-btn cr-hk-array" data-dir="${dir}" data-idx="${index}" title="Modifier la touche">${formatKeyDisplay(hk.key)}</button>
                            <button class="cr-icon-btn cr-del-hk" data-dir="${dir}" data-idx="${index}" style="color:#dc3545; font-size:14px; margin-left:2px;" title="Supprimer">✖</button>
                        </div>
                    </div>
                </div>`;
            });
            dirHtml += `</div>`;
            return dirHtml;
        };

        html += renderDirection('forward', t('forward'));
        html += renderDirection('backward', t('backward'));
        
        container.innerHTML = html;
        attachHotkeysDOMListeners();
    }

    function attachHotkeysDOMListeners() {
        document.querySelectorAll('.cr-hk-time-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const dir = e.target.dataset.dir;
                const idx = parseInt(e.target.dataset.idx);
                let val = parseInt(e.target.value) || 0;
                if (val < 1) val = 1; e.target.value = val;
                hotkeysConfig[dir][idx].time = val;
                GM_setValue('cr_hotkeys_multi', hotkeysConfig);
            });
        });

        document.querySelectorAll('.cr-del-hk').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const dir = e.target.dataset.dir;
                const idx = parseInt(e.target.dataset.idx);
                hotkeysConfig[dir].splice(idx, 1);
                GM_setValue('cr_hotkeys_multi', hotkeysConfig);
                renderHotkeysSettings();
            });
        });

        document.querySelectorAll('.cr-add-hk').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const dir = e.target.dataset.dir;
                hotkeysConfig[dir].push({ key: 'UNASSIGNED', time: 10 }); 
                GM_setValue('cr_hotkeys_multi', hotkeysConfig);
                renderHotkeysSettings();
            });
        });

        document.querySelectorAll('.cr-hk-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                
                if (this.classList.contains('capturing')) return;
                
                document.querySelectorAll('.cr-hk-btn').forEach(b => {
                    b.classList.remove('capturing');
                    if (b.classList.contains('cr-hk-single')) {
                        b.innerText = formatKeyDisplay(hotkeysConfig[b.dataset.action].key);
                    } else {
                        b.innerText = formatKeyDisplay(hotkeysConfig[b.dataset.dir][b.dataset.idx].key);
                    }
                });

                this.classList.add('capturing');
                this.innerText = t('pressKey');
                
                const captureKey = (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    
                    if (this.classList.contains('cr-hk-single')) {
                        const action = this.dataset.action;
                        hotkeysConfig[action].key = evt.code;
                    } else {
                        const dir = this.dataset.dir;
                        const idx = parseInt(this.dataset.idx);
                        hotkeysConfig[dir][idx].key = evt.code;
                    }
                    
                    GM_setValue('cr_hotkeys_multi', hotkeysConfig);
                    this.innerText = formatKeyDisplay(evt.code);
                    this.classList.remove('capturing');
                    
                    window.removeEventListener('keydown', captureKey, true);
                };
                
                setTimeout(() => window.addEventListener('keydown', captureKey, true), 100);
            });
        });
    }

    function initMenuAndButton() {
        videoElement = document.querySelector('video');
        if (!videoElement) return;
        playerContainer = videoElement.parentElement.parentElement;
        if (!playerContainer) return;

        if (!videoElement.dataset.crSkipInitialized) {
            videoElement.addEventListener('timeupdate', handleTimeUpdate);
            videoElement.addEventListener('playing', handleTimeUpdate);
            videoElement.addEventListener('loadedmetadata', () => setTimeout(drawHighlights, 1000));
            videoElement.dataset.crSkipInitialized = "true";
        }

        if (!document.getElementById('cr-skip-menu')) {
            const stop = (e) => e.stopPropagation();

            const menu = document.createElement('div');
            menu.id = 'cr-skip-menu';
            menu.innerHTML = `
                <div class="cr-menu-header">
                    <h3>⚙️ CR Utilities</h3>
                    <div class="cr-header-actions">
                        <button class="cr-icon-btn" id="cr-open-config" title="Settings">${CR_GEAR_SVG_MINI}</button>
                        <button class="cr-icon-btn" id="cr-close-menu">✖</button>
                    </div>
                </div>
                
                <div style="font-size: 13px; color: #ddd; margin-bottom: 8px;"><b>${t('autoSkip')}</b></div>
                <div class="cr-types-grid">
                    <label><input type="checkbox" class="cr-cb-type" value="intro" ${skipTypesEnabled.intro ? 'checked' : ''}> Intro</label>
                    <label><input type="checkbox" class="cr-cb-type" value="outro" ${skipTypesEnabled.outro ? 'checked' : ''}> Outro</label>
                    <label><input type="checkbox" class="cr-cb-type" value="recap" ${skipTypesEnabled.recap ? 'checked' : ''}> Recap</label>
                    <label><input type="checkbox" class="cr-cb-type" value="preview" ${skipTypesEnabled.preview ? 'checked' : ''}> Preview</label>
                </div>

                <hr style="border-color: rgba(255,255,255,0.05); margin: 12px 0;">
                
                <div class="cr-row">
                    <label>${t('type')}</label>
                    <select id="cr-type-sel">
                        <option value="intro">Intro</option>
                        <option value="outro">Outro</option>
                        <option value="recap">Recap</option>
                        <option value="preview">Preview</option>
                    </select>
                </div>
                
                <div class="cr-row"><label>${t('start')}</label><div class="cr-input-group">
                    <input type="text" id="cr-start-in" placeholder="00:00">
                    <button class="cr-btn-time" id="cr-get-start" title="${t('currTime')}">${CR_CLOCK_SVG}</button>
                    <button class="cr-btn-time" id="cr-get-start-zero" title="${t('zeroTime')}">${CR_START_SVG}</button>
                </div></div>
                
                <div class="cr-row"><label>${t('end')}</label><div class="cr-input-group">
                    <input type="text" id="cr-end-in" placeholder="01:30">
                    <button class="cr-btn-time" id="cr-get-end" title="${t('currTime')}">${CR_CLOCK_SVG}</button>
                    <button class="cr-btn-time" id="cr-get-max" title="${t('maxTime')}">${CR_END_SVG}</button>
                </div></div>
                
                <button class="cr-btn-save" id="cr-save-btn">${t('saveBtn')}</button>
                <div id="cr-saved-list"></div>
                <div class="cr-sync-status" id="cr-sync-text">${t('verify')}</div>
            `;
            playerContainer.appendChild(menu);
            menu.addEventListener('mousedown', stop); menu.addEventListener('click', stop);

            document.querySelectorAll('.cr-cb-type').forEach(cb => {
                cb.onchange = (e) => {
                    skipTypesEnabled[e.target.value] = e.target.checked;
                    GM_setValue('cr_skip_types', skipTypesEnabled);
                };
            });

            const configMenu = document.createElement('div');
            configMenu.id = 'cr-config-menu';
            configMenu.innerHTML = `
                <div class="cr-menu-header">
                    <h3>${t('configTitle')}</h3>
                    <div class="cr-header-actions">
                        <button class="cr-icon-btn" id="cr-close-config">✖</button>
                    </div>
                </div>
                
                <div style="font-size: 13px; color: #ddd; margin-bottom: 8px;"><b>☁️ Cloud Sync</b></div>
                <label style="font-size: 11px; color:#aaa; margin-bottom: 4px; display: block;">Bin ID</label>
                <input type="text" class="cr-input-full" id="cr-bin-id" placeholder="Bin ID" value="${GM_getValue('cr_bin_id', '')}">
                <label style="font-size: 11px; color:#aaa; margin-bottom: 4px; display: block;">API Master Key</label>
                <input type="password" class="cr-input-full" id="cr-api-key" placeholder="API Key" value="${GM_getValue('cr_api_key', '')}">
                
                <hr style="border-color: rgba(255,255,255,0.05); margin: 15px 0;">
                
                <div id="cr-hotkeys-container"></div>
                
                <button class="cr-btn-save" id="cr-save-keys" style="margin-top: 15px;">${t('saveKeys')}</button>
            `;
            playerContainer.appendChild(configMenu);
            configMenu.addEventListener('mousedown', stop); configMenu.addEventListener('click', stop);

            renderHotkeysSettings();

            document.getElementById('cr-close-menu').onclick = () => menu.style.display = 'none';
            document.getElementById('cr-open-config').onclick = () => {
                menu.style.display = 'none';
                configMenu.style.display = 'block';
            };
            document.getElementById('cr-close-config').onclick = () => {
                configMenu.style.display = 'none';
                menu.style.display = 'block';
                document.querySelectorAll('.cr-hk-btn').forEach(b => {
                    b.classList.remove('capturing');
                    if (b.classList.contains('cr-hk-single')) {
                        b.innerText = formatKeyDisplay(hotkeysConfig[b.dataset.action].key);
                    } else {
                        b.innerText = formatKeyDisplay(hotkeysConfig[b.dataset.dir][b.dataset.idx].key);
                    }
                });
            };
            
            document.getElementById('cr-save-keys').onclick = () => {
                GM_setValue('cr_bin_id', document.getElementById('cr-bin-id').value.trim());
                GM_setValue('cr_api_key', document.getElementById('cr-api-key').value.trim());
                document.getElementById('cr-close-config').click();
                pullFromCloudBackground();
            };
            
            document.getElementById('cr-get-start').onclick = () => { 
                document.getElementById('cr-start-in').value = secondsToTime(videoElement.currentTime);
                const maxDur = videoElement.duration || 0;
                let predictedEnd = videoElement.currentTime + INTRO_OUTRO_LENGTH;
                if (predictedEnd > maxDur) predictedEnd = maxDur;
                document.getElementById('cr-end-in').value = secondsToTime(predictedEnd);
            };

            document.getElementById('cr-get-start-zero').onclick = () => {
                document.getElementById('cr-start-in').value = "00:00";
            };

            document.getElementById('cr-get-end').onclick = () => {
                document.getElementById('cr-end-in').value = secondsToTime(videoElement.currentTime);
            };

            document.getElementById('cr-get-max').onclick = () => {
                if (videoElement && videoElement.duration) {
                    document.getElementById('cr-end-in').value = secondsToTime(videoElement.duration);
                }
            };

            document.getElementById('cr-save-btn').onclick = () => {
                const status = document.getElementById('cr-sync-text');
                const type = document.getElementById('cr-type-sel').value;
                const start = timeToSeconds(document.getElementById('cr-start-in').value);
                let end = timeToSeconds(document.getElementById('cr-end-in').value);
                
                const maxDur = videoElement ? videoElement.duration : Infinity;
                if (end > maxDur) { end = maxDur; }
                
                localData[currentEpisodeId] = localData[currentEpisodeId] || {};
                localData[currentEpisodeId][type] = { start, end };
                GM_setValue('cr_sync_data', localData); 
                
                document.getElementById('cr-start-in').value = '';
                document.getElementById('cr-end-in').value = '';
                hasAutoFilled = false;
                if (autoFillTimer) { clearTimeout(autoFillTimer); autoFillTimer = null; }

                updateMenuList(); drawHighlights();

                if (GM_getValue('cr_bin_id', '') && GM_getValue('cr_api_key', '')) {
                    status.innerText = t('cloudSend');
                    syncCloud("PUT", localData).then(() => {
                        status.innerText = t('cloudSyncOk');
                        setTimeout(() => { if(status && status.innerText === t('cloudSyncOk')) status.innerText = ""; }, 3000);
                    });
                }
            };
            
            updateMenuList();
            pullFromCloudBackground();
        }

        if (!document.getElementById('cr-skip-btn')) {
            const outer = document.createElement('div'); 
            outer.className = 'kat:relative';
            outer.style.display = 'flex';
            outer.style.alignItems = 'center';
            
            const inner = document.createElement('div'); inner.className = 'kat:relative';
            const btn = document.createElement('button');
            btn.id = 'cr-skip-btn'; btn.type = 'button'; btn.title = "CR Utilities";
            btn.className = 'kat:flex kat:items-center kat:justify-center kat:h-44 kat:w-44 kat:@lg:h-64 kat:@lg:w-64 kat:opacity-75 kat:hover:opacity-100 kat:fill-icon-tertiary kat:hover:bg-neutral-700 kat:rounded-full kat:cursor-pointer'; 
            btn.innerHTML = CR_GEAR_SVG_MAIN;
            
            const block = (e) => { e.preventDefault(); e.stopPropagation(); };
            btn.addEventListener('click', (e) => {
                block(e);
                toggleMainMenu();
            });
            btn.addEventListener('mousedown', block);
            inner.appendChild(btn); outer.appendChild(inner);
            
            let target = document.querySelector('[data-testid="track-selection-button"]') || 
                         document.querySelector('[data-testid="playback-speed-button"]') ||
                         document.querySelector('[data-testid="next-episode-icon"]') ||
                         document.querySelector('[data-testid="settings-button"]') || 
                         document.querySelector('[data-testid="audio-and-subtitles-button"]');
            
            if (!target && playerContainer) {
                const all = Array.from(playerContainer.querySelectorAll('svg')).filter(svg => !svg.closest('#cr-skip-menu, #cr-config-menu, #cr-skip-btn'));
                target = all.length > 2 ? all[all.length - 2].closest('button, [role="button"]') : null;
            }
            if (target) {
                let btnGroup = target.parentElement;
                while (btnGroup && btnGroup.children.length < 2 && btnGroup.tagName !== 'BODY') {
                    btnGroup = btnGroup.parentElement;
                }
                if (btnGroup) { btnGroup.insertBefore(outer, btnGroup.firstChild); } 
                else { target.parentElement.insertBefore(outer, target); }
            }
        }
    }

    function updateMenuList() {
        const list = document.getElementById('cr-saved-list');
        if (!list) return;
        list.innerHTML = `<div class="cr-saved-title">${t('savedList')}</div>`;
        const data = localData[currentEpisodeId] || {};
        
        let hasData = false;
        Object.keys(data).forEach(type => {
            hasData = true;
            const item = document.createElement('div'); item.className = 'cr-saved-item';
            let color = '#f47521'; 
            if (type === 'outro') color = '#dc3545';
            if (type === 'recap') color = '#ffc107';
            if (type === 'preview') color = '#007bff';

            item.innerHTML = `<span><b style="color:${color};">${type.toUpperCase()}</b> ${secondsToTime(data[type].start)} - ${secondsToTime(data[type].end)}</span><button title="${t('delete')}">✖</button>`;
            item.querySelector('button').onclick = () => {
                delete localData[currentEpisodeId][type];
                GM_setValue('cr_sync_data', localData);
                updateMenuList(); drawHighlights();
                
                if (GM_getValue('cr_bin_id', '') && GM_getValue('cr_api_key', '')) {
                    const status = document.getElementById('cr-sync-text');
                    if (status) status.innerText = t('cloudDel');
                    syncCloud("PUT", localData).then(() => {
                        if (status) status.innerText = t('cloudSyncOk');
                        setTimeout(() => { if(status && status.innerText === t('cloudSyncOk')) status.innerText = ""; }, 3000);
                    });
                }
            };
            list.appendChild(item);
        });
        
        if (!hasData) {
            list.innerHTML += `<div style="color: #666; padding-left: 5px;">${t('emptyList')}</div>`;
        }
    }

    window.addEventListener('pointerdown', (e) => {
        const m = document.getElementById('cr-skip-menu');
        const c = document.getElementById('cr-config-menu');
        const b = document.getElementById('cr-skip-btn');
        if (m?.style.display === 'block' && !m.contains(e.target) && !b?.contains(e.target)) m.style.display = 'none';
        if (c?.style.display === 'block' && !c.contains(e.target) && !b?.contains(e.target)) {
            if (!e.target.classList.contains('capturing')) c.style.display = 'none';
        }
    }, true);

    setInterval(() => {
        const id = getEpisodeId();
        if (!id) {
            currentEpisodeId = null; videoElement = null; playerContainer = null; return;
        }
        if (id !== currentEpisodeId) {
            currentEpisodeId = id; hasAutoFilled = false;
            if (autoFillTimer) { clearTimeout(autoFillTimer); autoFillTimer = null; }
            updateMenuList(); drawHighlights();
        }
        initMenuAndButton();
        if (videoElement) drawHighlights();
    }, 1000);

})();