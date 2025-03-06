const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const cameraSelect = document.getElementById("cameraSelect");

let detector;
let cameraStream;

// 🔹 Function to Load Pose Detection Model
async function loadModel() {
    detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);
}

// 🔹 Function to Start Camera
async function startCamera(deviceId = null) {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
        video: { deviceId: deviceId ? { exact: deviceId } : undefined }
    };

    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = cameraStream;

    // 🔹 Populate Camera Options
    const devices = await navigator.mediaDevices.enumerateDevices();
    cameraSelect.innerHTML = "";
    devices.forEach(device => {
        if (device.kind === "videoinput") {
            let option = document.createElement("option");
            option.value = device.deviceId;
            option.text = device.label || `Camera ${cameraSelect.length + 1}`;
            cameraSelect.appendChild(option);
        }
    });

    // 🔹 Auto-switch Camera
    cameraSelect.onchange = () => startCamera(cameraSelect.value);
}

// 🔹 Function to Detect Human Pose
async function detectPose() {
    if (!detector) return;

    const poses = await detector.estimatePoses(video);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    poses.forEach(pose => {
        pose.keypoints.forEach(point => {
            if (point.score > 0.3) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = "red";
                ctx.fill();
            }
        });

        drawSkeleton(pose.keypoints);
    });

    requestAnimationFrame(detectPose);
}

// 🔹 Function to Draw Skeleton
function drawSkeleton(keypoints) {
    const pairs = [
        [0, 1], [1, 2], [2, 3], [3, 4],  // Head to Arm
        [0, 5], [5, 6], [6, 7], [7, 8],  // Other Arm
        [5, 9], [9, 10], [10, 11], [11, 12] // Legs
    ];

    pairs.forEach(([a, b]) => {
        if (keypoints[a].score > 0.3 && keypoints[b].score > 0.3) {
            ctx.beginPath();
            ctx.moveTo(keypoints[a].x, keypoints[a].y);
            ctx.lineTo(keypoints[b].x, keypoints[b].y);
            ctx.strokeStyle = "blue";
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    });
}

// 🔹 Function for AI Voice Alert
function aiVoiceAlert(message) {
    const speech = new SpeechSynthesisUtterance(message);
    speech.lang = "en-US";
    window.speechSynthesis.speak(speech);
}

// 🔹 Function to Detect Fight/Crime
async function monitorActivity() {
    if (!detector) return;

    const poses = await detector.estimatePoses(video);
    let fightDetected = false;

    poses.forEach(pose => {
        const leftHand = pose.keypoints[9];
        const rightHand = pose.keypoints[10];

        if (leftHand.score > 0.3 && rightHand.score > 0.3) {
            if (Math.abs(leftHand.x - rightHand.x) < 50 && Math.abs(leftHand.y - rightHand.y) < 50) {
                fightDetected = true;
            }
        }
    });

    if (fightDetected) {
        aiVoiceAlert("Warning! Fight detected!");
        alert("⚠️ Warning: Fight detected!");
    }

    setTimeout(monitorActivity, 2000);
}

// 🔹 Initialize
async function init() {
    await loadModel();
    await startCamera();
    detectPose();
    monitorActivity();
}

init();
