(function () {
    try {
        // FOUC Prevention: Immediate theme application before module load
        const savedTheme = localStorage.getItem('deoch-theme-preference') || 'hybrasyl';
        window.applyThemeVisuals = (theme) => {
            document.documentElement.setAttribute('data-theme', theme);
        };
        window.applyThemeVisuals(savedTheme);
    } catch (e) {
        console.error('Failed to initialize theme:', e);
    }

    // Mobile Fixed Background Stabilization
    try {
        const stabilizeBg = () => {
            const bg = document.querySelector('.fixed-background');
            if (bg) {
                // Lock height and width to screen dimensions to prevent address bar resizing jumps
                bg.style.height = window.screen.height + 'px';
                bg.style.width = window.screen.width + 'px';
            }
        };

        document.addEventListener('DOMContentLoaded', stabilizeBg);
        
        let lastWidth = window.innerWidth;
        window.addEventListener('resize', () => {
            if (window.innerWidth !== lastWidth) {
                lastWidth = window.innerWidth;
                stabilizeBg();
            }
        });

        // Safe fallback execution
        if (document.readyState !== 'loading') {
            stabilizeBg();
        }
    } catch (err) {
        console.error('Failed to stabilize background:', err);
    }
})();
