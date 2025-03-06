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

// Load AI Models (YOLO + PoseNet)
async function loadAIModels() {
    const objectModel = await cocoSsd.load();
    const poseModel = await posenet.load();
    return { objectModel, poseModel };
}

// Detect Objects & Movement
async function detectActivity(models) {
    const objectPredictions = await models.objectModel.detect(video);
    const pose = await models.poseModel.estimateSinglePose(video, {
        flipHorizontal: false,
        decodingMethod: 'single-person'
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSkeleton(pose.keypoints);
    
    let detectedWeapons = objectPredictions.filter(obj => obj.class === "knife" || obj.class === "gun");
    let detectedPeople = objectPredictions.filter(obj => obj.class === "person");

    if (detectedWeapons.length > 0) {
        triggerAlert("🚨 Weapon Detected!");
        sendAlertToAdmin("Weapon Detected!");
        autoEmergencyCall();
    } else if (detectFighting(pose.keypoints)) {
        triggerAlert("⚠️ Fight Detected!");
        sendAlertToAdmin("Fight Detected!");
    } else {
        alertMessage.innerText = "✅ No suspicious activity.";
    }

    requestAnimationFrame(() => detectActivity(models)); // Loop detection
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

// Trigger Alert System
function triggerAlert(message) {
    alertMessage.innerText = message;
    speakAlert(message);
}

// AI Voice Alert
function speakAlert(text) {
    const speech = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(speech);
}

// Send Alert to Admin via Firebase
function sendAlertToAdmin(event) {
    fetch("https://your-firebase-database.com/add", {
        method: "POST",
        body: JSON.stringify({ event }),
        headers: { "Content-Type": "application/json" }
    }).then(response => response.json())
      .then(data => console.log("Alert Sent:", data))
      .catch(error => console.error("Error:", error));
}

// Auto Emergency Call (Gamit ang Twilio API)
function autoEmergencyCall() {
    fetch("https://your-twilio-api.com/call", {
        method: "POST",
        body: JSON.stringify({ message: "Emergency! Weapon Detected!" }),
        headers: { "Content-Type": "application/json" }
    }).then(response => response.json())
      .then(data => console.log("Emergency Call Triggered:", data))
      .catch(error => console.error("Call Error:", error));
}

// Start AI Camera & Detection
startCamera().then(() => {
    loadAIModels().then(models => {
        detectActivity(models);
    });
});
