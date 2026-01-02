import './style.css';

// --- CẤU HÌNH API ---
// Vi su dung Proxy trong vite.config.js nen giu nguyen path tuong doi
const API_GENERATE_TOPIC = "/api/generate-topic";
const API_PROCESS_SPEECH = "/api/process-speech";

// --- BIẾN TOÀN CỤC (GLOBAL) ---
let mediaRecorder; // Đối tượng ghi âm
let audioChunks = []; // Mảng chứa các mẩu âm thanh
let lastAudioBlob; // File âm thanh (ghi am) cuối cùng (để phát lại)
let lastFeedbackAudioWavBlob; // File am thanh (TTS) cuoi cung (de phat lai)

// --- CÁC ĐỐI TƯỢNG DOM (ELEMENTS) ---

// Nav & Scroll
const navLinkHome = document.getElementById('nav-link-home');
const navLinkPractice = document.getElementById('nav-link-practice');
const ctaButton = document.getElementById('cta-button');

// App Chinh
const generateTopicBtn = document.getElementById('generate-topic-btn');
const topicLoading = document.getElementById('topic-loading');
const questionText = document.getElementById('question-text');

// Ghi am
const recordBtn = document.getElementById('record-btn');
const recordIconContainer = document.getElementById('record-icon-container');
const statusText = document.getElementById('status-text');

// Ket qua
const loadingArea = document.getElementById('loading-area');
const resultArea = document.getElementById('result-area');
const transcriptText = document.getElementById('transcript-text');

// Phat lai (Nguoi dung)
const playbackArea = document.getElementById('playback-area');
const playbackBtn = document.getElementById('playback-btn');
const audioPlayer = document.getElementById('audio-player');
const playbackStatus = document.getElementById('playback-status');

// Phan hoi (AI)
const feedbackArea = document.getElementById('feedback-area');
const feedbackText = document.getElementById('feedback-text');
const feedbackError = document.getElementById('feedback-error');
const feedbackAudioArea = document.getElementById('feedback-audio-area');
const feedbackAudioBtn = document.getElementById('feedback-audio-btn');
const feedbackAudioPlayer = document.getElementById('feedback-audio-player');
const feedbackAudioStatus = document.getElementById('feedback-audio-status');

// Icon Templates (Lấy từ HTML)
const iconTemplates = document.getElementById('icon-templates');
// Ensure iconTemplates exists before querying
let micIcon, stopIcon, playIcon, pauseIcon;
if (iconTemplates) {
  micIcon = iconTemplates.querySelector('#svg-mic-icon').cloneNode(true);
  stopIcon = iconTemplates.querySelector('#svg-stop-icon').cloneNode(true);
  playIcon = iconTemplates.querySelector('#svg-play-icon').cloneNode(true);
  pauseIcon = iconTemplates.querySelector('#svg-pause-icon').cloneNode(true);
} else {
  console.error("Icon templates not found in DOM");
}


// --- LOGIC KHOI TAO (CHAY KHI TAI TRANG) ---
document.addEventListener('DOMContentLoaded', () => {
  if (!micIcon) return; // Guard clause

  // 1. Khoi tao Icon cho phan App
  recordIconContainer.appendChild(micIcon);
  playbackBtn.appendChild(playIcon.cloneNode(true));
  feedbackAudioBtn.appendChild(playIcon.cloneNode(true));

  // 2. Gan su kien cho phan App
  generateTopicBtn.addEventListener('click', generateNewTopic);
  recordBtn.addEventListener('click', toggleRecording);

  // 3. Gan su kien cho cac nut Phat lai
  playbackBtn.addEventListener('click', togglePlayback);
  audioPlayer.addEventListener('ended', onPlaybackEnded);

  feedbackAudioBtn.addEventListener('click', toggleFeedbackAudioPlayback);
  feedbackAudioPlayer.addEventListener('ended', onFeedbackAudioPlaybackEnded);

  // 4. Gan su kien cho Nav & Scroll
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

  // 5. Kich hoat hieu ung cuon
  activateScrollEffects();
});

// --- LOGIC TAO CHU DE ---
async function generateNewTopic() {
  console.log("Dang goi API tao chu de...");
  // Hien thi loading
  topicLoading.classList.remove('hidden');
  questionText.classList.add('hidden');
  generateTopicBtn.disabled = true;

  try {
    const response = await fetch(API_GENERATE_TOPIC);
    if (!response.ok) {
      throw new Error(`Loi server: ${response.status}`);
    }
    const data = await response.json();

    // Hien thi topic moi
    questionText.textContent = data.topic || "Hay gioi thieu ve ban than ban.";

  } catch (error) {
    console.error("Loi khi tao topic:", error);
    questionText.textContent = `Loi: ${error.message}. Ban co the noi tu do.`;
  } finally {
    // An loading
    topicLoading.classList.add('hidden');
    questionText.classList.remove('hidden');
    generateTopicBtn.disabled = false;
  }
}

// --- LOGIC GHI AM (MediaRecorder) ---
async function toggleRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    // Đang ghi -> Dừng ghi
    mediaRecorder.stop();
    recordBtn.disabled = true;
    statusText.textContent = "Đang dừng ghi âm...";
  } else {
    // Đang dừng -> Bắt đầu ghi
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
  audioChunks = []; // Xóa các mẩu cũ
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
    // 1. Dọn dẹp stream (tắt mic)
    stream.getTracks().forEach(track => track.stop());

    // 2. Tạo file âm thanh
    lastAudioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });

    // 3. Tạo URL để phát lại (Nguoi dung)
    const audioUrl = URL.createObjectURL(lastAudioBlob);
    audioPlayer.src = audioUrl;

    // 4. Gửi đi để xu ly (GOI API BACKEND)
    sendAudioToAPI(lastAudioBlob);

    // 5. Cập nhật UI
    recordIconContainer.innerHTML = "";
    recordIconContainer.appendChild(micIcon.cloneNode(true));
    recordBtn.classList.remove('recording');
    statusText.textContent = "Đã ghi xong. Đang gửi đi phân tích...";
  };

  // Bắt đầu ghi
  mediaRecorder.start();

  // Cập nhật UI
  recordIconContainer.innerHTML = "";
  recordIconContainer.appendChild(stopIcon.cloneNode(true));
  recordBtn.classList.add('recording');
  statusText.textContent = "Đang ghi âm... (Nhấn để dừng)";

  // Reset ket qua cu
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

// --- LOGIC GOI API CHINH (Backend) ---

async function sendAudioToAPI(audioBlob) {
  // 1. Hiển thị Loading
  loadingArea.classList.remove('hidden');
  resultArea.classList.add('hidden');
  recordBtn.disabled = true; // Cấm ghi âm khi đang xử lý

  // 2. Tạo FormData
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  try {
    // 3. Gửi API
    const response = await fetch(API_PROCESS_SPEECH, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Lỗi server: ${response.status}`);
    }

    // 4. Hien thi ket qua (Transcript & Feedback Text)
    transcriptText.textContent = data.transcript || "(Không nghe rõ... Vui lòng thử lại)";
    feedbackText.textContent = data.feedback_text || "Không có phản hồi từ AI.";

    loadingArea.classList.add('hidden');
    resultArea.classList.remove('hidden');
    playbackArea.classList.remove('hidden'); // Hien nut Nghe lai
    feedbackArea.classList.remove('hidden'); // Hien phan hoi

    // 5. Xu ly Feedback Audio (TTS)
    if (data.feedback_audio_base64) {
      try {
        // Ham convertPcmToWav se xu ly data base64 va tra ve 1 Blob WAV
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
    // 6. Cho phép ghi âm lại
    recordBtn.disabled = false;
    statusText.textContent = "Nhấn để bắt đầu ghi âm";
  }
}

// --- LOGIC PHAT LAI ---

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


// --- HAM CHUYEN DOI PCM SANG WAV (BAT BUOC) ---
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

  // Tao header cho file WAV
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

// --- LOGIC HIEU UNG ---
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
    threshold: 0.1 // Kich hoat khi 10% phan tu xuat hien
  });

  elementsToAnimate.forEach(el => {
    observer.observe(el);
  });
}
