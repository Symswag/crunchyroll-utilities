// ==UserScript==
// @name         Crunchyroll Utilities
// @namespace    http://tampermonkey.net/
// @version      5.2
// @description  Couteau suisse Crunchyroll : Fix navigation (SPA), Bouton 1ère position, Local-First & Cloud.
// @author       Symswag
// @match        *://*.crunchyroll.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      api.jsonbin.io
// ==/UserScript==

(function() {
    'use strict';

    const INTRO_OUTRO_LENGTH = 90;
    let videoElement = null;
    let playerContainer = null;
    let currentEpisodeId = null;
    let autoSkipEnabled = GM_getValue('cr_auto_skip', true);
    let isSkipping = false;
    let hasAutoFilled = false;
    let autoFillTimer = null;
    
    // Base de données locale unifiée
    let localData = GM_getValue('cr_sync_data', {}); 

    // --- SYSTÈME DE LOGS PERSONNALISÉ ---
    function crLog(message, type = 'info', data = null) {
        const prefix = '%c CR Utils ';
        const prefixStyle = 'background: #f47521; color: #ffffff; font-weight: bold; border-radius: 4px; padding: 2px 4px; margin-right: 5px; font-family: sans-serif;';
        let msgStyle = 'font-weight: bold; font-family: sans-serif; ';
        
        switch (type.toLowerCase()) {
            case 'success': msgStyle += 'color: #28a745;'; break;
            case 'warn':    msgStyle += 'color: #ffc107;'; break;
            case 'error':   msgStyle += 'color: #dc3545;'; break;
            case 'cloud':   msgStyle += 'color: #0dcaf0;'; break;
            default:        msgStyle += 'color: #007bff;'; break;
        }

        if (data !== null) console.log(`${prefix}%c${message}`, prefixStyle, msgStyle, data);
        else console.log(`${prefix}%c${message}`, prefixStyle, msgStyle);
    }

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
        .cr-input-group { display: flex; align-items: center; gap: 5px; }
        .cr-row input[type="text"] { width: 75px; background: #2a2c33; color: #fff; border: 1px solid #444; padding: 6px; border-radius: 4px; text-align: center; font-family: monospace; }
        .cr-row input[type="text"]:focus { border-color: #f47521; outline: none; }
        .cr-row select { background: #2a2c33; color: #fff; border: 1px solid #444; padding: 6px; border-radius: 4px; width: 100px; cursor: pointer; }
        .cr-btn-time { background: transparent; color: #f47521; border: 1px solid rgba(244,117,33,0.3); padding: 5px 8px; cursor: pointer; border-radius: 4px; font-size: 14px; transition: background 0.2s; }
        .cr-btn-time:hover { background: rgba(244,117,33,0.1); border-color: rgba(244,117,33,0.6); }
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
        #cr-progress-overlay { position: absolute; left: 0; width: 100%; top: 50%; transform: translateY(-50%); height: 4px; pointer-events: none; z-index: 10; }
        .cr-highlight { position: absolute; height: 100%; opacity: 0.9; border-radius: 2px; }
        .cr-hl-intro { background-color: #28a745; }
        .cr-hl-outro { background-color: #dc3545; }
        #cr-skip-btn:hover svg { fill: #f47521; }
        .cr-sync-status { font-size: 10px; text-align: center; margin-top: 10px; opacity: 0.5; color: #aaa; }
    `);

    // --- LOGIQUE CLOUD API SÉCURISÉE ---
    function syncCloud(method, data = null) {
        const binId = GM_getValue('cr_bin_id', '');
        const apiKey = GM_getValue('cr_api_key', '');

        if (!binId || !apiKey) {
            crLog("Clés Cloud manquantes, requête annulée", "warn");
            return Promise.resolve(null);
        }

        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: method,
                url: `https://api.jsonbin.io/v3/b/${binId}`,
                headers: { "Content-Type": "application/json", "X-Master-Key": apiKey },
                data: data ? JSON.stringify(data) : null,
                onload: (res) => {
                    try {
                        const json = JSON.parse(res.responseText);
                        resolve(json.record ? json.record : null);
                    } catch (e) {
                        crLog("Erreur de parsing API", "error", e);
                        resolve(null);
                    }
                },
                onerror: (err) => {
                    crLog("Erreur réseau API", "error", err);
                    resolve(null);
                }
            });
        });
    }

    async function pullFromCloudBackground() {
        const statusEl = document.getElementById('cr-sync-text');
        
        if (!GM_getValue('cr_bin_id', '') || !GM_getValue('cr_api_key', '')) {
            if (statusEl) statusEl.innerText = "⚠️ Clés Cloud manquantes (⚙️)";
            return;
        }

        if (statusEl) statusEl.innerText = "⬇️ Vérification Cloud...";
        crLog("Récupération des données Cloud...", "cloud");
        
        const cloud = await syncCloud("GET");
        
        if (!cloud) {
            if (statusEl) statusEl.innerText = "❌ Erreur de connexion Cloud";
            return;
        }

        if (cloud.init === "ok" && Object.keys(cloud).length === 1) {
            if (statusEl) statusEl.innerText = "✅ Cloud vierge (Prêt pour la 1ère sauvegarde)";
            return;
        }
            
        if (JSON.stringify(cloud) !== JSON.stringify(localData)) {
            crLog("Mise à jour Cloud détectée !", "info", cloud);
            let needPush = false;
            GM_listValues().forEach(key => {
                if (key.startsWith("cr_ep_")) {
                    const epId = key.replace("cr_ep_", "");
                    if (!cloud[epId]) {
                        cloud[epId] = GM_getValue(key);
                        needPush = true;
                    }
                }
            });

            localData = cloud;
            GM_setValue('cr_sync_data', localData);
            
            if (needPush) {
                if (statusEl) statusEl.innerText = "⏳ Envoi des anciens épisodes...";
                await syncCloud("PUT", localData);
            }
            updateMenuList(); drawHighlights();
        } else {
            crLog("La base locale est déjà à jour.", "success");
        }
        
        if (statusEl) statusEl.innerText = "✅ À jour avec le Cloud";
    }

    // --- UTILITAIRES ---
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
        // Renvoie null si on n'est pas sur une page /watch/
        const match = window.location.pathname.match(/\/watch\/([^\/]+)/);
        return match ? match[1] : null;
    }

    // --- LOGIQUE SKIP ---
    function handleTimeUpdate() {
        if (!autoSkipEnabled || !videoElement || isSkipping) return;
        
        const data = localData[currentEpisodeId] || {}; 
        const currentTime = videoElement.currentTime;
        const duration = videoElement.duration; 

        const jumpToTime = (targetTime) => {
            isSkipping = true; 
            crLog(`Saut automatique vers ${secondsToTime(targetTime)}`, "info");
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
            setTimeout(() => { isSkipping = false; }, 1000);
        };

        if (data.intro && currentTime >= data.intro.start && currentTime < data.intro.end - 0.5) {
            jumpToTime(data.intro.end);
        }
        else if (data.outro && currentTime >= data.outro.start && currentTime < data.outro.end - 0.5) {
            let targetOutroTime = data.outro.end;
            if (!isNaN(duration) && targetOutroTime > duration - 2) targetOutroTime = duration - 2; 
            if (currentTime < targetOutroTime) jumpToTime(targetOutroTime);
        }
    }

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

        ['intro', 'outro'].forEach(type => {
            if (data[type]) {
                const hl = document.createElement('div');
                hl.className = `cr-highlight cr-hl-${type}`;
                hl.style.left = `${(data[type].start / duration) * 100}%`;
                hl.style.width = `${((data[type].end - data[type].start) / duration) * 100}%`;
                overlay.appendChild(hl);
            }
        });
    }

    // --- UI & INITIALISATION ---
    const CR_GEAR_PATH = `M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.05-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.12.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.73 8.87c-.11.2-.06.47.12.61l2.03 1.58c-.04.3-.06.62-.06.94s.02.64.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.12-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.11-.2.06-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z`;
    const CR_GEAR_SVG_MAIN = `<svg viewBox="0 0 24 24" fill="currentColor" class="kat:w-24 kat:h-24 kat:@lg:w-40 kat:@lg:h-40 kat:shrink-0"><path d="${CR_GEAR_PATH}"/></svg>`;
    const CR_GEAR_SVG_MINI = `<svg viewBox="0 0 24 24" fill="currentColor" style="width:18px;height:18px;"><path d="${CR_GEAR_PATH}"/></svg>`;

    function initMenuAndButton() {
        videoElement = document.querySelector('video');
        if (!videoElement) return;
        
        playerContainer = videoElement.parentElement.parentElement;
        if (!playerContainer) return;

        if (!videoElement.dataset.crSkipInitialized) {
            videoElement.addEventListener('timeupdate', handleTimeUpdate);
            videoElement.addEventListener('loadedmetadata', () => setTimeout(drawHighlights, 1000));
            videoElement.dataset.crSkipInitialized = "true";
            crLog("Lecteur vidéo accroché avec succès.", "success");
        }

        if (!document.getElementById('cr-skip-menu')) {
            const stop = (e) => e.stopPropagation();

            // 1. MENU PRINCIPAL (SKIPS)
            const menu = document.createElement('div');
            menu.id = 'cr-skip-menu';
            menu.innerHTML = `
                <div class="cr-menu-header">
                    <h3>⚙️ CR Utilities</h3>
                    <div class="cr-header-actions">
                        <button class="cr-icon-btn" id="cr-open-config" title="Configuration Cloud">${CR_GEAR_SVG_MINI}</button>
                        <button class="cr-icon-btn" id="cr-close-menu" title="Fermer">✖</button>
                    </div>
                </div>
                <div class="cr-row"><label><input type="checkbox" id="cr-auto-skip-cb" ${autoSkipEnabled ? 'checked' : ''}> Activer Auto Skip</label></div>
                <hr style="border-color: rgba(255,255,255,0.05); margin: 12px 0;">
                <div class="cr-row"><label>Type :</label><select id="cr-type-sel"><option value="intro">Intro</option><option value="outro">Outro</option></select></div>
                <div class="cr-row"><label>Début :</label><div class="cr-input-group"><input type="text" id="cr-start-in" placeholder="00:00"><button class="cr-btn-time" id="cr-get-start">⏱️</button></div></div>
                <div class="cr-row"><label>Fin :</label><div class="cr-input-group"><input type="text" id="cr-end-in" placeholder="01:30"><button class="cr-btn-time" id="cr-get-end">⏱️</button></div></div>
                <button class="cr-btn-save" id="cr-save-btn">Enregistrer le segment</button>
                <div id="cr-saved-list"></div>
                <div class="cr-sync-status" id="cr-sync-text">Vérification...</div>
            `;
            playerContainer.appendChild(menu);
            menu.addEventListener('mousedown', stop); menu.addEventListener('click', stop);

            // 2. MENU SECONDAIRE (CONFIGURATION CLOUD)
            const configMenu = document.createElement('div');
            configMenu.id = 'cr-config-menu';
            configMenu.innerHTML = `
                <div class="cr-menu-header">
                    <h3>☁️ Cloud Config</h3>
                    <div class="cr-header-actions">
                        <button class="cr-icon-btn" id="cr-close-config" title="Retour">✖</button>
                    </div>
                </div>
                <div style="font-size: 12px; color:#aaa; margin-bottom:12px; line-height: 1.4;">Entrez vos identifiants JSONBin.io pour synchroniser vos skips entre vos appareils.</div>
                
                <label style="font-size: 11px; color:#ddd; margin-bottom: 4px; display: block;">Bin ID</label>
                <input type="text" class="cr-input-full" id="cr-bin-id" placeholder="Ex: 69ef4a..." value="${GM_getValue('cr_bin_id', '')}">
                
                <label style="font-size: 11px; color:#ddd; margin-bottom: 4px; margin-top: 8px; display: block;">API Master Key</label>
                <input type="password" class="cr-input-full" id="cr-api-key" placeholder="Ex: $2a$10$..." value="${GM_getValue('cr_api_key', '')}">
                
                <button class="cr-btn-save" id="cr-save-keys" style="margin-top: 15px;">Sauvegarder & Retour</button>
            `;
            playerContainer.appendChild(configMenu);
            configMenu.addEventListener('mousedown', stop); configMenu.addEventListener('click', stop);

            // Événements de navigation
            document.getElementById('cr-close-menu').onclick = () => menu.style.display = 'none';
            document.getElementById('cr-open-config').onclick = () => {
                menu.style.display = 'none';
                configMenu.style.display = 'block';
            };
            document.getElementById('cr-close-config').onclick = () => {
                configMenu.style.display = 'none';
                menu.style.display = 'block';
            };
            
            // Sauvegarde config
            document.getElementById('cr-save-keys').onclick = () => {
                GM_setValue('cr_bin_id', document.getElementById('cr-bin-id').value.trim());
                GM_setValue('cr_api_key', document.getElementById('cr-api-key').value.trim());
                crLog("Clés Cloud sauvegardées en local.", "success");
                configMenu.style.display = 'none';
                menu.style.display = 'block';
                pullFromCloudBackground();
            };

            // Actions principales
            document.getElementById('cr-auto-skip-cb').onchange = (e) => { autoSkipEnabled = e.target.checked; GM_setValue('cr_auto_skip', autoSkipEnabled); };
            
            document.getElementById('cr-get-start').onclick = () => { 
                document.getElementById('cr-start-in').value = secondsToTime(videoElement.currentTime);
                document.getElementById('cr-end-in').value = secondsToTime(videoElement.currentTime + INTRO_OUTRO_LENGTH);
            };
            document.getElementById('cr-get-end').onclick = () => document.getElementById('cr-end-in').value = secondsToTime(videoElement.currentTime);

            document.getElementById('cr-save-btn').onclick = () => {
                const status = document.getElementById('cr-sync-text');
                const type = document.getElementById('cr-type-sel').value;
                const start = timeToSeconds(document.getElementById('cr-start-in').value);
                const end = timeToSeconds(document.getElementById('cr-end-in').value);
                
                localData[currentEpisodeId] = localData[currentEpisodeId] || {};
                localData[currentEpisodeId][type] = { start, end };
                GM_setValue('cr_sync_data', localData); 
                crLog(`Segment ${type} sauvegardé en local.`, "success", {start, end});
                
                document.getElementById('cr-start-in').value = '';
                document.getElementById('cr-end-in').value = '';
                hasAutoFilled = false;
                if (autoFillTimer) { clearTimeout(autoFillTimer); autoFillTimer = null; }

                updateMenuList(); drawHighlights();

                if (GM_getValue('cr_bin_id', '') && GM_getValue('cr_api_key', '')) {
                    status.innerText = "⏳ Envoi vers le Cloud...";
                    syncCloud("PUT", localData).then(() => {
                        status.innerText = "✅ Synchro Cloud OK";
                        crLog("Cloud mis à jour !", "success");
                        setTimeout(() => { if(status && status.innerText === "✅ Synchro Cloud OK") status.innerText = ""; }, 3000);
                    });
                }
            };
            
            updateMenuList();
            pullFromCloudBackground();
        }

        // 3. CRÉATION DU GROS BOUTON SUR LE LECTEUR
        if (!document.getElementById('cr-skip-btn')) {
            const outer = document.createElement('div'); outer.className = 'kat:relative';
            const inner = document.createElement('div'); inner.className = 'kat:relative';
            const btn = document.createElement('button');
            btn.id = 'cr-skip-btn'; btn.type = 'button'; btn.title = "CR Utilities";
            btn.className = 'kat:flex kat:items-center kat:justify-center kat:h-44 kat:w-44 kat:@lg:h-64 kat:@lg:w-64 kat:opacity-75 kat:hover:opacity-100 kat:fill-icon-tertiary kat:hover:bg-neutral-700 kat:rounded-full kat:cursor-pointer'; 
            btn.innerHTML = CR_GEAR_SVG_MAIN;
            
            const block = (e) => { e.preventDefault(); e.stopPropagation(); };
            btn.addEventListener('click', (e) => {
                block(e);
                const menu = document.getElementById('cr-skip-menu');
                const configMenu = document.getElementById('cr-config-menu');
                
                const isAnyMenuOpen = menu.style.display === 'block' || configMenu.style.display === 'block';
                
                if (isAnyMenuOpen) {
                    menu.style.display = 'none';
                    configMenu.style.display = 'none';
                } else {
                    menu.style.display = 'block';
                    if (videoElement && !hasAutoFilled) {
                        document.getElementById('cr-type-sel').value = videoElement.currentTime > (videoElement.duration/2) ? 'outro' : 'intro';
                        document.getElementById('cr-start-in').value = secondsToTime(videoElement.currentTime);
                        document.getElementById('cr-end-in').value = secondsToTime(videoElement.currentTime + INTRO_OUTRO_LENGTH);
                        
                        hasAutoFilled = true;
                        if (autoFillTimer) clearTimeout(autoFillTimer);
                        autoFillTimer = setTimeout(() => { hasAutoFilled = false; }, 120000);
                    }
                }
            });
            btn.addEventListener('mousedown', block);
            inner.appendChild(btn); outer.appendChild(inner);
            
            // Ciblage robuste et placement en 1ère position !
            let target = document.querySelector('[data-testid="settings-button"]') || 
                         document.querySelector('[data-testid="audio-and-subtitles-button"]') ||
                         document.querySelector('[data-testid="vilos-settings_menu"]');
            
            if (!target && playerContainer) {
                const all = Array.from(playerContainer.querySelectorAll('svg'));
                target = all.length > 2 ? all[all.length - 2].closest('button, [role="button"]') : null;
            }
            
            if (target) {
                while (target.parentElement && target.parentElement.classList.contains('kat:relative')) {
                    target = target.parentElement;
                }
                // On remonte au conteneur parent et on insère tout au début (firstChild)
                if (target.parentElement) {
                    target.parentElement.insertBefore(outer, target.parentElement.firstChild);
                }
            }
        }
    }

    function updateMenuList() {
        const list = document.getElementById('cr-saved-list');
        if (!list) return;
        list.innerHTML = `<div class="cr-saved-title">Segments sauvegardés :</div>`;
        const data = localData[currentEpisodeId] || {};
        
        let hasData = false;
        Object.keys(data).forEach(type => {
            hasData = true;
            const item = document.createElement('div'); item.className = 'cr-saved-item';
            item.innerHTML = `<span><b>${type.toUpperCase()}</b> ${secondsToTime(data[type].start)} - ${secondsToTime(data[type].end)}</span><button title="Supprimer">✖</button>`;
            item.querySelector('button').onclick = () => {
                delete localData[currentEpisodeId][type];
                GM_setValue('cr_sync_data', localData);
                updateMenuList(); drawHighlights();
                crLog(`Segment ${type} supprimé en local.`, "warn");
                
                if (GM_getValue('cr_bin_id', '') && GM_getValue('cr_api_key', '')) {
                    const status = document.getElementById('cr-sync-text');
                    if (status) status.innerText = "⏳ Suppression Cloud...";
                    syncCloud("PUT", localData).then(() => {
                        if (status) status.innerText = "✅ Synchro Cloud OK";
                        setTimeout(() => { if(status && status.innerText === "✅ Synchro Cloud OK") status.innerText = ""; }, 3000);
                    });
                }
            };
            list.appendChild(item);
        });
        
        if (!hasData) {
            list.innerHTML += `<div style="color: #666; padding-left: 5px;">Rien pour cet épisode.</div>`;
        }
    }

    window.addEventListener('pointerdown', (e) => {
        const m = document.getElementById('cr-skip-menu');
        const c = document.getElementById('cr-config-menu');
        const b = document.getElementById('cr-skip-btn');
        if (m?.style.display === 'block' && !m.contains(e.target) && !b?.contains(e.target)) m.style.display = 'none';
        if (c?.style.display === 'block' && !c.contains(e.target) && !b?.contains(e.target)) c.style.display = 'none';
    }, true);

    setInterval(() => {
        const id = getEpisodeId();
        
        // SÉCURITÉ SPA : Si on n'est pas sur un épisode, on réinitialise l'état et on s'arrête
        if (!id) {
            currentEpisodeId = null;
            videoElement = null;
            playerContainer = null;
            return;
        }

        if (id !== currentEpisodeId) {
            currentEpisodeId = id; 
            crLog("Changement d'épisode détecté : " + id, "info");
            
            hasAutoFilled = false;
            if (autoFillTimer) { clearTimeout(autoFillTimer); autoFillTimer = null; }
            
            updateMenuList(); drawHighlights();
        }
        initMenuAndButton();
        if (videoElement) drawHighlights();
    }, 1000);

})();