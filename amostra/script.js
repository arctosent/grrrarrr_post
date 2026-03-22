const cards = {
  vision: {
    tag: "Arctos | Essencia",
    title: "Visao Criativa",
    text: "A Arctos transforma ideias em experiências memoravéis, com direção artistica forte, universo autoral e impacto visual."
  },
  games: {
    tag: "Arctos | Jogos",
    title: "Game Design",
    text: "Do conceito ao gameplay, desenhamos sistemas de jogo, progressao e sensacao para manter o publico engajado."
  },
  community: {
    tag: "Arctos | Comunidade",
    title: "Comunidade Viva",
    text: "A comunidade participa de cada etapa com conteudo, testes e conversas constantes entre estudo e jogadores."
  },
  brand: {
    tag: "Arctos | Marca",
    title: "Branding e Identidade",
    text: "Cada projeto recebe direção de marca, linguagem visual e consistência para ser reconhecido em qualquer plataforma."
  }
};

const entities = Array.from(document.querySelectorAll('.entity'));
const infoTag = document.getElementById('infoTag');
const infoTitle = document.getElementById('infoTitle');
const infoText = document.getElementById('infoText');
const scene = document.getElementById('scene');
const majorBear = document.querySelector('.c-major');
const cameraBear = document.querySelector('.camera-bear');
const cameraFlash = document.getElementById('cameraFlash');
const bgMusic = document.getElementById('bgMusic');
const cameraSound = new Audio('imagem/malarbrush-camera-flash-204151.mp3');
let cameraAudioContext = null;

cameraSound.preload = 'auto';
cameraSound.volume = 0.95;

function startBackgroundMusic() {
  if (!bgMusic) {
    return;
  }

  bgMusic.volume = 0.2;
  bgMusic.play().catch(() => {
    // Autoplay pode ser bloqueado; aguardamos interação do usuário.
  });
}

function updateInfo(entity) {
  const key = entity?.dataset?.key;
  const data = key ? cards[key] : null;
  if (!data) {
    return;
  }

  entities.forEach((item) => item.classList.remove('is-active'));
  entity.classList.add('is-active');

  infoTag.textContent = data.tag;
  infoTitle.textContent = data.title;
  infoText.textContent = data.text;
}

function playCameraShutter() {
  try {
    const shot = cameraSound.cloneNode();
    shot.volume = cameraSound.volume;
    shot.play().catch(() => {
      // Fallback para navegadores com bloqueio de autoplay/audio.
      playSynthShutter();
    });
    return;
  } catch (_error) {
    // Continua para o fallback sintético.
  }

  playSynthShutter();
}

function playSynthShutter() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  if (!cameraAudioContext) {
    cameraAudioContext = new AudioCtx();
  }

  if (cameraAudioContext.state === 'suspended') {
    cameraAudioContext.resume();
  }

  const ctx = cameraAudioContext;
  const now = ctx.currentTime;

  const length = Math.max(1, Math.floor(ctx.sampleRate * 0.06));
  const noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);

  for (let i = 0; i < length; i += 1) {
    const decay = 1 - i / length;
    data[i] = (Math.random() * 2 - 1) * decay;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1600, now);
  filter.Q.setValueAtTime(0.8, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.38, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.08);

  const clickOsc = ctx.createOscillator();
  clickOsc.type = 'triangle';
  clickOsc.frequency.setValueAtTime(240, now + 0.01);
  clickOsc.frequency.exponentialRampToValueAtTime(95, now + 0.1);

  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(0.001, now + 0.01);
  clickGain.gain.exponentialRampToValueAtTime(0.13, now + 0.02);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

  clickOsc.connect(clickGain);
  clickGain.connect(ctx.destination);
  clickOsc.start(now + 0.01);
  clickOsc.stop(now + 0.12);
}

function triggerCameraShot() {
  if (scene) {
    scene.classList.remove('camera-shot');
    // Force restart of flash animation
    void scene.offsetWidth;
    scene.classList.add('camera-shot');
    window.setTimeout(() => scene.classList.remove('camera-shot'), 260);
  }

  if (cameraFlash) {
    cameraFlash.setAttribute('data-shot', String(Date.now()));
  }

  playCameraShutter();
}

entities.forEach((entity) => {
  entity.addEventListener('click', () => updateInfo(entity));
  entity.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      updateInfo(entity);
    }
  });
});

if (cameraBear) {
  cameraBear.addEventListener('click', triggerCameraShot);
  cameraBear.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      triggerCameraShot();
    }
  });
}

const initialEntity = document.querySelector('.entity.is-active') || entities[0];
if (initialEntity) {
  updateInfo(initialEntity);
}

if (majorBear && scene) {
  majorBear.addEventListener('mouseenter', () => {
    scene.classList.add('major-hover');
  });

  majorBear.addEventListener('mouseleave', () => {
    scene.classList.remove('major-hover');
  });

  majorBear.addEventListener('focus', () => {
    scene.classList.add('major-hover');
  });

  majorBear.addEventListener('blur', () => {
    scene.classList.remove('major-hover');
  });
}

startBackgroundMusic();

const unlockMusic = () => {
  startBackgroundMusic();
};

document.addEventListener('pointerdown', unlockMusic, { once: true });
document.addEventListener('keydown', unlockMusic, { once: true });
