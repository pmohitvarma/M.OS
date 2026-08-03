// M.OS Main Orchestration & Cinematic Boot Sequence
// Handles transitions, logo morphing, coordinates canvas sparks, and page nav.

document.addEventListener('DOMContentLoaded', () => {
  // 0. Primary DOM Elements Lookup
  const overlay = document.getElementById('intro-overlay');
  const container = document.getElementById('dashboard-container');
  const introLogo = document.getElementById('intro-logo');
  const introSubtitle = document.getElementById('intro-subtitle');
  const loaderLine = document.getElementById('intro-loader-line');
  const headerLogo = document.querySelector('.header-logo');

  // 1. Initialize Engines
  const cursor = new CursorEngine();
  const background = new BackgroundEngine();
  const academic = new AcademicEngine();
  const sem = new SemEngine();
  const focus = new FocusEngine();
  const nexus = new NexusEngine();
  const profile = new ProfileEngine();
  const dashboard = new DashboardEngine();

  // 2. Navigation Control System
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.dashboard-section');

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetSection = btn.getAttribute('data-target');
      
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      sections.forEach((section) => {
        if (section.id === `section-${targetSection}`) {
          section.classList.add('active');
        } else {
          section.classList.remove('active');
        }
      });
      
      // Dispatch resize event to let canvas systems and tilt bounds recalculate
      window.dispatchEvent(new Event('resize'));
      
      // Dispatch custom tab-changed event for immediate scroll reveal updates
      window.dispatchEvent(new CustomEvent('tab-changed', { detail: { target: targetSection } }));
    });
  });

  // 3. Intro Canvas Spark System
  const introCanvas = document.getElementById('intro-canvas');
  let introSparks = [];
  let orbitParticles = [];
  let introAnimId = null;
  let shockwave = null;
  let hudAngle = 0;
  let shapesAngle = 0;
  let handoffStarted = false;
  let lastLogoX = null;
  let lastLogoY = null;

  if (introCanvas) {
    const ctx = introCanvas.getContext('2d');
    const resizeIntroCanvas = () => {
      introCanvas.width = window.innerWidth;
      introCanvas.height = window.innerHeight;
    };
    resizeIntroCanvas();
    window.addEventListener('resize', resizeIntroCanvas);

    // Center coordinates
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Seed ambient floating dust in the loading overlay
    for (let i = 0; i < 60; i++) {
      introSparks.push({
        x: Math.random() * introCanvas.width,
        y: Math.random() * introCanvas.height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.15,
        color: Math.random() > 0.65 ? '#38bdf8' : '#ffffff',
        pulse: Math.random() * 0.012 + 0.004
      });
    }

    // Seed Orbiting Particles around title
    for (let i = 0; i < 70; i++) {
      orbitParticles.push({
        angle: Math.random() * Math.PI * 2,
        orbitRadius: Math.random() * 90 + 130, // orbit width band
        speed: (Math.random() * 0.0035 + 0.0015) * (Math.random() > 0.5 ? 1 : -1),
        radius: Math.random() * 1.6 + 0.4,
        alpha: Math.random() * 0.5 + 0.25,
        color: Math.random() > 0.45 ? '#38bdf8' : '#a78bfa'
      });
    }

    const drawIntroSparks = () => {
      const isWhiteTheme = document.body.classList.contains('white-theme') || (localStorage.getItem('mymo_theme') === 'white');
      ctx.clearRect(0, 0, introCanvas.width, introCanvas.height);

      // Spark trails during logo handoff
      if (handoffStarted && introLogo) {
        const rect = introLogo.getBoundingClientRect();
        const logoCenterX = rect.left + rect.width / 2;
        const logoCenterY = rect.top + rect.height / 2;

        if (lastLogoX !== null && lastLogoY !== null) {
          const dx = logoCenterX - lastLogoX;
          const dy = logoCenterY - lastLogoY;
          const speed = Math.hypot(dx, dy);

          if (speed > 0.1) {
            const numTrailSparks = Math.min(6, Math.ceil(speed * 0.6));
            for (let i = 0; i < numTrailSparks; i++) {
              const t = Math.random();
              const px = lastLogoX + dx * t + (Math.random() - 0.5) * rect.width * 0.35;
              const py = lastLogoY + dy * t + (Math.random() - 0.5) * rect.height * 0.35;
              
              const angle = Math.random() * Math.PI * 2;
              const spread = Math.random() * 1.8;
              
              introSparks.push({
                x: px,
                y: py,
                vx: -dx * 0.18 + Math.cos(angle) * spread,
                vy: -dy * 0.18 + Math.sin(angle) * spread,
                radius: Math.random() * 2.2 + 0.8,
                alpha: 1.0,
                life: 0.85,
                color: Math.random() > 0.45 ? '#38bdf8' : '#a78bfa',
                trail: []
              });
            }
          }
        }
        lastLogoX = logoCenterX;
        lastLogoY = logoCenterY;
      }
      
      const width = introCanvas.width;
      const height = introCanvas.height;
      const curCenterX = width / 2;
      const curCenterY = height / 2;

      // 3a. Draw background abstract HUD geometry (Hexagonal orbits & crosshairs)
      shapesAngle += 0.0008;
      hudAngle += 0.0025;

      // Compute dynamically rippled radiuses
      let r1 = 130;
      let r2 = 200;
      let r3 = 260;
      let rHex = 240;
      let rRadar = 320;
      
      if (shockwave) {
        const d1 = Math.abs(r1 - shockwave.radius);
        const d2 = Math.abs(r2 - shockwave.radius);
        const d3 = Math.abs(r3 - shockwave.radius);
        const dHex = Math.abs(rHex - shockwave.radius);
        const dRadar = Math.abs(rRadar - shockwave.radius);
        
        if (d1 < 120) r1 += Math.sin((d1 / 120) * Math.PI) * 18 * shockwave.alpha;
        if (d2 < 120) r2 += Math.sin((d2 / 120) * Math.PI) * 18 * shockwave.alpha;
        if (d3 < 120) r3 += Math.sin((d3 / 120) * Math.PI) * 18 * shockwave.alpha;
        if (dHex < 120) rHex += Math.sin((dHex / 120) * Math.PI) * 18 * shockwave.alpha;
        if (dRadar < 120) rRadar += Math.sin((dRadar / 120) * Math.PI) * 18 * shockwave.alpha;
      }

      // Concentric circles
      ctx.strokeStyle = isWhiteTheme ? 'rgba(2, 136, 209, 0.08)' : 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(curCenterX, curCenterY, r1, 0, Math.PI * 2);
      ctx.stroke();

      // Outer dashed circle
      ctx.strokeStyle = isWhiteTheme ? 'rgba(123, 31, 162, 0.08)' : 'rgba(167, 139, 250, 0.04)';
      ctx.setLineDash([5, 15]);
      ctx.beginPath();
      ctx.arc(curCenterX, curCenterY, r2, hudAngle, hudAngle + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ring 3 (Slow rotating ticks)
      ctx.strokeStyle = isWhiteTheme ? 'rgba(2, 136, 209, 0.06)' : 'rgba(56, 189, 248, 0.03)';
      ctx.setLineDash([2, 35]);
      ctx.beginPath();
      ctx.arc(curCenterX, curCenterY, r3, -hudAngle * 0.6, -hudAngle * 0.6 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw faint background hex
      ctx.strokeStyle = isWhiteTheme ? 'rgba(123, 31, 162, 0.03)' : 'rgba(167, 139, 250, 0.015)';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + shapesAngle;
        const hx = curCenterX + rHex * Math.cos(angle);
        const hy = curCenterY + rHex * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();

      // Radar Sweep Line (cinematic diagnostics HUD)
      ctx.strokeStyle = isWhiteTheme ? 'rgba(2, 136, 209, 0.04)' : 'rgba(56, 189, 248, 0.015)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(curCenterX, curCenterY);
      ctx.lineTo(curCenterX + rRadar * Math.cos(hudAngle), curCenterY + rRadar * Math.sin(hudAngle));
      ctx.stroke();
      
      // Radar Sweep Arc Glow
      const radarGrad = ctx.createRadialGradient(curCenterX, curCenterY, 50, curCenterX, curCenterY, rRadar);
      radarGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      radarGrad.addColorStop(1, isWhiteTheme ? 'rgba(2, 136, 209, 0.02)' : 'rgba(56, 189, 248, 0.008)');
      ctx.fillStyle = radarGrad;
      ctx.beginPath();
      ctx.arc(curCenterX, curCenterY, rRadar, hudAngle - 0.25, hudAngle);
      ctx.lineTo(curCenterX, curCenterY);
      ctx.fill();

      // Outer tick ring
      ctx.strokeStyle = isWhiteTheme ? 'rgba(2, 136, 209, 0.05)' : 'rgba(56, 189, 248, 0.02)';
      ctx.lineWidth = 1;
      ctx.setLineDash([1, 8]);
      ctx.beginPath();
      ctx.arc(curCenterX, curCenterY, rRadar, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3b. Draw Orbiting dot formations
      orbitParticles.forEach((p) => {
        p.angle += p.speed;
        
        // Dynamic pull factor toward center when shockwave happens
        let currentRadius = p.orbitRadius;
        if (shockwave) {
          const waveDist = shockwave.radius;
          // Pull orbit particles inward or push them slightly based on shockwave
          if (waveDist < currentRadius) {
            const pull = (1 - (currentRadius - waveDist) / 200) * 12;
            if (pull > 0) currentRadius -= pull;
          }
        }

        const x = curCenterX + currentRadius * Math.cos(p.angle);
        const y = curCenterY + currentRadius * Math.sin(p.angle);
        
        ctx.beginPath();
        ctx.arc(x, y, p.radius, 0, Math.PI * 2);
        
        let drawColor = p.color;
        if (isWhiteTheme) {
          if (p.color === '#38bdf8') drawColor = '#0288d1';
          else if (p.color === '#a78bfa') drawColor = '#7b1fa2';
        }
        ctx.fillStyle = drawColor;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = p.color === '#38bdf8' ? (isWhiteTheme ? 2 : 4) : 0;
        ctx.shadowColor = isWhiteTheme ? 'rgba(2, 136, 209, 0.4)' : '#38bdf8';
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // 3c. Draw shockwave physical forces
      if (shockwave) {
        shockwave.radius += shockwave.speed;
        shockwave.alpha *= 0.965;

        ctx.strokeStyle = isWhiteTheme 
          ? `rgba(2, 136, 209, ${shockwave.alpha})` 
          : `rgba(56, 189, 248, ${shockwave.alpha})`;
        ctx.lineWidth = 3;
        ctx.shadowBlur = isWhiteTheme ? 8 : 20;
        ctx.shadowColor = isWhiteTheme ? 'rgba(2, 136, 209, 0.4)' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(shockwave.x, shockwave.y, shockwave.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (shockwave.radius >= shockwave.maxRadius || shockwave.alpha < 0.005) {
          shockwave = null;
        }
      }

      // 3d. Draw ambient sparks & dust
      introSparks.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Shockwave physical push on ambient particles
        if (shockwave) {
          const dx = p.x - shockwave.x;
          const dy = p.y - shockwave.y;
          const dist = Math.hypot(dx, dy);

          if (Math.abs(dist - shockwave.radius) < 60 && dist > 1) {
            const force = (1 - Math.abs(dist - shockwave.radius) / 60) * 16;
            // Vortex Swirl: perpendicular force component
            const swirlX = -dy / dist;
            const swirlY = dx / dist;
            p.vx += (dx / dist) * force * 0.12 + swirlX * force * 0.06 * shockwave.alpha;
            p.vy += (dy / dist) * force * 0.12 + swirlY * force * 0.06 * shockwave.alpha;
          }
        }
        
        // Friction / drag logic to settle particles down
        p.vx *= 0.98;
        p.vy *= 0.98;

        // Boundaries wrap
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        if (p.life !== undefined) {
          // Spark explosion particles decay
          p.life -= 0.015;
          p.radius *= 0.975;
          p.alpha = p.life;
          
          // Save trail coordinates for explosion sparks
          if (!p.trail) p.trail = [];
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 8) {
            p.trail.shift();
          }
        } else {
          // Ambient dust twinkle
          p.alpha += p.pulse;
          if (p.alpha > 0.65 || p.alpha < 0.1) p.pulse = -p.pulse;
        }

        // Draw spark trail first
        if (p.trail && p.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let j = 1; j < p.trail.length; j++) {
            ctx.lineTo(p.trail[j].x, p.trail[j].y);
          }
          let drawColor = p.color;
          if (isWhiteTheme) {
            if (p.color === '#38bdf8') drawColor = '#0288d1';
            else if (p.color === '#ffffff') drawColor = 'rgba(84, 96, 122, 0.45)';
          }
          ctx.strokeStyle = drawColor;
          ctx.lineWidth = p.radius * 0.5;
          ctx.globalAlpha = p.alpha * 0.25;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2);
        
        let drawColor = p.color;
        if (isWhiteTheme) {
          if (p.color === '#38bdf8') drawColor = '#0288d1';
          else if (p.color === '#ffffff') drawColor = 'rgba(84, 96, 122, 0.45)';
        }
        ctx.fillStyle = drawColor;
        ctx.globalAlpha = Math.max(0, p.alpha);
        
        if (p.color === '#38bdf8') {
          ctx.shadowBlur = isWhiteTheme ? 3 : 6;
          ctx.shadowColor = isWhiteTheme ? 'rgba(2, 136, 209, 0.4)' : '#38bdf8';
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Filter dead explosion sparks
      introSparks = introSparks.filter(p => p.life === undefined || p.life > 0);
      introAnimId = requestAnimationFrame(drawIntroSparks);
    };
    drawIntroSparks();
  }

  // Helper: Trigger custom spark blast at coordinates
  const triggerSparkBlast = (x, y) => {
    if (!introCanvas) return;
    
    // 1. Trigger circular spark expansion
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5.5 + 2.5;
      introSparks.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 2.8 + 1.2,
        alpha: 1.0,
        life: 1.0,
        color: Math.random() > 0.4 ? '#38bdf8' : '#ffffff',
        trail: []
      });
    }

    // 2. Trigger shockwave physical ripple
    shockwave = {
      x: x,
      y: y,
      radius: 0,
      maxRadius: Math.max(window.innerWidth, window.innerHeight) * 0.85,
      speed: 16,
      alpha: 1.0
    };
  };

  // 4. Boot Choreography Execution
  // Step A: Staggered entrance of boot letters
  const letters = document.querySelectorAll('.intro-logo .letter');
  setTimeout(() => {
    letters.forEach((letter, idx) => {
      setTimeout(() => {
        letter.classList.add('reveal');
      }, idx * 120);
    });
  }, 150);

  // Show loader and subtitle after letters
  setTimeout(() => {
    if (introSubtitle) introSubtitle.classList.add('reveal');
    if (loaderLine) loaderLine.classList.add('reveal');
  }, 900);

  // Step B: Morph Sequence (My.OS -> M.OS)
  setTimeout(() => {
    const letterY = document.querySelector('.letter.char-y');
    if (letterY) {
      // Find y letter coordinates for explosion point
      const rect = letterY.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      
      // Morph: Hide 'y' letter
      letterY.classList.add('morph-hide');
      
      // Trigger canvas particle blast
      triggerSparkBlast(x, y);

      // Brief flash glow on parent logo
      if (introLogo) {
        introLogo.style.textShadow = '0 0 50px rgba(56, 189, 248, 0.9), 0 0 10px rgba(255, 255, 255, 0.8)';
        setTimeout(() => {
          introLogo.style.textShadow = '0 0 30px rgba(56, 189, 248, 0.3), 0 0 2px rgba(255, 255, 255, 0.8)';
        }, 300);
      }
    }
  }, 2200);

  // Step C: Translate Title to Navbar Logo (Handoff Animation)
  setTimeout(() => {
    if (overlay && introLogo && headerLogo) {
      // 1. Save original container style overrides to compute the true untransformed resting bounds
      const origTransform = container ? container.style.transform : '';
      const origTransition = container ? container.style.transition : '';
      const origOpacity = container ? container.style.opacity : '';
      const origFilter = container ? container.style.filter : '';

      // Temporarily disable container transitions and transforms to measure true resting navbar layout
      if (container) {
        container.style.transition = 'none';
        container.style.transform = 'none';
        container.style.opacity = '1';
        container.style.filter = 'none';
        // Force reflow
        container.offsetHeight;
      }

      // Compute bounding rectangles in target resting layout coordinates
      const headerRect = headerLogo.getBoundingClientRect();
      const introRect = introLogo.getBoundingClientRect();

      // Restore original container states to ensure animation transition plays correctly
      if (container) {
        container.style.transition = origTransition;
        container.style.transform = origTransform;
        container.style.opacity = origOpacity;
        container.style.filter = origFilter;
        // Force reflow again
        container.offsetHeight;
      }

      // Ensure elements are drawn in layout
      if (headerRect.width > 0 && introRect.width > 0) {
        // Find font size scales
        const headerSize = parseFloat(window.getComputedStyle(headerLogo).fontSize);
        const introSize = parseFloat(window.getComputedStyle(introLogo).fontSize);
        const scale = headerSize / introSize;

        // Calculate deltas relative to centers
        const deltaX = (headerRect.left + headerRect.width / 2) - (introRect.left + introRect.width / 2);
        const deltaY = (headerRect.top + headerRect.height / 2) - (introRect.top + introRect.height / 2);

        // Add handoff class for letter-spacing and style transitions
        introLogo.classList.add('handoff');

        // Enable spark trail spawning
        handoffStarted = true;

        // Apply dynamic translate/scale to header position
        introLogo.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scale})`;
      } else {
        // Fallback translation if rects are collapsed
        introLogo.classList.add('handoff');
        introLogo.style.transform = 'translate(-35vw, -42vh) scale(0.3)';
        handoffStarted = true;
      }

      // 2. Emerge dashboard and fade overlay backdrop
      overlay.classList.add('reveal-started');
      if (container) {
        container.classList.add('visible');
      }
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 150);
    }
  }, 3300);

  // Step D: Finish sequence, display navbar logo and clean overlay
  setTimeout(() => {
    // Disable spark trail spawning (existing particles will fade naturally)
    handoffStarted = false;
    if (headerLogo) {
      headerLogo.classList.add('visible');
    }
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
    }
    // Stabilize layout by recalculating card boundaries
    window.dispatchEvent(new Event('resize'));
  }, 4400);

  // Remove overlay from DOM completely to prevent layout blockages
  setTimeout(() => {
    if (overlay) {
      overlay.remove();
    }
    if (introAnimId) {
      cancelAnimationFrame(introAnimId);
    }
  }, 5800);

  // 5. Scroll-Based Section Reveal System
  const setupScrollReveal = () => {
    const cards = document.querySelectorAll('.glass-card');
    
    const updateScrollReveal = () => {
      const viewportHeight = window.innerHeight;
      
      cards.forEach((card) => {
        const parentSection = card.closest('.dashboard-section');
        // If card is inside a section that is NOT active, keep it in an assembled and visible state
        // so it does not jump cut when the tab becomes active
        if (parentSection && parentSection.classList.contains('active')) {
          card.setAttribute('data-scroll-y', '0');
          card.setAttribute('data-scroll-scale', '1');
          card.style.setProperty('--scroll-opacity', '1');
          card.style.setProperty('--scroll-blur', '0px');
          card.classList.add('assembled');
          return;
        }

        if (parentSection && !parentSection.classList.contains('active')) {
          card.setAttribute('data-scroll-y', '0');
          card.setAttribute('data-scroll-scale', '1');
          card.style.setProperty('--scroll-opacity', '1');
          card.style.setProperty('--scroll-blur', '0px');
          card.classList.add('assembled');
          return;
        }

        const rect = card.getBoundingClientRect();
        
        // The span over which the scroll animation progress runs (250px)
        const revealSpan = 250;
        let progress = (viewportHeight - rect.top) / revealSpan;
        
        if (progress < 0) progress = 0;
        if (progress > 1) progress = 1;
        
        // smoothstep interpolation
        const easeProgress = progress * progress * (3 - 2 * progress);
        
        const scrollY = (1 - easeProgress) * 55; // slides up from 55px below
        const scrollScale = 0.91 + easeProgress * 0.09; // scales from 0.91 to 1.0
        const scrollOpacity = easeProgress;
        
        card.setAttribute('data-scroll-y', scrollY);
        card.setAttribute('data-scroll-scale', scrollScale);
        card.style.setProperty('--scroll-opacity', scrollOpacity);
        card.style.setProperty('--scroll-blur', '0px');
        card.classList.add('assembled');
      });
    };

    window.addEventListener('scroll', updateScrollReveal, { passive: true });
    window.addEventListener('resize', updateScrollReveal);
    
    // Initial run
    updateScrollReveal();

    // Listen for tab navigation changes
    window.addEventListener('tab-changed', () => {
      setTimeout(updateScrollReveal, 50); // small delay to let tab switch render
    });
  };

  // 4b. Status initialization telemetry has been replaced by heartbeat system

  setupScrollReveal();
});
