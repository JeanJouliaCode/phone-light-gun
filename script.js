var peer = new Peer();

const button = document.getElementById("button");
const input = document.getElementById("input");
let conn = null;
let dotToDraw = [];

peer.on("open", function (id) {
  console.log("My peer ID is: " + id);
});

// console.log(peer);
var canvas = document.getElementById("camera-canvas");

function rgb2hsv(r, g, b) {
  let rabs, gabs, babs, rr, gg, bb, h, s, v, diff, diffc, percentRoundFn;
  rabs = r / 255;
  gabs = g / 255;
  babs = b / 255;
  (v = Math.max(rabs, gabs, babs)), (diff = v - Math.min(rabs, gabs, babs));
  diffc = (c) => (v - c) / 6 / diff + 1 / 2;
  percentRoundFn = (num) => Math.round(num * 100) / 100;
  if (diff == 0) {
    h = s = 0;
  } else {
    s = diff / v;
    rr = diffc(rabs);
    gg = diffc(gabs);
    bb = diffc(babs);

    if (rabs === v) {
      h = bb - gg;
    } else if (gabs === v) {
      h = 1 / 3 + rr - bb;
    } else if (babs === v) {
      h = 2 / 3 + gg - rr;
    }
    if (h < 0) {
      h += 1;
    } else if (h > 1) {
      h -= 1;
    }
  }
  return {
    h: Math.round(h * 360),
    s: percentRoundFn(s * 100),
    v: percentRoundFn(v * 100),
  };
}

function findEveragePositionGreen(
  searchArea = { x: 0, y: 0, width: canvas.width, height: canvas.height }
) {
  let sumX = 0;
  let sumY = 0;
  let countGreen = 0;
  let countAll = 0;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  const skipFactop = 1;

  for (let x = searchArea.x; x < searchArea.width; x += skipFactop) {
    for (let y = searchArea.y; y < searchArea.height; y += skipFactop) {
      if (x > searchArea.width || y > searchArea.height) continue;

      const { r, g, b, i } = getPixelRGB(x, y, pixels, canvas);
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

  const threshold = 0.0005;
  if (countGreen / countAll > threshold) {
    return { x: avgX, y: avgY };
  } else {
    return null;
  }
}

function getPixelRGB(x, y, pixelData, canv) {
  // Calculate the index of the pixel in the pixelData array
  const index = (y * canv.width + x) * 4;

  // Extract the RGB values from the pixelData array
  const red = pixelData[index];
  const green = pixelData[index + 1];
  const blue = pixelData[index + 2];

  return { r: red, g: green, b: blue, i: index };
}

function drawDot(x, y, color, radius, canvas) {
  const ctx = canvas.getContext("2d");
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.closePath();
}

function filterCanvas() {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    let r = pixels[i];
    let g = pixels[i + 1];
    let b = pixels[i + 2];
    if (r > 200 && g < 100 && b < 100) {
      pixels[i] = 255;
      pixels[i + 1] = 255;
      pixels[i + 2] = 255;
    } else {
      pixels[i] = 0;
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function playStream(canvas, stream) {
  var video = document.createElement("video");
  video.addEventListener("loadedmetadata", function () {
    const context = canvas.getContext("2d");
    var drawFrame = function () {
      context.drawImage(video, 0, 0);
      //filterCanvas();
      window.requestAnimationFrame(drawFrame);
      dotToDraw.forEach((dot) => {
        drawDot(dot.x, dot.y, "yellow", 10, canvas);
      });
    };
    drawFrame();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  });
  video.autoplay = true;
  video.srcObject = stream;
}

async function playCamera(canvas) {
  var devices = navigator.mediaDevices;
  if (devices && "getUserMedia" in devices) {
    var constraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      video: {
        facingMode: "environment",
      },
    };
    const stream = await devices.getUserMedia(constraints);
    playStream(canvas, stream);
  } else {
    console.error("Camera API is not supported.");
  }
}

playCamera(canvas, canvas.width, canvas.height);

const shoot = document.getElementById("button-shoot");
document.body.addEventListener("touchstart", () => {
  sendPosition();
});

setInterval(() => {
  sendPosition();
}, 200);

function sendPosition() {
  const position = getPositionScreen();

  if (position) {
    if (!conn) {
      conn = peer.connect("jjeeaann2013");
    }

    console.log(position);
    conn.send(position);
  }
}

function getPositionScreen() {
  // first get the average green positon on the screen to draw a line
  const greenPosition = findEveragePositionGreen();
  const leftGreenPosition = greenPosition
    ? findEveragePositionGreen({
        x: 0,
        y: 0,
        width: Math.floor(greenPosition.x),
        height: canvas.height,
      })
    : null;
  const rightGreenPosition = greenPosition
    ? findEveragePositionGreen({
        x: Math.floor(greenPosition.x),
        y: 0,
        width: canvas.width,
        height: canvas.height,
      })
    : null;

  const distanceLeftToRight = distanceBetweenPoints(
    leftGreenPosition,
    rightGreenPosition
  );

  const projectionCenterScreenOnLeftRight = getProjectionPosition(
    leftGreenPosition,
    rightGreenPosition,
    { x: canvas.width / 2, y: canvas.height / 2 }
  );

  const distanceLeftToProjection = distanceBetweenPoints(
    leftGreenPosition,
    projectionCenterScreenOnLeftRight
  );

  const distanceCenterToProjection = distanceBetweenPoints(
    { x: canvas.width / 2, y: canvas.height / 2 },
    projectionCenterScreenOnLeftRight
  );

  dotToDraw = [{ x: canvas.width / 2, y: canvas.height / 2 }];
  return {
    x: distanceLeftToProjection / distanceLeftToRight,
    y:
      (distanceCenterToProjection / distanceLeftToRight) *
      -pointSide(
        { x: canvas.width / 2, y: canvas.height / 2 },
        leftGreenPosition,
        rightGreenPosition
      ),
  };
}

function pointSide(point, lineStart, lineEnd) {
  const crossProduct =
    (lineEnd.x - lineStart.x) * (point.y - lineStart.y) -
    (lineEnd.y - lineStart.y) * (point.x - lineStart.x);

  return crossProduct > 0 ? 1 : -1;
}

function distanceBetweenPoints(point1, point2) {
  const a = point1.x - point2.x;
  const b = point1.y - point2.y;
  return Math.sqrt(a * a + b * b);
}

function getProjectionPosition(point1, point2, point3) {
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
  return (projectionPoint = {
    x: point1.x + projectionScalar * vectorAB.x,
    y: point1.y + projectionScalar * vectorAB.y,
  });
}
