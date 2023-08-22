let filterLoop = null;
let filterStep = 0;
let hsl = [0.32741617357001973, 1, 0.33137254901960783];
let colorTolerance = 0.086;
let intensityTolerance = 0.156;
let luminosityTolerance = 0.161;

function filterColorCanvas(canvas1, canvas2) {
    const ctx = canvas1.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas1.width, canvas1.height);
    const pixels = imageData.data;
    for (let i = 0; i < pixels.length; i += 4) {
        let r = pixels[i];
        let g = pixels[i + 1];
        let b = pixels[i + 2];
        let [h, s, l] = rgbToHsl(r, g, b);

        if (
            h > hsl[0] - colorTolerance &&
            h < hsl[0] + colorTolerance &&
            s > hsl[1] - intensityTolerance &&
            s < hsl[1] + intensityTolerance &&
            l > hsl[2] - luminosityTolerance &&
            l < hsl[2] + luminosityTolerance
        ) {
            pixels[i] = 255;
            pixels[i + 1] = 255;
            pixels[i + 2] = 255;
        } else {
            pixels[i] = 0;
            pixels[i + 1] = 0;
            pixels[i + 2] = 0;
        }
    }
    const ctx2 = canvas2.getContext('2d');
    ctx2.putImageData(imageData, 0, 0);
}

function getAverageColor(canvas) {
    const ctx = canvas.getContext('2d');

    // Get the center coordinates of the canvas
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Calculate the region to sample (5x5 square centered on the canvas)
    const startX = centerX - 2; // 2 pixels to the left
    const startY = centerY - 2; // 2 pixels above
    const endX = centerX + 2; // 2 pixels to the right
    const endY = centerY + 2; // 2 pixels below

    // Get pixel data from the calculated region
    const imageData = ctx.getImageData(startX, startY, 5, 5);
    const data = imageData.data;

    // Calculate the average color
    let totalRed = 0;
    let totalGreen = 0;
    let totalBlue = 0;

    for (let i = 0; i < data.length; i += 4) {
        totalRed += data[i];
        totalGreen += data[i + 1];
        totalBlue += data[i + 2];
    }

    const averageRed = Math.round(totalRed / 25);
    const averageGreen = Math.round(totalGreen / 25);
    const averageBlue = Math.round(totalBlue / 25);

    return [averageRed, averageGreen, averageBlue];
}

function rgbToHsl(r, g, b) {
    (r /= 255), (g /= 255), (b /= 255);

    var max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    var h,
        s,
        l = (max + min) / 2;

    if (max == min) {
        h = s = 0; // achromatic
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }

        h /= 6;
    }

    return [h, s, l];
}

document.getElementById('button-calibrate').addEventListener('click', () => {
    document.getElementById('main').style.display = 'none';
    document.getElementById('calibrate').style.display = 'block';

    const filterCanvas = document.getElementById('filter-canvas');
    filterCanvas.height = finder.video.videoHeight;
    filterCanvas.width = finder.video.videoWidth;

    document.getElementById('button-filter').addEventListener('click', () => {
        if (filterStep == 0) {
            const [averageRed, averageGreen, averageBlue] = getAverageColor(filterCanvas);
            hsl = rgbToHsl(averageRed, averageGreen, averageBlue);

            document.getElementById('color-cube').style.backgroundColor = `rgb(${averageRed}, ${averageGreen}, ${averageBlue})`;

            filterStep = 1;
            document.getElementById('sliders').style.display = 'block';
            document.getElementById('button-filter').style.display = 'none';
        }
    });

    document.getElementById('slider-tolerance').addEventListener('input', (e) => {
        colorTolerance = e.target.value / 1000;
    });

    document.getElementById('slider-luminosity').addEventListener('input', (e) => {
        luminosityTolerance = e.target.value / 1000;
    });

    document.getElementById('slider-intensity').addEventListener('input', (e) => {
        intensityTolerance = e.target.value / 1000;
    });

    filterLoop = setInterval(() => {
        const context = filterCanvas.getContext('2d');
        context.drawImage(finder.video, 0, 0);
        if (filterStep == 0) {
            context.strokeStyle = 'green';
            context.lineWidth = 2;
            const startX = filterCanvas.width / 2 - 5;
            const startY = filterCanvas.height / 2 - 5;
            context.strokeRect(startX, startY, 10, 10);
        }
        if (filterStep == 1) filterColorCanvas(filterCanvas, filterCanvas);
    }, 100);
});

document.getElementById('button-done').addEventListener('click', () => {
    document.getElementById('sliders').style.display = 'none';
    document.getElementById('button-filter').style.display = 'block';

    document.getElementById('main').style.display = 'block';
    document.getElementById('calibrate').style.display = 'none';
    filterStep = 0;

    finder.setHsl(hsl, colorTolerance, intensityTolerance, luminosityTolerance);

    clearInterval(filterLoop);
});
