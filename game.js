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
    needsRedraw = true; // Ensure redraw on key release for responsive stop
});

// Remove old touch control functions and listeners
// canvas.addEventListener("touchstart", handleTouch, { passive: false });
// canvas.addEventListener("touchmove", handleTouch, { passive: false });
// canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
// canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });


// Joystick Controls
const joystickBase = document.getElementById('joystickBase');
const joystickKnob = document.getElementById('joystickKnob');
let joystickActive = false;
let joystickStartX = 0;
let joystickStartY = 0;
const joystickMaxDistance = joystickBase.offsetWidth / 2 - joystickKnob.offsetWidth / 2; // Max distance knob can move

if (joystickBase && joystickKnob) {
    joystickKnob.addEventListener('touchstart', (event) => {
        event.preventDefault();
        joystickActive = true;
        const touch = event.touches[0];
        joystickStartX = touch.clientX;
        joystickStartY = touch.clientY;
        needsRedraw = true;
    }, { passive: false });

    document.addEventListener('touchmove', (event) => {
        if (!joystickActive) return;
        event.preventDefault();
        needsRedraw = true;
        const touch = event.touches[0];
        let deltaX = touch.clientX - joystickStartX;
        let deltaY = touch.clientY - joystickStartY;

        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX);

        if (distance > joystickMaxDistance) {
            deltaX = Math.cos(angle) * joystickMaxDistance;
            deltaY = Math.sin(angle) * joystickMaxDistance;
        }

        joystickKnob.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        // Reset keys
        keys["ArrowUp"] = false;
        keys["ArrowDown"] = false;
        keys["ArrowLeft"] = false;
        keys["ArrowRight"] = false;

        // Determine direction based on angle and distance
        const threshold = joystickMaxDistance * 0.3; // 30% of max distance to activate
        if (distance > threshold) {
            const angleDeg = angle * 180 / Math.PI;
            const angleMargin = 22.5; // Margin for direction detection
            if (angleDeg > -135 - angleMargin && angleDeg < -45 + angleMargin) keys["ArrowUp"] = true;
            if (angleDeg > 45 - angleMargin && angleDeg < 135 + angleMargin) keys["ArrowDown"] = true;
            if (angleDeg > -45 - angleMargin && angleDeg < 45 + angleMargin) keys["ArrowRight"] = true;
            if (angleDeg < -135 + angleMargin || angleDeg > 135 - angleMargin) keys["ArrowLeft"] = true;
        }

    }, { passive: false });

    document.addEventListener('touchend', (event) => {
        if (!joystickActive) return;
        event.preventDefault();
        joystickActive = false;
        joystickKnob.style.transform = `translate(0px, 0px)`; // Reset knob position
        keys["ArrowUp"] = false;
        keys["ArrowDown"] = false;
        keys["ArrowLeft"] = false;
        keys["ArrowRight"] = false;
        needsRedraw = true;
    }, { passive: false });

    document.addEventListener('touchcancel', (event) => {
        if (!joystickActive) return;
        event.preventDefault();
        joystickActive = false;
        joystickKnob.style.transform = `translate(0px, 0px)`;
        keys["ArrowUp"] = false;
        keys["ArrowDown"] = false;
        keys["ArrowLeft"] = false;
        keys["ArrowRight"] = false;
        needsRedraw = true;
    }, { passive: false });
}


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
   const oldX = character.x;
   const oldY = character.y;

   let attemptedX = oldX;
   let attemptedY = oldY;

   if (keys["ArrowUp"]) attemptedY -= character.speed;
   if (keys["ArrowDown"]) attemptedY += character.speed;
   if (keys["ArrowLeft"]) attemptedX -= character.speed;
   if (keys["ArrowRight"]) attemptedX += character.speed;

   // Call handleCollisions before clamping to map boundaries
   // It will update character.x and character.y directly
   if (collisionMapImage.complete && charSprite.complete && charSprite.width > 0 && charSprite.height > 0) {
       handleCollisions(oldX, oldY, attemptedX, attemptedY);
   } else {
       // If collision data not ready, or sprite dimensions unknown, allow movement if attempted
       if (attemptedX !== oldX || attemptedY !== oldY) {
            character.x = attemptedX;
            character.y = attemptedY;
       }
   }

   // Clamp character to map boundaries
   if (mapImage.complete && charSprite.complete && charSprite.width > 0 && charSprite.height > 0) {
      character.x = Math.max(0, Math.min(character.x, mapImage.width - charSprite.width));
      character.y = Math.max(0, Math.min(character.y, mapImage.height - charSprite.height));
   }

   updateCameraPosition();
   needsRedraw = true; // Character moved or attempted to move, so a redraw is needed
}

function handleCollisions(oldX, oldY, attemptedX, attemptedY) {
    // Helper function to check for collision at a given position
    function isCollidingAt(x, y) {
        // Assumes charSprite.width and charSprite.height are > 0
        const charWidth = charSprite.width;
        const charHeight = charSprite.height;

        const checkX = Math.floor(x);
        const checkY = Math.floor(y);

        const mapWidth = collisionCanvas.width;
        const mapHeight = collisionCanvas.height;

        const readStartX = Math.max(0, checkX);
        const readStartY = Math.max(0, checkY);
        const readEndX = Math.min(mapWidth, checkX + charWidth);
        const readEndY = Math.min(mapHeight, checkY + charHeight);

        const readWidth = readEndX - readStartX;
        const readHeight = readEndY - readStartY;

        if (readWidth <= 0 || readHeight <= 0) {
            return false; 
        }
        
        const imageData = collisionCtx.getImageData(readStartX, readStartY, readWidth, readHeight);
        const pixels = imageData.data;

        for (let i = 0; i < pixels.length; i += 4) {
            // If pixel is black (R=0, G=0, B=0) and not fully transparent, it's a collision
            if (pixels[i] === 0 && pixels[i + 1] === 0 && pixels[i + 2] === 0 && pixels[i+3] > 0) {
                return true;
            }
        }
        return false;
    }

    let finalX = attemptedX;
    let finalY = attemptedY;

    // If no movement was actually attempted, no need for complex collision logic
    if (oldX === attemptedX && oldY === attemptedY) {
        // Check if current position is colliding (e.g. spawned in wall)
        if (isCollidingAt(oldX, oldY)) {
            // This part is tricky: if spawned in a wall, there's no "non-colliding" spot to revert to.
            // For now, just stay put. A more advanced solution might try to push the character out.
            character.x = oldX;
            character.y = oldY;
        } else {
            character.x = oldX; // No movement, no collision
            character.y = oldY;
        }
        return;
    }

    if (isCollidingAt(attemptedX, attemptedY)) { // Full move results in collision
        const movedInX = (attemptedX !== oldX);
        const movedInY = (attemptedY !== oldY);

        let canSlideOnX = false;
        if (movedInX) {
            canSlideOnX = !isCollidingAt(attemptedX, oldY);
        }

        let canSlideOnY = false;
        if (movedInY) {
            canSlideOnY = !isCollidingAt(oldX, attemptedY);
        }

        if (movedInX && movedInY) { // Diagonal movement attempt
            if (canSlideOnX && canSlideOnY) {
                // Both slides are independently possible, but diagonal is blocked (e.g. hitting corner tip).
                // Revert to original position to prevent weird corner behavior or getting stuck.
                finalX = oldX;
                finalY = oldY;
            } else if (canSlideOnX) {
                finalX = attemptedX; // Slide along X
                finalY = oldY;
            } else if (canSlideOnY) {
                finalX = oldX;       // Slide along Y
                finalY = attemptedY;
            } else {
                finalX = oldX;       // Cannot slide in either direction
                finalY = oldY;
            }
        } else if (movedInX) { // Horizontal-only movement attempt that collided
            // If it collided, (attemptedX, oldY) is the colliding point.
            // So canSlideOnX (which checks !isCollidingAt(attemptedX, oldY)) would be false.
            // Character should not move.
            finalX = oldX;
            finalY = oldY; // Y was already oldY
        } else if (movedInY) { // Vertical-only movement attempt that collided
            // Similar to horizontal, canSlideOnY would be false.
            finalX = oldX; // X was already oldX
            finalY = oldY;
        } else {
            // This case implies oldX === attemptedX && oldY === attemptedY,
            // but that's handled by the early return.
            // If somehow reached, means current spot is colliding.
            finalX = oldX;
            finalY = oldY;
        }
    }
    // If no collision with (attemptedX, attemptedY), finalX and finalY are already set correctly.

    character.x = finalX;
    character.y = finalY;
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
