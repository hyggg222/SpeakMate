import './style.css';

const API_GENERATE_TOPIC = "/api/generate-topic";
const API_PROCESS_SPEECH = "/api/process-speech";

let mediaRecorder;
let audioChunks = [];
let lastAudioBlob;
let lastFeedbackAudioWavBlob;

const navLinkHome = document.getElementById('nav-link-home');
const navLinkPractice = document.getElementById('nav-link-practice');
const ctaButton = document.getElementById('cta-button');

const generateTopicBtn = document.getElementById('generate-topic-btn');
const topicLoading = document.getElementById('topic-loading');
const questionText = document.getElementById('question-text');

const recordBtn = document.getElementById('record-btn');
const recordIconContainer = document.getElementById('record-icon-container');
const statusText = document.getElementById('status-text');

const loadingArea = document.getElementById('loading-area');
const resultArea = document.getElementById('result-area');
const transcriptText = document.getElementById('transcript-text');

const playbackArea = document.getElementById('playback-area');
const playbackBtn = document.getElementById('playback-btn');
const audioPlayer = document.getElementById('audio-player');
const playbackStatus = document.getElementById('playback-status');

const feedbackArea = document.getElementById('feedback-area');
const feedbackText = document.getElementById('feedback-text');
const feedbackError = document.getElementById('feedback-error');
const feedbackAudioArea = document.getElementById('feedback-audio-area');
const feedbackAudioBtn = document.getElementById('feedback-audio-btn');
const feedbackAudioPlayer = document.getElementById('feedback-audio-player');
const feedbackAudioStatus = document.getElementById('feedback-audio-status');

const iconTemplates = document.getElementById('icon-templates');

let micIcon, stopIcon, playIcon, pauseIcon;
if (iconTemplates) {
  micIcon = iconTemplates.querySelector('#svg-mic-icon').cloneNode(true);
  stopIcon = iconTemplates.querySelector('#svg-stop-icon').cloneNode(true);
  playIcon = iconTemplates.querySelector('#svg-play-icon').cloneNode(true);
  pauseIcon = iconTemplates.querySelector('#svg-pause-icon').cloneNode(true);
} else {
  console.error("Icon templates not found in DOM");
}

document.addEventListener('DOMContentLoaded', () => {
  if (!micIcon) return;

  recordIconContainer.appendChild(micIcon);
  playbackBtn.appendChild(playIcon.cloneNode(true));
  feedbackAudioBtn.appendChild(playIcon.cloneNode(true));

  generateTopicBtn.addEventListener('click', generateNewTopic);
  recordBtn.addEventListener('click', toggleRecording);

  playbackBtn.addEventListener('click', togglePlayback);
  audioPlayer.addEventListener('ended', onPlaybackEnded);

  feedbackAudioBtn.addEventListener('click', toggleFeedbackAudioPlayback);
  feedbackAudioPlayer.addEventListener('ended', onFeedbackAudioPlaybackEnded);

  const homeSection = document.getElementById('home-page');
  const appSection = document.getElementById('app-section');

  if (navLinkHome && homeSection) {
    navLinkHome.addEventListener('click', (e) => {
      e.preventDefault();
      homeSection.scrollIntoView({ behavior: 'smooth' });
    });
  }
  if (navLinkPractice && appSection) {
    navLinkPractice.addEventListener('click', (e) => {
      e.preventDefault();
      appSection.scrollIntoView({ behavior: 'smooth' });
    });
  }
  if (ctaButton && appSection) {
    ctaButton.addEventListener('click', (e) => {
      e.preventDefault();
      appSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  activateScrollEffects();
});

async function generateNewTopic() {
  console.log("Dang goi API tao chu de...");
  topicLoading.classList.remove('hidden');
  questionText.classList.add('hidden');
  generateTopicBtn.disabled = true;

  try {
    const response = await fetch(API_GENERATE_TOPIC);
    if (!response.ok) {
      throw new Error(`Loi server: ${response.status}`);
    }
    const data = await response.json();

    questionText.textContent = data.topic || "Hay gioi thieu ve ban than ban.";

  } catch (error) {
    console.error("Loi khi tao topic:", error);
    questionText.textContent = `Loi: ${error.message}. Ban co the noi tu do.`;
  } finally {
    topicLoading.classList.add('hidden');
    questionText.classList.remove('hidden');
    generateTopicBtn.disabled = false;
  }
}

async function toggleRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    recordBtn.disabled = true;
    statusText.textContent = "Đang dừng ghi âm...";
  } else {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startRecording(stream);
    } catch (err) {
      console.error("Lỗi khi xin quyền Mic:", err);
      statusText.textContent = "Lỗi: Không thể truy cập Micro.";
    }
  }
}

function startRecording(stream) {
  audioChunks = [];
  const options = {
    mimeType: 'audio/webm;codecs=opus',
    audioBitsPerSecond: 128000,
    sampleRate: 16000
  };

  try {
    mediaRecorder = new MediaRecorder(stream, options);
  } catch (e) {
    console.warn("Khong the set sampleRate 16kHz, su dung mac dinh cua trinh duyet.");
    mediaRecorder = new MediaRecorder(stream);
  }

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = () => {
    stream.getTracks().forEach(track => track.stop());

    lastAudioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });

    const audioUrl = URL.createObjectURL(lastAudioBlob);
    audioPlayer.src = audioUrl;

    sendAudioToAPI(lastAudioBlob);

    recordIconContainer.innerHTML = "";
    recordIconContainer.appendChild(micIcon.cloneNode(true));
    recordBtn.classList.remove('recording');
    statusText.textContent = "Đã ghi xong. Đang gửi đi phân tích...";
  };

  mediaRecorder.start();

  recordIconContainer.innerHTML = "";
  recordIconContainer.appendChild(stopIcon.cloneNode(true));
  recordBtn.classList.add('recording');
  statusText.textContent = "Đang ghi âm... (Nhấn để dừng)";

  resetRecordingUI();
}

function resetRecordingUI() {
  loadingArea.classList.add('hidden');
  resultArea.classList.add('hidden');
  playbackArea.classList.add('hidden');
  feedbackArea.classList.add('hidden');
  feedbackAudioArea.classList.add('hidden');
  feedbackError.classList.add('hidden');

  onPlaybackEnded();
  onFeedbackAudioPlaybackEnded();
  audioPlayer.src = "";
  feedbackAudioPlayer.src = "";
  lastAudioBlob = null;
  lastFeedbackAudioWavBlob = null;
}

async function sendAudioToAPI(audioBlob) {
  loadingArea.classList.remove('hidden');
  resultArea.classList.add('hidden');
  recordBtn.disabled = true;

  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  try {
    const response = await fetch(API_PROCESS_SPEECH, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Lỗi server: ${response.status}`);
    }

    transcriptText.textContent = data.transcript || "(Không nghe rõ... Vui lòng thử lại)";
    feedbackText.textContent = data.feedback_text || "Không có phản hồi từ AI.";

    loadingArea.classList.add('hidden');
    resultArea.classList.remove('hidden');
    playbackArea.classList.remove('hidden');
    feedbackArea.classList.remove('hidden');

    if (data.feedback_audio_base64) {
      try {
        lastFeedbackAudioWavBlob = await convertPcmToWav(data.feedback_audio_base64);
        const audioUrl = URL.createObjectURL(lastFeedbackAudioWavBlob);
        feedbackAudioPlayer.src = audioUrl;
        feedbackAudioArea.classList.remove('hidden');
      } catch (pcmError) {
        console.error("Loi xu ly audio PCM:", pcmError);
        feedbackError.textContent = "Loi: Khong the phat file am thanh phan hoi.";
        feedbackError.classList.remove('hidden');
      }
    }

  } catch (error) {
    console.error("Lỗi khi goi API xu ly:", error);
    loadingArea.classList.add('hidden');
    resultArea.classList.remove('hidden');
    feedbackArea.classList.remove('hidden');
    feedbackError.textContent = `Lỗi: ${error.message}`;
    feedbackError.classList.remove('hidden');
  } finally {
    recordBtn.disabled = false;
    statusText.textContent = "Nhấn để bắt đầu ghi âm";
  }
}

function togglePlayback() {
  if (audioPlayer.paused) {
    audioPlayer.play();
    playbackBtn.innerHTML = "";
    playbackBtn.appendChild(pauseIcon.cloneNode(true));
    playbackStatus.textContent = "Đang phát...";
  } else {
    audioPlayer.pause();
    playbackBtn.innerHTML = "";
    playbackBtn.appendChild(playIcon.cloneNode(true));
    playbackStatus.textContent = "Tạm dừng";
  }
}

function onPlaybackEnded() {
  playbackBtn.innerHTML = "";
  playbackBtn.appendChild(playIcon.cloneNode(true));
  playbackStatus.textContent = "Nhấn để nghe lại";
}

function toggleFeedbackAudioPlayback() {
  if (feedbackAudioPlayer.paused) {
    feedbackAudioPlayer.play();
    feedbackAudioBtn.innerHTML = "";
    feedbackAudioBtn.appendChild(pauseIcon.cloneNode(true));
    feedbackAudioStatus.textContent = "Đang phát...";
  } else {
    feedbackAudioPlayer.pause();
    feedbackAudioBtn.innerHTML = "";
    feedbackAudioBtn.appendChild(playIcon.cloneNode(true));
    feedbackAudioStatus.textContent = "Tạm dừng";
  }
}

function onFeedbackAudioPlaybackEnded() {
  feedbackAudioBtn.innerHTML = "";
  feedbackAudioBtn.appendChild(playIcon.cloneNode(true));
  feedbackAudioStatus.textContent = "Nhấn để nghe phản hồi";
}

async function convertPcmToWav(base64DataUri) {
  const parts = base64DataUri.split(',');
  const meta = parts[0];
  const base64Pcm = parts[1];

  const sampleRateMatch = meta.match(/rate=(\d+)/);
  const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;

  const pcmData = atob(base64Pcm);
  const buffer = new ArrayBuffer(pcmData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < pcmData.length; i++) {
    view[i] = pcmData.charCodeAt(i);
  }

  const pcm16 = new Int16Array(buffer);

  const wavBuffer = new ArrayBuffer(44 + pcm16.byteLength);
  const wavView = new DataView(wavBuffer);

  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;

  writeString(wavView, 0, 'RIFF');
  wavView.setUint32(4, 36 + pcm16.byteLength, true);
  writeString(wavView, 8, 'WAVE');
  writeString(wavView, 12, 'fmt ');
  wavView.setUint32(16, 16, true);
  wavView.setUint16(20, 1, true);
  wavView.setUint16(22, numChannels, true);
  wavView.setUint32(24, sampleRate, true);
  wavView.setUint32(28, byteRate, true);
  wavView.setUint16(32, blockAlign, true);
  wavView.setUint16(34, bitsPerSample, true);
  writeString(wavView, 36, 'data');
  wavView.setUint32(40, pcm16.byteLength, true);

  const pcmView = new Int16Array(wavBuffer, 44);
  pcmView.set(pcm16);

  return new Blob([wavView], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function activateScrollEffects() {
  const elementsToAnimate = document.querySelectorAll('.fade-in-on-scroll');
  if (elementsToAnimate.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1
  });

  elementsToAnimate.forEach(el => {
    observer.observe(el);
  });
}
