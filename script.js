const video = document.getElementById("cameraFeed");
const alertMessage = document.getElementById("alertMessage");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const cameraSelect = document.getElementById("cameraSelect");

let currentStream = null;
let poseModel, actionModel;

// Start Camera Function
async function startCamera(facingMode) {
    try {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: { facingMode: facingMode }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        currentStream = stream;
    } catch (err) {
        alertMessage.innerText = "❌ Camera access denied!";
        console.error("Camera error:", err);
    }
}

// Camera Switching Function
cameraSelect.addEventListener("change", function () {
    const selectedCamera = cameraSelect.value;
    startCamera(selectedCamera);
});

// Load AI Models
async function loadModels() {
    poseModel = await posenet.load();
    actionModel = await tf.loadLayersModel("/models/action-detection/model.json");

    detectActivity();
}

// Detect Activity & Draw Tracking
async function detectActivity() {
    const pose = await poseModel.estimateSinglePose(video, { flipHorizontal: false });
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (pose) {
        drawBoundingBox(pose.keypoints);
        drawSkeleton(pose.keypoints);
    }

    const actionPrediction = await detectCrimeActivity();
    if (actionPrediction) {
        showAlert(actionPrediction);
    }

    requestAnimationFrame(detectActivity);
}

// Draw Bounding Box
function drawBoundingBox(keypoints) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    keypoints.forEach(kp => {
        if (kp.score > 0.5) {
            minX = Math.min(minX, kp.position.x);
            minY = Math.min(minY, kp.position.y);
            maxX = Math.max(maxX, kp.position.x);
            maxY = Math.max(maxY, kp.position.y);
        }
    });

    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
}

// Draw Skeleton Tracking
function drawSkeleton(keypoints) {
    ctx.strokeStyle = "green";
    ctx.lineWidth = 3;

    const connections = [
        [5, 7], [7, 9], // Left arm
        [6, 8], [8, 10], // Right arm
        [5, 6], [5, 11], [6, 12], // Torso
        [11, 13], [13, 15], // Left leg
        [12, 14], [14, 16] // Right leg
    ];

    connections.forEach(([i, j]) => {
        const kp1 = keypoints[i].position;
        const kp2 = keypoints[j].position;

        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.stroke();
    });

    keypoints.forEach(kp => {
        ctx.beginPath();
        ctx.arc(kp.position.x, kp.position.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "blue";
        ctx.fill();
    });
}

// Detect Crime Activity
async function detectCrimeActivity() {
    const tensor = tf.browser.fromPixels(video).resizeNearestNeighbor([224, 224]).expandDims(0).toFloat().div(tf.scalar(255));
    const prediction = await actionModel.predict(tensor).data();

    const labels = ["Normal", "Fighting", "Shooting", "Stabbing"];
    const maxIndex = prediction.indexOf(Math.max(...prediction));

    if (labels[maxIndex] !== "Normal") {
        return labels[maxIndex];
    }

    return null;
}

// Show Alert
function showAlert(activity) {
    alertMessage.innerText = `⚠️ WARNING: ${activity} DETECTED!`;
    alertMessage.style.color = "red";
    speakAlert(`Warning! ${activity} detected.`);
}

// AI Voice Notification
function speakAlert(text) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    speech.rate = 1.0;
    window.speechSynthesis.speak(speech);
}

// Start Everything
startCamera("environment"); // Default: Back Camera
loadModels();
