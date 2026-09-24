/**
 * Award-Winning Luxury Portfolio Engine
 * Zero-Lag, Zero-Ghosting 60FPS Cursor-Tracking Hero + Full Scroll Architecture
 * Customized for Kava Anjali Shakti (Anjali Kava) — Full Stack Developer & UI/UX Enthusiast
 */

// Configuration Constants
const TOTAL_FRAMES = 64;
const LERP_FACTOR = 0.26; // Rapid tracking (~35ms response, zero lag)
const DEADZONE_RADIUS_RATIO = 0.12; // 12% screen radius for direct eye contact
const NATIVE_WIDTH = 1920;
const NATIVE_HEIGHT = 1080;
const NATIVE_ASPECT = NATIVE_WIDTH / NATIVE_HEIGHT;
const FACE_CENTER_NORM_X = 0.500;
const FACE_CENTER_NORM_Y = 0.444; // Center between eyes at bridge of nose

// State Variables
const frames = [];
let centerFrame = null;
let framesLoaded = 0;
let isLoaded = false;
let isHeroVisible = true;

// Cursor and Tracking State
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight * 0.35; // Default gaze slightly up-center
let targetAngle = 0;
let currentAngle = 0;
let isHoveringCenter = true; // Start in direct eye contact
let lastDrawnFrame = null;

// Magnetic Cursor State
let ringX = mouseX;
let ringY = mouseY;

// DOM Elements
const canvas = document.getElementById('character-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const preloader = document.getElementById('preloader');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const cursorDot = document.getElementById('cursor-dot');
const cursorRing = document.getElementById('cursor-ring');
const siteHeader = document.getElementById('site-header');
const heroSection = document.getElementById('hero');

/**
 * Shortest-Path Circular Angular Lerp
 */
function normalizeAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a <= -Math.PI) a += 2 * Math.PI;
  return a;
}

function lerpAngle(current, target, factor) {
  const diff = normalizeAngle(target - current);
  return current + diff * factor;
}

/**
 * Resize Canvas for High-DPI Displays (Retina / 4K)
 */
let dpr = window.devicePixelRatio || 1;
let viewW = window.innerWidth;
let viewH = window.innerHeight;

function handleResize() {
  dpr = window.devicePixelRatio || 1;
  viewW = window.innerWidth;
  viewH = window.innerHeight;

  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
  canvas.style.width = `${viewW}px`;
  canvas.style.height = `${viewH}px`;

  if (isLoaded && isHeroVisible) {
    drawFrame(lastDrawnFrame || centerFrame);
  }
}

window.addEventListener('resize', handleResize);
handleResize();

/**
 * Calculate Screen Cover Projection & Face Center Coordinates
 */
function getProjection() {
  const currentAspect = viewW / viewH;
  let renderW, renderH, renderX, renderY;

  if (currentAspect > NATIVE_ASPECT) {
    renderW = viewW;
    renderH = viewW / NATIVE_ASPECT;
    renderX = 0;
    renderY = (viewH - renderH) / 2;
  } else {
    renderH = viewH;
    renderW = viewH * NATIVE_ASPECT;
    renderX = (viewW - renderW) / 2;
    renderY = 0;
  }

  const faceX = renderX + renderW * FACE_CENTER_NORM_X;
  const faceY = renderY + renderH * FACE_CENTER_NORM_Y;

  return { renderX, renderY, renderW, renderH, faceX, faceY };
}

/**
 * Draw EXACTLY ONE Crisp Frame at 100% Opacity (Zero Ghosting)
 */
function drawFrame(img) {
  if (!img) return;

  const { renderX, renderY, renderW, renderH } = getProjection();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Fill background with exact matching burgundy-red seamlessly
  ctx.fillStyle = '#951118';
  ctx.fillRect(0, 0, viewW, viewH);

  // Draw single frame at 100% opacity
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, renderX, renderY, renderW, renderH);

  lastDrawnFrame = img;
}

/**
 * Asset Preloader
 */
function preloadAssets() {
  const totalToLoad = TOTAL_FRAMES + 1; // 64 directional + 1 center

  function updateProgress() {
    framesLoaded++;
    const percent = Math.round((framesLoaded / totalToLoad) * 100);
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `INITIALIZING ${percent}%`;

    if (framesLoaded === totalToLoad) {
      setTimeout(() => {
        isLoaded = true;
        preloader.classList.add('loaded');
        drawFrame(centerFrame);
        requestAnimationFrame(renderLoop);
      }, 200);
    }
  }

  // Preload Center Neutral Frame
  centerFrame = new Image();
  centerFrame.src = 'public/frames/center.webp';
  centerFrame.onload = updateProgress;
  centerFrame.onerror = () => {
    centerFrame.src = 'public/center.webp';
  };

  // Preload 64 Trajectory Frames
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const img = new Image();
    const filename = `frame_${String(i).padStart(2, '0')}.webp`;
    img.src = `public/frames/${filename}`;
    img.onload = updateProgress;
    frames[i] = img;
  }
}

/**
 * Main 60 FPS Animation & Tracking Loop
 */
function renderLoop() {
  if (!isLoaded) return;

  // Run cursor dot/ring physics on every frame
  updateCursor();

  // If hero is in view, run the canvas face tracking calculation
  if (isHeroVisible) {
    const { faceX, faceY } = getProjection();
    const dx = mouseX - faceX;
    const dy = mouseY - faceY;
    const dist = Math.hypot(dx, dy);

    // Deadzone detection: within 12% screen radius
    const minDim = Math.min(viewW, viewH);
    const deadzoneRadius = minDim * DEADZONE_RADIUS_RATIO;

    // Hysteresis threshold to prevent flickering near boundary
    if (isHoveringCenter) {
      if (dist > deadzoneRadius * 1.15) {
        isHoveringCenter = false;
        document.body.classList.remove('cursor-eye-contact');
      }
    } else {
      if (dist < deadzoneRadius * 0.95) {
        isHoveringCenter = true;
        document.body.classList.add('cursor-eye-contact');
      }
    }

    let frameToDraw;

    if (isHoveringCenter) {
      frameToDraw = centerFrame;
    } else {
      targetAngle = Math.atan2(dy, dx);
      currentAngle = lerpAngle(currentAngle, targetAngle, LERP_FACTOR);

      const positiveAngle = (currentAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const frameIndex = Math.round((positiveAngle / (2 * Math.PI)) * TOTAL_FRAMES) % TOTAL_FRAMES;

      frameToDraw = frames[frameIndex] || centerFrame;
    }

    drawFrame(frameToDraw);
  }

  requestAnimationFrame(renderLoop);
}

/**
 * Custom Magnetic Cursor Logic
 */
function updateCursor() {
  if (!cursorDot || !cursorRing) return;

  cursorDot.style.left = `${mouseX}px`;
  cursorDot.style.top = `${mouseY}px`;

  const ringLerp = 0.22;
  ringX += (mouseX - ringX) * ringLerp;
  ringY += (mouseY - ringY) * ringLerp;
  cursorRing.style.left = `${ringX}px`;
  cursorRing.style.top = `${ringY}px`;
}

// Global Mouse & Touch Handlers
window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

window.addEventListener('touchmove', (e) => {
  if (e.touches.length > 0) {
    mouseX = e.touches[0].clientX;
    mouseY = e.touches[0].clientY;
  }
}, { passive: true });

/**
 * Interactive Cursor Hover Bindings
 */
function bindInteractiveCursor() {
  const interactives = document.querySelectorAll(
    '.interactive, a, button, input, textarea, .scope-pill, .filter-pill, .bento-box, .project-card, .certificate-card, .timeline-card'
  );
  interactives.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      document.body.classList.add('cursor-hover');
    });
    el.addEventListener('mouseleave', () => {
      document.body.classList.remove('cursor-hover');
    });
  });
}

/**
 * Hero Intersection Observer
 * Pauses canvas rendering when hero is scrolled completely offscreen
 */
function initHeroObserver() {
  if (!heroSection) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      isHeroVisible = entry.isIntersecting;
      if (isHeroVisible && isLoaded) {
        drawFrame(lastDrawnFrame || centerFrame);
      }
    });
  }, { threshold: 0.05 });

  observer.observe(heroSection);
}

/**
 * Scroll Spy & Header Blur on Scroll
 */
function initScrollSpy() {
  const navLinks = document.querySelectorAll('.nav-links .nav-link');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;

    if (scrollY > 60) {
      siteHeader.classList.add('header-scrolled');
    } else {
      siteHeader.classList.remove('header-scrolled');
    }

    let currentSectionId = '';
    sections.forEach((sec) => {
      const top = sec.offsetTop - 220;
      const height = sec.offsetHeight;
      if (scrollY >= top && scrollY < top + height) {
        currentSectionId = sec.getAttribute('id');
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSectionId}`) {
        link.classList.add('active');
      }
    });
  }, { passive: true });
}

/**
 * Scroll Reveal Animations (IntersectionObserver)
 */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  reveals.forEach((el) => observer.observe(el));
}

/**
 * Work / Projects Filter Pills
 */
function initProjectFilters() {
  const filterPills = document.querySelectorAll('.filter-pill');
  const projectCards = document.querySelectorAll('.project-card');

  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');

      const filter = pill.getAttribute('data-filter');

      projectCards.forEach((card) => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 50);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(16px)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 250);
        }
      });
    });
  });
}

/**
 * Toast Notification Helper
 */
function showToast(message, duration = 3200) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

/**
 * Project Specs Data (Tailored to Anjali Kava's Full Stack & UI/UX Stack)
 */
const PROJECT_SPECS_DATA = {
  memories: {
    title: 'Memories Studio — Interactive Digital Photobooth',
    subtitle: 'Real-Time Web Photobooth Deployed on Vercel • Co-Engineered with Vishu Kava',
    badge: 'Live Production App • Featured',
    liveUrl: 'https://photo-memories-ac6t.vercel.app/',
    githubUrl: 'https://github.com/anjukava',
    collaborator: 'Co-created with Brother Vishu Kava',
    overview: 'A full-featured digital photobooth web application deployed live on Vercel. Engineered in close collaboration between Anjali Kava and her brother Vishu Kava, Memories Studio empowers users to capture instant webcam photo strips, customize vibrant borders, apply creative sticker overlays, and download high-resolution composite keepsakes directly from their browser.',
    highlights: [
      'Real-Time WebRTC Media Stream: Integrates navigator.mediaDevices.getUserMedia with camera switching, instant video stream, and hardware error fallbacks.',
      'Canvas Compositor & Strip Generator: High-speed HTML5 Canvas rendering for dynamic 3-photo / 4-photo film strips, polaroid layouts, and high-DPI export.',
      'Countdown & Burst Capture Engine: Interactive 3-2-1 visual timer with audio-visual cues and seamless sequential shot capturing.',
      'Aesthetic Studio Customizer: Real-time photo filters (B&W, Vintage Sepia, Grain, Warm Glow), custom border color picker, decorative stickers, and date stamps.',
      'Zero-Latency Client-Side Processing: In-browser image processing with client-side blob generation and direct download without requiring backend media storage.'
    ],
    stack: ['JavaScript (ES6+)', 'HTML5 Canvas API', 'WebRTC Camera API', 'CSS3 Modern UI', 'Vercel Deployment', 'Responsive Design']
  }
};

/**
 * Certificate Details Data (From Official Uploaded Certificates)
 */
const CERTIFICATES_DATA = {
  darshan: {
    title: 'Programming Challenge 2026 — Certificate of Participation',
    subtitle: 'Darshan Institute of Computer Application, Darshan University, Rajkot (Jan 31, 2026)',
    image: 'public/certificates/darshan_programming_challenge_2026.jpg',
    caption: 'Awarded to Kava Anjali for actively participating in the "Programming Challenge 2026" competitive programming event and demonstrating logical thinking and problem-solving skills by solving coding challenges.'
  },
  waytoweb: {
    title: 'One Week UI/UX Workshop — Certificate of Achievement',
    subtitle: 'Way To Web Pvt Ltd., Ahmedabad (Awarded on June 1, 2024)',
    image: 'public/certificates/way_to_web_uiux_workshop_2024.png',
    caption: 'Proudly presented to Anjali Kava for attending and successfully completing an intensive one-week professional UI/UX design workshop. Signed by Mr. Mahipatsinh Rajput, CEO.'
  }
};

/**
 * Interactive Modals (Resume, Project Specs & Certificate Preview)
 */
function initModals() {
  // Resume Modal
  const resumeModal = document.getElementById('resume-modal');
  const btnHeroResume = document.getElementById('btn-hero-resume');
  const btnHeaderResume = document.getElementById('btn-header-resume');
  const btnCloseResume = document.getElementById('btn-close-resume');
  const btnPrintResume = document.getElementById('btn-print-resume');

  function openResume() {
    if (resumeModal && typeof resumeModal.showModal === 'function') {
      resumeModal.showModal();
    }
  }

  function closeResume() {
    if (resumeModal) resumeModal.close();
  }

  if (btnHeroResume) btnHeroResume.addEventListener('click', openResume);
  if (btnHeaderResume) btnHeaderResume.addEventListener('click', openResume);
  if (btnCloseResume) btnCloseResume.addEventListener('click', closeResume);
  if (btnPrintResume) {
    btnPrintResume.addEventListener('click', () => {
      window.print();
    });
  }

  if (resumeModal) {
    resumeModal.addEventListener('click', (e) => {
      const rect = resumeModal.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        resumeModal.close();
      }
    });
  }

  // Certificate Viewer Modal
  const certModal = document.getElementById('certificate-modal');
  const btnCloseCert = document.getElementById('btn-close-cert-modal');
  const certModalTitle = document.getElementById('cert-modal-title');
  const certModalSubtitle = document.getElementById('cert-modal-subtitle');
  const certModalImg = document.getElementById('cert-modal-img');
  const certModalCaption = document.getElementById('cert-modal-caption');

  const certActionButtons = document.querySelectorAll('.btn-cert-action');
  certActionButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const certKey = btn.getAttribute('data-cert');
      const cert = CERTIFICATES_DATA[certKey];
      if (!cert || !certModal) return;

      certModalTitle.textContent = cert.title;
      certModalSubtitle.textContent = cert.subtitle;
      certModalImg.src = cert.image;
      certModalImg.alt = cert.title;
      certModalCaption.textContent = cert.caption;

      certModal.showModal();
    });
  });

  if (btnCloseCert && certModal) {
    btnCloseCert.addEventListener('click', () => {
      certModal.close();
    });
  }

  if (certModal) {
    certModal.addEventListener('click', (e) => {
      const rect = certModal.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        certModal.close();
      }
    });
  }

  // Project Specs Modal
  const projectModal = document.getElementById('project-modal');
  const btnCloseProject = document.getElementById('btn-close-project');
  const projectModalTitle = document.getElementById('project-modal-title');
  const projectModalSubtitle = document.getElementById('project-modal-subtitle');
  const projectModalBody = document.getElementById('project-modal-body');

  const actionButtons = document.querySelectorAll('.btn-card-action');
  actionButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-project');
      const data = PROJECT_SPECS_DATA[key];
      if (!data || !projectModal) return;

      projectModalTitle.textContent = data.title;
      projectModalSubtitle.textContent = data.subtitle;

      projectModalBody.innerHTML = `
        <div class="resume-section">
          <div style="display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center; margin-bottom: 0.8rem;">
            <span class="contact-status-pill">${data.badge}</span>
            ${data.collaborator ? `<span class="card-collaborator-pill">${data.collaborator}</span>` : ''}
          </div>
          <h3 class="resume-heading">Project Overview</h3>
          <p class="resume-text">${data.overview}</p>
        </div>

        <div class="resume-section">
          <h3 class="resume-heading">Key Technical Highlights</h3>
          <ul style="list-style: disc inside; display: flex; flex-direction: column; gap: 0.6rem; color: var(--text-secondary); font-size: 0.92rem; line-height: 1.6;">
            ${data.highlights.map(h => `<li>${h}</li>`).join('')}
          </ul>
        </div>

        <div class="resume-section">
          <h3 class="resume-heading">Technologies Deployed</h3>
          <div class="tech-pills" style="margin-top: 0.5rem;">
            ${data.stack.map(s => `<span class="tech-pill">${s}</span>`).join('')}
          </div>
        </div>

        ${(data.liveUrl || data.githubUrl) ? `
        <div class="resume-section" style="padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.1); display: flex; gap: 0.85rem; flex-wrap: wrap;">
          ${data.liveUrl ? `
            <a href="${data.liveUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary interactive" style="font-size: 0.82rem; padding: 0.65rem 1.35rem; background: #22c55e; color: #052e16; border-color: #86efac;">
              <span>Visit Live Web App</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </a>
          ` : ''}
          ${data.githubUrl ? `
            <a href="${data.githubUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary interactive" style="font-size: 0.82rem; padding: 0.65rem 1.35rem; background: #24292e;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span>GitHub Profile</span>
            </a>
          ` : ''}
        </div>
        ` : ''}
      `;

      bindInteractiveCursor();
      projectModal.showModal();
    });
  });

  if (btnCloseProject && projectModal) {
    btnCloseProject.addEventListener('click', () => {
      projectModal.close();
    });
  }

  if (projectModal) {
    projectModal.addEventListener('click', (e) => {
      const rect = projectModal.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        projectModal.close();
      }
    });
  }
}

/**
 * Contact Form & Copy Handlers
 */
function initContactForm() {
  const form = document.getElementById('contact-form');
  const feedback = document.getElementById('form-feedback');
  const submitBtn = document.getElementById('btn-submit-form');
  const scopePills = document.querySelectorAll('.scope-pill');
  let selectedScope = 'Full-Time Developer Role';

  scopePills.forEach((pill) => {
    pill.addEventListener('click', () => {
      scopePills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      selectedScope = pill.getAttribute('data-scope');
    });
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = form.querySelector('#contact-name').value.trim();
      const email = form.querySelector('#contact-email').value.trim();
      const message = form.querySelector('#contact-message').value.trim();

      if (!name || !email || !message) {
        feedback.className = 'form-feedback error';
        feedback.textContent = 'Please fill out all required fields before transmitting.';
        return;
      }

      submitBtn.classList.add('loading');
      submitBtn.querySelector('.btn-text').textContent = 'Transmitting...';

      setTimeout(() => {
        submitBtn.classList.remove('loading');
        submitBtn.querySelector('.btn-text').textContent = 'Transmit Message';

        feedback.className = 'form-feedback success';
        feedback.textContent = `Thank you, ${name}! Your transmission regarding "${selectedScope}" has been delivered. I will respond to ${email} promptly.`;

        showToast('Message sent to Anjali Kava!');
        form.reset();
        scopePills[0].click();

        setTimeout(() => {
          feedback.textContent = '';
          feedback.className = 'form-feedback';
        }, 8000);
      }, 1000);
    });
  }

  // Copy Email Button
  const btnCopyEmail = document.getElementById('btn-copy-email');
  if (btnCopyEmail) {
    btnCopyEmail.addEventListener('click', () => {
      const email = 'anjalikava1115@gmail.com';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(() => {
          showToast('Email copied: anjalikava1115@gmail.com');
        }).catch(() => {
          showToast(`Email: ${email}`);
        });
      } else {
        showToast(`Email: ${email}`);
      }
    });
  }

  // Copy Phone Button
  const btnCopyPhone = document.getElementById('btn-copy-phone');
  if (btnCopyPhone) {
    btnCopyPhone.addEventListener('click', () => {
      const phone = '+91 9409597725';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(phone).then(() => {
          showToast('Phone number copied: +91 9409597725');
        }).catch(() => {
          showToast(`Phone: ${phone}`);
        });
      } else {
        showToast(`Phone: ${phone}`);
      }
    });
  }
}

/**
 * Live Clock in Footer (India Standard Time - Jamnagar)
 */
function initLiveClock() {
  const clockEl = document.getElementById('live-clock');
  if (!clockEl) return;

  function update() {
    const now = new Date();
    const options = {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    try {
      const indiaTime = new Intl.DateTimeFormat('en-IN', options).format(now);
      clockEl.textContent = `INDIA ${indiaTime} IST`;
    } catch {
      clockEl.textContent = `JAMNAGAR ACTIVE`;
    }
  }

  update();
  setInterval(update, 30000);
}

/**
 * Master Initialization on DOM Ready
 */
document.addEventListener('DOMContentLoaded', () => {
  bindInteractiveCursor();
  preloadAssets();
  initHeroObserver();
  initScrollSpy();
  initScrollReveal();
  initProjectFilters();
  initModals();
  initContactForm();
  initLiveClock();
});
