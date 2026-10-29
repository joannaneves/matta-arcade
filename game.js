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
  const camera = { x: -400, y: -290 };
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
  let nextEnemyId = 1;
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
    x: 0, y: 0, radius: 23, speed: 225, health: 5, maxHealth: 5,
    invulnerable: 0, damage: 1, cooldown: 0.68, shotTimer: 0.2,
    projectileSpeed: 460, projectileCount: 1, pickupRadius: 43,
    weaponCycle: 0, pulseTimer: 8, pulseVisual: 0,
  };

  const upgrades = [
    { icon: '⚡', title: 'Hot take certeiro', detail: 'Ataques 12% mais rápidos.', apply: () => { player.cooldown = Math.max(0.34, player.cooldown * 0.88); } },
    { icon: '💥', title: 'Argumento forte', detail: 'Seus poderes causam +1 de dano.', apply: () => { player.damage = Math.min(5, player.damage + 1); } },
    { icon: '🎯', title: 'Foco no alvo', detail: 'Dispare mais um projétil por ataque.', apply: () => { player.projectileCount = Math.min(4, player.projectileCount + 1); } },
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
      camera.x = player.x - width / 2;
      camera.y = player.y - height * 0.58;
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
    nextEnemyId = 1;
    xp = 0;
    xpNeeded = 5;
    kills = 0;
    wave = 1;
    enemies = [];
    shots = [];
    gems = [];
    particles = [];
    player.x = 0;
    player.y = 0;
    camera.x = player.x - width / 2;
    camera.y = player.y - height * 0.58;
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
    player.weaponCycle = 0;
    player.pulseTimer = 8;
    player.pulseVisual = 0;
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
    if (!boss && enemies.length >= 72) return;
    const side = Math.floor(Math.random() * 4);
    const margin = 20;
    const x = camera.x + (side === 0 ? margin : side === 1 ? width - margin : margin + Math.random() * (width - margin * 2));
    const y = camera.y + (side === 2 ? margin : side === 3 ? height - margin : margin + Math.random() * (height - margin * 2));
    const currentWave = Math.floor(runTime / 45) + 1;
    const pressure = Math.ceil((level - 1) * 0.7) + Math.floor(runTime / 55);
    const roll = Math.random();
    const type = boss ? 'boss'
      : level >= 8 && roll > 0.89 ? 'brute'
        : level >= 4 && roll > 0.7 ? 'tank'
          : level >= 2 && roll > 0.43 ? 'runner' : 'minion';
    const stats = {
      minion: { radius: 16, hp: 2, speed: 49, color: '#8e6578' },
      runner: { radius: 13, hp: 2, speed: 91, color: '#b16d62' },
      tank: { radius: 22, hp: 6, speed: 34, color: '#718257' },
      brute: { radius: 26, hp: 10, speed: 41, color: '#88544e' },
      boss: { radius: 34, hp: 12, speed: 39, color: '#b6464f' },
    }[type];
    const hp = stats.hp + pressure * (type === 'runner' ? 1 : type === 'tank' || type === 'brute' ? 2 : 1);
    const size = stats.radius + (type === 'boss' ? Math.min(pressure, 7) : 0);
    enemies.push({
      id: nextEnemyId++, x, y, radius: size, hp, maxHp: hp,
      speed: stats.speed + currentWave * 1.5 + pressure * (type === 'runner' ? 2 : 0.8),
      boss: type === 'boss', type, color: stats.color,
      emote: Math.floor(Math.random() * 30), hitFlash: 0,
    });
  }

  function dropGem(enemy) {
    gems.push({ x: enemy.x, y: enemy.y, value: enemy.boss ? 7 : 1, size: enemy.boss ? 7 : 4.5, phase: Math.random() * Math.PI * 2 });
  }

  function updateCamera() {
    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;
    const left = width * 0.28;
    const right = width * 0.72;
    const top = height * 0.27;
    const bottom = height * 0.73;
    if (screenX < left) camera.x = player.x - left;
    else if (screenX > right) camera.x = player.x - right;
    if (screenY < top) camera.y = player.y - top;
    else if (screenY > bottom) camera.y = player.y - bottom;
  }

  function levelUp() {
    running = false;
    cancelAnimationFrame(frame);
    level += 1;
    xpNeeded = 5 + level * 2;
    $('#round').textContent = 'ESCOLHA UMA MELHORIA';
    $('#stamp').textContent = '⬆️';
    $('#dialogTitle').textContent = 'O chat evoluiu!';
    $('#dialogCopy').textContent = 'Escolha uma melhoria: a horda também cresce em vida e novos monstros entram na arena a cada nível.';
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
    const kinds = ['orb', 'thorn', 'ember'];
    const kind = kinds[player.weaponCycle % kinds.length];
    player.weaponCycle += 1;
    const count = kind === 'thorn' ? Math.max(1, Math.ceil(player.projectileCount / 2)) : player.projectileCount;
    const spread = kind === 'ember' ? 0.19 : 0.12;
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * spread;
      const angle = base + offset;
      const speed = player.projectileSpeed * (kind === 'ember' ? 0.78 : 1);
      shots.push({ x: player.x, y: player.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        radius: kind === 'thorn' ? 7 : kind === 'ember' ? 9 : 6,
        damage: player.damage + (kind === 'ember' ? 1 : 0), life: kind === 'ember' ? 1.4 : 1.1,
        kind, pierce: kind === 'thorn' ? 2 : 0, splash: kind === 'ember' ? 58 : 0,
        color: kind === 'thorn' ? '#8cf4dc' : kind === 'ember' ? '#ff845c' : '#d5f18a', hitIds: [], });
    }
    tone(kind === 'thorn' ? 720 : kind === 'ember' ? 330 : 510, 0.055);
  }

  function damageEnemy(enemy, amount) {
    if (enemy.hp <= 0) return;
    enemy.hp -= amount;
    enemy.hitFlash = 0.12;
    if (enemy.hp <= 0) {
      kills += 1;
      dropGem(enemy);
      burst(enemy.x, enemy.y, enemy.boss ? '#ff956b' : enemy.color, enemy.boss ? 24 : 11);
      if (enemy.boss) showToast('CHEFE DERRUBADO! +7 XP');
    }
  }

  function useShockwave() {
    player.pulseTimer = Math.max(6, 10 - Math.floor(level / 5));
    player.pulseVisual = 0.48;
    for (const enemy of enemies) {
      if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < 176) damageEnemy(enemy, 2 + Math.floor(level / 5));
    }
    burst(player.x, player.y, '#a3baff', 28);
    showToast('ONDA DE CHOQUE!');
    tone(190, 0.24);
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
    player.x += (moveX / magnitude) * player.speed * dt;
    player.y += (moveY / magnitude) * player.speed * dt;
    updateCamera();
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.pulseTimer -= dt;
    player.pulseVisual = Math.max(0, player.pulseVisual - dt);
    if (player.pulseTimer <= 0) useShockwave();

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnEnemy();
      spawnTimer = Math.max(0.26, 0.88 - runTime * 0.005 - (level - 1) * 0.018) * (0.72 + Math.random() * 0.5);
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
      if (distance < player.radius * 0.66 + enemy.radius * 0.58) takeDamage();
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
        if (shot.life <= 0) break;
        if (enemy.hp <= 0 || shot.hitIds.includes(enemy.id)) continue;
        if (Math.hypot(shot.x - enemy.x, shot.y - enemy.y) < shot.radius + enemy.radius * 0.58) {
          shot.hitIds.push(enemy.id);
          damageEnemy(enemy, shot.damage);
          if (shot.splash) {
            for (const nearby of enemies) {
              if (nearby !== enemy && Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y) < shot.splash) damageEnemy(nearby, Math.max(1, shot.damage - 1));
            }
          }
          burst(shot.x, shot.y, shot.color, shot.kind === 'ember' ? 9 : 4);
          if (shot.pierce > 0) shot.pierce -= 1;
          else shot.life = 0;
        }
      }
    }
    shots = shots.filter((shot) => shot.life > 0 && Math.hypot(shot.x - player.x, shot.y - player.y) < Math.max(width, height) * 1.5);
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
    gems = gems.filter((gem) => !gem.collected && Math.hypot(gem.x - player.x, gem.y - player.y) < Math.max(width, height) * 2.5);
    enemies = enemies.filter((enemy) => Math.hypot(enemy.x - player.x, enemy.y - player.y) < Math.max(width, height) * 2.5);

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

  function drawCreature(enemy, x, y, now) {
    const r = enemy.radius;
    const stride = Math.sin(now * 0.008 + enemy.id) * r * 0.08;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#07100dd0';
    ctx.beginPath(); ctx.ellipse(0, r * 0.78, r * 0.94, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = enemy.hitFlash > 0 ? '#fff4df' : '#211a1b';
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(4, r * 0.23);
    ctx.beginPath(); ctx.moveTo(-r * 0.28, r * 0.34); ctx.lineTo(-r * 0.4 + stride, r * 0.78); ctx.moveTo(r * 0.26, r * 0.34); ctx.lineTo(r * 0.39 - stride, r * 0.78); ctx.stroke();
    ctx.strokeStyle = enemy.hitFlash > 0 ? '#fff4df' : enemy.color;
    ctx.lineWidth = Math.max(5, r * 0.27);
    ctx.beginPath(); ctx.moveTo(-r * 0.42, -r * 0.08); ctx.lineTo(-r * 0.78, r * 0.28); ctx.moveTo(r * 0.42, -r * 0.08); ctx.lineTo(r * 0.74, r * 0.27); ctx.stroke();
    ctx.fillStyle = enemy.hitFlash > 0 ? '#fff4df' : enemy.color;
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, r * 0.28); ctx.lineTo(-r * 0.52, -r * 0.23); ctx.lineTo(-r * 0.29, -r * 0.49);
    ctx.lineTo(r * 0.15, -r * 0.52); ctx.lineTo(r * 0.53, -r * 0.2); ctx.lineTo(r * 0.5, r * 0.31);
    ctx.lineTo(r * 0.2, r * 0.53); ctx.lineTo(-r * 0.3, r * 0.49); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2b2022';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.25, r * 0.43, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();
    if (enemy.type === 'runner' || enemy.boss || enemy.type === 'brute') {
      ctx.fillStyle = '#c8b98b';
      ctx.beginPath(); ctx.moveTo(-r * 0.34, -r * 0.42); ctx.lineTo(-r * 0.55, -r * 0.94); ctx.lineTo(-r * 0.08, -r * 0.59); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.26, -r * 0.45); ctx.lineTo(r * 0.55, -r * 0.9); ctx.lineTo(r * 0.53, -r * 0.28); ctx.fill();
    }
    if (enemy.type === 'tank' || enemy.type === 'brute' || enemy.boss) {
      ctx.fillStyle = enemy.boss ? '#48343b' : '#383d32';
      ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.03); ctx.lineTo(-r * 0.24, -r * 0.39); ctx.lineTo(r * 0.2, -r * 0.4); ctx.lineTo(r * 0.48, -r * 0.02); ctx.lineTo(r * 0.36, r * 0.35); ctx.lineTo(-r * 0.35, r * 0.35); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = enemy.boss ? '#d18c78' : '#9a9a72'; ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.stroke();
    }
    drawAvatar(0, -r * 0.25, r * 0.32, emotes, enemy.emote, '👾');
    ctx.fillStyle = enemy.boss ? '#ffcd67' : '#f6d88a';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = enemy.boss ? 12 : 5;
    ctx.beginPath(); ctx.ellipse(-r * 0.14, -r * 0.27, r * 0.055, r * 0.075, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.14, -r * 0.27, r * 0.055, r * 0.075, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawHero(x, y, now) {
    const stride = Math.sin(now * 0.012) * 3;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#050b0acc';
    ctx.beginPath(); ctx.ellipse(0, 22, 25, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d7d4c7'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-7, 9); ctx.lineTo(-10 + stride, 23); ctx.moveTo(7, 9); ctx.lineTo(10 - stride, 23); ctx.stroke();
    ctx.fillStyle = '#283139'; ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(-18, 13); ctx.lineTo(-11, 18); ctx.lineTo(0, 12); ctx.lineTo(12, 18); ctx.lineTo(19, 9); ctx.lineTo(11, -9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#bd8e62'; ctx.beginPath(); ctx.ellipse(0, -4, 16, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d6c5a4'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-12, -6); ctx.lineTo(-21, 3); ctx.moveTo(12, -6); ctx.lineTo(21, 1); ctx.stroke();
    ctx.strokeStyle = '#83d5ad'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(20, 4); ctx.lineTo(29, -16); ctx.stroke();
    ctx.fillStyle = '#a8f4db'; ctx.shadowColor = '#7fffd0'; ctx.shadowBlur = 13;
    ctx.beginPath(); ctx.moveTo(29, -20); ctx.lineTo(35, -12); ctx.lineTo(29, -4); ctx.lineTo(24, -12); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
    drawAvatar(0, -19, 13, avatar, 0, 'M');
    ctx.strokeStyle = '#f1e6c5'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -5, 25, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function randomFor(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function drawTree(x, y, radius) {
    ctx.save();
    ctx.fillStyle = '#10271c70';
    ctx.beginPath(); ctx.ellipse(x + 5, y + radius * 0.6, radius * 1.02, radius * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#675b3b';
    ctx.fillRect(x - radius * 0.17, y, radius * 0.34, radius * 0.8);
    for (const [dx, dy, scale, color] of [
      [-0.38, 0.05, 0.63, '#245034'], [0.22, -0.18, 0.72, '#2d603b'],
      [-0.04, -0.42, 0.75, '#397348'], [0.38, 0.25, 0.48, '#397348'],
    ]) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x + dx * radius, y + dy * radius, radius * scale, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#83a95c70';
    ctx.beginPath(); ctx.arc(x - radius * 0.2, y - radius * 0.52, radius * 0.17, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawBrush(x, y, radius) {
    ctx.save();
    ctx.fillStyle = '#183f2b';
    ctx.beginPath(); ctx.ellipse(x, y, radius * 1.35, radius * 0.8, -0.18, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 7; i += 1) {
      const angle = (i / 7) * Math.PI * 2;
      const leafX = x + Math.cos(angle) * radius * 0.6;
      const leafY = y + Math.sin(angle) * radius * 0.42;
      ctx.fillStyle = i % 2 ? '#316943' : '#3b7548';
      ctx.beginPath(); ctx.ellipse(leafX, leafY, radius * 0.42, radius * 0.3, angle, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawStone(x, y, size, seed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(seed * Math.PI * 2);
    ctx.fillStyle = '#1a3c2d';
    ctx.beginPath(); ctx.ellipse(2, size * 0.42, size * 1.05, size * 0.66, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7d8c63';
    ctx.beginPath(); ctx.moveTo(-size, size * 0.4); ctx.lineTo(-size * 0.72, -size * 0.38); ctx.lineTo(-size * 0.1, -size * 0.8); ctx.lineTo(size * 0.82, -size * 0.27); ctx.lineTo(size, size * 0.44); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a0a87a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-size * 0.55, size * 0.04); ctx.lineTo(-size * 0.15, -size * 0.45); ctx.lineTo(size * 0.5, -size * 0.15); ctx.stroke();
    ctx.restore();
  }

  function drawTerrain() {
    const tileSize = 300;
    const left = Math.floor(camera.x / tileSize) - 1;
    const right = Math.ceil((camera.x + width) / tileSize) + 1;
    const top = Math.floor(camera.y / tileSize) - 1;
    const bottom = Math.ceil((camera.y + height) / tileSize) + 1;
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    ctx.fillStyle = '#1b352b';
    ctx.fillRect(camera.x, camera.y, width, height);

    for (let tileY = top; tileY <= bottom; tileY += 1) {
      for (let tileX = left; tileX <= right; tileX += 1) {
        const seed = (tileX * 92837111) ^ (tileY * 689287499);
        const random = randomFor(seed);
        const originX = tileX * tileSize;
        const originY = tileY * tileSize;
        ctx.fillStyle = random() > 0.5 ? '#5d704225' : '#081d1748';
        ctx.beginPath();
        ctx.ellipse(originX + random() * tileSize, originY + random() * tileSize, 65 + random() * 85, 36 + random() * 48, random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
        for (let tuft = 0; tuft < 12; tuft += 1) {
          const x = originX + random() * tileSize;
          const y = originY + random() * tileSize;
          ctx.strokeStyle = tuft % 2 ? '#8ca06b45' : '#b3b98825';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.lineTo(x + 2, y - 3); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + 4, y - 1); ctx.stroke();
        }
        for (let tree = 0; tree < 2; tree += 1) {
          drawTree(originX + 28 + random() * (tileSize - 56), originY + 28 + random() * (tileSize - 56), 13 + random() * 9);
        }
        if (random() > 0.33) drawBrush(originX + 35 + random() * (tileSize - 70), originY + 35 + random() * (tileSize - 70), 18 + random() * 12);
        if (random() > 0.58) drawStone(originX + 35 + random() * (tileSize - 70), originY + 35 + random() * (tileSize - 70), 11 + random() * 10, random());
      }
    }

    // A worn stone lane meanders across the woodland like a MOBA map route.
    const laneStep = 900;
    const firstLane = Math.floor((camera.y - camera.x - width) / laneStep) - 1;
    const lastLane = Math.ceil((camera.y + height - camera.x) / laneStep) + 1;
    for (let lane = firstLane; lane <= lastLane; lane += 1) {
      const offset = lane * laneStep;
      const startX = camera.x - 220;
      const endX = camera.x + width + 220;
      ctx.beginPath();
      for (let x = startX; x <= endX; x += 24) {
        const y = x + offset + Math.sin(x * 0.003 + lane) * 48 + Math.sin(x * 0.006 - lane) * 15;
        if (x === startX) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0d211d'; ctx.lineWidth = 78; ctx.stroke();
      ctx.strokeStyle = '#414638'; ctx.lineWidth = 67; ctx.stroke();
      ctx.strokeStyle = '#676247'; ctx.lineWidth = 50; ctx.stroke();
      ctx.strokeStyle = '#aa9b6b45'; ctx.lineWidth = 2; ctx.setLineDash([4, 16]); ctx.stroke();
      ctx.setLineDash([]);
    }

    // A blue-green river and stone banks appear in some map sectors.
    const riverStep = 1700;
    const minRiver = camera.y - (camera.x + width) * 0.62 - 180;
    const maxRiver = camera.y + height - (camera.x - 180) * 0.62 + 180;
    for (let offset = Math.floor(minRiver / riverStep) * riverStep; offset <= maxRiver; offset += riverStep) {
      const startX = camera.x - 180;
      const endX = camera.x + width + 180;
      ctx.beginPath();
      for (let x = startX; x <= endX; x += 28) {
        const y = -x * 0.62 + offset + Math.sin(x * 0.002 + offset) * 55;
        if (x === startX) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0b202080'; ctx.lineWidth = 78; ctx.stroke();
      ctx.strokeStyle = '#28534d85'; ctx.lineWidth = 62; ctx.stroke();
      ctx.strokeStyle = '#78a98245'; ctx.lineWidth = 2; ctx.setLineDash([3, 18]); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.52, Math.min(width, height) * 0.12, width * 0.5, height * 0.52, Math.max(width, height) * 0.72);
    vignette.addColorStop(0, '#04090800');
    vignette.addColorStop(0.68, '#04090828');
    vignette.addColorStop(1, '#020605a8');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  function draw(now) {
    ctx.clearRect(0, 0, width, height);
    drawTerrain();

    for (const gem of gems) {
      ctx.save();
      ctx.translate(gem.x - camera.x, gem.y - camera.y);
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
      const sx = shot.x - camera.x;
      const sy = shot.y - camera.y;
      ctx.shadowColor = shot.color;
      ctx.shadowBlur = shot.kind === 'ember' ? 21 : 14;
      ctx.fillStyle = shot.color;
      if (shot.kind === 'thorn') {
        ctx.translate(sx, sy); ctx.rotate(Math.atan2(shot.vy, shot.vx));
        ctx.beginPath(); ctx.moveTo(shot.radius * 1.8, 0); ctx.lineTo(-shot.radius, -shot.radius * 0.55); ctx.lineTo(-shot.radius * 0.5, 0); ctx.lineTo(-shot.radius, shot.radius * 0.55); ctx.closePath(); ctx.fill();
      } else if (shot.kind === 'ember') {
        ctx.beginPath(); ctx.ellipse(sx, sy, shot.radius * 1.35, shot.radius * 0.8, Math.atan2(shot.vy, shot.vx), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(sx - shot.vx * 0.025, sy - shot.vy * 0.025, shot.radius * 0.8, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(sx, sy, shot.radius, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    for (const enemy of enemies) {
      const screenX = enemy.x - camera.x;
      const screenY = enemy.y - camera.y;
      drawCreature(enemy, screenX, screenY, now);
      if (enemy.type !== 'minion' && !enemy.boss) {
        const barWidth = enemy.radius * 1.65;
        ctx.fillStyle = '#080b0b'; ctx.fillRect(screenX - barWidth / 2, screenY - enemy.radius - 9, barWidth, 3);
        ctx.fillStyle = enemy.type === 'runner' ? '#e1a07b' : '#b9bd80';
        ctx.fillRect(screenX - barWidth / 2, screenY - enemy.radius - 9, barWidth * Math.max(0, enemy.hp / enemy.maxHp), 3);
      }
      if (enemy.boss) {
        ctx.fillStyle = '#250e10'; ctx.fillRect(screenX - 23, screenY - enemy.radius - 11, 46, 4);
        ctx.fillStyle = '#ff8069'; ctx.fillRect(screenX - 23, screenY - enemy.radius - 11, 46 * Math.max(0, enemy.hp / enemy.maxHp), 4);
      }
    }

    for (const particle of particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.beginPath(); ctx.arc(particle.x - camera.x, particle.y - camera.y, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    if (player.invulnerable > 0 && Math.floor(now / 80) % 2) ctx.globalAlpha = 0.35;
    const playerScreenX = player.x - camera.x;
    const playerScreenY = player.y - camera.y;
    if (player.pulseVisual > 0) {
      ctx.strokeStyle = `rgba(160, 190, 255, ${player.pulseVisual * 1.6})`;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(playerScreenX, playerScreenY, 176 * (1 - player.pulseVisual / 0.48), 0, Math.PI * 2); ctx.stroke();
    }
    drawHero(playerScreenX, playerScreenY, now);
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

