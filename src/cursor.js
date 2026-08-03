// M.OS Advanced Interaction & 3D Tilt Parallax Engine
// Drives smooth card tilt shifts, depth-layer translations, and velocity-responsive edge glows.

class CursorEngine {
  constructor() {
    this.mouseVelocity = 0;
    this.lastMousePos = { x: 0, y: 0 };
    this.lastTime = performance.now();
    
    this.init();
  }

  init() {
    this.setupTiltCards();
    this.setupMouseVelocityTracker();
    this.setupGlobalGlowTracker();
  }

  setupMouseVelocityTracker() {
    window.addEventListener('mousemove', (e) => {
      const now = performance.now();
      const dt = now - this.lastTime;
      
      if (dt > 0) {
        const dx = e.clientX - this.lastMousePos.x;
        const dy = e.clientY - this.lastMousePos.y;
        const dist = Math.hypot(dx, dy);
        
        // Calculate velocity (pixels per ms)
        const vel = dist / dt;
        
        // Smooth velocity interpolation
        this.mouseVelocity += (vel - this.mouseVelocity) * 0.1;
        
        this.lastMousePos.x = e.clientX;
        this.lastMousePos.y = e.clientY;
        this.lastTime = now;
      }
    });
  }

  setupGlobalGlowTracker() {
    // Add coordinate-tracking for glows to all interactive tiles & buttons
    const glowElements = document.querySelectorAll('.quick-tile, .glow-btn, .nav-btn, .sem-sub-tab');
    
    glowElements.forEach((el) => {
      let rect = el.getBoundingClientRect();
      
      window.addEventListener('resize', () => {
        rect = el.getBoundingClientRect();
      });
      
      el.addEventListener('mousemove', (e) => {
        if (rect.width === 0 || rect.height === 0) {
          rect = el.getBoundingClientRect();
        }
        if (rect.width === 0 || rect.height === 0) return;
        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        el.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
        el.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
      });
    });
  }

  setupTiltCards() {
    // Release CSS animation transform lock once emergeCard animation completes
    document.addEventListener('animationend', (e) => {
      if (e.animationName === 'emergeCard' && e.target.classList.contains('glass-card')) {
        e.target.style.animation = 'breathGlow 8s infinite ease-in-out';
      }
    });

    // Target only panels (cards) and quick-access tiles to keep navigation tabs stable
    const cards = document.querySelectorAll('.glass-card, .quick-tile');
    
    cards.forEach((card) => {
      let rect = card.getBoundingClientRect();
      let rotateX = 0;
      let rotateY = 0;
      let curRotateX = 0;
      let curRotateY = 0;
      
      // 3D Parallax offsets
      let targetParallaxX = 0;
      let targetParallaxY = 0;
      let curParallaxX = 0;
      let curParallaxY = 0;
      
      let isHovered = false;
      
      // Determine max tilt based on element size (smaller elements tilt less to stay subtle)
      const isSmall = card.classList.contains('quick-tile');
      const maxTilt = isSmall ? 0.8 : 1.5; 
      
      // Seed unique timing variable to stagger floating motions
      let floatOffset = 0;
      let floatTime = Math.random() * 100;

      window.addEventListener('resize', () => {
        rect = card.getBoundingClientRect();
      });

      window.addEventListener('scroll', () => {
        if (isHovered) {
          rect = card.getBoundingClientRect();
        }
      }, { passive: true });

      card.addEventListener('mousemove', (e) => {
        isHovered = true;
        
        if (rect.width === 0 || rect.height === 0) {
          rect = card.getBoundingClientRect();
        }
        if (rect.width === 0 || rect.height === 0) return;
        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const pctX = (x / rect.width) - 0.5;
        const pctY = (y / rect.height) - 0.5;
        
        // Tilt towards cursor: surface rotates to face the cursor (disabled on grid panels to prevent Chrome 3D backdrop-filter seam glitches)
        const isGlitchProne = card.classList.contains('academic-matrix-panel') || 
                              card.classList.contains('sem-calendar-panel') || 
                              card.classList.contains('focus-daily-panel') || 
                              card.classList.contains('focus-active-panel') ||
                              card.classList.contains('fv2-daily-card') ||
                              card.classList.contains('fv2-progress-card') ||
                              card.classList.contains('fv2-library-card');
        rotateX = isGlitchProne ? 0 : pctY * maxTilt;
        rotateY = isGlitchProne ? 0 : -pctX * maxTilt;
        
        // Parallax offset: shift inner layers towards/away from mouse
        const maxParallax = isSmall ? 2 : 4;
        targetParallaxX = pctX * maxParallax;
        targetParallaxY = pctY * maxParallax;
        
        card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
        
        // Dynamically scale glow overlay opacity based on mouse velocity
        const baseIntensity = isSmall ? 0.35 : 0.65;
        const speedMultiplier = Math.min(0.2, this.mouseVelocity * 0.05);
        const dynamicOpacity = baseIntensity + speedMultiplier;
        
        card.style.setProperty('--glow-opacity', `${dynamicOpacity.toFixed(2)}`);
      });

      card.addEventListener('mouseenter', () => {
        rect = card.getBoundingClientRect();
        card.style.transition = 'border-color 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
      });

      card.addEventListener('mouseleave', () => {
        isHovered = false;
        rotateX = 0;
        rotateY = 0;
        targetParallaxX = 0;
        targetParallaxY = 0;
        card.style.transition = 'border-color 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        card.style.setProperty('--glow-opacity', '0');
      });

      // Smooth interpolation loop for card tilt & float & scroll reveal integration
      const animateTilt = () => {
        // Skip calculations and layout modifications if parent section is inactive (hidden)
        const parentSection = card.closest('.dashboard-section');
        if (parentSection && !parentSection.classList.contains('active')) {
          requestAnimationFrame(animateTilt);
          return;
        }

        const isGlitchProne = card.classList.contains('academic-matrix-panel') || 
                              card.classList.contains('sem-calendar-panel') || 
                              card.classList.contains('focus-daily-panel') || 
                              card.classList.contains('focus-active-panel') ||
                              card.classList.contains('fv2-daily-card') ||
                              card.classList.contains('fv2-progress-card') ||
                              card.classList.contains('fv2-library-card');

        if (isGlitchProne) {
          card.style.transform = '';
          requestAnimationFrame(animateTilt);
          return;
        }

        floatTime += 0.01; // slow increment for float timing
        
        if (isHovered) {
          curRotateX += (rotateX - curRotateX) * 0.045; // smooth cinematic easing
          curRotateY += (rotateY - curRotateY) * 0.045;
          curParallaxX += (targetParallaxX - curParallaxX) * 0.045;
          curParallaxY += (targetParallaxY - curParallaxY) * 0.045;
          floatOffset += (0 - floatOffset) * 0.045; // slide float back to 0 on hover
        } else {
          curRotateX += (0 - curRotateX) * 0.035; // smooth return to normal
          curRotateY += (0 - curRotateY) * 0.035;
          curParallaxX += (0 - curParallaxX) * 0.035;
          curParallaxY += (0 - curParallaxY) * 0.035;
          // Subtler float wave offset for premium look
          const floatRange = isSmall ? 0.3 : 0.6;
          floatOffset += (Math.sin(floatTime) * floatRange - floatOffset) * 0.03;
        }
        
        // Retrieve scroll-reveal parameters set dynamically by the Scroll System
        const scrollY = parseFloat(card.getAttribute('data-scroll-y') || '0');
        const scrollScale = parseFloat(card.getAttribute('data-scroll-scale') || '1');
        
        // Expose current smoothed parallax offsets to CSS variables
        card.style.setProperty('--parallax-x', `${curParallaxX.toFixed(2)}px`);
        card.style.setProperty('--parallax-y', `${curParallaxY.toFixed(2)}px`);
        
        // Combine 3D rotation, float wave offset, and scroll emerging offset
        const finalY = floatOffset + scrollY;
        card.style.transform = `perspective(800px) translateY(${finalY.toFixed(2)}px) scale(${scrollScale.toFixed(3)}) rotateX(${curRotateX.toFixed(2)}deg) rotateY(${curRotateY.toFixed(2)}deg) translateZ(15px)`;
        requestAnimationFrame(animateTilt);
      };

      animateTilt();
    });
  }

}

// Make globally available
window.CursorEngine = CursorEngine;
