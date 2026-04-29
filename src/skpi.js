window.CRUtil = window.CRUtil || {};
window.CRUtil.VideoPlayer = {
    element: null, container: null, isSkipping: false,
    init() {
        this.element = document.querySelector('video');
        if (this.element) this.container = this.element.parentElement.parentElement;
    },
    handleTimeUpdate() {
        // Logique de saut habituelle utilisant window.CRUtil.DataManager.localData
    }
};