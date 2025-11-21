// Get references to the HTML elements
const imageUpload = document.getElementById('imageUpload');
const originalImage = document.getElementById('originalImage');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const loading = document.getElementById('loading');
const downloadBtn = document.getElementById('download');
const progressBar = document.getElementById('progress-bar');
const timerDiv = document.getElementById('timer');

// Function to remove the background
async function removeBackground() {
    loading.style.display = 'block';
    progressBar.style.width = '0%';
    timerDiv.textContent = '';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 1;
        progressBar.style.width = `${progress}%`;
        if (progress >= 99) {
            clearInterval(interval);
        }
    }, 50); // Simulate progress

    const startTime = performance.now();

    // Load the BodyPix model
    const net = await bodyPix.load({
        architecture: 'ResNet50',
        outputStride: 16,
        quantBytes: 2
    });

    // Create a segmentation mask
    const segmentation = await net.segmentMultiPerson(originalImage, {
        flipHorizontal: false,
        internalResolution: 'high',
        segmentationThreshold: 0.7
    });

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    timerDiv.textContent = `Time taken: ${duration} seconds`;

    clearInterval(interval);
    progressBar.style.width = '100%';

    // Hide loading after a short delay
    setTimeout(() => {
        loading.style.display = 'none';
    }, 1000);


    // Create a new image data with a transparent background
    // Create a mask with the person opaque and the background transparent
    const foregroundColor = { r: 255, g: 255, b: 255, a: 255 }; // Opaque
    const backgroundColor = { r: 0, g: 0, b: 0, a: 0 }; // Transparent
    const personMask = bodyPix.toMask(segmentation, foregroundColor, backgroundColor);

    // Create a temporary canvas to hold the mask
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.putImageData(personMask, 0, 0);

    // Clear the main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the original image
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

    // Apply a subtle blur for smoother edges
    tempCtx.filter = 'blur(1px)';
    tempCtx.drawImage(tempCanvas, 0, 0);

    // Use 'destination-in' to keep only the parts of the image that overlap with the mask
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(tempCanvas, 0, 0);

    // Reset the composite operation
    ctx.globalCompositeOperation = 'source-over';
    downloadBtn.style.display = 'block';
}

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'transparent.png';
    link.href = canvas.toDataURL();
    link.click();
});

// Event listener for the file input
imageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage.src = e.target.result;
            originalImage.onload = () => {
                canvas.width = originalImage.width;
                canvas.height = originalImage.height;
                removeBackground();
            };
        };
        reader.readAsDataURL(file);
    }
});