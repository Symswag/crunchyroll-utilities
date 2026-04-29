window.CRUtil = window.CRUtil || {};
window.CRUtil.UI = {
    hasAutoFilled: false,
    autoFillTimer: null,

    injectCSS() {
        GM_addStyle(`
            #cr-skip-menu { position: absolute; bottom: 85px; right: 15px; z-index: 2147483647; background: rgba(14, 15, 18, 0.95); color: #fff; padding: 18px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); width: 300px; font-family: "Segoe UI", sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.7); display: none; backdrop-filter: blur(5px); }
            .cr-menu-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); }
            .cr-menu-header h3 { margin: 0; color: #f47521; font-size: 16px; font-weight: 700; text-transform: uppercase; }
            .cr-row { margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; font-size: 14px; }
            .cr-input-full { background: #1e1f23; color: #fff; border: 1px solid #333; padding: 5px; width: 100%; border-radius: 4px; font-size: 11px; margin-bottom: 5px; }
            .cr-btn-save { background: #f47521; color: white; border: none; width: 100%; padding: 10px; cursor: pointer; border-radius: 4px; font-weight: bold; margin-top: 5px; }
            #cr-progress-overlay { position: absolute; left: 0; width: 100%; top: 50%; transform: translateY(-50%); height: 4px; pointer-events: none; }
            .cr-highlight { position: absolute; height: 100%; opacity: 0.8; }
            .cr-hl-intro { background: #28a745; } .cr-hl-outro { background: #dc3545; }
            .cr-sync-status { font-size: 10px; text-align: center; margin-top: 10px; color: #888; }
        `);
    },

    setStatus(msg) { const el = document.getElementById('cr-sync-text'); if (el) el.innerText = msg; },

    buildMenu() {
        if (document.getElementById('cr-skip-menu')) return;
        const menu = document.createElement('div');
        menu.id = 'cr-skip-menu';
        menu.innerHTML = `
            <div class="cr-menu-header"><h3>⚙️ CR Utilities</h3></div>
            <div style="font-size: 11px; color:#aaa; margin-bottom:5px;">🔑 Config Cloud</div>
            <input type="text" class="cr-input-full" id="cr-bin-id" placeholder="Bin ID" value="${window.CRUtil.Config.cloud.BIN_ID}">
            <input type="password" class="cr-input-full" id="cr-api-key" placeholder="API Key" value="${window.CRUtil.Config.cloud.API_KEY}">
            <button class="cr-btn-save" style="background:#444; padding:5px; margin-bottom:10px;" id="cr-save-keys">Sauver Clés</button>
            <hr style="opacity:0.1">
            <div class="cr-row">Début: <input type="text" id="cr-start-in" style="width:70px"></div>
            <div class="cr-row">Fin: <input type="text" id="cr-end-in" style="width:70px"></div>
            <button class="cr-btn-save" id="cr-save-btn">Enregistrer Segment</button>
            <div id="cr-saved-list" style="margin-top:10px"></div>
            <div class="cr-sync-status" id="cr-sync-text"></div>
        `;
        window.CRUtil.VideoPlayer.container.appendChild(menu);
        
        document.getElementById('cr-save-keys').onclick = () => {
            GM_setValue('cr_bin_id', document.getElementById('cr-bin-id').value.trim());
            GM_setValue('cr_api_key', document.getElementById('cr-api-key').value.trim());
            location.reload();
        };

        document.getElementById('cr-save-btn').onclick = () => {
            const epId = window.CRUtil.DataManager.getEpisodeId();
            const start = window.CRUtil.Utils.timeToSeconds(document.getElementById('cr-start-in').value);
            const end = window.CRUtil.Utils.timeToSeconds(document.getElementById('cr-end-in').value);
            window.CRUtil.DataManager.localData[epId] = { intro: {start, end} }; // Simplifié pour l'exemple
            window.CRUtil.DataManager.saveLocalData();
            window.CRUtil.DataManager.pushToCloud();
            this.updateList();
        };
        this.updateList();
        window.CRUtil.DataManager.pullFromCloud(() => this.updateList());
    },

    buildButton() {
        if (document.getElementById('cr-skip-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'cr-skip-btn';
        btn.className = 'kat:flex kat:items-center kat:justify-center kat:h-44 kat:w-44 kat:opacity-75 kat:hover:opacity-100 kat:cursor-pointer';
        btn.innerHTML = window.CRUtil.Config.svg.GEAR;
        btn.onclick = (e) => {
            e.stopPropagation();
            const m = document.getElementById('cr-skip-menu');
            m.style.display = m.style.display === 'none' ? 'block' : 'none';
        };

        // Ciblage Robuste
        let target = document.querySelector('[data-testid="settings-button"]') || document.querySelector('[data-testid="audio-and-subtitles-button"]');
        if (target) {
            while (target.parentElement && target.parentElement.classList.contains('kat:relative')) { target = target.parentElement; }
            target.parentElement.insertBefore(btn, target);
        }
    },

    updateList() { /* ... Logique de liste habituelle ... */ },
    drawHighlights() { /* ... Logique de barres habituelle ... */ },
    resetAutoFill() { /* ... */ }
};