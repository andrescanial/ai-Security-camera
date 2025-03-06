const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const warningText = document.getElementById("warningText");
const warningAudio = document.getElementById("warningAudio");
const cameraSelect = document.getElementById("cameraSelect");

async function setupCamera() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    cameraSelect.innerHTML = "";
    videoDevices.forEach((device, index) => {
        const option = document.createElement("option");
        option.value = device.deviceId;
        option.textContent = `Camera ${index + 1}`;
        cameraSelect.appendChild(option);
    });

    if (videoDevices.length > 0) {
        startCamera(videoDevices[0].deviceId);
    }

    cameraSelect.addEventListener("change", () => {
        startCamera(cameraSelect.value);
    });
}

async function startCamera(deviceId) {
    const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { deviceId: deviceId } 
    });
    video.srcObject = stream;
}

async function loadPoseNet() {
    const net = await posenet.load();
    setInterval(async () => {
        const pose = await net.estimateSinglePose(video, {
            flipHorizontal: false,
            decodingMethod: "single-person"
        });

        drawPose(pose);
        detectDanger(pose);
    }, 100);
}

function drawPose(pose) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    pose.keypoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.position.x, point.position.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
    });

    const skeleton = [
        [pose.keypoints[5], pose.keypoints[7]],
        [pose.keypoints[7], pose.keypoints[9]],
        [pose.keypoints[6], pose.keypoints[8]],
        [pose.keypoints[8], pose.keypoints[10]],
        [pose.keypoints[5], pose.keypoints[6]],
        [pose.keypoints[5], pose.keypoints[11]],
        [pose.keypoints[6], pose.keypoints[12]],
        [pose.keypoints[11], pose.keypoints[12]],
        [pose.keypoints[11], pose.keypoints[13]],
        [pose.keypoints[13], pose.keypoints[15]],
        [pose.keypoints[12], pose.keypoints[14]],
        [pose.keypoints[14], pose.keypoints[16]],
    ];

    skeleton.forEach(bone => {
        ctx.beginPath();
        ctx.moveTo(bone[0].position.x, bone[0].position.y);
        ctx.lineTo(bone[1].position.x, bone[1].position.y);
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

function detectDanger(pose) {
    const leftHand = pose.keypoints[9].position;
    const rightHand = pose.keypoints[10].position;
    const nose = pose.keypoints[0].position;

    const leftHandUp = leftHand.y < nose.y;
    const rightHandUp = rightHand.y < nose.y;

    if (leftHandUp && rightHandUp) {
        warningText.textContent = "⚠️ WARNING: Possible Fighting Detected!";
        warningAudio.play();
    } else {
        warningText.textContent = "";
    }
}

setupCamera();
video.addEventListener("loadeddata", loadPoseNet);
