/* ============================================================
   EasySkillOS Docs — main.js
   Handles: theme toggle, mobile nav, back-to-top, tabs, Mermaid
   ============================================================ */

// ── Mermaid Initialisation ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (typeof mermaid !== 'undefined') {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    mermaid.initialize({
      startOnLoad: true,
      theme: isDark ? 'dark' : 'default',
      themeVariables: isDark ? {
        primaryColor:       '#4F46E5',
        primaryTextColor:   '#F1F5F9',
        primaryBorderColor: '#6366F1',
        lineColor:          '#818CF8',
        sectionBkgColor:    '#1E293B',
        altSectionBkgColor: '#273549',
        gridColor:          '#334155',
        secondaryColor:     '#7C3AED',
        tertiaryColor:      '#334155',
        background:         '#1E293B',
        mainBkg:            '#1E293B',
        nodeBorder:         '#475569',
        clusterBkg:         '#1E293B',
        titleColor:         '#F1F5F9',
        edgeLabelBackground:'#1E293B',
        actorBkg:           '#273549',
        actorBorder:        '#4F46E5',
        actorTextColor:     '#F1F5F9',
        actorLineColor:     '#818CF8',
        signalColor:        '#A5B4FC',
        signalTextColor:    '#F1F5F9',
        labelBoxBkgColor:   '#273549',
        labelBoxBorderColor:'#334155',
        labelTextColor:     '#F1F5F9',
        loopTextColor:      '#A5B4FC',
        noteBorderColor:    '#7C3AED',
        noteBkgColor:       '#2D1D56',
        noteTextColor:      '#DDD6FE',
        activationBorderColor: '#4F46E5',
        activationBkgColor: '#1E2A4A',
        sequenceNumberColor:'#F1F5F9',
        stateBkg:           '#273549',
        stateBorder:        '#4F46E5',
      } : {},
      securityLevel: 'loose',
      flowchart: { htmlLabels: true, curve: 'basis' },
      sequence:   { diagramMarginX: 20, diagramMarginY: 10, actorMargin: 60 },
    });
  }
});

// ── Theme Toggle ────────────────────────────────────────────
const THEME_KEY = 'easyskill-docs-theme';

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) ||
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const icon = document.querySelector('.theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getStoredTheme());

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
});

// ── Mobile Sidebar ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle   = document.getElementById('menuToggle');
  const sidebar      = document.getElementById('sidebar');
  const overlay      = document.getElementById('sidebarOverlay');

  function openSidebar() {
    sidebar?.classList.add('sidebar--open');
    overlay?.classList.add('sidebar-overlay--visible');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar?.classList.remove('sidebar--open');
    overlay?.classList.remove('sidebar-overlay--visible');
    document.body.style.overflow = '';
  }

  menuToggle?.addEventListener('click', () => {
    sidebar?.classList.contains('sidebar--open') ? closeSidebar() : openSidebar();
  });

  overlay?.addEventListener('click', closeSidebar);

  // Close on route change (mobile)
  document.querySelectorAll('.nav-item, .nav-subitem').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeSidebar();
    });
  });
});

// ── Back To Top ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  const mainContent = document.getElementById('mainContent');
  const scrollEl = mainContent || window;

  function onScroll() {
    const scrollY = mainContent
      ? mainContent.scrollTop
      : window.pageYOffset || document.documentElement.scrollTop;
    btn.classList.toggle('back-to-top--visible', scrollY > 400);
  }

  scrollEl.addEventListener('scroll', onScroll, { passive: true });

  btn.addEventListener('click', () => {
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
});

// ── Tab Groups ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab-group').forEach(group => {
    const buttons = group.querySelectorAll('.tab-btn');
    const panels  = group.querySelectorAll('.tab-panel');

    buttons.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('tab-btn--active'));
        panels.forEach(p => p.classList.remove('tab-panel--active'));
        btn.classList.add('tab-btn--active');
        panels[i]?.classList.add('tab-panel--active');
      });
    });

    // Activate first tab
    if (buttons[0]) buttons[0].classList.add('tab-btn--active');
    if (panels[0])  panels[0].classList.add('tab-panel--active');
  });
});

// ── Active nav highlight ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href');
    if (!href) return;
    const normalised = href.replace(/\/$/, '');
    const current    = path.replace(/\/$/, '').replace(/\.html$/, '');
    if (current.endsWith(normalised) || (normalised === '' && (current === '' || current === '/'))) {
      item.classList.add('nav-item--active');
      const subsections = item.nextElementSibling;
      if (subsections?.classList.contains('nav-subsections')) {
        subsections.classList.add('nav-subsections--open');
      }
    }
  });
});

// ── Copy-to-clipboard on code blocks ────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('pre').forEach(pre => {
    const btn = document.createElement('button');
    btn.textContent = 'Copy';
    btn.className = 'copy-btn';
    btn.style.cssText = `
      position:absolute; top:.5rem; right:.5rem;
      background:rgba(79,70,229,.2); border:1px solid rgba(79,70,229,.4);
      color:#818CF8; border-radius:4px; padding:.2rem .55rem;
      font-size:.7rem; cursor:pointer; font-family:inherit;
      transition: all 200ms ease;
    `;
    pre.style.position = 'relative';
    pre.appendChild(btn);

    btn.addEventListener('click', async () => {
      const text = pre.querySelector('code')?.innerText || pre.innerText;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = '✓ Copied';
        btn.style.color = '#34D399';
        setTimeout(() => { btn.textContent = 'Copy'; btn.style.color = '#818CF8'; }, 2000);
      } catch {
        btn.textContent = 'Failed';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      }
    });
  });
});

// ── Smooth anchor scroll offset (account for fixed header) ──
document.addEventListener('click', e => {
  const anchor = e.target.closest('a[href^="#"]');
  if (!anchor) return;
  const id = anchor.getAttribute('href').slice(1);
  const target = document.getElementById(id);
  if (!target) return;
  e.preventDefault();
  const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 60;
  const top = target.getBoundingClientRect().top + window.pageYOffset - headerH - 24;
  window.scrollTo({ top, behavior: 'smooth' });
  history.pushState(null, '', '#' + id);
});
