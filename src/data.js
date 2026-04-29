window.CRUtil = window.CRUtil || {};

window.CRUtil.DataManager = {
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
    },

    async syncCloud(method, data = null) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: method,
                url: window.CRUtil.Config.cloud.API_URL + window.CRUtil.Config.cloud.BIN_ID,
                headers: { "Content-Type": "application/json", "X-Master-Key": window.CRUtil.Config.cloud.API_KEY },
                data: data ? JSON.stringify(data) : null,
                onload: (res) => {
                    const json = JSON.parse(res.responseText);
                    resolve(json.record ? json.record : null);
                },
                onerror: () => resolve(null)
            });
        });
    },

    async pullFromCloud(updateUICallback) {
        window.CRUtil.UI.setStatus("⬇️ Vérification Cloud...");
        const cloud = await this.syncCloud("GET");
        
        if (!cloud) return window.CRUtil.UI.setStatus("❌ Erreur de connexion Cloud");
        if (cloud.init === "ok" && Object.keys(cloud).length === 1) return window.CRUtil.UI.setStatus("✅ Cloud vierge");
            
        if (JSON.stringify(cloud) !== JSON.stringify(this.localData)) {
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
                window.CRUtil.UI.setStatus("⏳ Envoi des anciens épisodes...");
                await this.syncCloud("PUT", this.localData);
            }
            if (updateUICallback) updateUICallback();
        }
        window.CRUtil.UI.setStatus("✅ À jour avec le Cloud");
    },

    async pushToCloud() {
        window.CRUtil.UI.setStatus("⏳ Envoi vers le Cloud...");
        await this.syncCloud("PUT", this.localData);
        window.CRUtil.UI.setStatus("✅ Synchro Cloud OK");
        setTimeout(() => { if (window.CRUtil.UI.getStatus() === "✅ Synchro Cloud OK") window.CRUtil.UI.setStatus(""); }, 3000);
    }
};