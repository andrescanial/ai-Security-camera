let video = document.getElementById("video");
let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");
let alertBox = document.getElementById("alertBox");
let cameraSelect = document.getElementById("cameraSelect");

// Start camera
async function startCamera(facingMode = "user") {
    if (navigator.mediaDevices.getUserMedia) {
        let stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode }
        });
        video.srcObject = stream;
    }
}

// Load PoseNet model
async function loadPoseNet() {
    const net = await posenet.load();
    detectPose(net);
}

// Detect human pose
async function detectPose(net) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    setInterval(async () => {
        const pose = await net.estimateSinglePose(video, {
            flipHorizontal: false,
            decodingMethod: "single-person"
        });

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawSkeleton(pose);
        detectViolence(pose);
    }, 100);
}

// Draw skeleton on detected person
function drawSkeleton(pose) {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;

    pose.keypoints.forEach((point) => {
        if (point.score > 0.5) {
            ctx.beginPath();
            ctx.arc(point.position.x, point.position.y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    });

    let adjacentKeypoints = posenet.getAdjacentKeyPoints(pose.keypoints, 0.5);
    adjacentKeypoints.forEach((pair) => {
        ctx.beginPath();
        ctx.moveTo(pair[0].position.x, pair[0].position.y);
        ctx.lineTo(pair[1].position.x, pair[1].position.y);
        ctx.stroke();
    });
}

// Detect violent behavior (simplified logic)
function detectViolence(pose) {
    let leftHand = pose.keypoints.find((p) => p.part === "leftWrist");
    let rightHand = pose.keypoints.find((p) => p.part === "rightWrist");
    let nose = pose.keypoints.find((p) => p.part === "nose");

    if (leftHand && rightHand && nose) {
        let handDistance = Math.abs(leftHand.position.y - nose.position.y) + Math.abs(rightHand.position.y - nose.position.y);
        
        if (handDistance < 100) {
            showAlert("⚠️ WARNING: Fighting Detected!");
        } else {
            hideAlert();
        }
    }
}

// Show alert
function showAlert(msg) {
    alertBox.innerText = msg;
    alertBox.style.display = "block";
    speakAlert(msg);
}

// Hide alert
function hideAlert() {
    alertBox.style.display = "none";
}

// AI Voice Alert
function speakAlert(msg) {
    let speech = new SpeechSynthesisUtterance(msg);
    speech.rate = 1;
    speech.pitch = 1;
    window.speechSynthesis.speak(speech);
}

// Camera switching
cameraSelect.addEventListener("change", (e) => {
    let facingMode = e.target.value;
    startCamera(facingMode);
});

// Start
startCamera();
loadPoseNet();
