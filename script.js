// More API functions here:
// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/pose

// the link to your model provided by Teachable Machine export panel
const URL = "./my_model/";
const WIDTH = 300;
const HEIGHT = 300;
const FLIP = true; // whether to flip the webcam

let status = "normal";
let isRunning = false;
let model, webcam, ctx, maxPredictions;
let startAt, endAt;

const alertContainer = document.getElementById("alert-container");
const mainContainer = document.getElementById("container");
const btn = document.querySelector(".btn");

btn.addEventListener("click", () => {
  if (!isRunning) {
    startAt = performance.now();
  } else {
    endAt = performance.now();
    console.log((endAt - startAt) / 1000);
  }

  isRunning = !isRunning;
  updateBtn();
  updateMainContainer();
});

const updateBtn = () => {
  if (isRunning) {
    btn.innerText = "Stop";
  } else {
    btn.innerText = "Start";
  }
};

const updateMainContainer = () => {
  if (isRunning) {
    mainContainer.style.display = "block";
  } else {
    mainContainer.style.display = "none";
  }
};

async function init() {
  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

  // load the model and metadata
  // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
  // Note: the pose library adds a tmPose object to your window (window.tmPose)
  model = await tmPose.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();

  // Convenience function to setup a webcam
  webcam = new tmPose.Webcam(WIDTH, HEIGHT, FLIP); // width, height, flip
  await webcam.setup(); // request access to the webcam
  await webcam.play();
  window.requestAnimationFrame(loop);

  // append/get elements to the DOM
  const canvas = document.getElementById("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  ctx = canvas.getContext("2d");
}

async function loop(timestamp) {
  if (!isRunning) {
    webcam.stop();
    return;
  }
  webcam.update(); // update the webcam frame
  await predict();
  window.requestAnimationFrame(loop);
}

async function predict() {
  // Prediction #1: run input through posenet
  // estimatePose can take in an image, video or canvas html element
  const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
  // Prediction 2: run input through teachable machine classification model
  const prediction = await model.predict(posenetOutput);

  if (prediction[2].probability.toFixed(2) > 0.9) {
    console.log(prediction[2].className);
    alertContainer.innerText = "you're good";
  } else {
    alertText = " Hey, stay focus";

    alertContainer.innerText = alertText;
    playAlertSound();
  }

  // finally draw the poses
  drawPose(pose);
}

function drawPose(pose) {
  if (webcam.canvas) {
    ctx.drawImage(webcam.canvas, 0, 0);
    // draw the keypoints and skeleton
    if (pose) {
      const minPartConfidence = 0.5;
      tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
      tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
    }
  }
}

const drawReport = () => {
  const report = document.getElementById("report");
};

let lastSoundPlayedAt = 0;
playAlertSound = () => {
  const now = Date.now();
  if (now - lastSoundPlayedAt > 5000) {
    const audioFile = "./assets/alert-sound.mp3";
    const audio = new Audio(audioFile);
    audio.play();
    lastSoundPlayedAt = now;
  }
};
