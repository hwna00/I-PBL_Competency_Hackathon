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
let startAt,
  endAt,
  totalLowFocusTime = 0;

const alertContainer = document.getElementById("alert-container");
const mainContainer = document.getElementById("container");
const btn = document.querySelector(".btn");

btn.addEventListener("click", () => {
  if (!isRunning) {
    startAt = performance.now();
    report.style.display = "none";
  } else {
    endAt = performance.now();

    drawReport();

    startAt = 0;
    endAt = 0;
    totalLowFocusTime = 0;
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

let lastLowFocusTime = 0;
async function predict() {
  // Prediction #1: run input through posenet
  // estimatePose can take in an image, video or canvas html element
  const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
  // Prediction 2: run input through teachable machine classification model
  const prediction = await model.predict(posenetOutput);

  if (prediction[2].probability.toFixed(2) > 0.9) {
    alertContainer.innerText = "you're good";

    if (lastLowFocusTime !== 0) {
      const currentTime = performance.now();
      const duration = (currentTime - lastLowFocusTime) / 1000; // 초 단위
      totalLowFocusTime += duration;
      lastLowFocusTime = 0;
    }
  } else {
    alertText = " Hey, stay focus";

    alertContainer.innerText = alertText;
    playAlertSound();
    if (lastLowFocusTime === 0) {
      lastLowFocusTime = performance.now();
    }
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

let myChart = null;
const drawReport = () => {
  const report = document.getElementById("report");
  report.innerHTML = "";
  report.style.display = "block";

  const h3 = document.createElement("h3");
  const totalDuration = (endAt - startAt) / 1000;
  let text = "";
  console.log(totalDuration, typeof totalDuration);

  if (totalDuration < 60) {
    text = `${Math.floor(totalDuration)}seconds`;
  } else if (totalDuration < 3600) {
    text = `${Math.floor(totalDuration / 60)}minutes`;
  } else {
    text = `${Math.floor(totalDuration / 3600)}hours`;
  }

  h3.textContent = `You drove for ${text}.`;

  const div = document.createElement("div");
  div.className = "chart-container";

  const canvas = document.createElement("canvas");
  canvas.id = "focusChart";

  div.appendChild(canvas);
  report.appendChild(h3);
  report.appendChild(div);

  const focusedTime = totalDuration - totalLowFocusTime;
  const ctx = canvas.getContext("2d");

  const data = {
    labels: ["focus time", "low focus time"],
    datasets: [
      {
        label: "focus",
        data: [Math.floor(focusedTime), Math.floor(totalLowFocusTime)],
        backgroundColor: [
          "rgba(54, 162, 235, 0.2)", // 집중 시간 색상
          "rgba(255, 99, 132, 0.2)", // 낮은 집중 시간 색상
        ],
        borderColor: ["rgba(54, 162, 235, 1)", "rgba(255, 99, 132, 1)"],
        borderWidth: 1,
      },
    ],
  };

  if (myChart) {
    myChart.destroy();
  }

  myChart = new Chart(ctx, {
    type: "doughnut",
    data: data,
    options: {
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
};
