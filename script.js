const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const switchCameraBtn = document.getElementById("switchCamera");
const alertSound = document.getElementById("alertSound");

let currentStream;
let usingFrontCamera = true;

async function setupCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
        video: {
            facingMode: usingFrontCamera ? "user" : "environment",
            width: 640,
            height: 480
        }
    };

    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = currentStream;

    video.onloadedmetadata = () => {
        video.play();
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    };
}

switchCameraBtn.addEventListener("click", () => {
    usingFrontCamera = !usingFrontCamera;
    setupCamera();
});

async function loadModels() {
    const poseNetModel = await posenet.load();
    return poseNetModel;
}

async function detectMovement(poseNetModel) {
    setInterval(async () => {
        const pose = await poseNetModel.estimateSinglePose(video, { flipHorizontal: usingFrontCamera });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        drawSkeleton(pose);
        detectCrime(pose);
    }, 100);
}

function drawSkeleton(pose) {
    pose.keypoints.forEach((point) => {
        if (point.score > 0.5) {
            ctx.beginPath();
            ctx.arc(point.position.x, point.position.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = "red";
            ctx.fill();
        }
    });
}

function detectCrime(pose) {
    const leftHand = pose.keypoints.find(k => k.part === "leftWrist");
    const rightHand = pose.keypoints.find(k => k.part === "rightWrist");
    const nose = pose.keypoints.find(k => k.part === "nose");

    if (leftHand.score > 0.5 && rightHand.score > 0.5 && nose.score > 0.5) {
        const handDistance = Math.abs(leftHand.position.x - rightHand.position.x);
        if (handDistance < 50) {
            ctx.fillStyle = "red";
            ctx.font = "30px Arial";
            ctx.fillText("⚠️ Possible Fight Detected!", 50, 50);
            alertSound.play();
        }
    }
}

async function start() {
    await setupCamera();
    const poseNetModel = await loadModels();
    detectMovement(poseNetModel);
}

start();
