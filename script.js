class RayFinder {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.dotToDraw = [];
  }

  getPositionInScreen() {
    // first get the average green positon on the screen to draw a line
    const greenPosition = this.findColorPosition();

    if (!greenPosition) return null;

    const leftGreenPosition = this.findColorPosition({
      x: 0,
      y: 0,
      width: Math.floor(greenPosition.x),
      height: this.canvas.height,
    });
    const rightGreenPosition = this.findColorPosition({
      x: Math.floor(greenPosition.x),
      y: 0,
      width: this.canvas.width,
      height: this.canvas.height,
    });

    this.dotToDraw = [greenPosition, leftGreenPosition, rightGreenPosition];

    if (!rightGreenPosition || !leftGreenPosition) return null;

    const distanceLeftToRight = this.distanceBetweenPoints(leftGreenPosition, rightGreenPosition);

    const projectionCenterScreenOnLeftRight = this.getProjectionPosition(leftGreenPosition, rightGreenPosition, {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
    });

    const distanceLeftToProjection = this.distanceBetweenPoints(leftGreenPosition, projectionCenterScreenOnLeftRight);

    const distanceCenterToProjection = this.distanceBetweenPoints({ x: this.canvas.width / 2, y: this.canvas.height / 2 }, projectionCenterScreenOnLeftRight);

    return {
      x: distanceLeftToProjection / distanceLeftToRight,
      y: (distanceCenterToProjection / distanceLeftToRight) * -this.pointSide({ x: this.canvas.width / 2, y: this.canvas.height / 2 }, leftGreenPosition, rightGreenPosition),
    };
  }

  playStream(stream) {
    var video = document.createElement('video');
    video.addEventListener('loadedmetadata', () => {
      const context = this.canvas.getContext('2d');
      var drawFrame = () => {
        context.drawImage(video, 0, 0);
        //filterCanvas();
        window.requestAnimationFrame(drawFrame);
        this.dotToDraw.forEach((dot) => {
          this.drawDot(dot.x, dot.y, 'yellow', 10, this.canvas);
        });
      };
      drawFrame();
      this.canvas.width = video.videoWidth;
      this.canvas.height = video.videoHeight;
    });
    video.autoplay = true;
    video.srcObject = stream;
  }

  drawDot(x, y, color, radius, canvas) {
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.closePath();
  }

  async startCamera() {
    var devices = navigator.mediaDevices;
    if (devices && 'getUserMedia' in devices) {
      var constraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        video: {
          facingMode: 'environment',
        },
      };
      const stream = await devices.getUserMedia(constraints);
      this.playStream(stream);
    } else {
      console.error('Camera API is not supported.');
    }
  }

  findColorPosition(searchArea = { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height }) {
    const skipFactop = 1;
    let sumX = 0;
    let sumY = 0;
    let countGreen = 0;
    let countAll = 0;
    const thresholdPartOfTheScreenGreen = 0.0005;

    const ctx = this.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const pixels = imageData.data;

    for (let x = searchArea.x; x < searchArea.width; x += skipFactop) {
      for (let y = searchArea.y; y < searchArea.height; y += skipFactop) {
        if (x > searchArea.width || y > searchArea.height) continue;

        const { r, g, b, i } = this.getPixelRGB(x, y, pixels, this.canvas);
        if (r < 80 && g > 200 && b < 80) {
          sumX += x;
          sumY += y;
          countGreen++;
        }
        countAll++;
      }
    }

    const avgX = sumX / countGreen;
    const avgY = sumY / countGreen;

    if (countGreen / countAll > thresholdPartOfTheScreenGreen) {
      return { x: avgX, y: avgY };
    } else {
      return null;
    }
  }

  pointSide(point, lineStart, lineEnd) {
    const crossProduct = (lineEnd.x - lineStart.x) * (point.y - lineStart.y) - (lineEnd.y - lineStart.y) * (point.x - lineStart.x);

    return crossProduct > 0 ? 1 : -1;
  }

  distanceBetweenPoints(point1, point2) {
    const a = point1.x - point2.x;
    const b = point1.y - point2.y;
    return Math.sqrt(a * a + b * b);
  }

  getProjectionPosition(point1, point2, point3) {
    const vectorAB = {
      x: point2.x - point1.x,
      y: point2.y - point1.y,
    };

    // Calculate the vector between the first point and the third point
    const vectorAC = {
      x: point3.x - point1.x,
      y: point3.y - point1.y,
    };

    // Calculate the length of the line segment AB
    const lengthAB = Math.sqrt(vectorAB.x * vectorAB.x + vectorAB.y * vectorAB.y);

    // Calculate the dot product of vectorAB and vectorAC
    const dotProduct = vectorAB.x * vectorAC.x + vectorAB.y * vectorAC.y;

    // Calculate the projection scalar value
    const projectionScalar = dotProduct / (lengthAB * lengthAB);

    // Calculate the coordinates of the projection point
    return {
      x: point1.x + projectionScalar * vectorAB.x,
      y: point1.y + projectionScalar * vectorAB.y,
    };
  }

  getPixelRGB(x, y, pixelData, canv) {
    // Calculate the index of the pixel in the pixelData array
    const index = (y * canv.width + x) * 4;

    // Extract the RGB values from the pixelData array
    const red = pixelData[index];
    const green = pixelData[index + 1];
    const blue = pixelData[index + 2];

    return { r: red, g: green, b: blue, i: index };
  }
}

const finder = new RayFinder('camera-canvas');
finder.startCamera();

var peer = new Peer();
peer.on('open', function (id) {
  console.log('My peer ID is: ' + id);
});
let connectionPeer = null;

// setInterval(() => {
//   finder.getPositionInScreen();
// }, 100);

document.getElementById('button-shoot').addEventListener('touchstart', () => {
  const position = finder.getPositionInScreen();
  navigator.vibrate(100);
  if (position) {
    if (!connectionPeer) {
      connectionPeer = peer.connect('jjeeaann2013');
    }

    console.log(position);
    connectionPeer.send(position);
  }
});
