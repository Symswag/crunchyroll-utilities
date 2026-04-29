window.CRUtil = window.CRUtil || {};
window.CRUtil.DataManager = {
    localData: GM_getValue('cr_sync_data', {}),

    getEpisodeId() {
        const match = window.location.pathname.match(/\/watch\/([^\/]+)/);
        return match ? match[1] : null;
    },

    getEpisodeData(epId) { return this.localData[epId] || {}; },

    saveLocalData() { GM_setValue('cr_sync_data', this.localData); },

    async syncCloud(method, data = null) {
        const binId = window.CRUtil.Config.cloud.BIN_ID;
        const apiKey = window.CRUtil.Config.cloud.API_KEY;
        if (!binId || !apiKey) return null;

        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: method,
                url: window.CRUtil.Config.cloud.API_URL + binId,
                headers: { "Content-Type": "application/json", "X-Master-Key": apiKey },
                data: data ? JSON.stringify(data) : null,
                onload: (res) => {
                    try { resolve(JSON.parse(res.responseText).record); } catch(e) { resolve(null); }
                },
                onerror: () => resolve(null)
            });
        });
    },

    async pullFromCloud(cb) {
        if (!window.CRUtil.Config.cloud.BIN_ID) return window.CRUtil.UI.setStatus("⚠️ Clés Cloud manquantes");
        window.CRUtil.UI.setStatus("⬇️ Synchro...");
        const cloud = await this.syncCloud("GET");
        if (cloud && JSON.stringify(cloud) !== JSON.stringify(this.localData)) {
            this.localData = cloud;
            this.saveLocalData();
            if (cb) cb();
        }
        window.CRUtil.UI.setStatus("✅ Cloud à jour");
    },

    async pushToCloud() {
        if (!window.CRUtil.Config.cloud.BIN_ID) return;
        window.CRUtil.UI.setStatus("⏳ Envoi...");
        await this.syncCloud("PUT", this.localData);
        window.CRUtil.UI.setStatus("✅ OK");
    }
};