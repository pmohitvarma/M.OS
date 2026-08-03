// M.OS Profile Section View Controller
// Manages Name, Institute Name, Course, Branch, and Specialization.
// Synchronizes Year and Semester automatically from Academic GPA entries.

class ProfileEngine {
  constructor() {
    this.editBtn = document.getElementById('edit-profile-btn');
    
    // Editable inputs
    this.nameInput = document.getElementById('profile-name-input');
    this.instituteInput = document.getElementById('profile-institute-input');
    this.courseInput = document.getElementById('profile-course-input');
    this.branchInput = document.getElementById('profile-branch-input');
    this.specInput = document.getElementById('profile-spec-input');
    
    // Synced read-only displays
    this.yearDisplay = document.getElementById('profile-year-val');
    this.semDisplay = document.getElementById('profile-sem-val');
    
    this.isEditing = false;
    
    // Theme references
    this.themeToggle = document.getElementById('theme-mode-toggle');
    this.darkThemeText = document.getElementById('theme-mode-dark-text');
    this.whiteThemeText = document.getElementById('theme-mode-white-text');
    this.activeTheme = localStorage.getItem('mymo_theme') || 'dark';

    // Particles references
    this.particlesToggle = document.getElementById('particles-toggle');
    this.particlesOffText = document.getElementById('particles-toggle-off-text');
    this.particlesOnText = document.getElementById('particles-toggle-on-text');
    this.particlesEnabled = localStorage.getItem('mymo_particles_enabled') !== 'false';
    
    // Particle Formations references
    this.formationsToggle = document.getElementById('formations-toggle');
    this.formationsOffText = document.getElementById('formations-toggle-off-text');
    this.formationsOnText = document.getElementById('formations-toggle-on-text');
    this.formationsRow = document.getElementById('formations-toggle-row');
    this.formationsEnabled = localStorage.getItem('mymo_particle_formations_enabled') !== 'false';
    
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
    this.loadData();
    this.syncAcademicTimeline();
    this.applyTheme(this.activeTheme, false);
    this.applyParticlesState(this.particlesEnabled);
    this.applyFormationsState(this.formationsEnabled);

    if (this.editBtn) {
      this.editBtn.addEventListener('click', () => this.toggleEditMode());
    }

    if (this.themeToggle) {
      this.themeToggle.addEventListener('change', () => {
        const newTheme = this.themeToggle.checked ? 'white' : 'dark';
        this.applyTheme(newTheme, true);
      });
    }

    if (this.particlesToggle) {
      this.particlesToggle.addEventListener('change', () => {
        this.applyParticlesState(this.particlesToggle.checked);
      });
    }

    if (this.formationsToggle) {
      this.formationsToggle.addEventListener('change', () => {
        this.applyFormationsState(this.formationsToggle.checked);
      });
    }

    // React to GPA changes to recompute timeline variables
    window.addEventListener('academic-gpa-updated', () => {
      this.syncAcademicTimeline();
    });
  }

  toggleEditMode() {
    this.isEditing = !this.isEditing;
    const btnText = this.editBtn.querySelector('.btn-text');

    if (this.isEditing) {
      // Enter Edit Mode
      document.body.classList.add('edit-profile-active');
      if (btnText) btnText.textContent = 'Save Profile';

      // Unlock editable inputs
      this.setInputReadOnlyState(false);
      if (this.nameInput) this.nameInput.focus();
    } else {
      // Exit Edit Mode
      document.body.classList.remove('edit-profile-active');
      if (btnText) btnText.textContent = 'Edit Profile';

      // Lock inputs
      this.setInputReadOnlyState(true);
      
      // Fallbacks if empty
      this.validateInputs();
      
      this.saveData();

      // Dispatch profile updated event so Dashboard syncs
      window.dispatchEvent(new CustomEvent('profile-updated'));
    }
  }

  setInputReadOnlyState(isReadOnly) {
    const inputs = [this.nameInput, this.instituteInput, this.courseInput, this.branchInput, this.specInput];
    inputs.forEach(input => {
      if (input) input.readOnly = isReadOnly;
    });
  }

  validateInputs() {
    if (this.nameInput && this.nameInput.value.trim() === '') this.nameInput.value = 'Mohit Varma';
    if (this.instituteInput && this.instituteInput.value.trim() === '') this.instituteInput.value = 'MIT Manipal';
    if (this.courseInput && this.courseInput.value.trim() === '') this.courseInput.value = 'Computer Science & Engineering';
    if (this.branchInput && this.branchInput.value.trim() === '') this.branchInput.value = 'CSE - Core';
    if (this.specInput && this.specInput.value.trim() === '') this.specInput.value = 'selected in 3rd year of cse course';
  }

  saveData() {
    if (this.nameInput) localStorage.setItem(this.storageKeyName, this.nameInput.value);
    if (this.instituteInput) localStorage.setItem(this.storageKeyInstitute, this.instituteInput.value);
    if (this.courseInput) localStorage.setItem(this.storageKeyCourse, this.courseInput.value);
    if (this.branchInput) localStorage.setItem(this.storageKeyBranch, this.branchInput.value);
    if (this.specInput) localStorage.setItem(this.storageKeySpec, this.specInput.value);
  }

  loadData() {
    const name = localStorage.getItem(this.storageKeyName);
    const inst = localStorage.getItem(this.storageKeyInstitute);
    const course = localStorage.getItem(this.storageKeyCourse);
    const branch = localStorage.getItem(this.storageKeyBranch);
    const spec = localStorage.getItem(this.storageKeySpec);

    if (this.nameInput) this.nameInput.value = name !== null ? name : 'Mohit Varma';
    if (this.instituteInput) this.instituteInput.value = inst !== null ? inst : 'MIT Manipal';
    if (this.courseInput) this.courseInput.value = course !== null ? course : 'Computer Science & Engineering';
    if (this.branchInput) this.branchInput.value = branch !== null ? branch : 'CSE - Core';
    if (this.specInput) this.specInput.value = spec !== null ? spec : 'selected in 3rd year of cse course';
  }

  syncAcademicTimeline() {
    const savedGpasRaw = localStorage.getItem(this.storageKeyGpas);
    let currentSem = 1;
    
    if (savedGpasRaw) {
      try {
        const gpas = JSON.parse(savedGpasRaw);
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
      } catch (e) {
        console.error('Error parsing GPAs inside Profile timeline calculations', e);
      }
    }

    let yearText = '—';
    if (typeof currentSem === 'number') {
      if (currentSem === 1 || currentSem === 2) yearText = '1st Year';
      else if (currentSem === 3 || currentSem === 4) yearText = '2nd Year';
      else if (currentSem === 5 || currentSem === 6) yearText = '3rd Year';
      else if (currentSem === 7 || currentSem === 8) yearText = '4th Year';
    } else if (currentSem === 'Graduated') {
      yearText = 'Graduated';
    }

    if (this.yearDisplay) {
      this.yearDisplay.textContent = yearText;
    }

    if (this.semDisplay) {
      this.semDisplay.textContent = typeof currentSem === 'number' ? 'Sem ' + currentSem : currentSem;
    }
  }

  applyTheme(theme, isTransition = false) {
    this.activeTheme = theme;
    localStorage.setItem('mymo_theme', theme);

    if (this.themeToggle) {
      this.themeToggle.checked = (theme === 'white');
    }

    if (theme === 'white') {
      document.body.classList.add('white-theme');
      document.documentElement.classList.add('white-theme');
      if (this.darkThemeText) this.darkThemeText.classList.remove('active');
      if (this.whiteThemeText) this.whiteThemeText.classList.add('active');
    } else {
      document.body.classList.remove('white-theme');
      document.documentElement.classList.remove('white-theme');
      if (this.darkThemeText) this.darkThemeText.classList.add('active');
      if (this.whiteThemeText) this.whiteThemeText.classList.remove('active');
    }

    if (isTransition) {
      // Dispatch resize event to let canvas systems and graph layers redraw immediately with new theme colors
      window.dispatchEvent(new Event('resize'));
    }
  }

  applyParticlesState(enabled) {
    this.particlesEnabled = enabled;
    localStorage.setItem('mymo_particles_enabled', enabled ? 'true' : 'false');
    
    if (this.particlesToggle) {
      this.particlesToggle.checked = enabled;
    }
    
    if (enabled) {
      if (this.particlesOffText) this.particlesOffText.classList.remove('active');
      if (this.particlesOnText) this.particlesOnText.classList.add('active');
      
      if (this.formationsRow) this.formationsRow.classList.remove('disabled-toggle-row');
      if (this.formationsToggle) this.formationsToggle.disabled = false;
    } else {
      if (this.particlesOffText) this.particlesOffText.classList.add('active');
      if (this.particlesOnText) this.particlesOnText.classList.remove('active');
      
      if (this.formationsRow) this.formationsRow.classList.add('disabled-toggle-row');
      if (this.formationsToggle) this.formationsToggle.disabled = true;
    }
  }

  applyFormationsState(enabled) {
    this.formationsEnabled = enabled;
    localStorage.setItem('mymo_particle_formations_enabled', enabled ? 'true' : 'false');
    
    if (this.formationsToggle) {
      this.formationsToggle.checked = enabled;
    }
    
    if (enabled) {
      if (this.formationsOffText) this.formationsOffText.classList.remove('active');
      if (this.formationsOnText) this.formationsOnText.classList.add('active');
    } else {
      if (this.formationsOffText) this.formationsOffText.classList.add('active');
      if (this.formationsOnText) this.formationsOnText.classList.remove('active');
    }
  }
}

// Make globally available to main.js
window.ProfileEngine = ProfileEngine;
