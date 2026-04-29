window.CRUtil = window.CRUtil || {};

window.CRUtil.VideoPlayer = {
    element: null,
    container: null,
    isSkipping: false,
    autoSkipEnabled: GM_getValue('cr_auto_skip', true),

    init() {
        if (!this.element) {
            this.element = document.querySelector('video');
            if (this.element) {
                this.element.addEventListener('timeupdate', () => this.handleTimeUpdate());
                this.element.addEventListener('loadedmetadata', () => setTimeout(() => window.CRUtil.UI.drawHighlights(), 1000));
            }
        }
        if (!this.container && this.element) {
            this.container = this.element.parentElement.parentElement;
        }
    },

    jumpToTime(targetTime) {
        this.isSkipping = true; 
        const slider = document.querySelector('input.timeline-slider[type="range"]');
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
        
        const epId = window.CRUtil.DataManager.getEpisodeId();
        const data = window.CRUtil.DataManager.getEpisodeData(epId);
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