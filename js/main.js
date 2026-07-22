document.getElementById('year').textContent = new Date().getFullYear();

// Header shrink on scroll
const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 40);
});

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');
navToggle.addEventListener('click', () => {
  mainNav.classList.toggle('open');
});
mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mainNav.classList.remove('open'));
});

// Reveal on scroll
const revealEls = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('is-visible'), i * 60);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
revealEls.forEach(el => observer.observe(el));

/* ============================================
   CARRINHO ESTILO IFOOD
   ============================================ */

const WHATSAPP_NUMBER = '5585984820590';

// Grupos de adicionais disponíveis para montar o açaí
const ADDON_GROUPS = [
  {
    name: 'Cremes',
    items: ['Creme de Ninho', 'Creme de Morango', 'Creme de Cookies', 'Cobertura de Morango', 'Creme de Avelã'],
  },
  {
    name: 'Frutas',
    items: ['Morango', 'Banana', 'Uva'],
  },
  {
    name: 'Complementos',
    items: ['Granola', 'Paçoca', 'Castanha Triturada', 'Disquete', 'Gotas de Chocolate', 'Leite em Pó', 'Leite Condensado', 'Marshmallow', 'Jujuba', 'Cereja', 'Ovo Maltine'],
  },
];

const brl = (v) => 'R$ ' + v.toFixed(2).replace('.', ',');

// Estado
let cart = [];
try { cart = JSON.parse(localStorage.getItem('ljCart')) || []; } catch (e) { cart = []; }
let current = null; // produto sendo montado no modal

// Elementos
const productModal = document.getElementById('productModal');
const modalBody = document.getElementById('modalBody');
const modalTitle = document.getElementById('modalTitle');
const modalBasePrice = document.getElementById('modalBasePrice');
const modalHint = document.getElementById('modalHint');
const modalObs = document.getElementById('modalObs');
const qtyValue = document.getElementById('qtyValue');
const addToCartPrice = document.getElementById('addToCartPrice');

const cartOverlay = document.getElementById('cartOverlay');
const cartItemsEl = document.getElementById('cartItems');
const cartEmptyEl = document.getElementById('cartEmpty');
const cartFooterEl = document.getElementById('cartFooter');
const cartTotalEl = document.getElementById('cartTotal');
const cartFabCount = document.getElementById('cartFabCount');

// ---- Abrir modal ao clicar em "Adicionar" ----
document.querySelectorAll('.btn-add').forEach((btn) => {
  btn.addEventListener('click', () => {
    const card = btn.closest('[data-product]');
    openProductModal({
      name: card.dataset.product,
      price: parseFloat(card.dataset.price),
      free: parseInt(card.dataset.free, 10),
    });
  });
});

function openProductModal(product) {
  current = { ...product, qty: 1, selected: [] };

  modalTitle.textContent = product.name;
  modalBasePrice.textContent = brl(product.price);
  modalObs.value = '';
  qtyValue.textContent = '1';

  // Constrói os grupos de adicionais
  modalBody.innerHTML = ADDON_GROUPS.map((group) => `
    <div class="addon-group">
      <div class="addon-group-head">
        <h4>${group.name}</h4>
      </div>
      ${group.items.map((item) => `
        <label class="addon-item">
          <input type="checkbox" value="${item}">
          <span class="addon-name">${item}</span>
        </label>
      `).join('')}
    </div>
  `).join('');

  // Listeners dos checkboxes
  modalBody.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', onAddonChange);
  });

  updateHint();
  updateModalPrice();
  openOverlay(productModal);
}

function onAddonChange() {
  current.selected = [...modalBody.querySelectorAll('input:checked')].map((i) => i.value);
  // Bloqueia novas seleções ao atingir o limite grátis
  const atLimit = current.selected.length >= current.free;
  modalBody.querySelectorAll('.addon-item').forEach((label) => {
    const cb = label.querySelector('input');
    const disable = atLimit && !cb.checked;
    cb.disabled = disable;
    label.classList.toggle('disabled', disable);
  });
  updateHint();
}

function updateHint() {
  const n = current.selected.length;
  modalHint.innerHTML = `Escolha até <strong>${current.free}</strong> adicionais grátis — <strong>${n} de ${current.free}</strong> selecionados`;
}

function updateModalPrice() {
  const total = current.price * current.qty;
  addToCartPrice.textContent = brl(total);
}

// Quantidade no modal
document.getElementById('qtyPlus').addEventListener('click', () => {
  current.qty++;
  qtyValue.textContent = current.qty;
  updateModalPrice();
});
document.getElementById('qtyMinus').addEventListener('click', () => {
  if (current.qty > 1) {
    current.qty--;
    qtyValue.textContent = current.qty;
    updateModalPrice();
  }
});

// Adicionar ao carrinho
document.getElementById('addToCart').addEventListener('click', () => {
  cart.push({
    id: Date.now() + '-' + Math.round(performance.now()),
    name: current.name,
    price: current.price,
    qty: current.qty,
    free: current.free,
    addons: current.selected.slice(),
    obs: modalObs.value.trim(),
  });
  saveCart();
  renderCart();
  closeOverlay(productModal);
  bumpFab();
});

// ---- Render do carrinho ----
function renderCart() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  cartFabCount.textContent = count;

  if (cart.length === 0) {
    cartItemsEl.innerHTML = '';
    cartItemsEl.style.display = 'none';
    cartEmptyEl.style.display = 'flex';
    cartFooterEl.style.display = 'none';
  } else {
    cartItemsEl.style.display = 'flex';
    cartEmptyEl.style.display = 'none';
    cartFooterEl.style.display = 'block';

    cartItemsEl.innerHTML = cart.map((item) => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-top">
          <span class="cart-item-name">${item.name}</span>
          <span class="cart-item-price">${brl(item.price * item.qty)}</span>
        </div>
        ${item.addons.length ? `<p class="cart-item-addons">➕ ${item.addons.join(', ')}</p>` : '<p class="cart-item-addons">Sem adicionais</p>'}
        ${item.obs ? `<p class="cart-item-obs">"${item.obs}"</p>` : ''}
        <div class="cart-item-bottom">
          <div class="qty-control">
            <button type="button" class="qty-btn" data-act="minus" aria-label="Diminuir">−</button>
            <span class="qty-value">${item.qty}</span>
            <button type="button" class="qty-btn" data-act="plus" aria-label="Aumentar">+</button>
          </div>
          <button type="button" class="cart-item-remove" data-act="remove">Remover</button>
        </div>
      </div>
    `).join('');

    cartItemsEl.querySelectorAll('.cart-item').forEach((el) => {
      const id = el.dataset.id;
      el.querySelector('[data-act="plus"]').addEventListener('click', () => changeQty(id, 1));
      el.querySelector('[data-act="minus"]').addEventListener('click', () => changeQty(id, -1));
      el.querySelector('[data-act="remove"]').addEventListener('click', () => removeItem(id));
    });
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  cartTotalEl.textContent = brl(total);
}

function changeQty(id, delta) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty < 1) return removeItem(id);
  saveCart();
  renderCart();
}

function removeItem(id) {
  cart = cart.filter((i) => i.id !== id);
  saveCart();
  renderCart();
}

function saveCart() {
  try { localStorage.setItem('ljCart', JSON.stringify(cart)); } catch (e) {}
}

function bumpFab() {
  cartFabCount.classList.remove('bump');
  void cartFabCount.offsetWidth; // reinicia a animação
  cartFabCount.classList.add('bump');
}

// ---- Checkout WhatsApp ----
document.getElementById('checkout').addEventListener('click', () => {
  if (cart.length === 0) return;
  let msg = '*Novo pedido — Leão de Judá Açaí* 🍇\n\n';
  cart.forEach((item, idx) => {
    msg += `*${item.qty}x ${item.name}* — ${brl(item.price * item.qty)}\n`;
    msg += item.addons.length ? `Adicionais: ${item.addons.join(', ')}\n` : 'Sem adicionais\n';
    if (item.obs) msg += `Obs: ${item.obs}\n`;
    if (idx < cart.length - 1) msg += '\n';
  });
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  msg += `\n*Total: ${brl(total)}*`;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
});

// ---- Abrir/fechar overlays ----
function openOverlay(el) {
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
}
function closeOverlay(el) {
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
}

document.getElementById('cartFab').addEventListener('click', () => openOverlay(cartOverlay));
document.getElementById('cartClose').addEventListener('click', () => closeOverlay(cartOverlay));
document.getElementById('modalClose').addEventListener('click', () => closeOverlay(productModal));

// Fecha ao clicar fora
productModal.addEventListener('click', (e) => { if (e.target === productModal) closeOverlay(productModal); });
cartOverlay.addEventListener('click', (e) => { if (e.target === cartOverlay) closeOverlay(cartOverlay); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (productModal.classList.contains('open')) closeOverlay(productModal);
    else if (cartOverlay.classList.contains('open')) closeOverlay(cartOverlay);
  }
});

// Render inicial (recupera carrinho salvo)
renderCart();
