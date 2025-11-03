document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const uploadBtn = document.getElementById('uploadBtn');
    const cameraBtn = document.getElementById('cameraBtn');
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const previewSection = document.getElementById('previewSection');
    const cameraPreview = document.getElementById('cameraPreview');
    const imagePreview = document.getElementById('imagePreview');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resultSection = document.getElementById('resultSection');

    // Event Listeners
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
    cameraBtn.addEventListener('click', toggleCamera);

    // Drag and Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drop-zone-active');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drop-zone-active');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drop-zone-active');
        const files = e.dataTransfer.files;
        if (files.length) {
            handleFileUpload({ target: { files } });
        }
    });
});
// Global variables for camera state
let isCameraActive = false;
let mediaStream = null;

// File Upload Handler
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
        showError('Please upload an image or PDF file');
        return;
    }

    try {
        showLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        // Show preview
        if (file.type.startsWith('image/')) {
            showImagePreview(URL.createObjectURL(file));
        }

        // Upload file to server
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');
        
        const data = await response.json();
        if (data.status === 'success') {
            // Process the extracted text
            await processExtractedText(data.text);
        }
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Camera Functions
async function toggleCamera() {
    if (isCameraActive) {
        await captureImage();
    } else {
        await startCamera();
    }
}

async function startCamera() {
    try {
        const constraints = {
            video: {
                facingMode: 'environment'
            }
        };

        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraPreview.srcObject = mediaStream;
        cameraPreview.hidden = false;
        imagePreview.hidden = true;
        previewSection.hidden = false;
        isCameraActive = true;
        cameraBtn.innerHTML = '<span>📸</span> Capture';
        cameraBtn.classList.remove('btn-success');
        cameraBtn.classList.add('btn-danger');
    } catch (error) {
        showError('Unable to access camera. Please allow camera permissions.');
    }
}

async function captureImage() {
    if (!mediaStream) return;

    // Create canvas to capture the image
    const canvas = document.createElement('canvas');
    canvas.width = cameraPreview.videoWidth;
    canvas.height = cameraPreview.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(cameraPreview, 0, 0);

    try {
        showLoading(true);
        // Convert canvas to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });

        // Upload captured image
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        if (data.status === 'success') {
            // Show preview and process text
            showImagePreview(URL.createObjectURL(file));
            await processExtractedText(data.text);
        }
    } catch (error) {
        showError(error.message);
    } finally {
        stopCamera();
        showLoading(false);
    }
}

function stopCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    cameraPreview.srcObject = null;
    cameraPreview.hidden = true;
    isCameraActive = false;
    cameraBtn.innerHTML = '<span>📷</span> Camera';
    cameraBtn.classList.remove('btn-danger');
    cameraBtn.classList.add('btn-success');
}

// Result Processing
async function processExtractedText(text) {
    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });

        if (!response.ok) throw new Error('Analysis failed');

        const data = await response.json();
        displayResults(data.analysis);
    } catch (error) {
        showError(error.message);
    }
}

// UI Functions
function displayResults(analysis) {
    resultSection.innerHTML = `
        <div class="result-card">
            <h2>Receipt Summary</h2>
            <div class="info-grid">
                <div class="info-item">
                    <label>Store:</label>
                    <span>${analysis.store.name}</span>
                </div>
                <div class="info-item">
                    <label>Date:</label>
                    <span>${analysis.basic.date}</span>
                </div>
                <div class="info-item">
                    <label>Total:</label>
                    <span>$${analysis.basic.totalAmount.toFixed(2)}</span>
                </div>
                <div class="info-item">
                    <label>Payment:</label>
                    <span>${analysis.basic.paymentMethod}</span>
                </div>
            </div>
        </div>

        <div class="result-card">
            <h2>Items</h2>
            <div class="items-list">
                ${analysis.items.map(item => `
                    <div class="item">
                        <span>${item.name}</span>
                        <span>$${item.totalPrice.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <button onclick="resetApp()" class="btn btn-primary">
            Scan Another Document
        </button>
    `;
    resultSection.hidden = false;
}

function showImagePreview(url) {
    imagePreview.src = url;
    imagePreview.hidden = false;
    cameraPreview.hidden = true;
    previewSection.hidden = false;
}

function showLoading(show) {
    loadingSpinner.hidden = !show;
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.querySelector('.app-main').prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function resetApp() {
    fileInput.value = '';
    imagePreview.src = '';
    previewSection.hidden = true;
    resultSection.hidden = true;
    if (isCameraActive) stopCamera();
}