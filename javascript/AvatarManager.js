/**
 * @module AvatarManager
 * @description Authority for image cropping and avatar processing.
 */
export const AvatarManager = {
    elements: {
        dialog: null,
        img: null,
        container: null,
        zoom: null,
        saveBtn: null,
        cancelBtn: null
    },

    state: {
        imgOriginalWidth: 0,
        imgOriginalHeight: 0,
        scale: 1,
        posX: 0,
        posY: 0,
        isDragging: false,
        startX: 0,
        startY: 0,
        callback: null,
        rafScheduled: false,
        lastClientX: 0,
        lastClientY: 0,
        containerSize: 400
    },

    /**
     * Initializes the AvatarManager.
     * @param {AbortSignal} signal - Signal for cleaning up event listeners.
     */
    init(signal) {
        this.signal = signal;
        this.elements.dialog = document.getElementById('avatar-cropper-dialog');
        this.elements.img = document.getElementById('cropper-image');
        this.elements.container = document.getElementById('cropper-container');
        this.elements.zoom = document.getElementById('cropper-zoom');
        this.elements.saveBtn = document.getElementById('cropper-save-btn');
        this.elements.cancelBtn = document.getElementById('cropper-cancel-btn');

        this.bindEvents();
    },

    /**
     * Cleans up the AvatarManager state.
     */
    cleanup() {
        this.state.callback = null;
        this.state.isDragging = false;
        if (this.elements.container) this.elements.container.classList.remove('is-grabbing');
        console.log('AvatarManager: Cleanup called');
    },

    /**
     * Binds mouse, touch, and button click event listeners.
     */
    bindEvents() {
        if (!this.signal) return;

        // Zoom
        if (this.elements.zoom) {
            this.elements.zoom.addEventListener('input', (e) => {
                this.state.scale = parseFloat(e.target.value);
                this.state.containerSize = this.elements.container.offsetWidth || 400;
                this.updateTransform();
            }, { signal: this.signal });
        }

        // Pan Start
        if (this.elements.container) {
            this.elements.container.addEventListener('mousedown', (e) => this.startDrag(e), { signal: this.signal });
            this.elements.container.addEventListener('touchstart', (e) => {
                if (e.cancelable) e.preventDefault();
                this.startDrag(e.touches[0]);
            }, { passive: false, signal: this.signal });
        }

        // Pan Move
        window.addEventListener('mousemove', (e) => this.onDrag(e), { signal: this.signal });
        window.addEventListener('touchmove', (e) => {
            if (this.state.isDragging) {
                if (e.cancelable) e.preventDefault();
                this.onDrag(e.touches[0]);
            }
        }, { passive: false, signal: this.signal });

        // Pan End
        window.addEventListener('mouseup', () => this.endDrag(), { signal: this.signal });
        window.addEventListener('touchend', () => this.endDrag(), { signal: this.signal });

        // Controls
        if (this.elements.saveBtn) {
            this.elements.saveBtn.addEventListener('click', () => this.save(), { signal: this.signal });
        }
        if (this.elements.cancelBtn) {
            this.elements.cancelBtn.addEventListener('click', () => this.close(), { signal: this.signal });
        }
    },

    /**
     * Starts the dragging (panning) operation.
     * @param {MouseEvent|Touch} e - The drag event details.
     */
    startDrag(e) {
        this.state.isDragging = true;
        this.state.containerSize = this.elements.container.offsetWidth || 400;
        this.state.startX = e.clientX - this.state.posX;
        this.state.startY = e.clientY - this.state.posY;
        this.elements.container.classList.add('is-grabbing');
    },

    /**
     * Updates positions during drag movement.
     * @param {MouseEvent|Touch} e - The drag movement details.
     */
    onDrag(e) {
        if (!this.state.isDragging) return;
        
        this.state.lastClientX = e.clientX;
        this.state.lastClientY = e.clientY;

        if (!this.state.rafScheduled) {
            this.state.rafScheduled = true;
            requestAnimationFrame(() => this.tickDrag());
        }
    },

    /**
     * Executes the dragging update aligned with the animation frame.
     */
    tickDrag() {
        if (!this.state.isDragging) {
            this.state.rafScheduled = false;
            return;
        }
        this.state.posX = this.state.lastClientX - this.state.startX;
        this.state.posY = this.state.lastClientY - this.state.startY;
        this.updateTransform();
        this.state.rafScheduled = false;
    },

    /**
     * Ends the dragging operation.
     */
    endDrag() {
        this.state.isDragging = false;
        if (this.elements.container) {
            this.elements.container.classList.remove('is-grabbing');
        }
    },

    /**
     * Constrains scale and position of the image to stay inside the crop boundaries.
     */
    constrain() {
        const containerSize = this.state.containerSize || this.elements.container.offsetWidth || 400;
        const selectionSize = containerSize * 0.85;
        
        // Calculate current display dimensions
        const ratio = Math.min(containerSize / this.state.imgOriginalWidth, containerSize / this.state.imgOriginalHeight);
        const baseWidth = this.state.imgOriginalWidth * ratio;
        const baseHeight = this.state.imgOriginalHeight * ratio;
        
        const scaledWidth = baseWidth * this.state.scale;
        const scaledHeight = baseHeight * this.state.scale;

        // Ensure scale isn't too small to fill the selection
        const minScaleX = selectionSize / baseWidth;
        const minScaleY = selectionSize / baseHeight;
        const minScale = Math.max(minScaleX, minScaleY);
        
        if (this.state.scale < minScale) {
            this.state.scale = minScale;
            this.elements.zoom.value = minScale;
        }

        // Constraints for panning (relative to center)
        const maxX = (scaledWidth - selectionSize) / 2;
        const maxY = (scaledHeight - selectionSize) / 2;

        this.state.posX = Math.max(-maxX, Math.min(maxX, this.state.posX));
        this.state.posY = Math.max(-maxY, Math.min(maxY, this.state.posY));
    },

    /**
     * Applies CSS transform properties based on current scale and position.
     */
    updateTransform() {
        if (this.elements.img) {
            this.constrain();
            this.elements.img.style.transform = `translate(${this.state.posX}px, ${this.state.posY}px) scale(${this.state.scale})`;
        }
    },

    /**
     * Opens the cropper with the provided file.
     * @param {File} file 
     * @param {Function} callback Called with the resulting Base64 string.
     */
    async open(file, callback) {
        this.state.callback = callback;
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.state.imgOriginalWidth = img.width;
                this.state.imgOriginalHeight = img.height;
                
                // Reset state
                this.state.scale = 1;
                this.state.posX = 0;
                this.state.posY = 0;
                this.elements.zoom.value = 1;
                
                // Show modal first to ensure layout dimensions are available
                this.elements.dialog.showModal();
                
                this.state.containerSize = this.elements.container.offsetWidth || 400;
                const containerSize = this.state.containerSize;
                const selectionSize = containerSize * 0.85;

                // Calculate the minimum scale required to fill the 85% circle
                const ratio = Math.min(containerSize / img.width, containerSize / img.height);
                const baseWidth = img.width * ratio;
                const baseHeight = img.height * ratio;
                
                const minScale = Math.max(selectionSize / baseWidth, selectionSize / baseHeight);
                this.elements.zoom.min = minScale;
                this.state.scale = Math.max(1, minScale);
                this.elements.zoom.value = this.state.scale;
                
                this.elements.img.style.width = baseWidth + 'px';
                this.elements.img.style.height = baseHeight + 'px';
                this.elements.img.src = e.target.result;
                this.updateTransform();
            };
            img.src = e.target.result;
        };

        reader.readAsDataURL(file);
    },

    /**
     * Closes the cropper dialog.
     */
    close() {
        this.elements.dialog.close();
    },

    /**
     * Crops the image using HTML5 Canvas and invokes the callback with Base64 WebP data.
     * @returns {Promise<void>}
     */
    async save() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Use a standard 400px output size for high resolution
        canvas.width = 400;
        canvas.height = 400;

        const containerSize = this.state.containerSize || this.elements.container.offsetWidth || 400;
        const selectionSize = containerSize * 0.85;
        
        // The selection is a square of selectionSize x selectionSize in the middle of containerSize
        // We want to map this selection area to our 400x400 canvas.
        
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Scaling factor from selection space to canvas space
        const outputScale = canvas.width / selectionSize;
        
        const imgDisplayWidth = this.elements.img.offsetWidth;
        const imgDisplayHeight = this.elements.img.offsetHeight;

        // Image center relative to selection center (which is container center)
        // Since selection is centered, these are the same.
        
        // Final draw dimensions on the 400x400 canvas
        const finalDrawWidth = imgDisplayWidth * this.state.scale * outputScale;
        const finalDrawHeight = imgDisplayHeight * this.state.scale * outputScale;
        
        // Position on canvas: center of canvas minus half of scaled dimensions, 
        // plus the relative offset scaled to canvas space.
        const drawX = (canvas.width / 2) - (finalDrawWidth / 2) + (this.state.posX * outputScale);
        const drawY = (canvas.height / 2) - (finalDrawHeight / 2) + (this.state.posY * outputScale);

        ctx.drawImage(this.elements.img, drawX, drawY, finalDrawWidth, finalDrawHeight);

        const result = canvas.toDataURL('image/webp', 0.9);
        if (this.state.callback) this.state.callback(result);
        this.close();
    }
};
