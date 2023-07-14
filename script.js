var peer = new Peer();

const button = document.getElementById("button");
const input = document.getElementById("input");
let conn = null;
let dotDraw = [];

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

function findObjectBasedOnColor(color) {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  let countAgainst = 0;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    let r = pixels[i];
    let g = pixels[i + 1];
    let b = pixels[i + 2];

    const tolerance = 30;
    let flag = false;
    switch (color) {
      case "green":
        if (r < 80 && g > 200 && b < 80) flag = true;
        break;
      case "red":
        if (r > 200 && g < 100 && b < 100) flag = true;
        break;
      case "blue":
        if (r < 80 && g < 80 && b > 200) flag = true;
        break;
    }

    if (flag) {
      const x = (i / 4) % canvas.width;
      const y = Math.floor(i / (4 * canvas.width));
      sumX += x;
      sumY += y;
      count++;
    }
    countAgainst++;
  }
  const avgX = sumX / count;
  const avgY = sumY / count;
  if (count / countAgainst > 0.001) {
    return { x: avgX, y: avgY };
  } else {
    return null;
  }
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
    if (r < 80 && g < 80 && b > 200) {
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
      dotDraw.forEach((dot) => {
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
shoot.addEventListener("touchstart", () => {
  const redPosition = findObjectBasedOnColor("red"); //red
  const greenPosition = findObjectBasedOnColor("green"); //green
  const bluePosition = findObjectBasedOnColor("blue"); //blue

  if (redPosition && greenPosition && bluePosition) {
    dotDraw = [redPosition, greenPosition, bluePosition];
    console.log("found", greenPosition);

    if (!conn) {
      conn = peer.connect("jjeeaann2013");
    }
    conn.send(getPositionScreen(redPosition, greenPosition, bluePosition));
  }
});

function getPositionScreen(redPosition, greenPosition, bluePosition) {
  const horizontalProjection = getProjectionPosition(
    redPosition,
    greenPosition,
    {
      x: canvas.width / 2,
      y: canvas.height / 2,
    }
  );

  const centerGreenRed = {
    x: (redPosition.x + greenPosition.x) / 2,
    y: (redPosition.y + greenPosition.y) / 2,
  };

  const verticalProjection = getProjectionPosition(
    centerGreenRed,
    bluePosition,
    {
      x: canvas.width / 2,
      y: canvas.height / 2,
    }
  );

  const distanceRedGreen = distanceBetweenPoints(redPosition, greenPosition);
  const distancehorizontalProjectionRed = distanceBetweenPoints(
    horizontalProjection,
    redPosition
  );
  const distanceBlueCenter = distanceBetweenPoints(
    bluePosition,
    centerGreenRed
  );
  const distanceverticalProjectionBlue = distanceBetweenPoints(
    verticalProjection,
    bluePosition
  );

  dotDraw.push({ x: horizontalProjection.x, y: verticalProjection.y });
  return {
    x: distancehorizontalProjectionRed / distanceRedGreen,
    y: distanceverticalProjectionBlue / (distanceBlueCenter * 2),
  };
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

function handleVolumeButtonPress(event) {
  console.log(event.key);
  const volumeButtonPressed =
    event.key === "VolumeUp" || event.key === "VolumeDown";
  if (volumeButtonPressed) {
    // Volume button was pressed
    console.log("Volume button pressed");
  }
}

// Add event listener to capture keydown events
document.addEventListener("keydown", handleVolumeButtonPress);
