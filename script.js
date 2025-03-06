const video = document.getElementById("cameraFeed");
const alertMessage = document.getElementById("alertMessage");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const cameraSelect = document.getElementById("cameraSelect");

let previousKeypoints = [];
let weaponModel;
let currentStream = null;

// Start Camera with Selected Device
async function startCamera(facingMode = "environment") {
    try {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode, audio: true }  // ✅ May audio input na!
        });

        video.srcObject = stream;
        currentStream = stream;

        startSoundDetection(stream); // ✅ Start sound detection
    } catch (err) {
        alertMessage.innerText = "❌ Camera access denied!";
        console.error("Camera error:", err);
    }
}

// Load AI Models (PoseNet & COCO-SSD for weapons)
async function loadModels() {
    const poseModel = await posenet.load();
    weaponModel = await cocoSsd.load();
    return poseModel;
}

// Detect Activity
async function detectActivity(poseModel) {
    const poses = await poseModel.estimateMultiplePoses(video, {
        flipHorizontal: false,
        maxDetections: 5,
        scoreThreshold: 0.5
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let detectedFighting = false;
    let detectedWeapon = false;

    for (let pose of poses) {
        drawBoundingBox(pose.keypoints);
        autoAimFullBody(pose.keypoints);

        if (detectFighting(pose.keypoints)) {
            detectedFighting = true;
        }
    }

    detectedWeapon = await detectWeapon();

    if (detectedWeapon) {
        triggerWarning("Warning! A weapon has been detected!");
    } else if (detectedFighting) {
        triggerWarning("Alert! Fighting detected!");
    } else {
        alertMessage.innerText = "✅ Normal Activity";
    }

    requestAnimationFrame(() => detectActivity(poseModel));
}

// Auto-Aim sa Buong Katawan
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

    drawCrosshair(keypoints.find(p => p.part === "nose"));
    drawCrosshair(keypoints.find(p => p.part === "leftWrist"));
    drawCrosshair(keypoints.find(p => p.part === "rightWrist"));
}

// Gumagalaw na Bounding Box (Sumusunod sa Galaw ng Tao)
function drawBoundingBox(keypoints) {
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;

    keypoints.forEach(point => {
        if (point.score > 0.5) {
            minX = Math.min(minX, point.position.x);
            minY = Math.min(minY, point.position.y);
            maxX = Math.max(maxX, point.position.x);
            maxY = Math.max(maxY, point.position.y);
        }
    });

    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.strokeRect(minX - 10, minY - 10, (maxX - minX) + 20, (maxY - minY) + 20);

    ctx.fillStyle = "black";
    ctx.fillRect(minX - 10, minY - 30, 100, 20);
    ctx.fillStyle = "white";
    ctx.fillText("Person", minX, minY - 15);
}

// Fighting Detection (Mas Matalino)
function detectFighting(currentKeypoints) {
    if (previousKeypoints.length === 0) {
        previousKeypoints = currentKeypoints;
        return false;
    }

    const leftHand = currentKeypoints.find(p => p.part === "leftWrist");
    const rightHand = currentKeypoints.find(p => p.part === "rightWrist");
    const leftHandPrev = previousKeypoints.find(p => p.part === "leftWrist");
    const rightHandPrev = previousKeypoints.find(p => p.part === "rightWrist");

    if (leftHand && rightHand && leftHandPrev && rightHandPrev) {
        const leftSpeed = Math.abs(leftHand.position.y - leftHandPrev.position.y);
        const rightSpeed = Math.abs(rightHand.position.y - rightHandPrev.position.y);
        const handDistance = Math.abs(leftHand.position.x - rightHand.position.x);

        if ((leftSpeed > 15 || rightSpeed > 15) && handDistance < 100) {
            previousKeypoints = currentKeypoints;
            return true;
        }
    }

    previousKeypoints = currentKeypoints;
    return false;
}

// Weapon Detection (Baril at Kutsilyo)
async function detectWeapon() {
    const predictions = await weaponModel.detect(video);

    for (let pred of predictions) {
        if (pred.class === "knife" || pred.class === "gun") {
            drawWeaponBox(pred);
            return true;
        }
    }
    return false;
}

// Gumagalaw na Box Kapag May Weapon
function drawWeaponBox(pred) {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;
    ctx.strokeRect(pred.bbox[0], pred.bbox[1], pred.bbox[2], pred.bbox[3]);

    ctx.fillStyle = "black";
    ctx.fillRect(pred.bbox[0], pred.bbox[1] - 20, 100, 20);
    ctx.fillStyle = "red";
    ctx.fillText("Weapon", pred.bbox[0] + 5, pred.bbox[1] - 5);
}

// AI Voice Notification
function speakAlert(text) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";  // English voice alert
    speech.rate = 1.0; // Normal speed
    window.speechSynthesis.speak(speech);
}

// Warning System (May AI Voice Alert)
function triggerWarning(message) {
    alertMessage.innerText = message;
    speakAlert(message);
}

// Sound Detection (Para sa Sigaw o Putok ng Baril)
function startSoundDetection(stream) {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    analyser.fftSize = 512;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function analyzeAudio() {
        analyser.getByteFrequencyData(dataArray);
        const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;

        if (volume > 80) { // ✅ Kapag malakas ang tunog (sigaw o putok)
            triggerWarning("Loud noise detected! Possible gunshot or scream!");
        }

        requestAnimationFrame(analyzeAudio);
    }

    analyzeAudio();
}

// Start Camera on Dropdown Change
cameraSelect.addEventListener("change", () => {
    startCamera(cameraSelect.value);
});

// Start Everything
startCamera();
loadModels().then(model => detectActivity(model));
