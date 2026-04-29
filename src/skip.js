window.CRUtil = window.CRUtil || {};
window.CRUtil.VideoPlayer = {
    element: null, container: null, isSkipping: false,
    init() {
        this.element = document.querySelector('video');
        if (this.element) this.container = this.element.parentElement.parentElement;
    },
    handleTimeUpdate() {
        if (!autoSkipEnabled || !videoElement || isSkipping) return;
        
        const data = localData[currentEpisodeId] || {}; 
        const currentTime = videoElement.currentTime;
        const duration = videoElement.duration; 

        const jumpToTime = (targetTime) => {
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
};