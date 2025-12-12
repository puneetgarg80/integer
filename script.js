// State
let currentLevel = 0;
const maxLevel = 6;   // Space
const minLevel = -5;  // Dinosaur

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
        virtualScreen.innerText = "_";
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

async function startJourney() {
    const command = commandSequence;
    if (command.length === 0) return;

    // 1. Parse Legs (Group consecutive identical characters)
    const legs = command.match(/(\+)+|(-)+/g) || [];

    // 2. Validate Path Before Moving
    let simLevel = currentLevel;
    for (let leg of legs) {
        const delta = leg.length * (leg[0] === '+' ? 1 : -1);
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
        const direction = leg[0] === '+' ? 1 : -1;
        const dist = leg.length;
        const legTarget = currentLevel + (dist * direction);

        // Move floor by floor for this leg
        while (currentLevel !== legTarget) {
            statusDisplay.innerText = direction > 0 ? "Going Up... ▲" : "Going Down... ▼";
            await wait(800);

            currentLevel += direction;
            updateVisuals();
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

function guideSequence() {
    // Step 1: Intro
    showGuideMessage("Hello! I am your Guide. 👋<br><br>To go UP use <b>+</b>.<br>To go DOWN use <b>-</b>.");

    // Step 2: Task Assignment (after delay)
    setTimeout(() => {
        showGuideMessage("Now, a task for you!<br><br>Please take the lift to the <b>Art Centre (Level 2)</b>.");
        missionState = 'MOVING_TO_ART';
        // Highlight target
        const artFloor = document.querySelector('.floor[data-level="2"]');
        if (artFloor) artFloor.style.border = "2px dashed red";
    }, 5000);
}

function checkMissionStatus() {
    if (missionState === 'MOVING_TO_ART') {
        if (currentLevel === 2) {
            showGuideMessage("🌟 Excellent work!<br>You reached the Art Centre!");
            missionState = 'COMPLETED';
            // Remove highlight
            const artFloor = document.querySelector('.floor[data-level="2"]');
            if (artFloor) artFloor.style.border = "";
        } else {
            showGuideMessage("Not quite there yet.<br>I need you to go to <b>Level 2</b> (Art Centre).");
        }
    }
}

// Init
updateVisuals();
updateVirtualScreen();

// Start Guide
setTimeout(guideSequence, 1000);

// Dynamic Scaling for "No Scroll"
function adjustBuildingScale() {
    const wrapper = document.querySelector('.building-wrapper');
    const building = document.getElementById('building');

    if (!wrapper || !building) return;

    // Reset scale to measure natural size
    building.style.transform = 'scale(1)';

    const availableHeight = wrapper.clientHeight;
    const availableWidth = wrapper.clientWidth;
    const buildingHeight = building.scrollHeight;
    const buildingWidth = building.scrollWidth;

    const padding = 20;

    let scale = 1;

    // Check vertical fit
    if (buildingHeight > availableHeight - padding) {
        scale = (availableHeight - padding) / buildingHeight;
    }

    // Limit checks
    if (buildingWidth > availableWidth - padding) {
        const widthScale = (availableWidth - padding) / buildingWidth;
        scale = Math.min(scale, widthScale);
    }

    if (scale < 1) {
        building.style.transform = `scale(${scale})`;
    }
}

window.addEventListener('resize', adjustBuildingScale);
window.addEventListener('load', adjustBuildingScale);
// Call immediately in case load already fired
adjustBuildingScale();
