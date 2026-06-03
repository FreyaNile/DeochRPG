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
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1024;
                if (isMobile) {
                    // Lock height to innerHeight on mobile to prevent URL bar resizing jumps
                    bg.style.height = window.innerHeight + 'px';
                    bg.style.bottom = 'auto';
                    bg.style.width = '100%';
                } else {
                    // On desktop, clear inline styles so CSS top/left/right/bottom handles centering
                    bg.style.height = '';
                    bg.style.bottom = '';
                    bg.style.width = '';
                }
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
