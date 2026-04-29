window.CRUtil = window.CRUtil || {};

window.CRUtil.UI = {
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
            <div class="cr-row"><label><input type="checkbox" id="cr-auto-skip-cb" ${window.CRUtil.VideoPlayer.autoSkipEnabled ? 'checked' : ''}> Activer Auto Skip</label></div>
            <hr style="border-color: rgba(255,255,255,0.05); margin: 12px 0;">
            <div class="cr-row"><label>Type :</label><select id="cr-type-sel"><option value="intro">Intro</option><option value="outro">Outro</option></select></div>
            <div class="cr-row"><label>Début :</label><div class="cr-input-group"><input type="text" id="cr-start-in" placeholder="00:00"><button class="cr-btn-time" id="cr-get-start">⏱️</button></div></div>
            <div class="cr-row"><label>Fin :</label><div class="cr-input-group"><input type="text" id="cr-end-in" placeholder="01:30"><button class="cr-btn-time" id="cr-get-end">⏱️</button></div></div>
            <button class="cr-btn-save" id="cr-save-btn">Enregistrer</button>
            <div id="cr-saved-list"></div>
            <div class="cr-sync-status" id="cr-sync-text">✅ Base locale prête</div>
        `;
        window.CRUtil.VideoPlayer.container.appendChild(menu);
        
        // Événements du menu
        const stop = (e) => e.stopPropagation();
        menu.addEventListener('mousedown', stop); 
        menu.addEventListener('click', stop);
        document.getElementById('cr-close-menu').onclick = () => menu.style.display = 'none';
        
        document.getElementById('cr-auto-skip-cb').onchange = (e) => { 
            window.CRUtil.VideoPlayer.autoSkipEnabled = e.target.checked; 
            GM_setValue('cr_auto_skip', window.CRUtil.VideoPlayer.autoSkipEnabled); 
        };
        
        document.getElementById('cr-get-start').onclick = () => { 
            document.getElementById('cr-start-in').value = window.CRUtil.Utils.secondsToTime(window.CRUtil.VideoPlayer.element.currentTime);
            document.getElementById('cr-end-in').value = window.CRUtil.Utils.secondsToTime(window.CRUtil.VideoPlayer.element.currentTime + window.CRUtil.Config.skip.DEFAULT_LENGTH);
        };
        
        document.getElementById('cr-get-end').onclick = () => {
            document.getElementById('cr-end-in').value = window.CRUtil.Utils.secondsToTime(window.CRUtil.VideoPlayer.element.currentTime);
        };

        document.getElementById('cr-save-btn').onclick = () => {
            const epId = window.CRUtil.DataManager.getEpisodeId();
            if(!epId) return;

            const type = document.getElementById('cr-type-sel').value;
            const start = window.CRUtil.Utils.timeToSeconds(document.getElementById('cr-start-in').value);
            const end = window.CRUtil.Utils.timeToSeconds(document.getElementById('cr-end-in').value);
            
            window.CRUtil.DataManager.localData[epId] = window.CRUtil.DataManager.localData[epId] || {};
            window.CRUtil.DataManager.localData[epId][type] = { start, end };
            window.CRUtil.DataManager.saveLocalData(); 
            
            document.getElementById('cr-start-in').value = '';
            document.getElementById('cr-end-in').value = '';
            this.resetAutoFill();

            this.updateList(); 
            this.drawHighlights();
            window.CRUtil.DataManager.pushToCloud();
        };

        this.updateList();
        
        // On lance la vérification Cloud silencieuse juste après avoir créé le menu
        window.CRUtil.DataManager.pullFromCloud(() => { 
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
        btn.innerHTML = window.CRUtil.Config.svg.GEAR;
        
        const block = (e) => { e.preventDefault(); e.stopPropagation(); };
        btn.addEventListener('click', (e) => {
            block(e);
            const menu = document.getElementById('cr-skip-menu');
            const isOp = menu.style.display !== 'block';
            menu.style.display = isOp ? 'block' : 'none';
            
            if (isOp && window.CRUtil.VideoPlayer.element && !this.hasAutoFilled) {
                document.getElementById('cr-type-sel').value = window.CRUtil.VideoPlayer.element.currentTime > (window.CRUtil.VideoPlayer.element.duration/2) ? 'outro' : 'intro';
                document.getElementById('cr-start-in').value = window.CRUtil.Utils.secondsToTime(window.CRUtil.VideoPlayer.element.currentTime);
                document.getElementById('cr-end-in').value = window.CRUtil.Utils.secondsToTime(window.CRUtil.VideoPlayer.element.currentTime + window.CRUtil.Config.skip.DEFAULT_LENGTH);
                
                this.hasAutoFilled = true;
                if (this.autoFillTimer) clearTimeout(this.autoFillTimer);
                this.autoFillTimer = setTimeout(() => { this.hasAutoFilled = false; }, 120000);
            }
        });
        btn.addEventListener('mousedown', block);
        
        inner.appendChild(btn); outer.appendChild(inner);
        const all = Array.from(window.CRUtil.VideoPlayer.container.querySelectorAll('svg'));
        let target = all.length > 2 ? all[all.length - 2].closest('button, [role="button"]') : null;
        
        if (target) {
            while (target.parentElement && target.parentElement.classList.contains('kat:relative')) { 
                target = target.parentElement; 
            }
            if (target.parentElement) target.parentElement.insertBefore(outer, target);
        }
    },

    updateList() {
        const list = document.getElementById('cr-saved-list');
        if (!list) return;
        list.innerHTML = `<div class="cr-saved-title">Segments sauvegardés :</div>`;
        const epId = window.CRUtil.DataManager.getEpisodeId();
        const data = window.CRUtil.DataManager.getEpisodeData(epId);
        
        Object.keys(data).forEach(type => {
            const item = document.createElement('div'); item.className = 'cr-saved-item';
            item.innerHTML = `<span><b>${type.toUpperCase()}</b> ${window.CRUtil.Utils.secondsToTime(data[type].start)} - ${window.CRUtil.Utils.secondsToTime(data[type].end)}</span><button>✖</button>`;
            item.querySelector('button').onclick = () => {
                delete window.CRUtil.DataManager.localData[epId][type];
                window.CRUtil.DataManager.saveLocalData();
                this.updateList(); 
                this.drawHighlights();
                window.CRUtil.DataManager.pushToCloud();
            };
            list.appendChild(item);
        });
    },

    drawHighlights() {
        if (!window.CRUtil.VideoPlayer.element) return;
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

        const epId = window.CRUtil.DataManager.getEpisodeId();
        const data = window.CRUtil.DataManager.getEpisodeData(epId);
        const duration = window.CRUtil.VideoPlayer.element.duration;
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