const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const character = {
   x: 200,
   y: 300,
   speed: 1
};

const zoomFactor = 4;

let camX = 0; // camera position
let camY = 0; // camera position

// fractional margin from edge before camera moves
const deadZoneMarginFactor = 0.25;

const mapImage = new Image();
mapImage.src = 'map.png';

const collisionMapImage = new Image();
collisionMapImage.src = 'collision-map.png';

const charSprite = new Image();
charSprite.src = 'char.png';  

// Offscreen canvas for collision detection
const collisionCanvas = document.createElement('canvas');
const collisionCtx = collisionCanvas.getContext('2d', { willReadFrequently: true });

// Function to resize canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Redraw content if necessary after resize
    if (typeof draw === 'function' && mapImage.complete && collisionMapImage.complete && charSprite.complete) {
        updateCameraPosition(); 
        draw();
    }
}

// Initial resize
resizeCanvas();

// Resize canvas when window size changes
window.addEventListener('resize', resizeCanvas);

const keys = {};
let needsRedraw = true; // Flag to indicate if a redraw is needed

window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    needsRedraw = true; // Set flag when a key is pressed
});

window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
    // Optional: you might want to set needsRedraw = true here as well,
    // if releasing a key should also trigger a redraw (e.g., character stops moving)
    // For now, we'll only redraw on keydown to reduce computations.
});

function updateCameraPosition() {
    if (!mapImage.complete || !charSprite.complete) return; // Ensure images are loaded

    const deadZoneLeft = canvas.width * deadZoneMarginFactor;
    const deadZoneRight = canvas.width * (1 - deadZoneMarginFactor);
    const deadZoneTop = canvas.height * deadZoneMarginFactor;
    const deadZoneBottom = canvas.height * (1 - deadZoneMarginFactor);

    // Character's apparent screen position (top-left corner)
    const charScreenX = character.x * zoomFactor - camX;
    const charScreenY = character.y * zoomFactor - camY;
    // Character's apparent screen position (bottom-right corner)
    const charScreenRight = charScreenX + charSprite.width * zoomFactor;
    const charScreenBottom = charScreenY + charSprite.height * zoomFactor;

    // Adjust camera X
    if (charScreenX < deadZoneLeft) {
        camX = character.x * zoomFactor - deadZoneLeft;
    } else if (charScreenRight > deadZoneRight) {
        camX = character.x * zoomFactor + charSprite.width * zoomFactor - deadZoneRight;
    }

    // Adjust camera Y
    if (charScreenY < deadZoneTop) {
        camY = character.y * zoomFactor - deadZoneTop;
    } else if (charScreenBottom > deadZoneBottom) {
        camY = character.y * zoomFactor + charSprite.height * zoomFactor - deadZoneBottom;
    }

    // Clamp camera to map boundaries
    const maxCamX = Math.max(0, mapImage.width * zoomFactor - canvas.width);
    const maxCamY = Math.max(0, mapImage.height * zoomFactor - canvas.height);

    camX = Math.max(0, Math.min(camX, maxCamX));
    camY = Math.max(0, Math.min(camY, maxCamY));
}

function update() {
   if (keys["ArrowUp"]) character.y -= character.speed;
   if (keys["ArrowDown"]) character.y += character.speed;
   if (keys["ArrowLeft"]) character.x -= character.speed;
   if (keys["ArrowRight"]) character.x += character.speed;

   // Clamp character to map boundaries (optional, but good practice)
   if (mapImage.complete && charSprite.complete) {
      character.x = Math.max(0, Math.min(character.x, mapImage.width - charSprite.width));
      character.y = Math.max(0, Math.min(character.y, mapImage.height - charSprite.height));
   }

   updateCameraPosition();
   handleCollisions();
   needsRedraw = true; // Character moved, so a redraw is needed
}

function handleCollisions() {
    // Sample from the offscreen collision canvas using original map coordinates and character size
    const imageData = collisionCtx.getImageData(character.x, character.y, charSprite.width, charSprite.height);
    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
        // If pixel is black, revert the movement
        if (pixels[i] === 0 && pixels[i + 1] === 0 && pixels[i + 2] === 0) {
            if (keys["ArrowUp"]) character.y += character.speed;
            if (keys["ArrowDown"]) character.y -= character.speed;
            if (keys["ArrowLeft"]) character.x += character.speed;
            if (keys["ArrowRight"]) character.x -= character.speed;
            break;
        }
    }
}

function draw() {
    if (!mapImage.complete || !charSprite.complete) {
        // Don't draw if images aren't loaded yet, or show a loading state
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillText("Loading...", canvas.width / 2, canvas.height / 2);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Disable image smoothing for pixel art look
    ctx.imageSmoothingEnabled = false;

    ctx.translate(-camX, -camY);

    ctx.drawImage(mapImage, 0, 0, mapImage.width * zoomFactor, mapImage.height * zoomFactor);

    // Draw the character, scaled and at scaled position
    ctx.drawImage(
        charSprite,
        character.x * zoomFactor,
        character.y * zoomFactor,
        charSprite.width * zoomFactor,
        charSprite.height * zoomFactor
    );

    ctx.restore();
    needsRedraw = false;
}

function gameLoop(now) {
   requestAnimationFrame(gameLoop);
   update();
   if (needsRedraw) draw();
}

mapImage.onload = () => {
    collisionMapImage.onload = () => {
        // Setup offscreen collision canvas
        collisionCanvas.width = collisionMapImage.width;
        collisionCanvas.height = collisionMapImage.height;
        collisionCtx.drawImage(collisionMapImage, 0, 0);

        charSprite.onload = () => {
            resizeCanvas(); // This will call updateCameraPosition and draw
            needsRedraw = true; // Ensure initial draw
            // then = performance.now(); // Initialize 'then' before starting the loop - moved initialization into gameLoop
            requestAnimationFrame(gameLoop); // Start the loop
        };
        // Handle if character image was already cached and loaded
        if (charSprite.complete) {
            charSprite.onload();
        }
    };
    // Handle if collision map was already cached
    if (collisionMapImage.complete) {
        collisionMapImage.onload();
    }
};
// Handle if map image was already cached
if (mapImage.complete) {
    mapImage.onload();
}
