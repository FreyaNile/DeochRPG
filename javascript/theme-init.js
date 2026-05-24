(function () {
    try {
        // FOUC Prevention: Immediate theme application before module load
        const savedTheme = localStorage.getItem('deoch-theme-preference') || 'sandstorm';
        window.applyThemeVisuals = (theme) => {
            document.documentElement.setAttribute('data-theme', theme);
        };
        window.applyThemeVisuals(savedTheme);
    } catch (e) {
        console.error('Failed to initialize theme:', e);
    }
})();
