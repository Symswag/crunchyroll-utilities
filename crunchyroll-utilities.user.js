// ==UserScript==
// @name         Crunchyroll Utilities
// @namespace    http://tampermonkey.net/
// @version      7.0.0
// @description  Couteau suisse pour Crunchyroll : Auto-Skip, Local-First & Cloud Sync (Fichier Unique).
// @author       Symswag
// @match        *://*.crunchyroll.com/watch/*
// @match        *://*.crunchyroll.com/*/watch/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      api.jsonbin.io
// ==/UserScript==

(function() {
    'use strict';

    // Notre espace global pour ranger le code proprement
    const CRUtil = {};

    // =====================================================================
    // 1. CONFIGURATION GLOBALE
    // =====================================================================
    CRUtil.Config = {
        cloud: {
            get BIN_ID() { return GM_getValue('cr_bin_id', ''); },
            get API_KEY() { return GM_getValue('cr_api_key', ''); },
            API_URL: "https://api.jsonbin.io/v3/b/"
        },
        skip: {
            DEFAULT_LENGTH: 90
        },
        svg: {
            GEAR: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="kat:w-24 kat:h-24 kat:@lg:w-40 kat:@lg:h-40 kat:shrink-0"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.05-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.12.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.73 8.87c-.11.2-.06.47.12.61l2.03 1.58c-.04.3-.06.62-.06.94s.02.64.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.12-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.11-.2.06-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor"/></svg>`
        }
    };

    // =====================================================================
    // 2. UTILITAIRES
    // =====================================================================
    CRUtil.Utils = {
        timeToSeconds(timeStr) {
            if (!timeStr) return 0;
            const parts = timeStr.split(':').map(Number);
            if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
            if (parts.length === 2) return parts[0] * 60 + parts[1];
            return isNaN(parts[0]) ? 0 : parts[0];
        },
        
        secondsToTime(seconds) {
            if (isNaN(seconds)) return "00:00";
            seconds = Math.max(0, seconds);
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        },

        log(message, type = 'info', data = null) {
            const prefix = '%c CR Utils ';
            const prefixStyle = 'background: #f47521; color: #ffffff; font-weight: bold; border-radius: 4px; padding: 2px 4px; margin-right: 5px; font-family: sans-serif;';
            let msgStyle = 'font-weight: bold; font-family: sans-serif; ';
            
            switch (type.toLowerCase()) {
                case 'success': msgStyle += 'color: #28a745;'; break;
                case 'warn':    msgStyle += 'color: #ffc107;'; break;
                case 'error':   msgStyle += 'color: #dc3545;'; break;
                case 'cloud':   msgStyle += 'color: #0dcaf0;'; break;
                case 'info':
                default:        msgStyle += 'color: #007bff;'; break;
            }

            if (data !== null) console.log(`${prefix}%c${message}`, prefixStyle, msgStyle, data);
            else console.log(`${prefix}%c${message}`, prefixStyle, msgStyle);
        }
    };

    // =====================================================================
    // 3. GESTION DES DONNÉES (LOCAL & CLOUD)
    // =====================================================================
    CRUtil.DataManager = {
        localData: GM_getValue('cr_sync_data', {}),

        getEpisodeId() {
            const match = window.location.pathname.match(/\/watch\/([^\/]+)/);
            return match ? match[1] : null;
        },

        getEpisodeData(epId) {
            return this.localData[epId] || {};
        },

        saveLocalData() {
            GM_setValue('cr_sync_data', this.localData);
            CRUtil.Utils.log("Données sauvegardées en local", "success");
        },

        async syncCloud(method, data = null) {
            const binId = CRUtil.Config.cloud.BIN_ID;
            const apiKey = CRUtil.Config.cloud.API_KEY;
            
            if (!binId || !apiKey) {
                CRUtil.Utils.log("Clés Cloud manquantes, annulation de la requête", "warn");
                return Promise.resolve(null);
            }

            return new Promise((resolve) => {
                GM_xmlhttpRequest({
                    method: method,
                    url: CRUtil.Config.cloud.API_URL + binId,
                    headers: { "Content-Type": "application/json", "X-Master-Key": apiKey },
                    data: data ? JSON.stringify(data) : null,
                    onload: (res) => {
                        try {
                            const json = JSON.parse(res.responseText);
                            resolve(json.record ? json.record : null);
                        } catch (e) {
                            CRUtil.Utils.log("Erreur de parsing JSON", "error", e);
                            resolve(null); 
                        }
                    },
                    onerror: (err) => {
                        CRUtil.Utils.log("Erreur réseau JSONBin", "error", err);
                        resolve(null);
                    }
                });
            });
        },

        async pullFromCloud(updateUICallback) {
            if (!CRUtil.Config.cloud.BIN_ID || !CRUtil.Config.cloud.API_KEY) {
                return CRUtil.UI.setStatus("⚠️ Clés Cloud manquantes");
            }

            CRUtil.UI.setStatus("⬇️ Vérification Cloud...");
            CRUtil.Utils.log("Récupération des données depuis le Cloud...", "cloud");
            
            const cloud = await this.syncCloud("GET");
            
            if (!cloud) return CRUtil.UI.setStatus("❌ Erreur de connexion Cloud");
            if (cloud.init === "ok" && Object.keys(cloud).length === 1) return CRUtil.UI.setStatus("✅ Cloud vierge");
                
            if (JSON.stringify(cloud) !== JSON.stringify(this.localData)) {
                CRUtil.Utils.log("Mise à jour détectée sur le Cloud !", "info", cloud);
                
                let needPush = false;
                GM_listValues().forEach(key => {
                    if (key.startsWith("cr_ep_")) {
                        const epId = key.replace("cr_ep_", "");
                        if (!cloud[epId]) { cloud[epId] = GM_getValue(key); needPush = true; }
                    }
                });

                this.localData = cloud;
                this.saveLocalData();
                
                if (needPush) {
                    CRUtil.UI.setStatus("⏳ Envoi des anciens épisodes...");
                    await this.syncCloud("PUT", this.localData);
                }
                if (updateUICallback) updateUICallback();
            } else {
                CRUtil.Utils.log("Le local est déjà à jour avec le Cloud.", "success");
            }
            CRUtil.UI.setStatus("✅ À jour avec le Cloud");
        },

        async pushToCloud() {
            if (!CRUtil.Config.cloud.BIN_ID || !CRUtil.Config.cloud.API_KEY) return;
            
            CRUtil.UI.setStatus("⏳ Envoi vers le Cloud...");
            CRUtil.Utils.log("Envoi des données vers JSONBin...", "cloud", this.localData);
            
            await this.syncCloud("PUT", this.localData);
            CRUtil.UI.setStatus("✅ Synchro Cloud OK");
            CRUtil.Utils.log("Cloud mis à jour avec succès !", "success");
            
            setTimeout(() => { if (CRUtil.UI.getStatus() === "✅ Synchro Cloud OK") CRUtil.UI.setStatus(""); }, 3000);
        }
    };

    // =====================================================================
    // 4. LECTEUR VIDÉO
    // =====================================================================
    CRUtil.VideoPlayer = {
        element: null,
        container: null,
        isSkipping: false,
        autoSkipEnabled: GM_getValue('cr_auto_skip', true),

        init() {
            this.element = document.querySelector('video');
            if (!this.element) return;
            
            this.container = this.element.parentElement.parentElement;
            if (!this.container) return;

            if (!this.element.dataset.crSkipInitialized) {
                this.element.addEventListener('timeupdate', () => this.handleTimeUpdate());
                this.element.addEventListener('loadedmetadata', () => setTimeout(() => CRUtil.UI.drawHighlights(), 1000));
                this.element.dataset.crSkipInitialized = "true";
                CRUtil.Utils.log("Lecteur vidéo accroché avec succès.", "success");
            }
        },

        jumpToTime(targetTime) {
            this.isSkipping = true; 
            const slider = document.querySelector('input.timeline-slider[type="range"]');
            CRUtil.Utils.log(`Saut auto vers ${CRUtil.Utils.secondsToTime(targetTime)}`, "info");
            
            if (slider) {
                slider.value = targetTime;
                slider.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                slider.dispatchEvent(new Event('input', { bubbles: true })); 
                slider.dispatchEvent(new Event('change', { bubbles: true }));
                slider.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            } else {
                this.element.currentTime = targetTime;
            }
            setTimeout(() => { this.isSkipping = false; }, 1000);
        },

        handleTimeUpdate() {
            if (!this.autoSkipEnabled || !this.element || this.isSkipping) return;
            
            const epId = CRUtil.DataManager.getEpisodeId();
            const data = CRUtil.DataManager.getEpisodeData(epId);
            const currentTime = this.element.currentTime;
            const duration = this.element.duration; 

            if (data.intro && currentTime >= data.intro.start && currentTime < data.intro.end - 0.5) {
                this.jumpToTime(data.intro.end);
            }
            else if (data.outro && currentTime >= data.outro.start && currentTime < data.outro.end - 0.5) {
                let targetOutroTime = data.outro.end;
                if (!isNaN(duration) && targetOutroTime > duration - 2) targetOutroTime = duration - 2; 
                if (currentTime < targetOutroTime) this.jumpToTime(targetOutroTime);
            }
        }
    };

    // =====================================================================
    // 5. INTERFACE UTILISATEUR (UI)
    // =====================================================================
    CRUtil.UI = {
        hasAutoFilled: false,
        autoFillTimer: null,

        injectCSS() {
            GM_addStyle(`
                #cr-skip-menu { position: absolute; bottom: 85px; right: 15px; z-index: 2147483647; background: rgba(14, 15, 18, 0.95); color: #fff; padding: 18px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); width: 300px; font-family: "Segoe UI", sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.7); display: none; backdrop-filter: blur(5px); }
                .cr-menu-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); }
                .cr-menu-header h3 { margin: 0; color: #f47521; font-size: 16px; font-weight: 700; text-transform: uppercase; }
                #cr-close-menu { background: transparent; color: #aaa; border: none; font-size: 20px; cursor: pointer; padding: 0; line-height: 1; }
                #cr-close-menu:hover { color: #fff; }
                .cr-row { margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; font-size: 14px; }
                .cr-row label { color: #ddd; display: flex; align-items: center; gap: 8px; cursor: pointer; }
                .cr-input-group { display: flex; align-items: center; gap: 5px; }
                .cr-row input[type="text"] { width: 75px; background: #2a2c33; color: #fff; border: 1px solid #444; padding: 6px; border-radius: 4px; text-align: center; font-family: monospace; }
                .cr-row input[type="text"]:focus { border-color: #f47521; outline: none; }
                .cr-row select { background: #2a2c33; color: #fff; border: 1px solid #444; padding: 6px; border-radius: 4px; width: 100px; cursor: pointer; }
                .cr-btn-time { background: transparent; color: #f47521; border: 1px solid rgba(244,117,33,0.3); padding: 5px 8px; cursor: pointer; border-radius: 4px; transition: background 0.2s; }
                .cr-btn-time:hover { background: rgba(244,117,33,0.1); border-color: rgba(244,117,33,0.6); }
                .cr-btn-save { background: #f47521; color: white; border: none; width: 100%; padding: 10px; margin-top: 10px; font-weight: bold; cursor: pointer; border-radius: 4px; text-transform: uppercase; font-size: 13px; transition: background 0.2s; }
                .cr-btn-save:hover { background: #df6210; }
                
                .cr-input-full { background: #1e1f23; color: #aaa; border: 1px solid #333; padding: 6px; border-radius: 4px; width: 100%; font-family: monospace; font-size: 11px; margin-bottom: 5px; box-sizing: border-box; }
                .cr-input-full:focus { border-color: #f47521; outline: none; color: #fff;}
                .cr-btn-small { background: transparent; color: #aaa; border: 1px solid #444; padding: 4px; width: 100%; cursor: pointer; border-radius: 4px; font-size: 11px; transition: all 0.2s; margin-bottom: 10px; }
                .cr-btn-small:hover { background: #333; color: #fff; }

                #cr-saved-list { margin-top: 15px; font-size: 13px; }
                .cr-saved-item { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 8px; margin-bottom: 6px; border-radius: 4px; }
                .cr-saved-item b { color: #f47521; }
                .cr-saved-item button { background: rgba(217, 83, 79, 0.1); border: 1px solid rgba(217, 83, 79, 0.3); color: #d9534f; border-radius: 4px; cursor: pointer; padding: 4px 8px; font-size: 11px; }
                #cr-progress-overlay { position: absolute; left: 0; width: 100%; top: 50%; transform: translateY(-50%); height: 4px; pointer-events: none; z-index: 10; }
                .cr-highlight { position: absolute; height: 100%; opacity: 0.9; border-radius: 2px; }
                .cr-hl-intro { background-color: #28a745; }
                .cr-hl-outro { background-color: #dc3545; }
                #cr-skip-btn:hover svg { fill: #f47521; }
                .cr-sync-status { font-size: 10px; text-align: center; margin-top: 10px; opacity: 0.5; color: #aaa; }
            `);
        },

        setStatus(msg) {
            const el = document.getElementById('cr-sync-text');
            if (el) el.innerText = msg;
        },

        getStatus() {
            const el = document.getElementById('cr-sync-text');
            return el ? el.innerText : "";
        },

        buildMenu() {
            if (document.getElementById('cr-skip-menu')) return;
            
            const menu = document.createElement('div');
            menu.id = 'cr-skip-menu';
            menu.style.display = 'none'; 
            menu.innerHTML = `
                <div class="cr-menu-header"><h3>⚙️ CR Utilities</h3><button id="cr-close-menu">✖</button></div>
                <div class="cr-row"><label><input type="checkbox" id="cr-auto-skip-cb" ${CRUtil.VideoPlayer.autoSkipEnabled ? 'checked' : ''}> Activer Auto Skip</label></div>
                
                <hr style="border-color: rgba(255,255,255,0.05); margin: 12px 0;">
                <div style="font-size: 11px; color:#aaa; margin-bottom:4px;">🔑 JSONBin (BIN_ID / API_KEY)</div>
                <input type="text" class="cr-input-full" id="cr-bin-id" placeholder="Ex: 69ef4a..." value="${CRUtil.Config.cloud.BIN_ID}">
                <input type="password" class="cr-input-full" id="cr-api-key" placeholder="Ex: $2a$10$..." value="${CRUtil.Config.cloud.API_KEY}">
                <button class="cr-btn-small" id="cr-save-keys">Sauvegarder les clés Cloud</button>

                <hr style="border-color: rgba(255,255,255,0.05); margin: 12px 0;">
                <div class="cr-row"><label>Type :</label><select id="cr-type-sel"><option value="intro">Intro</option><option value="outro">Outro</option></select></div>
                <div class="cr-row"><label>Début :</label><div class="cr-input-group"><input type="text" id="cr-start-in" placeholder="00:00"><button class="cr-btn-time" id="cr-get-start">⏱️</button></div></div>
                <div class="cr-row"><label>Fin :</label><div class="cr-input-group"><input type="text" id="cr-end-in" placeholder="01:30"><button class="cr-btn-time" id="cr-get-end">⏱️</button></div></div>
                <button class="cr-btn-save" id="cr-save-btn">Enregistrer le Segment</button>
                <div id="cr-saved-list"></div>
                <div class="cr-sync-status" id="cr-sync-text">Vérification...</div>
            `;
            CRUtil.VideoPlayer.container.appendChild(menu);
            
            // Events menu
            const stop = (e) => e.stopPropagation();
            menu.addEventListener('mousedown', stop); 
            menu.addEventListener('click', stop);
            document.getElementById('cr-close-menu').onclick = () => menu.style.display = 'none';
            
            // Bouton sauvegarde clés Cloud
            document.getElementById('cr-save-keys').onclick = () => {
                GM_setValue('cr_bin_id', document.getElementById('cr-bin-id').value.trim());
                GM_setValue('cr_api_key', document.getElementById('cr-api-key').value.trim());
                CRUtil.Utils.log("Clés Cloud sauvegardées en local.", "success");
                
                CRUtil.DataManager.pullFromCloud(() => { 
                    this.updateList(); 
                    this.drawHighlights(); 
                });
            };

            document.getElementById('cr-auto-skip-cb').onchange = (e) => { 
                CRUtil.VideoPlayer.autoSkipEnabled = e.target.checked; 
                GM_setValue('cr_auto_skip', CRUtil.VideoPlayer.autoSkipEnabled); 
            };
            
            document.getElementById('cr-get-start').onclick = () => { 
                document.getElementById('cr-start-in').value = CRUtil.Utils.secondsToTime(CRUtil.VideoPlayer.element.currentTime);
                document.getElementById('cr-end-in').value = CRUtil.Utils.secondsToTime(CRUtil.VideoPlayer.element.currentTime + CRUtil.Config.skip.DEFAULT_LENGTH);
            };
            
            document.getElementById('cr-get-end').onclick = () => {
                document.getElementById('cr-end-in').value = CRUtil.Utils.secondsToTime(CRUtil.VideoPlayer.element.currentTime);
            };

            document.getElementById('cr-save-btn').onclick = () => {
                const epId = CRUtil.DataManager.getEpisodeId();
                if(!epId) return;

                const type = document.getElementById('cr-type-sel').value;
                const start = CRUtil.Utils.timeToSeconds(document.getElementById('cr-start-in').value);
                const end = CRUtil.Utils.timeToSeconds(document.getElementById('cr-end-in').value);
                
                CRUtil.DataManager.localData[epId] = CRUtil.DataManager.localData[epId] || {};
                CRUtil.DataManager.localData[epId][type] = { start, end };
                
                CRUtil.DataManager.saveLocalData(); 
                
                document.getElementById('cr-start-in').value = '';
                document.getElementById('cr-end-in').value = '';
                this.resetAutoFill();

                this.updateList(); 
                this.drawHighlights();
                CRUtil.DataManager.pushToCloud();
            };

            this.updateList();
            
            // Lance la vérification au démarrage du menu
            CRUtil.DataManager.pullFromCloud(() => { 
                this.updateList(); 
                this.drawHighlights(); 
            });
        },

        buildButton() {
            if (document.getElementById('cr-skip-btn')) return;
            
            const outer = document.createElement('div'); outer.className = 'kat:relative';
            const inner = document.createElement('div'); inner.className = 'kat:relative';
            const btn = document.createElement('button');
            btn.id = 'cr-skip-btn'; btn.type = 'button'; btn.title = "CR Utilities";
            btn.className = 'kat:flex kat:items-center kat:justify-center kat:h-44 kat:w-44 kat:@lg:h-64 kat:@lg:w-64 kat:opacity-75 kat:hover:opacity-100 kat:fill-icon-tertiary kat:hover:bg-neutral-700 kat:rounded-full kat:cursor-pointer'; 
            btn.innerHTML = CRUtil.Config.svg.GEAR;
            
            const block = (e) => { e.preventDefault(); e.stopPropagation(); };
            
            btn.addEventListener('click', (e) => {
                block(e);
                const menu = document.getElementById('cr-skip-menu');
                const isOp = menu.style.display !== 'block';
                menu.style.display = isOp ? 'block' : 'none';
                
                if (isOp && CRUtil.VideoPlayer.element && !this.hasAutoFilled) {
                    document.getElementById('cr-type-sel').value = CRUtil.VideoPlayer.element.currentTime > (CRUtil.VideoPlayer.element.duration/2) ? 'outro' : 'intro';
                    document.getElementById('cr-start-in').value = CRUtil.Utils.secondsToTime(CRUtil.VideoPlayer.element.currentTime);
                    document.getElementById('cr-end-in').value = CRUtil.Utils.secondsToTime(CRUtil.VideoPlayer.element.currentTime + CRUtil.Config.skip.DEFAULT_LENGTH);
                    
                    this.hasAutoFilled = true;
                    if (this.autoFillTimer) clearTimeout(this.autoFillTimer);
                    this.autoFillTimer = setTimeout(() => { this.hasAutoFilled = false; }, 120000);
                }
            });
            btn.addEventListener('mousedown', block);
            
            inner.appendChild(btn); outer.appendChild(inner);
            
            // Ciblage robuste (anti-Poupées Russes)
            let target = document.querySelector('[data-testid="settings-button"]') || 
                         document.querySelector('[data-testid="audio-and-subtitles-button"]') ||
                         document.querySelector('[data-testid="vilos-settings_menu"]');
            
            // Fallback si Crunchyroll a changé ses attributs
            if (!target && CRUtil.VideoPlayer.container) {
                const all = Array.from(CRUtil.VideoPlayer.container.querySelectorAll('svg'));
                target = all.length > 2 ? all[all.length - 2].closest('button, [role="button"]') : null;
            }
            
            if (target) {
                while (target.parentElement && target.parentElement.classList.contains('kat:relative')) {
                    target = target.parentElement;
                }
                if (target.parentElement) {
                    target.parentElement.insertBefore(outer, target);
                }
            }
        },

        updateList() {
            const list = document.getElementById('cr-saved-list');
            if (!list) return;
            
            list.innerHTML = `<div class="cr-saved-title">Segments sauvegardés :</div>`;
            const epId = CRUtil.DataManager.getEpisodeId();
            const data = CRUtil.DataManager.getEpisodeData(epId);
            
            let hasData = false;
            
            Object.keys(data).forEach(type => {
                hasData = true;
                const item = document.createElement('div'); 
                item.className = 'cr-saved-item';
                item.innerHTML = `
                    <span><b>${type.toUpperCase()}</b> ${CRUtil.Utils.secondsToTime(data[type].start)} - ${CRUtil.Utils.secondsToTime(data[type].end)}</span>
                    <button title="Supprimer ce segment">✖</button>
                `;
                
                item.querySelector('button').onclick = () => {
                    delete CRUtil.DataManager.localData[epId][type];
                    CRUtil.DataManager.saveLocalData();
                    this.updateList(); 
                    this.drawHighlights();
                    CRUtil.DataManager.pushToCloud();
                };
                
                list.appendChild(item);
            });

            if (!hasData) {
                list.innerHTML += `<div style="color: #666; padding-left: 5px;">Rien pour cet épisode.</div>`;
            }
        },

        drawHighlights() {
            if (!CRUtil.VideoPlayer || !CRUtil.VideoPlayer.element) return;
            
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

            const epId = CRUtil.DataManager.getEpisodeId();
            const data = CRUtil.DataManager.getEpisodeData(epId);
            const duration = CRUtil.VideoPlayer.element.duration;
            
            if (isNaN(duration) || duration === 0) return;

            ['intro', 'outro'].forEach(type => {
                if (data[type]) {
                    const hl = document.createElement('div');
                    hl.className = `cr-highlight cr-hl-${type}`;
                    hl.style.left = `${(data[type].start / duration) * 100}%`;
                    hl.style.width = `${((data[type].end - data[type].start) / duration) * 100}%`;
                    overlay.appendChild(hl);
                }
            });
        },

        resetAutoFill() {
            this.hasAutoFilled = false;
            if (this.autoFillTimer) { 
                clearTimeout(this.autoFillTimer); 
                this.autoFillTimer = null; 
            }
        }
    };

    // =====================================================================
    // 6. INITIALISATION ET BOUCLE DE VIE
    // =====================================================================
    CRUtil.UI.injectCSS();
    let lastEpisodeId = null;

    // Fermeture du menu au clic à l'extérieur
    window.addEventListener('pointerdown', (e) => {
        const m = document.getElementById('cr-skip-menu');
        const b = document.getElementById('cr-skip-btn');
        if (m?.style.display === 'block' && !m.contains(e.target) && !b?.contains(e.target)) {
            m.style.display = 'none';
        }
    }, true);

    // Boucle de survie (1000ms)
    setInterval(() => {
        CRUtil.VideoPlayer.init();
        
        if (!CRUtil.VideoPlayer.container) return;

        const currentEpId = CRUtil.DataManager.getEpisodeId();
        
        // Détection d'un changement d'épisode dans le lecteur
        if (currentEpId && currentEpId !== lastEpisodeId) {
            lastEpisodeId = currentEpId; 
            CRUtil.UI.resetAutoFill();
            CRUtil.UI.updateList(); 
            CRUtil.UI.drawHighlights();
            CRUtil.Utils.log("Changement d'épisode détecté : " + currentEpId, "info");
        }

        // On garantit que l'UI est toujours injectée
        CRUtil.UI.buildMenu();
        CRUtil.UI.buildButton();
        
        // On maintient les couleurs sur la barre de progression
        if (CRUtil.VideoPlayer.element) {
            CRUtil.UI.drawHighlights();
        }
    }, 1000);

})();