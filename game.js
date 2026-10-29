(() => {
  const $ = (selector) => document.querySelector(selector);
  const canvas = $('#game');
  const ctx = canvas.getContext('2d');
  const stage = canvas.parentElement;
  const avatar = new Image();
  const emotes = new Image();
  avatar.src = 'assets/matta.png';
  emotes.src = 'assets/chat-emotes.png';

  const music = new Audio('assets/audio/matta-lofi-background.mp3');
  music.loop = true;
  music.volume = 0.12;
  const clips = [
    new Audio('assets/audio/live-clip-01.mp3'),
    new Audio('assets/audio/live-clip-02.mp3'),
  ];
  clips.forEach((clip) => { clip.preload = 'none'; });

  let width = 800;
  let height = 500;
  let pixelRatio = 1;
  let frame = 0;
  let lastFrame = 0;
  let hudTimer = 0;
  let running = false;
  let musicOn = true;
  let effectsOn = false;
  let runTime = 0;
  let spawnTimer = 0.5;
  let nextBoss = 55;
  let level = 1;
  let xp = 0;
  let xpNeeded = 5;
  let kills = 0;
  let wave = 1;
  let enemies = [];
  let shots = [];
  let gems = [];
  let particles = [];
  const keys = new Set();
  const player = {
    x: 400, y: 300, radius: 23, speed: 225, health: 5, maxHealth: 5,
    invulnerable: 0, damage: 1, cooldown: 0.68, shotTimer: 0.2,
    projectileSpeed: 460, projectileCount: 1, pickupRadius: 43,
  };

  const upgrades = [
    { icon: '⚡', title: 'Hot take certeiro', detail: 'Ataques 20% mais rápidos.', apply: () => { player.cooldown = Math.max(0.24, player.cooldown * 0.8); } },
    { icon: '💥', title: 'Argumento forte', detail: 'Seus ataques causam +1 de dano.', apply: () => { player.damage += 1; } },
    { icon: '🎯', title: 'Foco no alvo', detail: 'Dispare mais um projétil por ataque.', apply: () => { player.projectileCount = Math.min(5, player.projectileCount + 1); } },
    { icon: '🧲', title: 'Ímã de hype', detail: 'Colete XP de mais longe.', apply: () => { player.pickupRadius += 30; } },
    { icon: '💚', title: 'Pausa pra água', detail: 'Ganhe uma vida máxima e recupere 2.', apply: () => { player.maxHealth += 1; player.health = Math.min(player.maxHealth, player.health + 2); } },
    { icon: '👟', title: 'Rotação de mapa', detail: 'Mova-se 15% mais rápido.', apply: () => { player.speed *= 1.15; } },
    { icon: '🚀', title: 'Projétil supersônico', detail: 'Seus ataques viajam 25% mais rápido.', apply: () => { player.projectileSpeed *= 1.25; } },
  ];

  function resize() {
    const rect = stage.getBoundingClientRect();
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    if (!running) {
      player.x = width / 2;
      player.y = height * 0.58;
      draw(performance.now(), 0);
    }
  }
  new ResizeObserver(resize).observe(stage);

  function formatTime(seconds) {
    const whole = Math.floor(seconds);
    return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
  }

  function updateHud() {
    const nextWave = Math.floor(runTime / 45) + 1;
    $('#time').textContent = formatTime(runTime);
    $('#kills').textContent = kills;
    $('#sideKills').textContent = kills;
    $('#levelLabel').textContent = `NÍVEL ${level}`;
    $('#sideLevel').textContent = level;
    $('#xpText').textContent = `${xp} / ${xpNeeded} XP`;
    const percent = Math.min(100, (xp / xpNeeded) * 100);
    $('#xpBar').style.width = `${percent}%`;
    $('#sideXpBar').style.width = `${percent}%`;
    $('#lives').textContent = Array.from({ length: player.maxHealth }, (_, i) => i < player.health ? '♥' : '♡').join(' ');
    $('#sideWave').textContent = `WAVE ${nextWave}`;
    $('#waveLabel').textContent = `WAVE ${nextWave} — ${nextWave === 1 ? 'FILA RANQUEADA' : 'CHAT CADA VEZ MAIOR'}`;
    $('#round').textContent = running ? `NÍVEL ${level}` : 'PREPARE-SE';
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 900);
  }

  function tone(frequency, duration = 0.09) {
    if (!effectsOn) return;
    try {
      const audioContext = tone.context || (tone.context = new AudioContext());
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.045, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch { /* Browser without Web Audio: the game still works. */ }
  }

  async function startMusic() {
    if (!musicOn) return;
    try { await music.play(); } catch { showToast('TOQUE EM ♫ PARA INICIAR A TRILHA'); }
  }

  function startGame() {
    running = true;
    runTime = 0;
    spawnTimer = 0.45;
    nextBoss = 55;
    level = 1;
    xp = 0;
    xpNeeded = 5;
    kills = 0;
    wave = 1;
    enemies = [];
    shots = [];
    gems = [];
    particles = [];
    player.x = width / 2;
    player.y = height * 0.58;
    player.speed = 225;
    player.health = 5;
    player.maxHealth = 5;
    player.invulnerable = 0;
    player.damage = 1;
    player.cooldown = 0.68;
    player.shotTimer = 0.15;
    player.projectileSpeed = 460;
    player.projectileCount = 1;
    player.pickupRadius = 43;
    $('#overlay').classList.add('hidden');
    $('#dialog').classList.remove('level-dialog');
    $('#choices').hidden = true;
    $('#start').hidden = false;
    updateHud();
    startMusic();
    lastFrame = performance.now();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(loop);
  }

  function gameOver() {
    running = false;
    cancelAnimationFrame(frame);
    $('#round').textContent = 'LIVE OFFLINE';
    $('#stamp').textContent = '📴';
    $('#dialogTitle').textContent = 'O chat te engoliu';
    $('#dialogCopy').innerHTML = `Você ficou <b>${formatTime(runTime)}</b> na arena, chegou ao nível <b>${level}</b> e derrubou <b>${kills}</b> inimigos.`;
    $('#dialog').classList.remove('level-dialog');
    $('#choices').hidden = true;
    $('#start').textContent = 'Tentar mais uma →';
    $('#start').hidden = false;
    $('#overlay').classList.remove('hidden');
    tone(180, 0.24);
  }

  function burst(x, y, color, count = 8) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 35 + Math.random() * 110;
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.35 + Math.random() * 0.4, maxLife: 0.75, color });
    }
  }

  function spawnEnemy(boss = false) {
    if (!boss && enemies.length >= 85) return;
    const side = Math.floor(Math.random() * 4);
    const margin = 20;
    const x = side === 0 ? margin : side === 1 ? width - margin : margin + Math.random() * (width - margin * 2);
    const y = side === 2 ? margin : side === 3 ? height - margin : margin + Math.random() * (height - margin * 2);
    const currentWave = Math.floor(runTime / 45) + 1;
    const size = boss ? 32 : 17 + Math.random() * 4;
    enemies.push({
      x, y, radius: size, hp: boss ? 7 + currentWave * 2 : 2 + Math.floor(currentWave / 3),
      maxHp: boss ? 7 + currentWave * 2 : 2 + Math.floor(currentWave / 3),
      speed: boss ? 34 + currentWave * 2 : 37 + Math.random() * 17 + currentWave * 2,
      boss, emote: Math.floor(Math.random() * 30), hitFlash: 0,
    });
  }

  function dropGem(enemy) {
    gems.push({ x: enemy.x, y: enemy.y, value: enemy.boss ? 7 : 1, size: enemy.boss ? 7 : 4.5, phase: Math.random() * Math.PI * 2 });
  }

  function levelUp() {
    running = false;
    cancelAnimationFrame(frame);
    level += 1;
    xpNeeded = 5 + level * 2;
    $('#round').textContent = 'ESCOLHA UMA MELHORIA';
    $('#stamp').textContent = '⬆️';
    $('#dialogTitle').textContent = 'O chat evoluiu!';
    $('#dialogCopy').textContent = 'Escolha uma melhoria para aguentar a próxima onda.';
    $('#dialog').classList.add('level-dialog');
    $('#start').hidden = true;
    const choices = $('#choices');
    choices.replaceChildren();
    choices.hidden = false;
    const pick = [...upgrades].sort(() => Math.random() - 0.5).slice(0, 3);
    for (const upgrade of pick) {
      const button = document.createElement('button');
      button.className = 'choice';
      button.innerHTML = `<span class="choice-icon">${upgrade.icon}</span><strong>${upgrade.title}</strong><small>${upgrade.detail}</small>`;
      button.addEventListener('click', () => {
        upgrade.apply();
        $('#overlay').classList.add('hidden');
        $('#dialog').classList.remove('level-dialog');
        choices.hidden = true;
        $('#start').hidden = false;
        updateHud();
        showToast(`${upgrade.icon} ${upgrade.title.toUpperCase()}`);
        running = true;
        lastFrame = performance.now();
        frame = requestAnimationFrame(loop);
      }, { once: true });
      choices.append(button);
    }
    updateHud();
    $('#overlay').classList.remove('hidden');
    tone(820, 0.12);
  }

  function nearestEnemy(maxDistance = 390) {
    let nearest = null;
    let distance = maxDistance;
    for (const enemy of enemies) {
      const d = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (d < distance) { nearest = enemy; distance = d; }
    }
    return nearest;
  }

  function fireAtTarget() {
    const target = nearestEnemy();
    if (!target) return;
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const base = Math.atan2(dy, dx);
    const spread = 0.13;
    for (let i = 0; i < player.projectileCount; i += 1) {
      const offset = (i - (player.projectileCount - 1) / 2) * spread;
      const angle = base + offset;
      shots.push({ x: player.x, y: player.y, vx: Math.cos(angle) * player.projectileSpeed, vy: Math.sin(angle) * player.projectileSpeed, radius: 6, damage: player.damage, life: 1.15 });
    }
    tone(510, 0.045);
  }

  function takeDamage() {
    if (player.invulnerable > 0) return;
    player.health -= 1;
    player.invulnerable = 0.9;
    burst(player.x, player.y, '#ff8069', 16);
    showToast(['GANK DO CHAT!', 'BOLETO CRÍTICO!', 'TRETA NA LIVE!'][Math.floor(Math.random() * 3)]);
    tone(230, 0.13);
    updateHud();
    if (player.health <= 0) gameOver();
  }

  function update(dt) {
    runTime += dt;
    const currentWave = Math.floor(runTime / 45) + 1;
    if (currentWave > wave) {
      wave = currentWave;
      showToast(`WAVE ${wave} — O CHAT AUMENTOU!`);
      tone(700, 0.18);
    }

    const movingLeft = keys.has('ArrowLeft') || keys.has('a') || keys.has('A');
    const movingRight = keys.has('ArrowRight') || keys.has('d') || keys.has('D');
    const movingUp = keys.has('ArrowUp') || keys.has('w') || keys.has('W');
    const movingDown = keys.has('ArrowDown') || keys.has('s') || keys.has('S');
    const moveX = (movingRight ? 1 : 0) - (movingLeft ? 1 : 0);
    const moveY = (movingDown ? 1 : 0) - (movingUp ? 1 : 0);
    const magnitude = Math.hypot(moveX, moveY) || 1;
    player.x = Math.max(player.radius + 4, Math.min(width - player.radius - 4, player.x + (moveX / magnitude) * player.speed * dt));
    player.y = Math.max(player.radius + 38, Math.min(height - player.radius - 18, player.y + (moveY / magnitude) * player.speed * dt));
    player.invulnerable = Math.max(0, player.invulnerable - dt);

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnEnemy();
      spawnTimer = Math.max(0.2, 0.88 - runTime * 0.006) * (0.74 + Math.random() * 0.55);
    }
    if (runTime >= nextBoss) {
      spawnEnemy(true);
      nextBoss += 55;
      showToast('CHEFE NA LIVE!');
      tone(155, 0.22);
    }

    for (const enemy of enemies) {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.hypot(dx, dy) || 1;
      enemy.x += (dx / distance) * enemy.speed * dt;
      enemy.y += (dy / distance) * enemy.speed * dt;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      if (distance < player.radius + enemy.radius * 0.72) takeDamage();
      if (!running) return;
    }

    player.shotTimer -= dt;
    if (player.shotTimer <= 0) {
      fireAtTarget();
      player.shotTimer = player.cooldown;
    }

    for (const shot of shots) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
      for (const enemy of enemies) {
        if (enemy.hp <= 0) continue;
        if (Math.hypot(shot.x - enemy.x, shot.y - enemy.y) < shot.radius + enemy.radius * 0.75) {
          enemy.hp -= shot.damage;
          enemy.hitFlash = 0.12;
          shot.life = 0;
          burst(shot.x, shot.y, '#c8f169', 4);
          if (enemy.hp <= 0) {
            kills += 1;
            dropGem(enemy);
            burst(enemy.x, enemy.y, enemy.boss ? '#ff956b' : '#9bce79', enemy.boss ? 22 : 9);
            if (enemy.boss) showToast('CHEFE DERRUBADO! +7 XP');
          }
          break;
        }
      }
    }
    shots = shots.filter((shot) => shot.life > 0 && shot.x > -25 && shot.x < width + 25 && shot.y > -25 && shot.y < height + 25);
    enemies = enemies.filter((enemy) => enemy.hp > 0);

    for (const gem of gems) {
      gem.phase += dt * 3;
      const dx = player.x - gem.x;
      const dy = player.y - gem.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance < player.pickupRadius * 3) {
        const pull = distance < player.pickupRadius ? 5 : 2.4;
        gem.x += (dx / distance) * (125 + pull * 20) * dt;
        gem.y += (dy / distance) * (125 + pull * 20) * dt;
      }
      if (distance < player.radius + gem.size + 4) {
        gem.collected = true;
        xp += gem.value;
        burst(gem.x, gem.y, '#8cdbff', 6);
        if (xp >= xpNeeded) {
          xp -= xpNeeded;
          levelUp();
          return;
        }
      }
    }
    gems = gems.filter((gem) => !gem.collected);

    for (const particle of particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
    }
    particles = particles.filter((particle) => particle.life > 0);
    hudTimer -= dt;
    if (hudTimer <= 0) { updateHud(); hudTimer = 0.12; }
  }

  function drawAvatar(x, y, radius, image, emoteIndex = 0, fallback = 'M') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    if (image === avatar && avatar.complete && avatar.naturalWidth) {
      ctx.drawImage(avatar, x - radius, y - radius, radius * 2, radius * 2);
    } else if (image === emotes && emotes.complete && emotes.naturalWidth) {
      const cellWidth = emotes.naturalWidth / 6;
      const cellHeight = emotes.naturalHeight / 5;
      ctx.drawImage(emotes, (emoteIndex % 6) * cellWidth, Math.floor(emoteIndex / 6) * cellHeight, cellWidth, cellHeight, x - radius, y - radius, radius * 2, radius * 2);
    } else {
      ctx.fillStyle = '#c8f169';
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      ctx.fillStyle = '#1a2118';
      ctx.font = `bold ${radius}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fallback, x, y);
    }
    ctx.restore();
  }

  function draw(now) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#142019';
    ctx.fillRect(0, 0, width, height);
    const drift = (now * 0.012) % 34;
    ctx.strokeStyle = '#d5f2c409';
    ctx.lineWidth = 1;
    for (let x = -34 + drift; x < width + 34; x += 34) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = -34 + drift; y < height + 34; y += 34) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.strokeStyle = '#c8f16924';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.33, 0, Math.PI * 2);
    ctx.stroke();

    for (const gem of gems) {
      ctx.save();
      ctx.translate(gem.x, gem.y);
      ctx.rotate(Math.sin(gem.phase) * 0.25);
      ctx.shadowColor = '#8cdbff';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#8cdbff';
      ctx.beginPath();
      ctx.moveTo(0, -gem.size - 2); ctx.lineTo(gem.size, 0); ctx.lineTo(0, gem.size + 2); ctx.lineTo(-gem.size, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    for (const shot of shots) {
      ctx.save();
      ctx.shadowColor = '#c8f169';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#e3ff96';
      ctx.beginPath(); ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    for (const enemy of enemies) {
      ctx.save();
      ctx.shadowColor = enemy.boss ? '#ff725e' : '#db83ac';
      ctx.shadowBlur = enemy.boss ? 20 : 8;
      ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : enemy.boss ? '#f25e5e' : '#da8cb0';
      ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius + (enemy.boss ? 2 : 0), 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      drawAvatar(enemy.x, enemy.y, enemy.radius - 2, emotes, enemy.emote, '👾');
      ctx.strokeStyle = enemy.boss ? '#ff8069' : '#ffe7f0';
      ctx.lineWidth = enemy.boss ? 3 : 1.5;
      ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2); ctx.stroke();
      if (enemy.boss) {
        ctx.fillStyle = '#250e10'; ctx.fillRect(enemy.x - 23, enemy.y - enemy.radius - 11, 46, 4);
        ctx.fillStyle = '#ff8069'; ctx.fillRect(enemy.x - 23, enemy.y - enemy.radius - 11, 46 * Math.max(0, enemy.hp / enemy.maxHp), 4);
      }
      ctx.restore();
    }

    for (const particle of particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.beginPath(); ctx.arc(particle.x, particle.y, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    if (player.invulnerable > 0 && Math.floor(now / 80) % 2) ctx.globalAlpha = 0.35;
    ctx.shadowColor = '#c8f169';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#c8f169';
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius + 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    drawAvatar(player.x, player.y, player.radius, avatar, 0, 'M');
    ctx.strokeStyle = '#ecffb6';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min((now - lastFrame) / 1000, 0.035);
    lastFrame = now;
    update(dt);
    draw(now);
    if (running) frame = requestAnimationFrame(loop);
  }

  const startButton = $('#start');
  startButton.addEventListener('click', startGame);
  $('#music').addEventListener('click', async () => {
    musicOn = !musicOn;
    $('#music').textContent = musicOn ? '♫ Trilha: 12%' : '♫ Trilha: off';
    if (musicOn) await startMusic();
    else music.pause();
  });
  $('#sound').addEventListener('click', () => {
    effectsOn = !effectsOn;
    $('#sound').textContent = effectsOn ? '♪ Efeitos: on' : '♪ Efeitos: off';
    tone(680);
  });
  $('#share').addEventListener('click', async () => {
    const data = { title: 'Matta: Sobrevive à Live', text: 'Sobrevive à horda do chat e mostra teu build!', url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(`${data.text} ${data.url}`); showToast('LINK COPIADO!'); }
    } catch (error) { if (error.name !== 'AbortError') showToast('COPIE O LINK DA BARRA!'); }
  });

  document.querySelectorAll('[data-clip]').forEach((button) => button.addEventListener('click', async () => {
    const clip = clips[Number(button.dataset.clip)];
    clips.forEach((other) => { if (other !== clip) { other.pause(); other.currentTime = 0; } });
    clip.currentTime = 0;
    try { await clip.play(); } catch { showToast('NÃO FOI POSSÍVEL TOCAR O CLIP'); }
  }));

  window.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) event.preventDefault();
    keys.add(event.key);
    if ((event.key === 'Enter' || event.key === ' ') && !running && !$('#overlay').classList.contains('hidden') && $('#choices').hidden) startGame();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key));
  window.addEventListener('blur', () => keys.clear());
  document.querySelectorAll('.pad').forEach((button) => {
    const key = button.dataset.key;
    for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'pointerleave']) {
      button.addEventListener(type, (event) => {
        event.preventDefault();
        if (type === 'pointerdown') { keys.add(key); button.setPointerCapture(event.pointerId); }
        else keys.delete(key);
      });
    }
  });

  resize();
  updateHud();
})();

