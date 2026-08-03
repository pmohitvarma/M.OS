// Academic Section Logic: GPA Table and Predictor
// Persistent storage and updates for academic grades.

class GpaGraph {
  constructor(engine) {
    this.engine = engine;
    this.canvas = document.getElementById('gpa-graph-canvas');
    this.tooltip = document.getElementById('gpa-graph-tooltip');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');

    // Values and target values for smooth transitions
    this.points = []; // Array of {sem: number, isFilled: boolean, currentGpa: number, targetGpa: number}
    this.filledSemestersCount = 0;

    // Animation control
    this.revealProgress = 0; // Goes from 0 to 1 on initial load
    this.isRevealed = false;
    this.animating = false;

    // Hover tracking
    this.mouse = { x: -1000, y: -1000, hoverIdx: -1 };

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Mouse listener
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      this.mouse.x = clientX * (this.canvas.width / rect.width);
      this.mouse.y = clientY * (this.canvas.height / rect.height);
      this.checkHover(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.x = -1000;
      this.mouse.y = -1000;
      this.mouse.hoverIdx = -1;
      if (this.tooltip) this.tooltip.style.opacity = '0';
      this.render();
    });

    // Load initial values
    this.updateData(true);

    // Listen for tab navigation changes to play the cinematic emerge sequence
    window.addEventListener('tab-changed', (e) => {
      if (e.detail.target === 'academic') {
        this.updateData(true);
      }
    });
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';

    this.render();
  }

  updateData(isInitial = false) {
    const savedGpasRaw = localStorage.getItem('mymo_gpas');
    let gpas = {};
    if (savedGpasRaw) {
      try {
        gpas = JSON.parse(savedGpasRaw);
      } catch (e) {
        console.error(e);
      }
    }

    let updatedPoints = [];
    let filledCount = 0;
    for (let i = 1; i <= 8; i++) {
      const valStr = gpas[i.toString()];
      const gpaVal = valStr && valStr.trim() !== '' ? parseFloat(valStr) : null;

      let targetGpa = 0;
      let isFilled = false;
      if (gpaVal !== null && !isNaN(gpaVal)) {
        targetGpa = gpaVal;
        isFilled = true;
        filledCount++;
      }

      let existingPoint = this.points[i - 1];
      let currentGpa = 0;
      if (existingPoint) {
        currentGpa = isInitial ? 0 : existingPoint.currentGpa;
      }

      updatedPoints.push({
        sem: i,
        isFilled: isFilled,
        currentGpa: currentGpa,
        targetGpa: targetGpa
      });
    }

    this.points = updatedPoints;
    this.filledSemestersCount = filledCount;

    if (isInitial) {
      this.revealProgress = 0;
      this.isRevealed = false;
      this.animateEmerge();
    } else {
      this.startTransition();
    }
  }

  getBezierPoint(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
  }

  animateEmerge() {
    if (this.animating) return;
    this.animating = true;

    this.xAxisProgress = 0;
    this.yAxisProgress = 0;
    this.labelsProgress = 0;
    this.lineProgress = 0;
    this.phase = 1; // 1: X-axis, 2: Y-axis, 3: Labels, 4: Line & Points, 5: Complete

    const startTime = performance.now();
    const xAxisDuration = 400;
    const yAxisDuration = 400;
    const labelsDuration = 400;
    const segmentDuration = 300; // ms per point segment

    // Number of active GPA semesters
    const activeCount = this.points.filter(p => p.isFilled).length;

    // Reset current GPAs for final calculation alignment
    this.points.forEach(p => {
      p.currentGpa = p.isFilled ? p.targetGpa : 0;
    });

    const tick = (now) => {
      const elapsed = now - startTime;

      if (elapsed < xAxisDuration) {
        // Phase 1: Draw X-axis
        this.phase = 1;
        const p = elapsed / xAxisDuration;
        this.xAxisProgress = p * p * (3 - 2 * p); // smoothstep
        this.yAxisProgress = 0;
        this.labelsProgress = 0;
        this.lineProgress = 0;
      } 
      else if (elapsed < xAxisDuration + yAxisDuration) {
        // Phase 2: Draw Y-axis
        this.phase = 2;
        this.xAxisProgress = 1.0;
        const p = (elapsed - xAxisDuration) / yAxisDuration;
        this.yAxisProgress = p * p * (3 - 2 * p);
        this.labelsProgress = 0;
        this.lineProgress = 0;
      } 
      else if (elapsed < xAxisDuration + yAxisDuration + labelsDuration) {
        // Phase 3: Fade in grid lines & labels
        this.phase = 3;
        this.xAxisProgress = 1.0;
        this.yAxisProgress = 1.0;
        const p = (elapsed - xAxisDuration - yAxisDuration) / labelsDuration;
        this.labelsProgress = p; // linear fade
        this.lineProgress = 0;
      } 
      else {
        // Phase 4: Draw points & lines semester-by-semester
        this.phase = 4;
        this.xAxisProgress = 1.0;
        this.yAxisProgress = 1.0;
        this.labelsProgress = 1.0;

        const lineElapsed = elapsed - xAxisDuration - yAxisDuration - labelsDuration;
        const totalLineDuration = segmentDuration * activeCount;

        if (lineElapsed < totalLineDuration) {
          this.lineProgress = lineElapsed / segmentDuration;
        } else {
          this.phase = 5;
          this.lineProgress = activeCount;
        }
      }

      this.render();

      if (this.phase < 5) {
        requestAnimationFrame(tick);
      } else {
        this.xAxisProgress = 1.0;
        this.yAxisProgress = 1.0;
        this.labelsProgress = 1.0;
        this.lineProgress = activeCount;
        this.animating = false;
        this.isRevealed = true;
        this.render();
      }
    };

    requestAnimationFrame(tick);
  }

  startTransition() {
    if (this.animating) return;
    this.animating = true;

    const duration = 600;
    const startTime = performance.now();

    this.points.forEach(p => {
      p.startGpa = p.currentGpa;
    });

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2; // easeInOutQuad

      this.points.forEach(p => {
        const start = p.startGpa || 0;
        const target = p.isFilled ? p.targetGpa : 0;
        p.currentGpa = start + (target - start) * ease;
      });

      this.render();

      if (progress < 1.0) {
        requestAnimationFrame(tick);
      } else {
        this.points.forEach(p => {
          if (p.isFilled) {
            p.currentGpa = p.targetGpa;
          } else {
            p.currentGpa = 0;
          }
        });
        this.animating = false;
        this.render();
      }
    };
    requestAnimationFrame(tick);
  }

  checkHover(clientX, clientY) {
    if (this.animating || this.points.length === 0 || this.filledSemestersCount === 0) return;

    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    const paddingLeft = 50;
    const paddingRight = 30;
    const paddingTop = 40;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    let hoverIdx = -1;
    let minDistance = 25;

    this.points.forEach((p, idx) => {
      if (!p.isFilled) return;

      const x = paddingLeft + (idx / 7) * chartWidth;
      const y = paddingTop + chartHeight - (p.currentGpa / 10) * chartHeight;

      const mouseX = this.mouse.x / (window.devicePixelRatio || 1);
      const mouseY = this.mouse.y / (window.devicePixelRatio || 1);

      const dist = Math.hypot(mouseX - x, mouseY - y);
      if (dist < minDistance) {
        minDistance = dist;
        hoverIdx = idx;
      }
    });

    if (hoverIdx !== this.mouse.hoverIdx) {
      this.mouse.hoverIdx = hoverIdx;
      this.render();

      if (hoverIdx !== -1 && this.tooltip) {
        const p = this.points[hoverIdx];
        this.tooltip.innerHTML = `
          <span class="tooltip-sem">Semester ${p.sem}</span>
          <span class="tooltip-val">${p.targetGpa.toFixed(2)} GPA</span>
        `;

        const rect = this.canvas.getBoundingClientRect();
        const x = paddingLeft + (hoverIdx / 7) * chartWidth;
        const y = paddingTop + chartHeight - (p.currentGpa / 10) * chartHeight;

        this.tooltip.style.left = `${rect.left + window.scrollX + x}px`;
        this.tooltip.style.top = `${rect.top + window.scrollY + y}px`;
        this.tooltip.style.opacity = '1';
      } else if (this.tooltip) {
        this.tooltip.style.opacity = '0';
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, width, height);

    const paddingLeft = 50;
    const paddingRight = 30;
    const paddingTop = 40;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Define progress variables based on our phase
    const xAxisProgress = this.animating ? this.xAxisProgress : 1.0;
    const yAxisProgress = this.animating ? this.yAxisProgress : 1.0;
    const labelsProgress = this.animating ? this.labelsProgress : 1.0;

    const isWhiteTheme = document.body.classList.contains('white-theme');

    // 1. Draw horizontal grid lines dynamically
    ctx.strokeStyle = isWhiteTheme 
      ? `rgba(0, 0, 0, ${0.05 * labelsProgress})` 
      : `rgba(255, 255, 255, ${0.03 * labelsProgress})`;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const gpaVal = i * 2;
      const y = paddingTop + chartHeight - (gpaVal / 10) * chartHeight;

      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + chartWidth, y);
      ctx.stroke();

      // Axis label values (GPA)
      if (labelsProgress > 0) {
        ctx.fillStyle = isWhiteTheme 
          ? `rgba(84, 96, 122, ${0.75 * labelsProgress})` 
          : `rgba(255, 255, 255, ${0.25 * labelsProgress})`;
        ctx.font = '500 0.72rem var(--font-family-sans)';
        ctx.textAlign = 'right';
        const slideOffset = (1 - labelsProgress) * -4;
        ctx.fillText(gpaVal.toString(), paddingLeft - 15, y + 4 + slideOffset);
      }
    }

    // 2. Draw Solid X-Axis Line (Draws from left to right)
    if (xAxisProgress > 0) {
      ctx.strokeStyle = isWhiteTheme ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, height - paddingBottom);
      ctx.lineTo(paddingLeft + chartWidth * xAxisProgress, height - paddingBottom);
      ctx.stroke();
    }

    // 3. Draw Solid Y-Axis Line (Draws from bottom to top)
    if (yAxisProgress > 0) {
      ctx.strokeStyle = isWhiteTheme ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, height - paddingBottom);
      ctx.lineTo(paddingLeft, (height - paddingBottom) - chartHeight * yAxisProgress);
      ctx.stroke();
    }

    // X-Axis Labels (Semester indices)
    if (labelsProgress > 0) {
      for (let i = 0; i < 8; i++) {
        const x = paddingLeft + (i / 7) * chartWidth;
        ctx.fillStyle = isWhiteTheme 
          ? `rgba(84, 96, 122, ${0.75 * labelsProgress})` 
          : `rgba(255, 255, 255, ${0.25 * labelsProgress})`;
        ctx.font = '500 0.72rem var(--font-family-sans)';
        ctx.textAlign = 'center';
        const slideOffset = (1 - labelsProgress) * 4;
        ctx.fillText(`S${i + 1}`, x, height - paddingBottom + 20 + slideOffset);
      }
    }

    if (this.filledSemestersCount === 0) {
      ctx.fillStyle = isWhiteTheme ? '#5a6072' : 'rgba(255, 255, 255, 0.35)';
      ctx.font = '400 0.85rem var(--font-family-sans)';
      ctx.textAlign = 'center';
      ctx.fillText('No semester GPA data entered yet.', width / 2, height / 2);
      return;
    }

    const activePoints = [];
    this.points.forEach((p, idx) => {
      if (p.isFilled) {
        const x = paddingLeft + (idx / 7) * chartWidth;
        // In progressive mode, use the targetGpa. In updates mode, use the currentGpa.
        const gpaToDraw = this.animating && this.phase === 4 ? p.targetGpa : p.currentGpa;
        const y = paddingTop + chartHeight - (gpaToDraw / 10) * chartHeight;
        activePoints.push({ x, y, val: gpaToDraw, idx });
      }
    });

    if (activePoints.length > 0) {
      const progressLimit = this.animating && this.phase < 4 ? 0 : (this.animating ? this.lineProgress : activePoints.length);

      // elastic bounce easing function for dots
      const easeBackOut = (x) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
      };

      // 1. Draw Area Fill Under the Graph line
      if (progressLimit > 0) {
        const areaGradi = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartHeight);
        areaGradi.addColorStop(0, isWhiteTheme ? 'rgba(2, 136, 209, 0.14)' : 'rgba(56, 189, 248, 0.12)');
        areaGradi.addColorStop(1, isWhiteTheme ? 'rgba(123, 31, 162, 0.0)' : 'rgba(167, 139, 250, 0.0)');

        ctx.beginPath();
        ctx.moveTo(activePoints[0].x, paddingTop + chartHeight);

        if (activePoints.length === 1) {
          ctx.lineTo(activePoints[0].x, activePoints[0].y);
          ctx.lineTo(activePoints[0].x, paddingTop + chartHeight);
        } else {
          ctx.lineTo(activePoints[0].x, activePoints[0].y);

          const segmentCount = activePoints.length - 1;
          for (let i = 0; i < segmentCount; i++) {
            const p0 = activePoints[i];
            const p1 = activePoints[i + 1];
            const cpX = (p0.x + p1.x) / 2;

            if (progressLimit <= i + 1) {
              const segmentProgress = Math.max(0, progressLimit - i);
              if (segmentProgress > 0) {
                const steps = 25;
                for (let j = 1; j <= steps; j++) {
                  const t = (j / steps) * segmentProgress;
                  const x = this.getBezierPoint(p0.x, cpX, cpX, p1.x, t);
                  const y = this.getBezierPoint(p0.y, p0.y, p1.y, p1.y, t);
                  ctx.lineTo(x, y);
                }
              }
              break;
            } else {
              ctx.bezierCurveTo(cpX, p0.y, cpX, p1.y, p1.x, p1.y);
            }
          }

          // Close progressive shape to bottom axis
          const lastIndex = Math.min(activePoints.length - 1, Math.ceil(progressLimit) - 1);
          if (lastIndex >= 0) {
            let lastX = activePoints[lastIndex].x;
            if (progressLimit < activePoints.length && lastIndex > 0) {
              const prevPt = activePoints[lastIndex - 1];
              const nextPt = activePoints[lastIndex];
              const segmentProgress = progressLimit - lastIndex;
              const cpX = (prevPt.x + nextPt.x) / 2;
              lastX = this.getBezierPoint(prevPt.x, cpX, cpX, nextPt.x, segmentProgress);
            }
            ctx.lineTo(lastX, paddingTop + chartHeight);
          }
        }
        ctx.fillStyle = areaGradi;
        ctx.fill();
      }

      // 2. Draw Progressive Bezier Line Connection
      if (progressLimit > 0) {
        const lineGradi = ctx.createLinearGradient(paddingLeft, 0, width - paddingRight, 0);
        lineGradi.addColorStop(0, isWhiteTheme ? '#0288d1' : '#38bdf8');
        lineGradi.addColorStop(1, isWhiteTheme ? '#7b1fa2' : '#a78bfa');

        ctx.strokeStyle = lineGradi;
        ctx.lineWidth = 3.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = isWhiteTheme ? 'rgba(2, 136, 209, 0.3)' : 'rgba(56, 189, 248, 0.45)';

        const segmentCount = activePoints.length - 1;
        if (activePoints.length === 1) {
          ctx.beginPath();
          ctx.arc(activePoints[0].x, activePoints[0].y, 1.5, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          for (let i = 0; i < segmentCount; i++) {
            const p0 = activePoints[i];
            const p1 = activePoints[i + 1];
            const cpX = (p0.x + p1.x) / 2;

            if (progressLimit <= i + 1) {
              const segmentProgress = Math.max(0, progressLimit - i);
              if (segmentProgress > 0) {
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                const steps = 30;
                for (let j = 1; j <= steps; j++) {
                  const t = (j / steps) * segmentProgress;
                  const x = this.getBezierPoint(p0.x, cpX, cpX, p1.x, t);
                  const y = this.getBezierPoint(p0.y, p0.y, p1.y, p1.y, t);
                  ctx.lineTo(x, y);
                }
                ctx.stroke();
              }
              break;
            } else {
              ctx.beginPath();
              ctx.moveTo(p0.x, p0.y);
              ctx.bezierCurveTo(cpX, p0.y, cpX, p1.y, p1.x, p1.y);
              ctx.stroke();
            }
          }
        }
        ctx.shadowBlur = 0;
      }

      // 3. Draw Hover guidelines
      if (!this.animating && this.mouse.hoverIdx !== -1) {
        const hoverPt = activePoints.find(p => p.idx === this.mouse.hoverIdx);
        if (hoverPt) {
          ctx.strokeStyle = isWhiteTheme ? 'rgba(2, 136, 209, 0.45)' : 'rgba(56, 189, 248, 0.35)';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(hoverPt.x, hoverPt.y);
          ctx.lineTo(hoverPt.x, paddingTop + chartHeight);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // 4. Draw Dots progressively (spring/bounce appearance)
      if (progressLimit > 0) {
        activePoints.forEach((pt, idx) => {
          if (progressLimit < idx + 1) {
            const pointProgress = progressLimit - idx;
            if (pointProgress > 0) {
              // Bounce in point dot
              const bounceT = Math.min(Math.max(pointProgress, 0), 1);
              const bloomScale = bounceT === 1 ? 1 : easeBackOut(bounceT);
              this.drawPointDot(ctx, pt, bloomScale);
            }
          } else {
            // Fully completed point
            this.drawPointDot(ctx, pt, 1.0);
          }
        });
      }
    }
  }

  drawPointDot(ctx, pt, scale) {
    const isHovered = pt.idx === this.mouse.hoverIdx;
    const isWhiteTheme = document.body.classList.contains('white-theme');

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, (isHovered ? 8 : 5.5) * scale, 0, Math.PI * 2);
    ctx.fillStyle = isHovered 
      ? (isWhiteTheme ? 'rgba(2, 136, 209, 0.25)' : 'rgba(56, 189, 248, 0.25)') 
      : (isWhiteTheme ? 'rgba(123, 31, 162, 0.25)' : 'rgba(167, 139, 250, 0.35)');
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, (isHovered ? 4.5 : 3.2) * scale, 0, Math.PI * 2);
    ctx.fillStyle = isWhiteTheme ? '#0288d1' : '#38bdf8';
    ctx.shadowBlur = isHovered ? 12 : 5;
    ctx.shadowColor = isWhiteTheme ? 'rgba(2, 136, 209, 0.4)' : '#38bdf8';
    ctx.fill();
    ctx.shadowBlur = 0;
  }

}

class AcademicEngine {
  constructor() {
    this.editBtn = document.getElementById('edit-academic-btn');
    this.gpaInputs = document.querySelectorAll('.gpa-input');
    this.sgpaVal = document.getElementById('sgpa-value');

    this.isEditing = false;
    this.storageKeyGpas = 'mymo_gpas';

    this.init();

    // Initialize custom GPA Graph
    this.graph = new GpaGraph(this);

    // Boot Predictor Engine internally to keep Academic section complete
    this.predictor = new PredictorEngine();
  }

  init() {
    this.loadData();
    this.recalculateSgpa(false);

    if (this.editBtn) {
      this.editBtn.addEventListener('click', () => this.toggleEditMode());
    }

    this.gpaInputs.forEach((input) => {
      input.addEventListener('input', () => this.handleGpaInput(input));
      input.addEventListener('blur', () => this.validateAndFormatGpa(input));
    });
  }

  toggleEditMode() {
    this.isEditing = !this.isEditing;
    const btnText = this.editBtn.querySelector('.btn-text');

    if (this.isEditing) {
      // Enter Edit Mode
      document.body.classList.add('edit-academic-active');
      if (btnText) btnText.textContent = 'Save Table';

      this.gpaInputs.forEach(input => input.readOnly = false);
      const firstInput = this.gpaInputs[0];
      if (firstInput) firstInput.focus();
    } else {
      // Exit Edit Mode and Validate
      let hasError = false;
      this.gpaInputs.forEach(input => {
        this.validateAndFormatGpa(input);
        if (input.classList.contains('invalid-val')) {
          hasError = true;
        }
      });

      if (hasError) {
        // Shaking effect
        this.editBtn.style.animation = 'shake 0.4s ease-in-out';
        setTimeout(() => this.editBtn.style.animation = '', 400);
        this.isEditing = true; // Stay in editing
        return;
      }

      document.body.classList.remove('edit-academic-active');
      if (btnText) btnText.textContent = 'Edit GPA';

      this.gpaInputs.forEach(input => input.readOnly = true);
      this.saveGpas();

      // Update graph values live
      if (this.graph) {
        this.graph.updateData();
      }

      // Dispatch custom event to notify details/timeline updates
      window.dispatchEvent(new CustomEvent('academic-gpa-updated'));
    }
  }

  handleGpaInput(input) {
    const val = parseFloat(input.value);
    if (input.value !== '' && (isNaN(val) || val < 0 || val > 10)) {
      input.classList.add('invalid-val');
    } else {
      input.classList.remove('invalid-val');
    }
    this.recalculateSgpa(true);
  }

  validateAndFormatGpa(input) {
    if (input.value === '') {
      input.classList.remove('invalid-val');
      this.recalculateSgpa(true);
      return;
    }

    let val = parseFloat(input.value);
    if (isNaN(val)) {
      input.value = '';
      input.classList.remove('invalid-val');
    } else if (val < 0) {
      input.value = '0.00';
      input.classList.remove('invalid-val');
    } else if (val > 10) {
      input.value = '10.00';
      input.classList.remove('invalid-val');
    } else {
      input.value = val.toFixed(2);
      input.classList.remove('invalid-val');
    }
    this.recalculateSgpa(true);
  }

  recalculateSgpa(triggerFlash = false) {
    let sum = 0;
    let count = 0;

    this.gpaInputs.forEach((input) => {
      const val = parseFloat(input.value);
      if (input.value !== '' && !isNaN(val) && !input.classList.contains('invalid-val')) {
        sum += val;
        count++;
      }
    });

    if (count > 0) {
      const average = (sum / count).toFixed(2);
      const prevVal = this.sgpaVal.textContent;
      this.sgpaVal.textContent = average;

      if (triggerFlash && prevVal !== average) {
        this.sgpaVal.parentElement.classList.add('sgpa-recalculating');
        setTimeout(() => this.sgpaVal.parentElement.classList.remove('sgpa-recalculating'), 400);
      }
    } else {
      this.sgpaVal.textContent = '—';
    }
  }

  saveGpas() {
    const gpas = {};
    this.gpaInputs.forEach((input) => {
      const sem = input.getAttribute('data-sem');
      gpas[sem] = input.value;
    });
    localStorage.setItem(this.storageKeyGpas, JSON.stringify(gpas));
  }

  loadData() {
    const savedGpasRaw = localStorage.getItem(this.storageKeyGpas);
    if (savedGpasRaw) {
      try {
        const gpas = JSON.parse(savedGpasRaw);
        this.gpaInputs.forEach((input) => {
          const sem = input.getAttribute('data-sem');
          if (gpas[sem] !== undefined) {
            input.value = gpas[sem];
          }
        });
      } catch (e) {
        console.error('Error loading GPAs', e);
      }
    }
  }
}

/// GPA + SGPA Predictor Engine
class PredictorEngine {
  constructor() {
    this.editBtn = document.getElementById('edit-predictor-btn');
    this.predictedSgpaVal = document.getElementById('predicted-sgpa-val');
    this.predictedCgpaVal = document.getElementById('predicted-cgpa-val');
    this.tableBody = document.getElementById('prediction-table-body');

    // Count adjusters
    this.countVal = document.getElementById('subjects-count-val');
    this.btnDecrease = document.getElementById('btn-decrease-subj');
    this.btnIncrease = document.getElementById('btn-increase-subj');

    // Toggle
    this.predictToggle = document.getElementById('sem-predict-mode-toggle');
    this.predictorCard = document.getElementById('academic-predictor-card');

    this.isEditing = false;
    this.predictModeActive = false;
    this.subjectCount = 6;
    this.subjectsData = [];

    this.storageKeySemCount = 'mymo_sem_count';
    this.storageKeySemData = 'mymo_sem_data';
    this.storageKeyPredictMode = 'mymo_sem_predict_active';

    this.gradePoints = {
      'A+': 10,
      'A': 9,
      'B': 8,
      'C': 7,
      'D': 6,
      'E': 5,
      'F': 0
    };

    this.init();
  }

  init() {
    this.loadData();
    this.renderRows();
    this.updatePredictModeUI();
    this.calculatePrediction(false);

    if (this.editBtn) {
      this.editBtn.addEventListener('click', () => this.toggleEditMode());
    }

    if (this.btnDecrease) {
      this.btnDecrease.addEventListener('click', () => this.adjustSubjectCount(-1));
    }
    if (this.btnIncrease) {
      this.btnIncrease.addEventListener('click', () => this.adjustSubjectCount(1));
    }

    if (this.predictToggle) {
      this.predictToggle.addEventListener('change', () => {
        this.predictModeActive = this.predictToggle.checked;
        this.updatePredictModeUI();
        this.calculatePrediction(true);
        this.saveData();
      });
    }

    // Listen to GPA updates for live recalculation of CGPA
    window.addEventListener('academic-gpa-updated', () => {
      this.calculatePrediction(true);
    });
  }

  renderRows() {
    if (!this.tableBody) return;
    this.tableBody.innerHTML = '';

    for (let i = 0; i < this.subjectCount; i++) {
      if (!this.subjectsData[i]) {
        this.subjectsData[i] = { subject: '', credits: '', grade: '' };
      }

      const data = this.subjectsData[i];
      const row = document.createElement('tr');
      row.className = 'prediction-row';

      // Subject Name
      const subjTd = document.createElement('td');
      subjTd.className = 'subj-cell';
      const subjInput = document.createElement('input');
      subjInput.type = 'text';
      subjInput.className = 'sem-subject';
      subjInput.placeholder = `Subject ${i + 1}`;
      subjInput.value = data.subject;
      subjInput.readOnly = !this.isEditing;
      subjInput.addEventListener('input', (e) => {
        this.subjectsData[i].subject = e.target.value;
      });
      subjTd.appendChild(subjInput);

      // Credits
      const creditsTd = document.createElement('td');
      creditsTd.className = 'credits-cell';
      const creditsInput = document.createElement('input');
      creditsInput.type = 'number';
      creditsInput.className = 'sem-credits';
      creditsInput.placeholder = '—';
      creditsInput.min = '1';
      creditsInput.max = '12';
      creditsInput.value = data.credits;
      creditsInput.readOnly = !this.isEditing;
      creditsInput.addEventListener('input', (e) => {
        this.handleCreditsInput(creditsInput, i);
      });
      creditsTd.appendChild(creditsInput);

      // Grade Selection
      const gradeTd = document.createElement('td');
      gradeTd.className = 'grade-cell';
      const selectWrapper = document.createElement('div');
      selectWrapper.className = 'select-wrapper';
      const select = document.createElement('select');
      select.className = 'sem-grade';
      select.disabled = !this.predictModeActive;

      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = '—';
      emptyOpt.selected = (data.grade === '');
      select.appendChild(emptyOpt);

      Object.keys(this.gradePoints).forEach((g) => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = `${g} (${this.gradePoints[g]})`;
        opt.selected = (data.grade === g);
        select.appendChild(opt);
      });

      select.addEventListener('change', (e) => {
        this.subjectsData[i].grade = e.target.value;
        this.calculatePrediction(true);
        this.saveData();
      });

      selectWrapper.appendChild(select);
      gradeTd.appendChild(selectWrapper);

      row.appendChild(subjTd);
      row.appendChild(creditsTd);
      row.appendChild(gradeTd);

      this.tableBody.appendChild(row);
    }

    if (this.countVal) {
      this.countVal.textContent = this.subjectCount;
    }
  }

  adjustSubjectCount(offset) {
    if (!this.isEditing) return;

    const newCount = this.subjectCount + offset;
    if (newCount < 1 || newCount > 15) return;

    this.subjectCount = newCount;

    if (offset > 0) {
      this.subjectsData.push({ subject: '', credits: '', grade: '' });
    } else {
      this.subjectsData.pop();
    }

    this.renderRows();
    this.calculatePrediction(true);
  }

  toggleEditMode() {
    this.isEditing = !this.isEditing;
    const btnText = this.editBtn.querySelector('.btn-text');

    if (this.isEditing) {
      document.body.classList.add('edit-predictor-active');
      if (btnText) btnText.textContent = 'Save Predictor';

      if (this.btnDecrease) this.btnDecrease.disabled = false;
      if (this.btnIncrease) this.btnIncrease.disabled = false;

      this.renderRows();
      const firstSubj = this.tableBody.querySelector('.sem-subject');
      if (firstSubj) firstSubj.focus();
    } else {
      // Validation Check
      let hasError = false;
      const creditsInputs = this.tableBody.querySelectorAll('.sem-credits');
      creditsInputs.forEach((input) => {
        const val = parseInt(input.value);
        if (input.value !== '' && (isNaN(val) || val <= 0 || val > 12)) {
          input.classList.add('invalid-val');
          hasError = true;
        } else {
          input.classList.remove('invalid-val');
        }
      });

      if (hasError) {
        this.editBtn.style.animation = 'shake 0.4s ease-in-out';
        setTimeout(() => this.editBtn.style.animation = '', 400);
        this.isEditing = true;
        return;
      }

      document.body.classList.remove('edit-predictor-active');
      if (btnText) btnText.textContent = 'Edit Predictor';

      if (this.btnDecrease) this.btnDecrease.disabled = true;
      if (this.btnIncrease) this.btnIncrease.disabled = true;

      this.renderRows();
      this.saveData();
    }
  }

  handleCreditsInput(input, index) {
    const val = parseInt(input.value);
    if (input.value !== '' && (isNaN(val) || val <= 0 || val > 12)) {
      input.classList.add('invalid-val');
      this.subjectsData[index].credits = input.value;
    } else {
      input.classList.remove('invalid-val');
      this.subjectsData[index].credits = input.value;
    }
    this.calculatePrediction(true);
  }

  updatePredictModeUI() {
    if (this.predictModeActive) {
      if (this.predictorCard) this.predictorCard.classList.add('prediction-mode-active');
      const selects = this.tableBody.querySelectorAll('.sem-grade');
      selects.forEach(select => select.disabled = false);
    } else {
      if (this.predictorCard) this.predictorCard.classList.remove('prediction-mode-active');
      const selects = this.tableBody.querySelectorAll('.sem-grade');
      selects.forEach(select => select.disabled = true);
    }
  }

  calculatePrediction(triggerAnimation = false) {
    if (!this.predictModeActive) {
      if (this.predictedSgpaVal) this.predictedSgpaVal.textContent = '—';
      if (this.predictedCgpaVal) this.predictedCgpaVal.textContent = '—';
      return;
    }

    let totalCreditsPoints = 0;
    let totalCredits = 0;
    let gradesEntered = 0;

    this.subjectsData.forEach((data) => {
      const creditsVal = parseInt(data.credits);
      const gradeVal = data.grade;

      if (!isNaN(creditsVal) && creditsVal > 0) {
        totalCredits += creditsVal;
        if (gradeVal !== '' && this.gradePoints[gradeVal] !== undefined) {
          totalCreditsPoints += (creditsVal * this.gradePoints[gradeVal]);
          gradesEntered++;
        }
      }
    });

    if (totalCredits > 0 && gradesEntered > 0) {
      const sgpa = parseFloat((totalCreditsPoints / totalCredits).toFixed(2));

      // Calculate predicted Cumulative GPA
      const savedGpasRaw = localStorage.getItem('mymo_gpas');
      let completedSum = 0;
      let completedCount = 0;
      if (savedGpasRaw) {
        try {
          const gpas = JSON.parse(savedGpasRaw);
          for (let i = 1; i <= 8; i++) {
            const val = gpas[i.toString()];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              const parsed = parseFloat(val);
              if (!isNaN(parsed)) {
                completedSum += parsed;
                completedCount++;
              }
            }
          }
        } catch (e) {
          console.error('Error loading GPAs inside Predictor Engine CGPA sync', e);
        }
      }

      const cgpa = parseFloat(((completedSum + sgpa) / (completedCount + 1)).toFixed(2));

      if (triggerAnimation) {
        this.animateValue(this.predictedSgpaVal, sgpa);
        this.animateValue(this.predictedCgpaVal, cgpa);
      } else {
        if (this.predictedSgpaVal) this.predictedSgpaVal.textContent = sgpa.toFixed(2);
        if (this.predictedCgpaVal) this.predictedCgpaVal.textContent = cgpa.toFixed(2);
      }
    } else {
      if (this.predictedSgpaVal) this.predictedSgpaVal.textContent = '—';
      if (this.predictedCgpaVal) this.predictedCgpaVal.textContent = '—';
    }
  }

  animateValue(element, targetVal) {
    if (!element) return;

    let currentVal = parseFloat(element.textContent);
    if (isNaN(currentVal)) {
      currentVal = 0.00;
    }

    if (element.animId) {
      cancelAnimationFrame(element.animId);
    }

    const duration = 450;
    const startTime = performance.now();
    const startValue = currentVal;
    const endValue = targetVal;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = startValue + (endValue - startValue) * ease;

      element.textContent = current.toFixed(2);

      if (progress < 1.0) {
        element.animId = requestAnimationFrame(tick);
      } else {
        element.textContent = endValue.toFixed(2);
        element.classList.add('pred-gpa-recalculating');
        setTimeout(() => element.classList.remove('pred-gpa-recalculating'), 400);
      }
    };

    element.animId = requestAnimationFrame(tick);
  }

  saveData() {
    localStorage.setItem(this.storageKeySemCount, this.subjectCount.toString());
    localStorage.setItem(this.storageKeySemData, JSON.stringify(this.subjectsData));
    localStorage.setItem(this.storageKeyPredictMode, this.predictModeActive ? 'true' : 'false');
  }

  loadData() {
    const savedCount = localStorage.getItem(this.storageKeySemCount);
    if (savedCount !== null) {
      const parsed = parseInt(savedCount);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 15) {
        this.subjectCount = parsed;
      }
    }

    const rawSemData = localStorage.getItem(this.storageKeySemData);
    if (rawSemData) {
      try {
        this.subjectsData = JSON.parse(rawSemData);
        while (this.subjectsData.length < this.subjectCount) {
          this.subjectsData.push({ subject: '', credits: '', grade: '' });
        }
        this.subjectsData = this.subjectsData.slice(0, this.subjectCount);
      } catch (e) {
        console.error('Error loading predictor data', e);
        this.subjectsData = [];
      }
    } else {
      this.subjectsData = [];
    }

    const savedPredict = localStorage.getItem(this.storageKeyPredictMode);
    this.predictModeActive = (savedPredict === 'true');
    if (this.predictToggle) {
      this.predictToggle.checked = this.predictModeActive;
    }
  }
}

// Make globally available to main.js
window.AcademicEngine = AcademicEngine;
