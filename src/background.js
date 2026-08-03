// M.OS Cinematic Background Vector Field, 3D Grid, and Particle Interaction System
// Integrates 4-layer parallax, a perspective grid, organic cohesion, and cursor-tracking shapes.

class BackgroundEngine {
  constructor() {
    this.canvas = document.getElementById('bg-canvas');
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.particleCount = 96; // Reduced to 80% (from 120) for optimization
    
    // Mouse coordinates (interpolated and raw)
    this.mouse = { x: 0, y: 0 };
    this.targetMouse = { x: 0, y: 0 };
    this.screenMouse = { x: 0, y: 0 };
    this.prevScreenMouse = { x: 0, y: 0 };
    this.mouseVelocity = { x: 0, y: 0 };
    
    // Ambient elements
    this.orbs = document.querySelectorAll('.ambient-orb');
    
    // Advanced Particle Interaction states
    this.isCursorInEmptySpace = false;
    this.lastActiveTime = performance.now();
    this.interactionActive = false;
    
    // Pattern parameters
    this.patternProgress = 0; 
    this.activePatternIdx = 0; 
    this.interactiveNodeCount = 32; // Reduced to 80% (from 40) in sync with particleCount
    this.patternRotation = 0;
    
    // Theme transition morphing progress (0: Dark theme, 1: White theme)
    this.themeProgress = document.body.classList.contains('white-theme') ? 1.0 : 0.0;
    
    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.prevScreenMouse.x = window.innerWidth / 2;
    this.prevScreenMouse.y = window.innerHeight / 2;
    this.screenMouse.x = window.innerWidth / 2;
    this.screenMouse.y = window.innerHeight / 2;

    // Track cursor positioning
    window.addEventListener('mousemove', (e) => {
      this.targetMouse.x = (e.clientX / window.innerWidth) - 0.5;
      this.targetMouse.y = (e.clientY / window.innerHeight) - 0.5;
      this.lastActiveTime = performance.now();
      
      // Determine if cursor is in empty/free space
      const hoveredElement = document.elementFromPoint(e.clientX, e.clientY);
      if (hoveredElement) {
        const isInteractive = hoveredElement.closest('.glass-card, button, input, select, table, header, a, .main-nav');
        const prevEmptyState = this.isCursorInEmptySpace;
        this.isCursorInEmptySpace = !isInteractive;
        
        // Cycle pattern index on entering empty space
        if (this.isCursorInEmptySpace && !prevEmptyState) {
          this.activePatternIdx = (this.activePatternIdx + 1) % 3;
        }
      }
    });

    // Generate node field
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(this.createParticle(i));
    }

    // Connect Card Overlay sparks with selective shape formations for only the 4 supported tabs
    const targetCards = [
      { selector: '.dashboard-hero-panel', shapeType: 'system_profile' },
      { selector: '.dashboard-stats-panel', shapeType: 'academic_identity' },
      { selector: '.academic-graph-panel', shapeType: 'gpa_progress' },
      { selector: '.sem-marks-panel', shapeType: 'marks_graph' }
    ];

    targetCards.forEach(({ selector, shapeType }) => {
      const el = document.querySelector(selector);
      if (el) {
        new CardParticleSystem(el, { maxParticles: 24, shapeType: shapeType });
      }
    });

    this.tick();
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticle(index) {
    const layer = (index % 4) + 1; // 4 layers
    let baseSpeed, radius, opacityMultiplier;
    
    if (layer === 1) {
      baseSpeed = 0.25; radius = Math.random() * 0.7 + 0.9; opacityMultiplier = 0.55;
    } else if (layer === 2) {
      baseSpeed = 0.16; radius = Math.random() * 0.4 + 0.55; opacityMultiplier = 0.40;
    } else if (layer === 3) {
      baseSpeed = 0.09; radius = Math.random() * 0.3 + 0.38; opacityMultiplier = 0.26;
    } else {
      baseSpeed = 0.04; radius = Math.random() * 0.2 + 0.22; opacityMultiplier = 0.14;
    }

    return {
      index: index,
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * baseSpeed,
      vy: (Math.random() - 0.5) * baseSpeed,
      // Original random speed vectors to return to on dissolve
      baseVx: (Math.random() - 0.5) * baseSpeed,
      baseVy: (Math.random() - 0.5) * baseSpeed,
      radius: radius,
      layer: layer,
      impulseX: 0,
      impulseY: 0,
      depth: (5 - layer) * 0.65, // Parallax modifier
      opacity: Math.random() * opacityMultiplier + 0.12,
      baseOpacity: opacityMultiplier,
      color: (() => {
        const rand = Math.random();
        if (rand > 0.88) return '#38bdf8'; // soft ice blue
        if (rand > 0.78) return '#fbbf24'; // warm solar amber
        if (rand > 0.68) return '#a78bfa'; // twilight purple
        return '#ffffff'; // starlight silver
      })(),
      pulseSpeed: Math.random() * 0.010 + 0.003,
      pulseDir: Math.random() > 0.5 ? 1 : -1,
      isInteractiveNode: index < this.interactiveNodeCount
    };
  }

  // Draw perspective background digital grid (Depth System)
  drawBackgroundGrid() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Dynamic vanishing point tracks the cursor slightly for parallax depth
    const vanishingPointX = width / 2 + this.mouse.x * 120;
    const vanishingPointY = height / 2 + this.mouse.y * 100;
    
    this.ctx.lineWidth = 0.6;
    this.ctx.shadowBlur = 0;

    // Interpolate grid colors between Dark theme and White theme dynamically
    const rC = Math.round(56 + (2 - 56) * this.themeProgress);
    const gC = Math.round(189 + (136 - 189) * this.themeProgress);
    const bC = Math.round(248 + (209 - 248) * this.themeProgress);
    const lineGlowColor = `${rC}, ${gC}, ${bC}`;

    const rP = Math.round(167 + (123 - 167) * this.themeProgress);
    const gP = Math.round(139 + (31 - 139) * this.themeProgress);
    const bP = Math.round(250 + (162 - 250) * this.themeProgress);
    const linePurpleColor = `${rP}, ${gP}, ${bP}`;

    const alphaMultiplier = 1.0 + (2.5 - 1.0) * this.themeProgress;

    // 1. Draw Longitudinal lines (faint, dashed astronomical tracks)
    const lineCount = 20;
    this.ctx.setLineDash([3, 15]);
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2 + (this.patternRotation * 0.00015);
      
      const targetX = vanishingPointX + Math.cos(angle) * Math.max(width, height) * 1.5;
      const targetY = vanishingPointY + Math.sin(angle) * Math.max(width, height) * 1.5;
      
      const gridGradi = this.ctx.createLinearGradient(vanishingPointX, vanishingPointY, targetX, targetY);

      gridGradi.addColorStop(0, `rgba(${lineGlowColor}, 0.0)`);
      gridGradi.addColorStop(0.3, `rgba(${lineGlowColor}, ${0.004 * alphaMultiplier})`);
      gridGradi.addColorStop(0.7, `rgba(${linePurpleColor}, ${0.005 * alphaMultiplier})`);
      gridGradi.addColorStop(1, `rgba(${lineGlowColor}, 0.0)`);

      this.ctx.strokeStyle = gridGradi;
      this.ctx.beginPath();
      this.ctx.moveTo(vanishingPointX, vanishingPointY);
      this.ctx.lineTo(targetX, targetY);
      this.ctx.stroke();
    }
    this.ctx.setLineDash([]);

    // 2. Draw Lateral concentric perspective rings (orbital paths)
    const ringCount = 8;
    const maxRadius = Math.max(width, height) * 1.2;
    this.ctx.setLineDash([2, 10]);
    for (let i = 1; i <= ringCount; i++) {
      const radius = Math.pow(i / ringCount, 1.8) * maxRadius;
      const ringAlpha = (1 - (radius / maxRadius)) * 0.008 * (1.0 + (2.0 - 1.0) * this.themeProgress);
      
      this.ctx.strokeStyle = `rgba(${lineGlowColor}, ${ringAlpha})`;
      this.ctx.beginPath();
      this.ctx.arc(vanishingPointX, vanishingPointY, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.setLineDash([]);
  }

  // Calculate target positions for dynamic patterns
  calculatePatternOffset(p, cx, cy) {
    const idx = p.index;
    const count = this.interactiveNodeCount;
    this.patternRotation += 0.005; // Continuously rotate patterns

    let tx = cx;
    let ty = cy;

    if (this.activePatternIdx === 0) {
      // --- PATTERN 1: HEXAGONAL WIREFRAME LATTICE ---
      const rings = 4;
      let nodeOffset = 0;
      let targetRing = 0;
      let ringNodesCount = 6;
      
      // Map node index to concentric hexagon rings
      for (let r = 1; r <= rings; r++) {
        const nextRingCount = r * 6;
        if (idx >= nodeOffset && idx < nodeOffset + nextRingCount) {
          targetRing = r;
          ringNodesCount = nextRingCount;
          break;
        }
        nodeOffset += nextRingCount;
      }
      
      if (targetRing === 0) {
        // Center node
        tx = cx;
        ty = cy;
      } else {
        const ringIdx = idx - nodeOffset;
        const radius = targetRing * 35;
        const angle = (ringIdx / ringNodesCount) * Math.PI * 2 + this.patternRotation * 0.02;
        tx = cx + radius * Math.cos(angle);
        ty = cy + radius * Math.sin(angle);
      }
    } 
    else if (this.activePatternIdx === 1) {
      // --- PATTERN 2: CONCENTRIC ORBITAL VORTEX ---
      // 3 rings of dots orbiting at different speeds and radii
      const ringIndex = idx % 3;
      const nodesPerRing = count / 3;
      const ringNodeIdx = Math.floor(idx / 3);
      const radius = 55 + ringIndex * 35;
      const speedDirection = ringIndex % 2 === 0 ? 1 : -1;
      const theta = (ringNodeIdx / nodesPerRing) * Math.PI * 2 + (this.patternRotation * 0.04 * speedDirection);
      
      tx = cx + radius * Math.cos(theta);
      ty = cy + radius * Math.sin(theta);
    } 
    else {
      // --- PATTERN 3: BLOOMING FIBONACCI SPIRAL ---
      const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
      const angle = idx * (2 * Math.PI / (phi * phi)) + this.patternRotation * 0.015;
      const radius = 8 * Math.sqrt(idx); // Spiral scaling factor
      
      tx = cx + radius * Math.cos(angle);
      ty = cy + radius * Math.sin(angle);
    }

    return { x: tx, y: ty };
  }

  tick() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Dynamic theme morphing interpolation (linear ease to target)
    const targetThemeProgress = document.body.classList.contains('white-theme') ? 1.0 : 0.0;
    this.themeProgress += (targetThemeProgress - this.themeProgress) * 0.065;

    // Render Perspective Grid
    this.drawBackgroundGrid();

    // Mouse interpolation physics
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

    this.screenMouse.x = (this.mouse.x + 0.5) * this.canvas.width;
    this.screenMouse.y = (this.mouse.y + 0.5) * this.canvas.height;

    this.mouseVelocity.x = this.screenMouse.x - this.prevScreenMouse.x;
    this.mouseVelocity.y = this.screenMouse.y - this.prevScreenMouse.y;
    this.prevScreenMouse.x = this.screenMouse.x;
    this.prevScreenMouse.y = this.screenMouse.y;

    // Settle interactive state based on active cursor coordinates
    const idleTimeout = 4000; // Settle patterns if mouse is idle for 4 seconds
    const timeSinceActive = performance.now() - this.lastActiveTime;
    const isMouseActive = timeSinceActive < idleTimeout;
    
    this.interactionActive = this.isCursorInEmptySpace && isMouseActive;

    // Pattern progress interpolation (ease progress up/down)
    const formationsEnabled = localStorage.getItem('mymo_particle_formations_enabled') !== 'false';
    if (this.interactionActive && formationsEnabled) {
      this.patternProgress += (1.0 - this.patternProgress) * 0.07;
    } else {
      this.patternProgress += (0.0 - this.patternProgress) * 0.05;
    }

    // Drift ambient background elements
    if (this.orbs.length > 0) {
      const shiftX = -this.mouse.x * 120;
      const shiftY = -this.mouse.y * 120;
      this.orbs.forEach((orb, index) => {
        const modifier = (index + 1) * 1.15;
        orb.style.transform = `translate3d(${shiftX * modifier}px, ${shiftY * modifier}px, 0)`;
      });
    }

    this.particlesEnabled = localStorage.getItem('mymo_particles_enabled') !== 'false';

    if (this.particlesEnabled) {
      // Organic Cohesion solver
      const cohesionLimit = 80;
      const isDrifting = this.patternProgress < 0.15;

      if (isDrifting) {
        for (let i = 0; i < this.particles.length; i++) {
          const p1 = this.particles[i];
          for (let j = i + 1; j < this.particles.length; j++) {
            const p2 = this.particles[j];
            if (p1.layer === p2.layer) {
              const dx = p1.x - p2.x;
              const dy = p1.y - p2.y;
              if (Math.abs(dx) < cohesionLimit && Math.abs(dy) < cohesionLimit) {
                const dist = Math.hypot(dx, dy);
                if (dist > 0.5 && dist < cohesionLimit) {
                  const force = ((cohesionLimit - dist) / cohesionLimit) * 0.003;
                  p1.x -= dx * force;
                  p1.y -= dy * force;
                  p2.x += dx * force;
                  p2.y += dy * force;
                }
              }
            }
          }
        }
      }

      // Update coordinates and draw
      this.particles.forEach((p) => {
        p.impulseX *= 0.94;
        p.impulseY *= 0.94;

        // Check if node is designated for geometric interactive pattern morphing
        if (p.isInteractiveNode && this.patternProgress > 0.01) {
          const targetOffset = this.calculatePatternOffset(p, this.screenMouse.x, this.screenMouse.y);
          
          // Ambient drift vector calculation
          p.x += p.vx + p.impulseX;
          p.y += p.vy + p.impulseY;
          
          // Smoothly interpolate between drifted coordinates and pattern coordinates
          p.drawX = p.x + (targetOffset.x - p.x) * this.patternProgress;
          p.drawY = p.y + (targetOffset.y - p.y) * this.patternProgress;

          // Wrap coordinate bounds for ambient drift
          if (p.x < -30) p.x = this.canvas.width + 15;
          if (p.x > this.canvas.width + 30) p.x = -15;
          if (p.y < -30) p.y = this.canvas.height + 15;
          if (p.y > this.canvas.height + 30) p.y = -15;
        } else {
          // Cosmic wind organic drift (low frequency orbital sway)
          const windTime = performance.now() * 0.0003 + p.index;
          const windX = Math.sin(windTime * 0.7) * 0.08;
          const windY = Math.cos(windTime * 0.5) * 0.08;

          p.x += p.vx + p.impulseX + windX;
          p.y += p.vy + p.impulseY + windY;

          // Parallax offsets
          const parallaxX = this.mouse.x * 75 * p.depth;
          const parallaxY = this.mouse.y * 75 * p.depth;

          p.drawX = p.x + parallaxX;
          p.drawY = p.y + parallaxY;

          // Wrap boundaries
          if (p.drawX < -30) p.x = this.canvas.width - parallaxX + 15;
          if (p.drawX > this.canvas.width + 30) p.x = -parallaxX - 15;
          if (p.drawY < -30) p.y = this.canvas.height - parallaxY + 15;
          if (p.drawY > this.canvas.height + 30) p.y = -parallaxY - 15;
        }

        // Opacity micro-twinkling logic
        p.opacity += p.pulseSpeed * p.pulseDir;
        const maxOpacity = p.baseOpacity * 1.25;
        const minOpacity = p.baseOpacity * 0.35;
        if (p.opacity > maxOpacity) p.pulseDir = -1;
        else if (p.opacity < minOpacity) p.pulseDir = 1;

        // Mouse proximity interaction (attraction and wind ripples)
        const dx = this.screenMouse.x - p.drawX;
        const dy = this.screenMouse.y - p.drawY;
        const distance = Math.hypot(dx, dy);
        const forceRadius = 200;

        // Skip proximity physics if node is currently locked inside a pattern
        const skipProximity = p.isInteractiveNode && this.patternProgress > 0.45;

        if (!skipProximity && distance > 0.1 && distance < forceRadius) {
          const influence = (forceRadius - distance) / forceRadius;
          
          // Attract toward cursor
          p.x += (dx / distance) * influence * 0.18;
          p.y += (dy / distance) * influence * 0.18;

          // Apply mouse movement wind force
          const mouseSpeed = Math.hypot(this.mouseVelocity.x, this.mouseVelocity.y);
          if (mouseSpeed > 0.4) {
            p.impulseX += (this.mouseVelocity.x * influence * 0.08) / p.layer;
            p.impulseY += (this.mouseVelocity.y * influence * 0.08) / p.layer;
          }
        }
      });

      // Draw connecting vector lines
      const connectionLimit = 85;

      for (let i = 0; i < this.particles.length; i++) {
        const p1 = this.particles[i];
        for (let j = i + 1; j < this.particles.length; j++) {
          const p2 = this.particles[j];

          // Connect nodes on the same or adjacent layers to give 3D depth lines
          if (Math.abs(p1.layer - p2.layer) <= 1) {
            const dx = p1.drawX - p2.drawX;
            const dy = p1.drawY - p2.drawY;

            if (Math.abs(dx) > connectionLimit || Math.abs(dy) > connectionLimit) continue;

            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < connectionLimit) {
              // Draw lines
              let alphaFactor = 0.075;
              
              // Connect lines tighter/brighter if clustered inside interaction shapes
              if (p1.isInteractiveNode && p2.isInteractiveNode && this.patternProgress > 0.4) {
                alphaFactor = 0.18 * this.patternProgress;
              }

              const lineAlpha = (1 - dist / connectionLimit) * alphaFactor * Math.min(p1.opacity, p2.opacity);
              this.ctx.beginPath();
              this.ctx.moveTo(p1.drawX, p1.drawY);
              this.ctx.lineTo(p2.drawX, p2.drawY);
              
              const rL = Math.round(56 + (2 - 56) * this.themeProgress);
              const gL = Math.round(189 + (136 - 189) * this.themeProgress);
              const bL = Math.round(248 + (209 - 248) * this.themeProgress);
              const lineGlowColor = `${rL}, ${gL}, ${bL}`;
              const multiplierL = 1.0 + (1.5 - 1.0) * this.themeProgress;

              this.ctx.strokeStyle = `rgba(${lineGlowColor}, ${lineAlpha * multiplierL})`;
              this.ctx.lineWidth = 0.35;
              this.ctx.stroke();
            }
          }
        }
      }

      // Draw glowing node circles
      this.particles.forEach((p) => {
        this.ctx.beginPath();
        
        // Slightly scale up interactive nodes forming patterns
        let renderRadius = p.radius;
        if (p.isInteractiveNode && this.patternProgress > 0.5) {
          renderRadius = p.radius * (1.0 + this.patternProgress * 0.35);
        }

        this.ctx.arc(p.drawX, p.drawY, renderRadius, 0, Math.PI * 2);
        
        let drawColor = p.color;
        if (p.color === '#ffffff') {
          if (this.themeProgress > 0.01) {
            let rT, gT, bT;
            if (p.index % 3 === 0) {
              rT = 100; gT = 116; bT = 139; // soft grey-blue
            } else if (p.index % 3 === 1) {
              rT = 148; gT = 163; bT = 184; // muted silver
            } else {
              rT = 71; gT = 85; bT = 105; // slate-grey
            }
            const rN = Math.round(255 + (rT - 255) * this.themeProgress);
            const gN = Math.round(255 + (gT - 255) * this.themeProgress);
            const bN = Math.round(255 + (bT - 255) * this.themeProgress);
            const opacityMult = 1.0 + (0.5 - 1.0) * this.themeProgress;
            drawColor = `rgba(${rN}, ${gN}, ${bN}, ${opacityMult})`;
          } else {
            drawColor = '#ffffff';
          }
        } else if (p.color === '#38bdf8') {
          let rT, gT, bT;
          if (p.index % 2 === 0) {
            rT = 2; gT = 136; bT = 209; // cyan accent
          } else {
            rT = 123; gT = 31; bT = 162; // violet accent
          }
          const rC = Math.round(56 + (rT - 56) * this.themeProgress);
          const gC = Math.round(189 + (gT - 189) * this.themeProgress);
          const bC = Math.round(248 + (bT - 248) * this.themeProgress);
          drawColor = `rgb(${rC}, ${gC}, ${bC})`;
        } else if (p.color === '#fbbf24') {
          // Solar amber particle handling
          const rC = Math.round(251 + (230 - 251) * this.themeProgress);
          const gC = Math.round(191 + (124 - 191) * this.themeProgress);
          const bC = Math.round(36 + (34 - 36) * this.themeProgress);
          drawColor = `rgb(${rC}, ${gC}, ${bC})`;
        } else if (p.color === '#a78bfa') {
          // Twilight purple particle handling
          const rC = Math.round(167 + (123 - 167) * this.themeProgress);
          const gC = Math.round(139 + (31 - 139) * this.themeProgress);
          const bC = Math.round(250 + (162 - 250) * this.themeProgress);
          drawColor = `rgb(${rC}, ${gC}, ${bC})`;
        }
        
        this.ctx.fillStyle = drawColor;
        this.ctx.globalAlpha = Math.max(0, p.opacity);
        
        if (p.color === '#38bdf8' || p.color === '#fbbf24' || p.color === '#a78bfa') {
          const blurTarget = p.isInteractiveNode && this.patternProgress > 0.5 ? 8 : 4;
          const blurMin = p.isInteractiveNode && this.patternProgress > 0.5 ? 4 : 2;
          this.ctx.shadowBlur = blurTarget + (blurMin - blurTarget) * this.themeProgress;
          
          let sR = 56, sG = 189, sB = 248;
          if (p.color === '#fbbf24') {
            sR = 251; sG = 191; sB = 36;
          } else if (p.color === '#a78bfa') {
            sR = 167; sG = 139; sB = 250;
          } else {
            sR = p.index % 2 === 0 ? 56 : 167;
            sG = p.index % 2 === 0 ? 189 : 139;
            sB = p.index % 2 === 0 ? 248 : 250;
          }
          const rS = Math.round(sR + (sR - sR) * this.themeProgress);
          const gS = Math.round(sG + (sG - sG) * this.themeProgress);
          const bS = Math.round(sB + (sB - sB) * this.themeProgress);
          this.ctx.shadowColor = `rgba(${rS}, ${gS}, ${bS}, ${(0.85 + (0.4 - 0.85) * this.themeProgress) * 0.7})`;
        } else {
          this.ctx.shadowBlur = 1.5 * (1.0 - this.themeProgress);
          this.ctx.shadowColor = `rgba(255, 255, 255, ${1.0 - this.themeProgress})`;
        }
        this.ctx.fill();
      });

      this.ctx.shadowBlur = 0;
      this.ctx.globalAlpha = 1.0;
    }

    requestAnimationFrame(() => this.tick());
  }
}

class CardParticleSystem {
  constructor(element, options = {}) {
    this.element = element;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'card-particles-canvas';
    
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '0';
    
    const parentStyle = window.getComputedStyle(this.element);
    if (parentStyle.position === 'static') {
      this.element.style.position = 'relative';
    }
    
    this.element.insertBefore(this.canvas, this.element.firstChild);
    this.ctx = this.canvas.getContext('2d');
    
    this.particles = [];
    this.maxParticles = options.maxParticles || 20;
    this.shapeType = options.shapeType || null;
    
    // Store mouse coordinates (both canvas-relative and screen-raw)
    this.mouse = { x: -1000, y: -1000, screenX: -1000, screenY: -1000, active: false };
    this.inEmptySpace = false;
    this.formationProgress = 0;
    this.orbitRotation = Math.random() * Math.PI * 2;
    this.templatePoints = [];
    this.animationTime = 0;
    this.shapeAnchor = { x: 0, y: 0 };
    this.themeProgress = document.body.classList.contains('white-theme') ? 1.0 : 0.0;
    
    if (this.shapeType) {
      this.generateAnimatedTemplatePoints(0);
    }
    
    this.init();
  }
  
  // Generates animated templates dynamically based on active frame ticks
  generateAnimatedTemplatePoints(t) {
    const pts = [];
    const scale = 58;
    
    if (this.shapeType === 'system_profile') {
      // 1. Dashboard -> "Solar System" (Concentric orbital paths - HIGHER intensity)
      const spiralIn = 1.4 - 0.4 * this.formationProgress;
      
      // Central Sun core (4 particles)
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + t * 0.005;
        const r = (0.05 + Math.sin(t * 0.015 + i) * 0.015) * spiralIn;
        pts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      
      // Planet 1: Inner (4 particles, fast orbit)
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + t * 0.012;
        const rx = 0.3 * spiralIn;
        const ry = 0.22 * spiralIn;
        const tilt = Math.PI / 18; // 10 degrees
        const ex = rx * Math.cos(angle);
        const ey = ry * Math.sin(angle);
        pts.push({
          x: ex * Math.cos(tilt) - ey * Math.sin(tilt),
          y: ex * Math.sin(tilt) + ey * Math.cos(tilt)
        });
      }
      
      // Planet 2: Middle (6 particles, medium orbit)
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + t * 0.007;
        const rx = 0.58 * spiralIn;
        const ry = 0.42 * spiralIn;
        const tilt = -Math.PI / 12; // -15 degrees
        const ex = rx * Math.cos(angle);
        const ey = ry * Math.sin(angle);
        pts.push({
          x: ex * Math.cos(tilt) - ey * Math.sin(tilt),
          y: ex * Math.sin(tilt) + ey * Math.cos(tilt)
        });
      }
      
      // Planet 3: Outer (10 particles, slow orbit)
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2 + t * 0.003;
        const rx = 0.86 * spiralIn;
        const ry = 0.62 * spiralIn;
        const tilt = Math.PI / 9; // 20 degrees
        const ex = rx * Math.cos(angle);
        const ey = ry * Math.sin(angle);
        pts.push({
          x: ex * Math.cos(tilt) - ey * Math.sin(tilt),
          y: ex * Math.sin(tilt) + ey * Math.cos(tilt)
        });
      }
    } 
    else if (this.shapeType === 'academic_identity') {
      // 2. Dashboard Academic Identity -> "3D Rotating DNA Helix" (Highly alive double helix winding in 3D around Y-axis)
      const spiralIn = 1.35 - 0.35 * this.formationProgress;
      
      // Strand 1 (12 particles winding vertically)
      for (let i = 0; i < 12; i++) {
        const yNorm = -0.7 + (i / 11) * 1.4;
        const angle = yNorm * Math.PI * 1.5 + t * 0.015;
        const x = 0.3 * Math.cos(angle);
        const z = 0.3 * Math.sin(angle);
        const pFactor = 1.0 + z * 0.18;
        
        pts.push({
          x: x * pFactor * spiralIn,
          y: yNorm * pFactor * spiralIn
        });
      }
      
      // Strand 2 (12 particles winding vertically in opposite phase)
      for (let i = 0; i < 12; i++) {
        const yNorm = -0.7 + (i / 11) * 1.4;
        const angle = yNorm * Math.PI * 1.5 + t * 0.015 + Math.PI;
        const x = 0.3 * Math.cos(angle);
        const z = 0.3 * Math.sin(angle);
        const pFactor = 1.0 + z * 0.18;
        
        pts.push({
          x: x * pFactor * spiralIn,
          y: yNorm * pFactor * spiralIn
        });
      }
    } 
    else if (this.shapeType === 'gpa_progress') {
      // 3. Academic GPA Graph -> "Spiral Galaxy" (Central pulsing core + 2 rotating spiral arms)
      const spiralIn = 1.3 - 0.3 * this.formationProgress;
      
      // Central core (6 particles)
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + t * 0.005;
        const r = (0.06 + Math.sin(t * 0.018 + i) * 0.012) * spiralIn;
        pts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      
      // Arm 1 (9 particles winding outward)
      for (let k = 0; k < 9; k++) {
        const p = k / 8;
        const angle = p * 1.8 * Math.PI + t * 0.012;
        const r = 0.15 + 0.72 * p;
        pts.push({
          x: r * Math.cos(angle) * spiralIn,
          y: r * Math.sin(angle) * 0.7 * spiralIn
        });
      }
      
      // Arm 2 (9 particles winding outward in opposite phase)
      for (let k = 0; k < 9; k++) {
        const p = k / 8;
        const angle = p * 1.8 * Math.PI + t * 0.012 + Math.PI;
        const r = 0.15 + 0.72 * p;
        pts.push({
          x: r * Math.cos(angle) * spiralIn,
          y: r * Math.sin(angle) * 0.7 * spiralIn
        });
      }
    } 
    else if (this.shapeType === 'marks_graph') {
      // 4. Sem Marks Graph -> "Bohr Atom" (Central wiggling nucleus + 3 interlocking orbital shells)
      const spiralIn = 1.3 - 0.3 * this.formationProgress;
      
      // Central nucleus (6 particles)
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + t * 0.008;
        const r = (0.07 + Math.sin(t * 0.02 + i) * 0.015) * spiralIn;
        pts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      
      // Orbit 1 (6 particles, 35 deg tilt)
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + t * 0.014;
        const rx = 0.75 * spiralIn;
        const ry = 0.25 * spiralIn;
        const tilt = Math.PI / 5.1; // 35 degrees
        const ex = rx * Math.cos(angle);
        const ey = ry * Math.sin(angle);
        pts.push({
          x: ex * Math.cos(tilt) - ey * Math.sin(tilt),
          y: ex * Math.sin(tilt) + ey * Math.cos(tilt)
        });
      }
      
      // Orbit 2 (6 particles, -35 deg tilt)
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - t * 0.011;
        const rx = 0.75 * spiralIn;
        const ry = 0.25 * spiralIn;
        const tilt = -Math.PI / 5.1;
        const ex = rx * Math.cos(angle);
        const ey = ry * Math.sin(angle);
        pts.push({
          x: ex * Math.cos(tilt) - ey * Math.sin(tilt),
          y: ex * Math.sin(tilt) + ey * Math.cos(tilt)
        });
      }
      
      // Orbit 3 (6 particles, 90 deg tilt)
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + t * 0.009;
        const rx = 0.25 * spiralIn;
        const ry = 0.75 * spiralIn;
        const tilt = Math.PI / 2.2;
        const ex = rx * Math.cos(angle);
        const ey = ry * Math.sin(angle);
        pts.push({
          x: ex * Math.cos(tilt) - ey * Math.sin(tilt),
          y: ex * Math.sin(tilt) + ey * Math.cos(tilt)
        });
      }
    }
    
    this.templatePoints = pts;
  }
  
  init() {
    this.resize();
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle());
    }
    
    this.element.addEventListener('mousemove', (e) => {
      this.mouse.screenX = e.clientX;
      this.mouse.screenY = e.clientY;
      this.mouse.active = true;
      
      // Selectively filter elements: ignore input components/buttons
      const isInteractive = e.target.closest('button, input, select, th, td, a, .quick-tile, .calendar-days span, .nav-btn, .sem-sub-tab, .color-dot');
      this.inEmptySpace = !isInteractive;
    });
    
    this.element.addEventListener('mouseleave', () => {
      this.mouse.active = false;
      this.inEmptySpace = false;
      this.mouse.x = -1000;
      this.mouse.y = -1000;
      this.mouse.screenX = -1000;
      this.mouse.screenY = -1000;
    });
    
    window.addEventListener('resize', () => this.resize());
    this.tick();
  }
  
  resize() {
    const rect = this.element.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }
  
  createParticle() {
    const size = Math.random() * 1.3 + 0.5;
    const depth = Math.random() * 0.8 + 0.2;
    const speedMultiplier = 0.14;
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * speedMultiplier * (1 / depth),
      vy: (Math.random() - 0.5) * speedMultiplier * (1 / depth),
      baseVx: (Math.random() - 0.5) * speedMultiplier * (1 / depth),
      baseVy: (Math.random() - 0.5) * speedMultiplier * (1 / depth),
      radius: size,
      depth: depth,
      opacity: Math.random() * 0.35 + 0.1,
      color: Math.random() > 0.65 ? '#38bdf8' : '#ffffff',
      pulseSpeed: Math.random() * 0.006 + 0.002,
      pulseDir: Math.random() > 0.5 ? 1 : -1,
      history: [] // coordinate history queue for glowing vector trails
    };
  }
  
  tick() {
    if (this.canvas.width === 0 || this.canvas.height === 0) {
      this.resize();
    }
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Dynamic theme morphing interpolation (linear ease to target)
    const targetThemeProgress = document.body.classList.contains('white-theme') ? 1.0 : 0.0;
    this.themeProgress += (targetThemeProgress - this.themeProgress) * 0.065;
    
    // 0. Update coordinates relative to card offset dynamically during scroll locks
    const particlesEnabled = localStorage.getItem('mymo_particles_enabled') !== 'false';

    if (particlesEnabled) {
      // 0. Update coordinates relative to card offset dynamically during scroll locks
        if (this.mouse.active) {
        const rect = this.canvas.getBoundingClientRect();
        const inBounds = this.mouse.screenX >= rect.left && this.mouse.screenX <= rect.right &&
                         this.mouse.screenY >= rect.top && this.mouse.screenY <= rect.bottom;
        
        if (inBounds) {
          const prevMouseX = this.mouse.x;
          const prevMouseY = this.mouse.y;
          this.mouse.x = this.mouse.screenX - rect.left;
          this.mouse.y = this.mouse.screenY - rect.top;
          
          // Compute instant mouse velocity for reactive bending
          if (prevMouseX !== -1000) {
            this.mouseVelX = this.mouse.x - prevMouseX;
            this.mouseVelY = this.mouse.y - prevMouseY;
          } else {
            this.mouseVelX = 0;
            this.mouseVelY = 0;
          }
          
          if (this.smoothVelX === undefined) {
            this.smoothVelX = 0;
            this.smoothVelY = 0;
          }
          this.smoothVelX += (this.mouseVelX - this.smoothVelX) * 0.05;
          this.smoothVelY += (this.mouseVelY - this.smoothVelY) * 0.05;

          // Interpolate shapeAnchor slowly for cinematic delay lag
          if (this.smoothedAnchorX === undefined) {
            this.smoothedAnchorX = this.mouse.x;
            this.smoothedAnchorY = this.mouse.y;
          }
          this.smoothedAnchorX += (this.mouse.x - this.smoothedAnchorX) * 0.035; // slow slide follow
          this.smoothedAnchorY += (this.mouse.y - this.smoothedAnchorY) * 0.035;

          this.shapeAnchor.x = this.smoothedAnchorX;
          this.shapeAnchor.y = this.smoothedAnchorY;
          
          // Dynamic sub-tab context check: Disable shape if Marks Graph is not active
          if (this.element.classList.contains('sem-marks-panel')) {
            const graphTab = this.element.querySelector('.sem-sub-tab[data-sem-tab="graph"]');
            if (graphTab && !graphTab.classList.contains('active')) {
              this.inEmptySpace = false;
            }
          }
        } else {
          this.mouse.active = false;
          this.inEmptySpace = false;
        }
      }
      
      // Slow rotational spin for orbital particles
      this.orbitRotation += 0.006; // slowed down from 0.01
      
      // Smooth interpolation of shape activation progress
      const formationsEnabled = localStorage.getItem('mymo_particle_formations_enabled') !== 'false';
      const isForming = this.mouse.active && this.inEmptySpace && this.shapeType && formationsEnabled;
      const targetProgress = isForming ? 1.0 : 0.0;
      this.formationProgress += (targetProgress - this.formationProgress) * 0.02; // extremely slow cinematic emerge (0.02)
      
      const activeState = this.formationProgress > 0.01;
      const scale = 58;
      
      // 1. Trigger animated updates on the vector structures during active morphing state
      if (activeState) {
        this.animationTime += 1;
        this.generateAnimatedTemplatePoints(this.animationTime);
      }
      
      this.particles.forEach((p, idx) => {
        // Save current coordinates to history for glowing trails
        p.history.push({ x: p.drawX || p.x, y: p.drawY || p.y });
        if (p.history.length > 4) {
          p.history.shift();
        }
        
        // Ambient twinkles
        p.opacity += p.pulseSpeed * p.pulseDir;
        if (p.opacity > 0.65) p.pulseDir = -1;
        if (p.opacity < 0.12) p.pulseDir = 1;
        
        // Wrap coordinates
        if (p.x < 0) p.x = this.canvas.width;
        if (p.x > this.canvas.width) p.x = 0;
        if (p.y < 0) p.y = this.canvas.height;
        if (p.y > this.canvas.height) p.y = 0;
        
        // Apply spring dynamics or drift calculations directly to coordinates
        const pProg = Math.max(0, Math.min(1, (this.formationProgress - (idx * 0.012)) / 0.72));
        const pFade = (this.templatePoints[idx] && this.templatePoints[idx].fade !== undefined) ? this.templatePoints[idx].fade : 1.0;
        
        if (activeState && pProg > 0.001) {
          let targetX = p.x;
          let targetY = p.y;
          
          if (idx < this.templatePoints.length) {
            // Point fits within symbol shape template (referenced to shapeAnchor)
            targetX = this.shapeAnchor.x + this.templatePoints[idx].x * scale;
            targetY = this.shapeAnchor.y + this.templatePoints[idx].y * scale;
          } else {
            // Extra particles orbit around the shape to clear space
            const angle = ((idx - this.templatePoints.length) / (this.maxParticles - this.templatePoints.length)) * Math.PI * 2 + this.orbitRotation;
            const orbitRadius = scale * 1.35;
            targetX = this.shapeAnchor.x + Math.cos(angle) * orbitRadius;
            targetY = this.shapeAnchor.y + Math.sin(angle) * orbitRadius;
          }
          
          // Spring acceleration calculation toward targets
          const dx = targetX - p.x;
          const dy = targetY - p.y;
          
          const springForce = 0.0025 * pProg * pFade; // gentle progressive spring force
          p.vx += dx * springForce;
          p.vy += dy * springForce;
          
          // Blend drift velocity as morph progress decays (softer return transition)
          p.vx += (p.baseVx - p.vx) * 0.012 * (1 - pProg);
          p.vy += (p.baseVy - p.vy) * 0.012 * (1 - pProg);
          
          // Apply spring damping
          const currentDamping = 0.05 * pProg + 0.015 * (1 - pProg);
          p.vx *= (1 - currentDamping);
          p.vy *= (1 - currentDamping);
        } 
        else {
          // Return velocity slowly to baseline drift speed (reduced for soft dispersion)
          p.vx += (p.baseVx - p.vx) * 0.008;
          p.vy += (p.baseVy - p.vy) * 0.008;
          
          if (this.mouse.active) {
            const dx = this.mouse.x - p.x;
            const dy = this.mouse.y - p.y;
            const dist = Math.hypot(dx, dy);
            const forceRadius = 90;
            
            if (dist < forceRadius) {
              const force = (forceRadius - dist) / forceRadius;
              const pullDir = p.depth > 0.5 ? -1 : 1;
              p.vx += (dx / dist) * force * 0.03 * pullDir;
              p.vy += (dy / dist) * force * 0.03 * pullDir;
            }
          }
        }
        
        // Update position
        p.x += p.vx;
        p.y += p.vy;
        
        if (this.mouse.active) {
          const centerX = this.canvas.width / 2;
          const centerY = this.canvas.height / 2;
          const targetShiftX = (this.mouse.x - centerX) * 0.05 * p.depth; // reduced shift modifier (0.05)
          const targetShiftY = (this.mouse.y - centerY) * 0.05 * p.depth;
          
          if (p.curShiftX === undefined) {
            p.curShiftX = 0;
            p.curShiftY = 0;
          }
          p.curShiftX += (targetShiftX - p.curShiftX) * 0.035; // slow shift transition
          p.curShiftY += (targetShiftY - p.curShiftY) * 0.035;
          
          p.drawX = p.x + p.curShiftX;
          p.drawY = p.y + p.curShiftY;
        } else {
          p.drawX = p.x;
          p.drawY = p.y;
        }
      });

      // 2. Draw Fading History Trails
      if (activeState && this.formationProgress > 0.1) {
        this.particles.forEach((p, idx) => {
          p.history.forEach((hist, hIdx) => {
            const histAlpha = (hIdx / p.history.length) * p.opacity * 0.25 * this.formationProgress;
            this.ctx.beginPath();
            this.ctx.arc(hist.x, hist.y, p.radius * 0.75, 0, Math.PI * 2);
            
            let drawColor = p.color;
            if (p.color === '#ffffff') {
              if (this.themeProgress > 0.01) {
                let rT, gT, bT;
                if (idx % 3 === 0) {
                  rT = 100; gT = 116; bT = 139; // soft grey-blue
                } else if (idx % 3 === 1) {
                  rT = 148; gT = 163; bT = 184; // muted silver
                } else {
                  rT = 71; gT = 85; bT = 105; // slate-grey
                }
                const rN = Math.round(255 + (rT - 255) * this.themeProgress);
                const gN = Math.round(255 + (gT - 255) * this.themeProgress);
                const bN = Math.round(255 + (bT - 255) * this.themeProgress);
                const opacityMult = 1.0 + (0.5 - 1.0) * this.themeProgress;
                drawColor = `rgba(${rN}, ${gN}, ${bN}, ${opacityMult})`;
              } else {
                drawColor = '#ffffff';
              }
            } else if (p.color === '#38bdf8') {
              let rT, gT, bT;
              if (idx % 2 === 0) {
                rT = 2; gT = 136; bT = 209;
              } else {
                rT = 123; gT = 31; bT = 162;
              }
              const rC = Math.round(56 + (rT - 56) * this.themeProgress);
              const gC = Math.round(189 + (gT - 189) * this.themeProgress);
              const bC = Math.round(248 + (bT - 248) * this.themeProgress);
              drawColor = `rgb(${rC}, ${gC}, ${bC})`;
            }
            
            this.ctx.fillStyle = drawColor;
            this.ctx.globalAlpha = Math.max(0, histAlpha);
            this.ctx.fill();
          });
        });
        this.ctx.globalAlpha = 1.0;
      }

      // 3. Draw Vector Connection Lines and Custom Cosmic Geometries
      if (activeState && this.formationProgress > 0.1) {
        const rL = Math.round(56 + (100 - 56) * this.themeProgress);
        const gL = Math.round(189 + (116 - 189) * this.themeProgress);
        const bL = Math.round(248 + (139 - 248) * this.themeProgress);
        const lineGlowColor = `${rL}, ${gL}, ${bL}`;
        
        const sortByAngle = (arr) => {
          return arr.slice().sort((a, b) => {
            const angleA = Math.atan2(a.drawY - this.shapeAnchor.y, a.drawX - this.shapeAnchor.x);
            const angleB = Math.atan2(b.drawY - this.shapeAnchor.y, b.drawX - this.shapeAnchor.x);
            return angleA - angleB;
          });
        };
        
        if (this.shapeType === 'system_profile' && this.particles.length >= 24) {
          // --- SOLAR SYSTEM ---
          // Sun core glow
          const sunGrad = this.ctx.createRadialGradient(
            this.shapeAnchor.x, this.shapeAnchor.y, 0,
            this.shapeAnchor.x, this.shapeAnchor.y, 0.22 * scale
          );
          sunGrad.addColorStop(0, `rgba(251, 191, 36, ${0.16 * this.formationProgress})`); // amber core
          sunGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.08 * this.formationProgress})`);
          sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          this.ctx.fillStyle = sunGrad;
          this.ctx.beginPath();
          this.ctx.arc(this.shapeAnchor.x, this.shapeAnchor.y, 0.22 * scale, 0, Math.PI * 2);
          this.ctx.fill();
          
          // Orbital paths
          const innerR = 0.3 * scale * (1.4 - 0.4 * this.formationProgress);
          const innerR_y = 0.22 * scale * (1.4 - 0.4 * this.formationProgress);
          const tilt1 = Math.PI / 18; // 10 deg
          
          const midR = 0.58 * scale * (1.4 - 0.4 * this.formationProgress);
          const midR_y = 0.42 * scale * (1.4 - 0.4 * this.formationProgress);
          const tilt2 = -Math.PI / 12; // -15 deg
          
          const outerR = 0.86 * scale * (1.4 - 0.4 * this.formationProgress);
          const outerR_y = 0.62 * scale * (1.4 - 0.4 * this.formationProgress);
          const tilt3 = Math.PI / 9; // 20 deg
          
          this.ctx.lineWidth = 0.6;
          
          const orbits = [
            { rx: innerR, ry: innerR_y, tilt: tilt1, alpha: 0.08 },
            { rx: midR, ry: midR_y, tilt: tilt2, alpha: 0.06 },
            { rx: outerR, ry: outerR_y, tilt: tilt3, alpha: 0.04 }
          ];
          
          orbits.forEach(orb => {
            this.ctx.strokeStyle = `rgba(${lineGlowColor}, ${orb.alpha * this.formationProgress})`;
            this.ctx.beginPath();
            this.ctx.ellipse(this.shapeAnchor.x, this.shapeAnchor.y, orb.rx, orb.ry, orb.tilt, 0, Math.PI * 2);
            this.ctx.stroke();
          });
          
          // Connect planet loops
          this.ctx.lineWidth = 0.5;
          this.ctx.strokeStyle = `rgba(${lineGlowColor}, ${0.07 * this.formationProgress})`;
          const loop1 = sortByAngle(this.particles.slice(4, 8));
          const loop2 = sortByAngle(this.particles.slice(8, 14));
          const loop3 = sortByAngle(this.particles.slice(14, 24));
          
          [loop1, loop2, loop3].forEach(loop => {
            if (loop.length > 1) {
              this.ctx.beginPath();
              this.ctx.moveTo(loop[0].drawX, loop[0].drawY);
              for (let i = 1; i < loop.length; i++) this.ctx.lineTo(loop[i].drawX, loop[i].drawY);
              this.ctx.closePath();
              this.ctx.stroke();
            }
          });
        } 
        else if (this.shapeType === 'academic_identity' && this.particles.length >= 24) {
          // --- 3D ROTATING DNA HELIX ---
          // Interpolate distinct strand colors (Strand 1: Ice Blue, Strand 2: Soft Lavender)
          const r1 = Math.round(56 + (100 - 56) * this.themeProgress);
          const g1 = Math.round(189 + (116 - 189) * this.themeProgress);
          const b1 = Math.round(248 + (139 - 248) * this.themeProgress);
          
          const r2 = Math.round(167 + (148 - 167) * this.themeProgress);
          const g2 = Math.round(139 + (163 - 139) * this.themeProgress);
          const b2 = Math.round(250 + (184 - 250) * this.themeProgress);
 
          const strand1 = this.particles.slice(0, 12).sort((a, b) => a.drawY - b.drawY);
          const strand2 = this.particles.slice(12, 24).sort((a, b) => a.drawY - b.drawY);
          
          this.ctx.lineWidth = 0.85;
          
          // Draw Strand 1 (Ice Blue)
          this.ctx.strokeStyle = `rgba(${r1}, ${g1}, ${b1}, ${0.14 * this.formationProgress})`;
          this.ctx.beginPath();
          this.ctx.moveTo(strand1[0].drawX, strand1[0].drawY);
          for (let i = 1; i < strand1.length; i++) {
            this.ctx.lineTo(strand1[i].drawX, strand1[i].drawY);
          }
          this.ctx.stroke();
          
          // Draw Strand 2 (Lavender)
          this.ctx.strokeStyle = `rgba(${r2}, ${g2}, ${b2}, ${0.14 * this.formationProgress})`;
          this.ctx.beginPath();
          this.ctx.moveTo(strand2[0].drawX, strand2[0].drawY);
          for (let i = 1; i < strand2.length; i++) {
            this.ctx.lineTo(strand2[i].drawX, strand2[i].drawY);
          }
          this.ctx.stroke();
          
          // Draw horizontal rungs connecting matching indexes along the height
          for (let i = 0; i < 12; i++) {
            const p1 = strand1[i];
            const p2 = strand2[i];
            
            const rungGrad = this.ctx.createLinearGradient(p1.drawX, p1.drawY, p2.drawX, p2.drawY);
            rungGrad.addColorStop(0, `rgba(${r1}, ${g1}, ${b1}, ${0.08 * this.formationProgress})`);
            rungGrad.addColorStop(1, `rgba(${r2}, ${g2}, ${b2}, ${0.08 * this.formationProgress})`);
            
            this.ctx.strokeStyle = rungGrad;
            this.ctx.lineWidth = 0.55;
            this.ctx.beginPath();
            this.ctx.moveTo(p1.drawX, p1.drawY);
            this.ctx.lineTo(p2.drawX, p2.drawY);
            this.ctx.stroke();
            
            // Glowing midpoint node
            const midX = (p1.drawX + p2.drawX) / 2;
            const midY = (p1.drawY + p2.drawY) / 2;
            const blendR = Math.round((r1 + r2) / 2);
            const blendG = Math.round((g1 + g2) / 2);
            const blendB = Math.round((b1 + b2) / 2);
            
            this.ctx.fillStyle = `rgba(${blendR}, ${blendG}, ${blendB}, ${0.18 * this.formationProgress})`;
            this.ctx.beginPath();
            this.ctx.arc(midX, midY, 1.4, 0, Math.PI * 2);
            this.ctx.fill();
          }
        } 
        else if (this.shapeType === 'gpa_progress' && this.particles.length >= 24) {
          // --- SPIRAL GALAXY ---
          // Galactic core glow
          const coreGrad = this.ctx.createRadialGradient(
            this.shapeAnchor.x, this.shapeAnchor.y, 0,
            this.shapeAnchor.x, this.shapeAnchor.y, 0.25 * scale
          );
          coreGrad.addColorStop(0, `rgba(251, 191, 36, ${0.18 * this.formationProgress})`); // warm amber core
          coreGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.08 * this.formationProgress})`);
          coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          this.ctx.fillStyle = coreGrad;
          this.ctx.beginPath();
          this.ctx.arc(this.shapeAnchor.x, this.shapeAnchor.y, 0.25 * scale, 0, Math.PI * 2);
          this.ctx.fill();
 
          // Draw rotating spiral arms
          this.ctx.lineWidth = 0.75;
          this.ctx.strokeStyle = `rgba(${lineGlowColor}, ${0.12 * this.formationProgress})`;
          
          const arm1 = this.particles.slice(6, 15);
          const arm2 = this.particles.slice(15, 24);
 
          [arm1, arm2].forEach(arm => {
            if (arm.length > 1) {
              this.ctx.beginPath();
              this.ctx.moveTo(arm[0].drawX, arm[0].drawY);
              for (let i = 1; i < arm.length; i++) this.ctx.lineTo(arm[i].drawX, arm[i].drawY);
              this.ctx.stroke();
            }
          });
        } 
        else if (this.shapeType === 'marks_graph' && this.particles.length >= 24) {
          // --- BOHR ATOM ---
          // Nucleus glow
          const nucGrad = this.ctx.createRadialGradient(
            this.shapeAnchor.x, this.shapeAnchor.y, 0,
            this.shapeAnchor.x, this.shapeAnchor.y, 0.16 * scale
          );
          nucGrad.addColorStop(0, `rgba(56, 189, 248, ${0.16 * this.formationProgress})`); // blue core
          nucGrad.addColorStop(0.6, `rgba(255, 255, 255, ${0.08 * this.formationProgress})`);
          nucGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          this.ctx.fillStyle = nucGrad;
          this.ctx.beginPath();
          this.ctx.arc(this.shapeAnchor.x, this.shapeAnchor.y, 0.16 * scale, 0, Math.PI * 2);
          this.ctx.fill();
          
          // Orbital shell guides
          this.ctx.lineWidth = 0.5;
          this.ctx.strokeStyle = `rgba(${lineGlowColor}, ${0.06 * this.formationProgress})`;
          
          // Orbit 1 (35 deg)
          this.ctx.beginPath();
          this.ctx.ellipse(this.shapeAnchor.x, this.shapeAnchor.y, 0.75 * scale, 0.25 * scale, Math.PI / 5.1, 0, Math.PI * 2);
          this.ctx.stroke();
 
          // Orbit 2 (-35 deg)
          this.ctx.beginPath();
          this.ctx.ellipse(this.shapeAnchor.x, this.shapeAnchor.y, 0.75 * scale, 0.25 * scale, -Math.PI / 5.1, 0, Math.PI * 2);
          this.ctx.stroke();
 
          // Orbit 3 (90 deg)
          this.ctx.beginPath();
          this.ctx.ellipse(this.shapeAnchor.x, this.shapeAnchor.y, 0.25 * scale, 0.75 * scale, Math.PI / 2.2, 0, Math.PI * 2);
          this.ctx.stroke();
          
          // Electron loop connections
          this.ctx.lineWidth = 0.65;
          this.ctx.strokeStyle = `rgba(${lineGlowColor}, ${0.10 * this.formationProgress})`;
          
          const orb1 = sortByAngle(this.particles.slice(6, 12));
          const orb2 = sortByAngle(this.particles.slice(12, 18));
          const orb3 = sortByAngle(this.particles.slice(18, 24));
          
          [orb1, orb2, orb3].forEach(loop => {
            if (loop.length > 1) {
              this.ctx.beginPath();
              this.ctx.moveTo(loop[0].drawX, loop[0].drawY);
              for (let i = 1; i < loop.length; i++) this.ctx.lineTo(loop[i].drawX, loop[i].drawY);
              this.ctx.closePath();
              this.ctx.stroke();
            }
          });
        }
      }
      
      // 4. Draw Particle Nodes
      this.particles.forEach((p, idx) => {
        this.ctx.beginPath();
        this.ctx.arc(p.drawX, p.drawY, p.radius, 0, Math.PI * 2);
        
        let drawColor = p.color;
        if (p.color === '#ffffff') {
          if (this.themeProgress > 0.01) {
            let rT, gT, bT;
            if (idx % 3 === 0) {
              rT = 100; gT = 116; bT = 139;
            } else if (idx % 3 === 1) {
              rT = 148; gT = 163; bT = 184;
            } else {
              rT = 71; gT = 85; bT = 105;
            }
            const rN = Math.round(255 + (rT - 255) * this.themeProgress);
            const gN = Math.round(255 + (gT - 255) * this.themeProgress);
            const bN = Math.round(255 + (bT - 255) * this.themeProgress);
            const opacityMult = 1.0 + (0.5 - 1.0) * this.themeProgress;
            drawColor = `rgba(${rN}, ${gN}, ${bN}, ${opacityMult})`;
          } else {
            drawColor = '#ffffff';
          }
        } else if (p.color === '#38bdf8') {
          let rT, gT, bT;
          if (idx % 2 === 0) {
            rT = 2; gT = 136; bT = 209;
          } else {
            rT = 123; gT = 31; bT = 162;
          }
          const rC = Math.round(56 + (rT - 56) * this.themeProgress);
          const gC = Math.round(189 + (gT - 189) * this.themeProgress);
          const bC = Math.round(248 + (bT - 248) * this.themeProgress);
          drawColor = `rgb(${rC}, ${gC}, ${bC})`;
        }
        this.ctx.fillStyle = drawColor;
        this.ctx.globalAlpha = Math.max(0, p.opacity);
        
        if (p.color === '#38bdf8') {
          this.ctx.shadowBlur = activeState ? 4 : 2.5;
          let sR = idx % 2 === 0 ? 56 : 167;
          let sG = idx % 2 === 0 ? 189 : 139;
          let sB = idx % 2 === 0 ? 248 : 250;
          const rS = Math.round(56 + (sR - 56) * this.themeProgress);
          const gS = Math.round(sG + (sG - sG) * this.themeProgress);
          const bS = Math.round(sB + (sB - sB) * this.themeProgress);
          this.ctx.shadowColor = `rgba(${rS}, ${gS}, ${bS}, ${0.85 + (0.4 - 0.85) * this.themeProgress})`;
        } else {
          this.ctx.shadowBlur = 0.8 * (1.0 - this.themeProgress);
          this.ctx.shadowColor = `rgba(255, 255, 255, ${1.0 - this.themeProgress})`;
        }
        this.ctx.fill();
      });
      
      this.ctx.shadowBlur = 0;
      this.ctx.globalAlpha = 1.0;
    }
    
    requestAnimationFrame(() => this.tick());
  }
}

// Make globally available
window.BackgroundEngine = BackgroundEngine;
window.CardParticleSystem = CardParticleSystem;
