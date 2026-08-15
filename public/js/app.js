(function () {
  'use strict';

  /* ---------- Geolocație ---------- */
  function saveLocation(lat, lng) {
    try { localStorage.setItem('aprozar-loc', lat + ',' + lng); } catch (e) { /* ignore */ }
    return fetch('/api/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng })
    });
  }

  /* Dacă am locația salvată în browser, dar serverul a pierdut-o (restart),
     o restabilim automat, fără să mai cerem permisiunea. */
  const locateCultivatorsBtn = document.getElementById('locateCultivators');
  const locateStoresBtn = document.getElementById('locateStores');
  if ((locateCultivatorsBtn || locateStoresBtn) && typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('aprozar-loc');
      if (saved) {
        const [slat, slng] = saved.split(',').map(parseFloat);
        if (!isNaN(slat) && !isNaN(slng)) {
          saveLocation(slat, slng).then(() => window.location.reload()).catch(() => {});
        }
      }
    } catch (e) { /* ignore */ }
  }

  function useLocation(successCb, errorMsg) {
    if (!navigator.geolocation) {
      alert('Browserul tău nu suportă locația.');
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try { await saveLocation(latitude, longitude); } catch (e) { /* ignore */ }
      if (successCb) successCb(latitude, longitude);
    }, () => {
      if (errorMsg) alert(errorMsg);
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  /* ---------- Cel mai apropiat magazin Dor de Casă ---------- */
  const nearestBtn = document.getElementById('nearestStoreBtn');
  if (nearestBtn) {
    nearestBtn.addEventListener('click', () => {
      nearestBtn.disabled = true;
      nearestBtn.querySelector('span') && (nearestBtn.querySelector('span').textContent = 'Se caută…');
      useLocation(async (lat, lng) => {
        const res = await fetch('/magazine?nearest=1&lat=' + lat + '&lng=' + lng, { headers: { Accept: 'application/json' } });
        const data = await res.json();
        const result = document.getElementById('nearestStoreResult');
        if (result && data.store) {
          document.getElementById('nsName').textContent = data.store.name + ' — ' + data.store.city;
          document.getElementById('nsAddr').textContent = data.store.county + ' · ' + data.store.address;
          document.getElementById('nsDist').textContent = '🚗 la ' + data.store.distanceLabel;
          result.classList.remove('hidden');
          result.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        nearestBtn.disabled = false;
        nearestBtn.querySelector('span') && (nearestBtn.querySelector('span').textContent = 'Magazinul cel mai apropiat');
      }, 'Nu am putut obține locația. Verifică permisiunile browserului.');
    });
  }

  const locateStores = document.getElementById('locateStores');
  if (locateStores) {
    locateStores.addEventListener('click', () => {
      useLocation(() => window.location.reload(), 'Nu am putut obține locația.');
    });
  }

  const locateCultivators = document.getElementById('locateCultivators');
  if (locateCultivators) {
    locateCultivators.addEventListener('click', () => {
      locateCultivators.disabled = true;
      locateCultivators.querySelector('span') && (locateCultivators.querySelector('span').textContent = 'Se caută…');
      useLocation(() => window.location.reload(), 'Nu am putut obține locația. Verifică permisiunile browserului.');
    });
  }

  /* ---------- Coș ---------- */
  async function postJSON(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    return res.json();
  }

  function updateBadge(count) {
    const cartLink = document.querySelector('.icon-btn[href="/cumparaturi"]');
    if (!cartLink) return;
    let badge = cartLink.querySelector('.badge-cart');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'badge-dot badge-cart';
        cartLink.appendChild(badge);
      }
      badge.textContent = count;
    } else if (badge) {
      badge.remove();
    }
  }

  document.addEventListener('click', async (e) => {
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) {
      e.preventDefault();
      const productId = addBtn.dataset.add;
      const btn = addBtn;
      btn.classList.add('adding');
      const data = await postJSON('/api/cart/add', { productId });
      if (data.ok) {
        btn.classList.remove('adding');
        btn.classList.add('added');
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = '+'; btn.classList.remove('added'); }, 1200);
        updateBadge(data.count);
        const totalEl = document.getElementById('cartTotal');
        if (totalEl && data.total) totalEl.textContent = data.total + ' lei';
      } else {
        alert(data.error || 'Nu am putut adăuga produsul.');
        btn.classList.remove('adding');
      }
      return;
    }

    const incBtn = e.target.closest('[data-inc]');
    if (incBtn) {
      const id = incBtn.dataset.inc;
      const input = document.querySelector('[data-qty="' + id + '"]');
      if (input) {
        input.value = (parseFloat(input.value) || 0) + 1;
        updateQty(id, input.value);
      }
      return;
    }

    const decBtn = e.target.closest('[data-dec]');
    if (decBtn) {
      const id = decBtn.dataset.dec;
      const input = document.querySelector('[data-qty="' + id + '"]');
      if (input) {
        input.value = Math.max(0, (parseFloat(input.value) || 0) - 1);
        updateQty(id, input.value);
      }
      return;
    }
  });

  async function updateQty(id, qty) {
    const data = await postJSON('/api/cart/set', { productId: id, qty });
    if (data.ok) {
      if (data.total) {
        const totalEl = document.getElementById('cartTotal');
        if (totalEl) totalEl.textContent = data.total + ' lei';
      }
      updateBadge(data.count);
      if (qty <= 0) {
        const item = document.querySelector('[data-item="' + id + '"]');
        if (item) item.remove();
        if (document.querySelectorAll('.cart-item').length === 0) window.location.reload();
      } else {
        const input = document.querySelector('[data-qty="' + id + '"]');
        const lineEl = document.querySelector('[data-line="' + id + '"]');
        if (input && lineEl) {
          const price = parseFloat(input.dataset.price) || 0;
          lineEl.textContent = (qty * price).toFixed(2) + ' lei';
        }
      }
    }
  }

  document.querySelectorAll('.qty-input').forEach(input => {
    input.addEventListener('change', () => updateQty(input.dataset.qty, parseFloat(input.value) || 0));
  });

  const clearCart = document.getElementById('clearCart');
  if (clearCart) {
    clearCart.addEventListener('click', async () => {
      if (!confirm('Golești coșul de cumpărături?')) return;
      await postJSON('/api/cart/clear');
      window.location.reload();
    });
  }

  const placeOrder = document.getElementById('placeOrder');
  if (placeOrder) {
    placeOrder.addEventListener('click', async () => {
      placeOrder.disabled = true;
      placeOrder.textContent = 'Se trimite…';
      try {
        const data = await postJSON('/api/cart/order');
        if (data.ok) {
          updateBadge(0);
          const waText = encodeURIComponent('Bună ziua! Aș dori să comand din Aprozar Românesc. Comanda mea a fost înregistrată cu succes.');
          window.location.href = 'https://wa.me/40700000000?text=' + waText;
        } else {
          alert(data.error || 'Nu am putut plasa comanda.');
          if (data.error && data.error.includes('autentificat')) {
            window.location.href = '/login?next=/cumparaturi';
          }
          placeOrder.disabled = false;
          placeOrder.textContent = 'Trimite comanda la producători';
        }
      } catch (e) {
        alert('A apărut o eroare. Încearcă din nou.');
        placeOrder.disabled = false;
        placeOrder.textContent = 'Trimite comanda la producători';
      }
    });
  }

  /* ---------- Filtre ---------- */
  const filterToggle = document.getElementById('filterToggle');
  const filterDrawer = document.getElementById('filterDrawer');
  if (filterToggle && filterDrawer) {
    filterToggle.addEventListener('click', () => filterDrawer.classList.toggle('hidden'));
  }

  /* ---------- Share prin WhatsApp ---------- */
  const shareWaBtn = document.getElementById('shareWa');
  if (shareWaBtn) {
    shareWaBtn.addEventListener('click', () => {
      const pageUrl = window.location.href;
      const text = 'Aprozar Românesc — produse 100% românești, direct de la țară: ' + pageUrl;
      const waUrl = 'https://wa.me/?text=' + encodeURIComponent(text);
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    });
  }

  /* ---------- Fundal verde închis ---------- */
  const themeToggle = document.getElementById('themeToggle');
  const appShell = document.querySelector('.app-shell');
  if (themeToggle && appShell) {
    const KEY = 'aprozar-theme';
    function applyTheme(dark) {
      document.body.classList.toggle('dark-green-mode', dark);
      appShell.classList.toggle('dark-green', dark);
      themeToggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
      themeToggle.querySelector('.icon-moon').classList.toggle('hidden', dark);
      themeToggle.querySelector('.icon-sun').classList.toggle('hidden', !dark);
    }
    let dark = localStorage.getItem(KEY) === '1';
    applyTheme(dark);
    themeToggle.addEventListener('click', () => {
      dark = !dark;
      localStorage.setItem(KEY, dark ? '1' : '0');
      applyTheme(dark);
    });
  }

  /* ---------- Card cultivator: recenzii expandabile ---------- */
  document.querySelectorAll('.cultivator-card').forEach(card => {
    const toggle = card.querySelector('.cultivator-reviews-toggle');
    const reviews = card.querySelector('.cultivator-reviews');
    const close = card.querySelector('.cult-reviews-close');
    if (!toggle || !reviews) return;
    function setOpen(open) {
      card.classList.toggle('reviews-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      reviews.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    function scrollToSection(sel) {
      const target = card.querySelector(sel);
      if (target && reviews) {
        reviews.scrollTo({ top: target.offsetTop - 10, behavior: 'smooth' });
      }
    }
    toggle.addEventListener('click', () => setOpen(!card.classList.contains('reviews-open')));
    if (close) close.addEventListener('click', () => setOpen(false));
    card.querySelectorAll('[data-open-card]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        setOpen(true);
        const where = el.getAttribute('data-open-card');
        if (where === 'announcements') scrollToSection('.cult-announcements');
        else if (where === 'reviews') scrollToSection('.cult-reviews-list');
      });
    });
  });

  /* ---------- Lightbox avatar producător ---------- */
  const lightbox = document.getElementById('img-lightbox');
  if (lightbox) {
    const lbImg = document.getElementById('img-lightbox-img');
    const lbClose = document.getElementById('img-lightbox-close');
    function openLightbox(src) {
      lbImg.src = src;
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
      lightbox.hidden = true;
      document.body.style.overflow = '';
      lbImg.src = '';
    }
    lbClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
    document.querySelectorAll('.cultivator-avatar img, .cult-hero-avatar img').forEach(av => {
      av.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const src = av.getAttribute('src');
        if (src) openLightbox(src);
      });
    });
  }

  /* ---------- Re-comandă rapidă (ultimii cultivatori) ---------- */
  const reorderBtn = document.querySelector('[data-reorder]');
  if (reorderBtn) {
    reorderBtn.addEventListener('click', async () => {
      reorderBtn.disabled = true;
      try {
        const data = await postJSON('/api/cart/reorder', {});
        if (data.ok) {
          updateBadge(data.count);
          reorderBtn.textContent = '✓ Adăugat în coș';
          setTimeout(() => {
            reorderBtn.textContent = '⚡ Comandă rapid ca și ultima dată';
            reorderBtn.disabled = false;
          }, 1500);
        } else {
          alert(data.error || 'Nu am putut re-comanda.');
          reorderBtn.disabled = false;
        }
      } catch (err) {
        alert('Nu am putut re-comanda.');
        reorderBtn.disabled = false;
      }
    });
  }

  /* ---------- Autentificare rapidă (Recumpără Rapid) ---------- */
  const quickLoginModal = document.getElementById('quick-login-modal');
  if (quickLoginModal) {
    const form = document.getElementById('quick-login-form');
    const errEl = form.querySelector('.quick-login-error');
    const btn = document.getElementById('quick-login-btn');
    const openBtn = document.querySelector('[data-quick-login]');

    function openModal() {
      quickLoginModal.hidden = false;
      document.body.style.overflow = 'hidden';
      const inp = form.querySelector('[name="identifier"]');
      if (inp) inp.focus();
    }
    function closeModal() {
      quickLoginModal.hidden = true;
      document.body.style.overflow = '';
      errEl.hidden = true;
    }

    if (openBtn) openBtn.addEventListener('click', openModal);
    quickLoginModal.querySelectorAll('[data-modal-close]').forEach(el => el.addEventListener('click', closeModal));
    quickLoginModal.addEventListener('click', (e) => { if (e.target === quickLoginModal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.hidden = true;
      btn.disabled = true;
      btn.textContent = 'Se verifică…';
      try {
        const res = await fetch('/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: new URLSearchParams(new FormData(form)).toString()
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          window.location.href = data.redirect || '/';
          return;
        }
        errEl.textContent = data.error || 'Nu am putut face autentificarea.';
        errEl.hidden = false;
        btn.disabled = false;
        btn.textContent = 'Intră în cont';
      } catch (err) {
        errEl.textContent = 'A apărut o eroare. Încearcă din nou.';
        errEl.hidden = false;
        btn.disabled = false;
        btn.textContent = 'Intră în cont';
      }
    });
  }
})();
