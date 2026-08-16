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
  function hasLocationCookie() {
    return document.cookie.split(';').some(c => c.trim().startsWith('aprozar_loc='));
  }
  const locateCultivatorsBtn = document.getElementById('locateCultivators');
  const locateStoresBtn = document.getElementById('locateStores');
  if ((locateCultivatorsBtn || locateStoresBtn) && typeof localStorage !== 'undefined' && !hasLocationCookie()) {
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

  /* ---------- Distribuie aplicația (share nativ + fallback) ---------- */
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const pageUrl = window.location.href;
      const text = 'Aprozar Românesc — produse 100% românești, direct de la țară';
      const data = { title: 'Aprozar Românesc', text, url: pageUrl };
      if (navigator.share) {
        try {
          await navigator.share(data);
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text + ' ' + pageUrl);
          if (window.toast) window.toast('Link copiat în clipboard');
          else alert('Link copiat în clipboard');
          return;
        } catch (err) {}
      }
      window.open('mailto:?subject=' + encodeURIComponent(data.title) + '&body=' + encodeURIComponent(text + ' ' + pageUrl), '_blank');
    });
  }

  /* ---------- Mărimea textului (A - 4 poziții, de la mic la mare) ---------- */
  const fsBtns = document.querySelectorAll('.fs-btn');
  if (fsBtns.length) {
    const FS_KEY = 'aprozar-fs';
    function applyFs(level) {
      document.documentElement.style.setProperty('--fs', String(level));
      try { localStorage.setItem(FS_KEY, String(level)); } catch (e) { /* ignore */ }
      fsBtns.forEach(b => b.classList.toggle('active', parseFloat(b.dataset.fs) === level));
    }
    const saved = parseFloat(localStorage.getItem(FS_KEY) || '1');
    const savedIdx = [...fsBtns].findIndex(b => parseFloat(b.dataset.fs) === saved);
    fsBtns.forEach((b, i) => {
      b.addEventListener('click', () => {
        applyFs(parseFloat(b.dataset.fs));
        fsBtns.forEach((x, j) => x.setAttribute('aria-pressed', String(j === i)));
      });
      b.setAttribute('aria-pressed', String(i === (savedIdx >= 0 ? savedIdx : 1)));
    });
    applyFs(savedIdx >= 0 ? saved : 1);
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
    document.querySelectorAll('.cultivator-avatar img, .cult-hero-avatar img, .cart-thumb img, .pcard-img img, .cult-product img, .cult-hero-cover img, .farmer-photo img, .pc-avatar img').forEach(av => {
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

  /* ---------- Organizare categorii (alfabetic / fixate sus) ---------- */
  const catGrid = document.getElementById('catGrid');
  if (catGrid) {
    const SORT_KEY = 'aprozar-cat-sort';
    const PIN_KEY = 'aprozar-cat-pins';
    const sortToggle = document.getElementById('catSortToggle');
    const pinHint = document.getElementById('catPinHint');

    function readPins() {
      try {
        const pins = JSON.parse(localStorage.getItem(PIN_KEY) || '[]');
        return Array.isArray(pins) ? pins : [];
      } catch (e) { return []; }
    }
    function savePins(pins) {
      try { localStorage.setItem(PIN_KEY, JSON.stringify(pins)); } catch (e) { /* ignore */ }
    }
    function currentSort() {
      return localStorage.getItem(SORT_KEY) === 'alpha' ? 'alpha' : 'pin';
    }

    function render() {
      const cards = Array.from(catGrid.querySelectorAll('.cat-grid-card'));
      const sort = currentSort();
      const pins = readPins();

      sortToggle.querySelectorAll('.cat-sort-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.sort === sort);
      });
      pinHint.style.display = sort === 'pin' ? '' : 'none';

      cards.forEach(card => {
        const isPinned = pins.includes(card.dataset.cat);
        card.classList.toggle('pinned', isPinned);
        const btn = card.querySelector('.cat-pin-btn');
        btn.classList.toggle('pinned', isPinned);
        btn.title = isPinned ? 'De-fixează' : 'Fixează sus';
      });

      if (sort === 'alpha') {
        cards.sort((a, b) => a.dataset.cat.localeCompare(b.dataset.cat, 'ro'));
      } else {
        cards.sort((a, b) => {
          const pa = pins.indexOf(a.dataset.cat);
          const pb = pins.indexOf(b.dataset.cat);
          if (pa === -1 && pb === -1) return 0;
          if (pa === -1) return 1;
          if (pb === -1) return -1;
          return pa - pb;
        });
      }
      cards.forEach(card => catGrid.appendChild(card));
    }

    catGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-pin-btn');
      if (!btn) return;
      const name = btn.dataset.pin;
      const pins = readPins();
      const idx = pins.indexOf(name);
      if (idx === -1) pins.push(name); else pins.splice(idx, 1);
      savePins(pins);
      if (currentSort() !== 'pin') localStorage.setItem(SORT_KEY, 'pin');
      render();
      pinHint.classList.add('shown');
      pinHint.textContent = idx === -1
        ? '✅ „' + name + '" e fixată sus'
        : '„' + name + '" a fost de-fixată';
    });

    sortToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-sort-btn');
      if (!btn) return;
      localStorage.setItem(SORT_KEY, btn.dataset.sort);
      render();
    });

    render();
  }

  /* ---------- Adaugă produs rapid (pagina principală) ---------- */
  const producerAddToggle = document.getElementById('producerAddToggle');
  const producerAddForm = document.getElementById('producerAddForm');
  const paCategory = document.getElementById('paCategory');
  const paProduct = document.getElementById('paProduct');
  const paCustomWrap = document.getElementById('paCustomWrap');
  const paCustomName = document.getElementById('paCustomName');
  const paPrice = document.getElementById('paPrice');
  const paUnit = document.getElementById('paUnit');
  const paSubmit = document.getElementById('paSubmit');
  const paStatus = document.getElementById('paStatus');

  const PRODUCT_SUGGESTIONS = {
    'Legume': ['Roșii', 'Castraveți', 'Ardei gras', 'Ardei iute', 'Salată verde', 'Spanac', 'Morcovi', 'Varză', 'Vinete', 'Dovlecei', 'Fasole verde', 'Mazăre', 'Ceapă verde', 'Usturoi', 'Pătrunjel', 'Mărar'],
    'Cartofi și ceapă': ['Cartofi noi', 'Cartofi roșii', 'Cartofi galbeni', 'Ceapă roșie', 'Ceapă galbenă', 'Ceapă albă', 'Ceapă verde', 'Usturoi'],
    'Fructe': ['Mere', 'Pere', 'Prune', 'Căpșuni', 'Zmeură', 'Afine', 'Cireșe', 'Vișine', 'Struguri', 'Caise', 'Piersici', 'Pepene roșu', 'Pepene galben', 'Gutui'],
    'Lactate': ['Lapte de vacă', 'Lapte de capră', 'Telemea', 'Brânză de vaci', 'Cașcaval', 'Smântână', 'Iaurt', 'Urdă', 'Chefir', 'Unt'],
    'Cereale': ['Grâu', 'Porumb', 'Ovăz', 'Secară', 'Orz', 'Făină de grâu', 'Făină de porumb', 'Mălai', 'Fulgi de ovăz'],
    'Panificație': ['Pâine de casă', 'Pâine cu maia', 'Pâine integrală', 'Covrigi', 'Colaci', 'Cozonac', 'Plăcintă', 'Lipie', 'Chifle'],
    'Miere și dulciuri': ['Miere de salcâm', 'Miere de tei', 'Miere polifloră', 'Propolis', 'Polen', 'Fagure', 'Ceară'],
    'Dulcețuri': ['Dulceață de căpșuni', 'Dulceață de prune', 'Dulceață de zmeură', 'Dulceață de caise', 'Gem de fructe', 'Sirop'],
    'Carne și ouă': ['Ouă de găină', 'Ouă de prepeliță', 'Piept de pui', 'Pulpă de porc', 'Carne tocată', 'Cârnați', 'Slănină', 'Pui întreg', 'Iepure', 'Curcan'],
    'Pește': ['Păstrăv', 'Crap', 'Șalău', 'Somn', 'Sânger', 'Biban', 'Știucă', 'Creveți', 'Midii'],
    'Conserve și murături': ['Murături asortate', 'Castraveți murați', 'Varză murată', 'Zacuscă', 'Gogoșari', 'Compot', 'Bulion', 'Roșii bulion', 'Gem conservat'],
    'Băuturi naturale': ['Suc de mere', 'Suc de struguri', 'Must', 'Sirop de soc', 'Limonadă', 'Compot de fructe', 'Băutură din mentă'],
    'Plante și ceaiuri': ['Mentă', 'Mușețel', 'Sunătoare', 'Lavandă', 'Cimbru', 'Rozmarin', 'Salvie', 'Tei', 'Urzici', 'Răsaduri'],
    'Altele': ['Nuci', 'Semințe', 'Flori', 'Plante decorative', 'Răsaduri', 'Săpun natural']
  };

  if (producerAddToggle && producerAddForm) {
    const chev = document.getElementById('producerAddChev');

    producerAddToggle.addEventListener('click', () => {
      const open = !producerAddForm.classList.contains('hidden');
      producerAddForm.classList.toggle('hidden', open);
      producerAddToggle.classList.toggle('open', !open);
      producerAddToggle.setAttribute('aria-expanded', String(!open));
      if (chev) chev.textContent = open ? '▾' : '▴';
    });

    if (paCategory && paProduct) {
      paCategory.addEventListener('change', () => {
        const cat = paCategory.value;
        paProduct.innerHTML = '';
        const first = document.createElement('option');
        first.value = '';
        first.textContent = cat ? 'Alege produsul…' : 'Mai întâi alege categoria';
        paProduct.appendChild(first);
        paProduct.disabled = !cat;

        if (cat) {
          (PRODUCT_SUGGESTIONS[cat] || []).forEach(name => {
            const o = document.createElement('option');
            o.value = name;
            o.textContent = name;
            paProduct.appendChild(o);
          });
          const custom = document.createElement('option');
          custom.value = '__custom__';
          custom.textContent = '✏️ Alt produs (scrie tu)';
          paProduct.appendChild(custom);
        }

        paCustomWrap.classList.add('hidden');
        paCustomName.value = '';
      });

      paProduct.addEventListener('change', () => {
        const isCustom = paProduct.value === '__custom__';
        paCustomWrap.classList.toggle('hidden', !isCustom);
        if (isCustom) paCustomName.focus();
      });
    }

    if (paSubmit && paStatus) {
      paSubmit.addEventListener('click', async () => {
        const category = paCategory ? paCategory.value : '';
        const productValue = paProduct ? paProduct.value : '';
        const name = productValue === '__custom__' ? paCustomName.value.trim() : productValue;
        const price = paPrice ? paPrice.value : '';
        const unit = paUnit ? paUnit.value : 'kg';

        if (!category) { paStatus.textContent = 'Alege categoria.'; paStatus.className = 'pa-status pa-error'; return; }
        if (!name) { paStatus.textContent = 'Alege sau scrie produsul.'; paStatus.className = 'pa-status pa-error'; return; }
        if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) { paStatus.textContent = 'Introdu un preț valid.'; paStatus.className = 'pa-status pa-error'; return; }

        paStatus.textContent = 'Se publică…';
        paStatus.className = 'pa-status';
        paSubmit.disabled = true;

        try {
          const res = await fetch('/produs/nou', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
            },
            body: new URLSearchParams({
              name, category, price, unit,
              description: '',
              available: '1'
            }).toString()
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok) {
            paStatus.textContent = '✅ „' + data.name + '" a fost publicat!';
            paStatus.className = 'pa-status pa-ok';
            if (paCategory) paCategory.value = '';
            if (paProduct) { paProduct.innerHTML = ''; paProduct.disabled = true; }
            paCustomWrap.classList.add('hidden');
            paCustomName.value = '';
            if (paPrice) paPrice.value = '';
          } else {
            paStatus.textContent = data.error || 'Nu am putut publica produsul.';
            paStatus.className = 'pa-status pa-error';
          }
        } catch (err) {
          paStatus.textContent = 'A apărut o eroare. Încearcă din nou.';
          paStatus.className = 'pa-status pa-error';
        }
        paSubmit.disabled = false;
      });
    }
  }

  /* ---------- Adaugă povestea ta (producători) ---------- */
  const storyToggle = document.getElementById('storyToggle');
  const storyBox = document.getElementById('storyBox');
  const storyText = document.getElementById('storyText');
  const storySave = document.getElementById('storySave');
  const storyStatus = document.getElementById('storyStatus');
  if (storyToggle && storyBox) {
    storyToggle.addEventListener('click', () => {
      const open = !storyBox.classList.contains('hidden');
      storyBox.classList.toggle('hidden', open);
      storyToggle.classList.toggle('open', !open);
      storyToggle.setAttribute('aria-expanded', String(!open));
      if (!open && storyText) storyText.focus();
    });
    if (storySave && storyText && storyStatus) {
      storySave.addEventListener('click', async () => {
        const story = storyText.value.trim();
        if (!story) { storyStatus.textContent = 'Scrie întâi povestea ta.'; storyStatus.className = 'pa-status pa-error'; return; }
        storyStatus.textContent = 'Se salvează…';
        storyStatus.className = 'pa-status';
        storySave.disabled = true;
        try {
          const res = await fetch('/poveste', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
            body: new URLSearchParams({ story })
          });
          const data = await res.json();
          if (data.ok) {
            storyStatus.textContent = '✅ Povestea ta a fost salvată!';
            storyStatus.className = 'pa-status pa-ok';
            storyBox.classList.add('hidden');
            storyToggle.classList.remove('open');
            storyToggle.setAttribute('aria-expanded', 'false');
          } else {
            storyStatus.textContent = data.error || 'Nu am putut salva povestea.';
            storyStatus.className = 'pa-status pa-error';
          }
        } catch (e) {
          storyStatus.textContent = 'A apărut o eroare. Încearcă din nou.';
          storyStatus.className = 'pa-status pa-error';
        }
        storySave.disabled = false;
      });
    }
  }
})();
