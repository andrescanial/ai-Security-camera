const video = document.getElementById("cameraFeed");
const alertMessage = document.getElementById("alertMessage");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Start Camera
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (err) {
        alertMessage.innerText = "❌ Camera access denied!";
        console.error("Camera error:", err);
    }
}

// Load AI Model (PoseNet)
async function loadAIModel() {
    return await posenet.load();
}

// Detect Multiple People & Auto-Aim
async function detectActivity(model) {
    const poses = await model.estimateMultiplePoses(video, {
        flipHorizontal: false,
        maxDetections: 5, // Detect up to 5 people
        scoreThreshold: 0.5
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let detectedFighting = false;

    poses.forEach(pose => {
        drawSkeleton(pose.keypoints);
        autoAimFullBody(pose.keypoints);

        if (detectFighting(pose.keypoints)) {
            detectedFighting = true;
        }
    });

    if (detectedFighting) {
        triggerWarning("⚠️ Warning: Fighting Detected!");
    } else {
        alertMessage.innerText = "✅ All clear.";
    }

    requestAnimationFrame(() => detectActivity(model)); // Loop detection
}

// Auto-Aim Function (Buong Katawan, Multi-Person)
function autoAimFullBody(keypoints) {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;

    keypoints.forEach(point => {
        if (point.score > 0.5) {
            ctx.beginPath();
            ctx.arc(point.position.x, point.position.y, 10, 0, 2 * Math.PI);
            ctx.stroke();
        }
    });

    drawCrosshair(keypoints.find(p => p.part === "nose")); // Head
    drawCrosshair(keypoints.find(p => p.part === "leftWrist")); // Left Hand
    drawCrosshair(keypoints.find(p => p.part === "rightWrist")); // Right Hand
    drawCrosshair(keypoints.find(p => p.part === "leftKnee")); // Left Knee
    drawCrosshair(keypoints.find(p => p.part === "rightKnee")); // Right Knee
}

// Draw Crosshair
function drawCrosshair(point) {
    if (point && point.score > 0.5) {
        ctx.beginPath();
        ctx.moveTo(point.position.x - 10, point.position.y);
        ctx.lineTo(point.position.x + 10, point.position.y);
        ctx.moveTo(point.position.x, point.position.y - 10);
        ctx.lineTo(point.position.x, point.position.y + 10);
        ctx.stroke();
    }
}

// Detect Fighting Motion
function detectFighting(keypoints) {
    const leftHand = keypoints.find(p => p.part === "leftWrist");
    const rightHand = keypoints.find(p => p.part === "rightWrist");

    return leftHand && rightHand && Math.abs(leftHand.position.y - rightHand.position.y) < 50;
}

// Draw Skeleton on Canvas
function drawSkeleton(keypoints) {
    ctx.fillStyle = "red";
    keypoints.forEach(point => {
        if (point.score > 0.5) {
            ctx.beginPath();
            ctx.arc(point.position.x, point.position.y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
}

// Trigger Warning
function triggerWarning(message) {
    alertMessage.innerText = message;
    speakAlert(message);
}

// AI Voice Warning
function speakAlert(text) {
    const speech = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(speech);
}

// Start AI Camera & Detection
startCamera().then(() => {
    loadAIModel().then(model => {
        detectActivity(model);
    });
});
