window.CRUtil = window.CRUtil || {};
window.CRUtil.Utils = {
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
    // --- SYSTÈME DE LOGS PERSONNALISÉ ---
    log(message, type = 'info', data = null) {
        // Le petit badge orange vif [CR Utils]
        const prefix = '%c CR Utils ';
        const prefixStyle = 'background: #f47521; color: #ffffff; font-weight: bold; border-radius: 4px; padding: 2px 4px; margin-right: 5px; font-family: sans-serif;';
        
        let msgStyle = 'font-weight: bold; font-family: sans-serif; ';
        
        // On adapte la couleur du texte selon le type de message
        switch (type.toLowerCase()) {
            case 'success': msgStyle += 'color: #28a745;'; break; // Vert
            case 'warn':    msgStyle += 'color: #ffc107;'; break; // Jaune
            case 'error':   msgStyle += 'color: #dc3545;'; break; // Rouge
            case 'cloud':   msgStyle += 'color: #0dcaf0;'; break; // Bleu cyan (pour les requêtes API)
            case 'info':
            default:        msgStyle += 'color: #007bff;'; break; // Bleu classique
        }

        // Si on a envoyé des données (comme un objet JSON), on les affiche à la suite proprement
        if (data !== null) {
            console.log(`${prefix}%c${message}`, prefixStyle, msgStyle, data);
        } else {
            console.log(`${prefix}%c${message}`, prefixStyle, msgStyle);
        }
    }
};