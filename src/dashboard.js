// M.OS Clean Dashboard View Controller
// Manages profile variables synchronization, current timeline badges, cumulative SGPA dial, and quick access directories.

class DashboardEngine {
  constructor() {
    // DOM elements - Profile Info
    this.nameDisplay = document.getElementById('dashboard-name-display');
    this.courseDisplay = document.getElementById('dashboard-course-display');
    this.branchDisplay = document.getElementById('dashboard-branch-display');
    this.specDisplay = document.getElementById('dashboard-spec-display');
    this.instituteDisplay = document.getElementById('dashboard-institute-display');
    
    // DOM elements - Stats & Timeline
    this.yearVal = document.getElementById('dashboard-year-val');
    this.semVal = document.getElementById('dashboard-sem-val');
    this.sgpaVal = document.getElementById('dashboard-sgpa-val');

    // Storage keys
    this.storageKeyName = 'mymo_dashboard_name';
    this.storageKeyInstitute = 'mymo_institute';
    this.storageKeyCourse = 'mymo_course';
    this.storageKeyBranch = 'mymo_branch';
    this.storageKeySpec = 'mymo_specialization';
    this.storageKeyGpas = 'mymo_gpas';

    this.init();
  }

  init() {
    this.syncAll();
    this.setupShortcuts();

    // Listeners for modifications in other sections
    window.addEventListener('profile-updated', () => this.syncAll());
    window.addEventListener('academic-gpa-updated', () => this.syncAll());
  }

  setupShortcuts() {
    const tiles = document.querySelectorAll('.quick-tile');
    tiles.forEach((tile) => {
      tile.addEventListener('click', () => {
        const targetSection = tile.getAttribute('data-section');
        const targetCardId = tile.getAttribute('data-card-id');
        if (!targetSection) return;

        // Find main navigation button
        const navBtn = document.querySelector(`.nav-btn[data-target="${targetSection}"]`);
        if (navBtn) {
          navBtn.click();
          
          if (targetCardId) {
            // Wait slightly for the section fade-in animation, then scroll
            setTimeout(() => {
              const targetCard = document.getElementById(targetCardId);
              if (targetCard) {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Add highlight flash animation class
                targetCard.classList.add('shortcut-highlight-flash');
                setTimeout(() => {
                  targetCard.classList.remove('shortcut-highlight-flash');
                }, 1500);
              }
            }, 180);
          } else {
            // Scroll page back to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      });
    });
  }

  syncAll() {
    // 1. Sync Profile Info
    const name = localStorage.getItem(this.storageKeyName) || 'Mohit Varma';
    const inst = localStorage.getItem(this.storageKeyInstitute) || 'MIT Manipal';
    const course = localStorage.getItem(this.storageKeyCourse) || 'Computer Science & Engineering';
    const branch = localStorage.getItem(this.storageKeyBranch) || 'CSE - Core';
    const spec = localStorage.getItem(this.storageKeySpec) || 'selected in 3rd year of cse course';

    if (this.nameDisplay) this.nameDisplay.textContent = name;
    if (this.instituteDisplay) this.instituteDisplay.textContent = inst;
    if (this.courseDisplay) this.courseDisplay.textContent = course;
    if (this.branchDisplay) this.branchDisplay.textContent = branch;
    if (this.specDisplay) this.specDisplay.textContent = spec;

    // 2. Sync GPAs and Timeline (Year/Sem)
    const savedGpasRaw = localStorage.getItem(this.storageKeyGpas);
    let currentSem = 1;
    let sum = 0;
    let count = 0;
    
    if (savedGpasRaw) {
      try {
        const gpas = JSON.parse(savedGpasRaw);
        // Find current sem
        for (let i = 1; i <= 8; i++) {
          const val = gpas[i.toString()];
          if (val === undefined || val === null || String(val).trim() === '') {
            currentSem = i;
            break;
          }
          if (i === 8) {
            currentSem = 'Graduated';
          }
        }
        
        // Summing active GPAs
        for (let i = 1; i <= 8; i++) {
          const val = gpas[i.toString()];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            const parsedGpa = parseFloat(val);
            if (!isNaN(parsedGpa)) {
              sum += parsedGpa;
              count++;
            }
          }
        }
      } catch (e) {
        console.error('Error parsing GPAs inside Dashboard sync', e);
      }
    }

    // Timeline Text formatting
    let yearText = '—';
    if (typeof currentSem === 'number') {
      if (currentSem === 1 || currentSem === 2) yearText = '1st Year';
      else if (currentSem === 3 || currentSem === 4) yearText = '2nd Year';
      else if (currentSem === 5 || currentSem === 6) yearText = '3rd Year';
      else if (currentSem === 7 || currentSem === 8) yearText = '4th Year';
    } else if (currentSem === 'Graduated') {
      yearText = 'Graduated';
    }

    if (this.yearVal) this.yearVal.textContent = yearText;
    if (this.semVal) this.semVal.textContent = typeof currentSem === 'number' ? 'Sem ' + currentSem : currentSem;

    // Recalculate and animate Cumulative SGPA
    if (count > 0 && this.sgpaVal) {
      const average = parseFloat((sum / count).toFixed(2));
      this.animateNumericValue(this.sgpaVal, average);
    } else if (this.sgpaVal) {
      this.sgpaVal.textContent = '—';
    }
  }

  animateNumericValue(element, targetVal) {
    if (!element) return;

    let currentVal = parseFloat(element.textContent);
    if (isNaN(currentVal)) {
      currentVal = 0.00;
    }

    if (element.animId) {
      cancelAnimationFrame(element.animId);
    }

    const duration = 600;
    const startTime = performance.now();
    const startValue = currentVal;
    const endValue = targetVal;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const ease = 1 - Math.pow(1 - progress, 4); // Quartic ease out
      const current = startValue + (endValue - startValue) * ease;
      
      element.textContent = current.toFixed(2);

      if (progress < 1.0) {
        element.animId = requestAnimationFrame(tick);
      } else {
        element.textContent = endValue.toFixed(2);
      }
    };

    element.animId = requestAnimationFrame(tick);
  }
}

// Make globally available to main.js
window.DashboardEngine = DashboardEngine;
