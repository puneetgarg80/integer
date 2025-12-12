// State
let currentLevel = 0;
const maxLevel = 6;   // Space
const minLevel = -5;  // Dinosaur
let inputMode = 'CLASSIC'; // CLASSIC or NUMERIC

let commandSequence = ""; // Virtual input state

// DOM Elements
const statusDisplay = document.getElementById('status-display'); // Top status
const virtualScreen = document.getElementById('virtual-screen'); // Bottom command view
const floors = document.querySelectorAll('.floor');
const goBtn = document.getElementById('go-btn');
const arrowBtns = document.querySelectorAll('.arrow-btn');
const clearBtn = document.querySelector('.clear-btn-mini');

// Helper for async delay
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function addChar(char) {
    commandSequence += char;
    updateVirtualScreen();
}

function clearInput() {
    commandSequence = "";
    updateVirtualScreen();
}

function updateVirtualScreen() {
    if (commandSequence === "") {
        virtualScreen.innerText = "";
        virtualScreen.style.opacity = "0.5";
    } else {
        virtualScreen.innerText = commandSequence;
        virtualScreen.style.opacity = "1";
    }
}

function setControlsEnabled(isEnabled) {
    goBtn.disabled = !isEnabled;
    arrowBtns.forEach(btn => btn.disabled = !isEnabled);
    clearBtn.disabled = !isEnabled;
    if (isEnabled) {
        goBtn.style.filter = "none";
    } else {
        goBtn.style.filter = "grayscale(100%)";
    }
}

function updateVisuals(textOverride = null) {
    // 1. Highlight Correct Floor
    floors.forEach(f => {
        const level = parseInt(f.getAttribute('data-level'));
        if (level === currentLevel) {
            f.classList.add('active-lift');
        } else {
            f.classList.remove('active-lift');
        }
    });

    // 2. Update Screen Text (Top Display)
    if (textOverride) {
        statusDisplay.innerText = textOverride;
    } else {
        const sign = currentLevel > 0 ? '+' : '';
        statusDisplay.innerText = `Level: ${sign}${currentLevel}`;
    }

    updateLiftPosition();
}

function updateLiftPosition() {
    const building = document.getElementById('building');
    const targetFloor = document.querySelector(`.floor[data-level='${currentLevel}']`);
    const liftCar = document.getElementById('lift-car');

    if (!targetFloor || !liftCar || !building) return;

    // Calculate position relative to the building container
    // The floor's offsetTop is relative to the building container
    // We want to center the lift on the floor.

    const floorTop = targetFloor.offsetTop;
    const floorHeight = targetFloor.offsetHeight;
    const liftHeight = liftCar.offsetHeight;

    // Center vertically
    const topPos = floorTop + (floorHeight / 2) - (liftHeight / 2);

    liftCar.style.top = `${topPos}px`;
}

function upgradeToNumeric() {
    inputMode = 'NUMERIC';
    document.getElementById('classic-controls').style.display = 'none';
    const numPad = document.getElementById('numeric-controls');
    numPad.style.display = 'grid';

    statusDisplay.innerText = "SYSTEM UPGRADED!";
    setTimeout(() => {
        updateVisuals();
        clearInput();
    }, 2000);
}

async function startJourney() {
    const command = commandSequence;
    if (command.length === 0) return;

    // 1. Parse Legs
    let legs = [];
    if (inputMode === 'CLASSIC') {
        legs = command.match(/(↑)+|(↓)+/g) || [];
    } else {
        // Numeric Mode: Matches "↑4", "↓10" etc.
        const rawLegs = command.match(/([↑↓])(\d+)/g) || [];
        legs = rawLegs.map(leg => {
            const dir = leg[0];
            const count = parseInt(leg.substring(1));
            return dir.repeat(count);
        });
    }

    if (legs.length === 0) return;

    // 2. Validate Path Before Moving
    let simLevel = currentLevel;
    for (let leg of legs) {
        const delta = leg.length * (leg[0] === '↑' ? 1 : -1);
        simLevel += delta;

        if (simLevel > maxLevel) {
            statusDisplay.style.color = "red";
            statusDisplay.innerText = "Error: Too High!";
            setTimeout(() => { statusDisplay.style.color = "#00E676"; updateVisuals(); }, 1500);
            return;
        }
        if (simLevel < minLevel) {
            statusDisplay.style.color = "red";
            statusDisplay.innerText = "Error: Too Low!";
            setTimeout(() => { statusDisplay.style.color = "#00E676"; updateVisuals(); }, 1500);
            return;
        }
    }

    // --- Start Animation Loop ---
    setControlsEnabled(false);
    clearInput();

    const lcdStatus = document.querySelector('.lcd-status');
    lcdStatus.innerText = "MOVING...";

    // 3. Execute Legs
    for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        const direction = leg[0] === '↑' ? 1 : -1;
        const dist = leg.length;
        const legTarget = currentLevel + (dist * direction);

        // Move floor by floor for this leg
        while (currentLevel !== legTarget) {
            statusDisplay.innerText = direction > 0 ? "Going Up... ▲" : "Going Down... ▼";

            currentLevel += direction;
            updateVisuals();

            await wait(800); // Wait for transition to compete
        }

        // Small pause between legs if there are more
        if (i < legs.length - 1) {
            statusDisplay.innerText = "Holding...";
            await wait(500);
        }
    }

    // Finished
    statusDisplay.innerText = "Ding! 🔔";
    lcdStatus.innerText = "ARRIVED";
    await wait(1000);
    updateVisuals();
    lcdStatus.innerText = "READY";
    setControlsEnabled(true);

    // Guide Check
    checkMissionStatus();
}

// --- Guide Logic ---
const guideText = document.getElementById('guide-text');
let missionState = 'INTRO'; // INTRO, MOVING_TO_ART, COMPLETED

function showGuideMessage(text) {
    guideText.style.opacity = '0';
    setTimeout(() => {
        guideText.innerHTML = text; // Allow HTML for bolding
        guideText.style.opacity = '1';
    }, 300);
}

function setTargetHighlight(level) {
    document.querySelectorAll('.floor').forEach(f => f.style.border = "");
    if (level !== null) {
        const floor = document.querySelector(`.floor[data-level='${level}']`);
        if (floor) floor.style.border = "2px dashed red";
    }
}

function guideSequence() {
    // Step 1: Intro
    showGuideMessage("Hello! I am your Guide. 👋<br><br>To go UP use <b>↑</b>.<br>To go DOWN use <b>↓</b>.");

    // Step 2: Task Assignment (after delay)
    setTimeout(() => {
        showGuideMessage("Now, a task for you!<br><br>Please take the lift to the <b>Art Centre</b>.");
        missionState = 'MOVING_TO_ART';
        setTargetHighlight(2);
    }, 3000);
}

function checkMissionStatus() {
    if (missionState === 'MOVING_TO_ART') {
        if (currentLevel === 2) {
            showGuideMessage("🌟 Excellent work!<br>You reached the Art Centre!");
            setTargetHighlight(null);

            setTimeout(() => {
                showGuideMessage("Next Challenge:<br>Go <b>4 floors UP</b> from here.");
                missionState = 'MOVING_UP_4';
                setTargetHighlight(6);
            }, 3000);
        } else {
            showGuideMessage("Not quite there yet.<br>I need you to go to <b>Art Centre</b>.");
        }
    } else if (missionState === 'MOVING_UP_4') {
        if (currentLevel === 6) {
            showGuideMessage("🚀 Wow! You are in Space!");
            setTargetHighlight(null);

            setTimeout(() => {
                showGuideMessage("Final Challenge:<br>Go <b>3 floors DOWN</b>.");
                missionState = 'MOVING_DOWN_3';
                setTargetHighlight(3);
            }, 3000);
        } else {
            showGuideMessage("Try again!<br>You need to go <b>4 floors UP</b>.");
        }
    } else if (missionState === 'MOVING_DOWN_3') {
        if (currentLevel === 3) {
            showGuideMessage("📚 Brilliant!<br>You found the Books!");
            setTargetHighlight(null);

            setTimeout(() => {
                showGuideMessage("Time for an adventure!<br>Go all the way down to <b>Dinosaurs</b>.");
                missionState = 'MOVING_TO_DINO';
                setTargetHighlight(-5);
            }, 3000);
        } else {
            showGuideMessage("Not there yet.<br>Go <b>3 floors DOWN</b>.");
        }
    } else if (missionState === 'MOVING_TO_DINO') {
        if (currentLevel === -5) {
            showGuideMessage("🦖 ROAR! You made it!<br>Watch out for the T-Rex!");
            setTargetHighlight(null);

            setTimeout(() => {
                showGuideMessage("Story Time! 📖<br>Bela's Building is getting popular!<br>But people are tired of pressing so many buttons...");

                setTimeout(() => {
                    showGuideMessage("So Bela invented a <b>Numeric Keypad</b>!<br>Upgrading your lift controls now...");

                    setTimeout(() => {
                        upgradeToNumeric();
                        // Teleport to Level 0 for the next test
                        currentLevel = 0;
                        updateVisuals();
                        showGuideMessage("<b>System Upgraded!</b><br>I've warped you to Level 0.<br>Now, try the new controls: Go <b>3 floors DOWN</b> (↓3).");
                        missionState = 'MOVING_DOWN_3_NEW';
                        setTargetHighlight(-3);
                    }, 4000);
                }, 5000);
            }, 3000);
        } else {
            showGuideMessage("Keep going down!<br>The <b>Dinosaurs</b> are at Level -5.");
        }
    } else if (missionState === 'MOVING_DOWN_3_NEW') {
        if (currentLevel === -3) {
            showGuideMessage("🎬 Perfect!<br>Welcome to the Cinema!");
            missionState = 'COMPLETED';
            setTargetHighlight(null);
        } else {
            showGuideMessage("Not quite.<br>Press <b>↓</b> then <b>3</b> to go to Level -3.");
        }
    }
}


function initFromParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const stateParam = urlParams.get('missionState');

    if (!stateParam) {
        // Default Start
        setTimeout(guideSequence, 1000);
        return;
    }

    // Stop existing guide sequence if any (though we are initing fresh)
    missionState = stateParam;

    // Handle specific states
    switch (missionState) {
        case 'MOVING_TO_ART':
            currentLevel = 0;
            setTargetHighlight(2);
            showGuideMessage("Dev Mode: Jumped to <b>MOVING_TO_ART</b>.<br>Go to Level 2.");
            break;
        case 'MOVING_UP_4':
            currentLevel = 2;
            setTargetHighlight(6);
            showGuideMessage("Dev Mode: Jumped to <b>MOVING_UP_4</b>.<br>Go to Level 6.");
            break;
        case 'MOVING_DOWN_3':
            currentLevel = 6;
            setTargetHighlight(3);
            showGuideMessage("Dev Mode: Jumped to <b>MOVING_DOWN_3</b>.<br>Go to Level 3.");
            break;
        case 'MOVING_TO_DINO':
            currentLevel = 3;
            setTargetHighlight(-5);
            showGuideMessage("Dev Mode: Jumped to <b>MOVING_TO_DINO</b>.<br>Go to Level -5.");
            break;
        case 'MOVING_DOWN_3_NEW':
            currentLevel = 0;
            setTargetHighlight(-3);
            upgradeToNumeric(); // Force upgrade UI
            showGuideMessage("Dev Mode: Jumped to <b>MOVING_DOWN_3_NEW</b>.<br>Go to Level -3 (↓3).");
            break;
        case 'COMPLETED':
            showGuideMessage("Dev Mode: Jumped to <b>COMPLETED</b>.");
            break;
        default:
            console.warn("Unknown mission state:", missionState);
            setTimeout(guideSequence, 1000); // Fallback
            break;
    }

    updateVisuals();
    updateVirtualScreen();
}

// Init
updateVisuals();
updateVirtualScreen();

// Start
initFromParams();

// Resize Logic
// We only need to update the lift position because CSS flexbox handles the building size now.
window.addEventListener('resize', () => {
    updateLiftPosition();
});
// Initial call
updateLiftPosition();
