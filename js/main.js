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
    limit: 2,
    items: ['Creme de Ninho', 'Creme de Morango', 'Creme de Cookies', 'Creme de Avelã'],
  },
  {
    name: 'Frutas',
    limit: 1,
    items: ['Morango', 'Banana', 'Uva'],
  },
  {
    name: 'Complementos',
    limit: 2,
    items: ['Granola', 'Paçoca', 'Castanha Triturada', 'Disquete', 'Chocolate Granulado', 'Gotas de Chocolate', 'Leite em Pó', 'Leite Condensado', 'Marshmallow', 'Jujuba', 'Cereja', 'Ovo Maltine'],
  },
  {
    name: 'Coberturas',
    limit: 1,
    items: ['Cobertura de Morango', 'Cobertura de Chocolate'],
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
const cartCustomerEl = document.getElementById('cartCustomer');
const cartFooterEl = document.getElementById('cartFooter');
const cartTotalEl = document.getElementById('cartTotal');
const cartFabCount = document.getElementById('cartFabCount');
const customerFields = {
  name: document.getElementById('customerName'),
  address: document.getElementById('customerAddress'),
  neighborhood: document.getElementById('customerNeighborhood'),
  reference: document.getElementById('customerReference'),
  payment: document.getElementById('customerPayment'),
};

try {
  const savedCustomer = JSON.parse(localStorage.getItem('ljCustomer')) || {};
  Object.entries(customerFields).forEach(([key, field]) => {
    field.value = savedCustomer[key] || '';
    field.addEventListener('input', saveCustomer);
    field.addEventListener('change', saveCustomer);
  });
} catch (e) {
  Object.values(customerFields).forEach((field) => {
    field.addEventListener('input', saveCustomer);
    field.addEventListener('change', saveCustomer);
  });
}

function saveCustomer() {
  try {
    const customer = Object.fromEntries(Object.entries(customerFields).map(([key, field]) => [key, field.value.trim()]));
    localStorage.setItem('ljCustomer', JSON.stringify(customer));
  } catch (e) {}
}

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
        <h4>${group.name}${group.limit ? ` (máx. ${group.limit})` : ''}</h4>
      </div>
      ${group.items.map((item) => `
        <label class="addon-item">
          <input type="checkbox" value="${item}" data-group="${group.name}">
          <span class="addon-name">${item}</span>
        </label>
      `).join('')}
    </div>
  `).join('');

  const limitNotice = document.createElement('div');
  limitNotice.className = 'addon-limit-notice';
  limitNotice.textContent = 'Escolha até o limite de cada categoria.';
  modalBody.appendChild(limitNotice);

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

  const selectedByGroup = {};
  modalBody.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    if (cb.checked) {
      const groupName = cb.dataset.group;
      selectedByGroup[groupName] = (selectedByGroup[groupName] || 0) + 1;
    }
  });

  modalBody.querySelectorAll('.addon-item').forEach((label) => {
    const cb = label.querySelector('input');
    const group = ADDON_GROUPS.find((item) => item.name === cb.dataset.group);
    const groupLimit = group && group.limit ? group.limit : Number.POSITIVE_INFINITY;
    const atLimit = current.selected.length >= current.free && !cb.checked;
    const atGroupLimit = selectedByGroup[group.name] >= groupLimit && !cb.checked;
    const disable = atLimit || atGroupLimit;

    cb.disabled = disable;
    label.classList.toggle('disabled', disable);

    if (atGroupLimit && !cb.checked) {
      label.title = `Limite de ${group.name.toLowerCase()}: ${groupLimit}`;
    } else {
      label.title = '';
    }
  });

  updateHint();
}

function updateHint() {
  const n = current.selected.length;
  const cremaGroup = ADDON_GROUPS.find((group) => group.name === 'Cremes');
  const frutaGroup = ADDON_GROUPS.find((group) => group.name === 'Frutas');
  const complementoGroup = ADDON_GROUPS.find((group) => group.name === 'Complementos');
  const coberturaGroup = ADDON_GROUPS.find((group) => group.name === 'Coberturas');

  const cremaLimit = cremaGroup && cremaGroup.limit ? cremaGroup.limit : 0;
  const frutaLimit = frutaGroup && frutaGroup.limit ? frutaGroup.limit : 0;
  const complementoLimit = complementoGroup && complementoGroup.limit ? complementoGroup.limit : 0;
  const coberturaLimit = coberturaGroup && coberturaGroup.limit ? coberturaGroup.limit : 0;

  modalHint.innerHTML = `Máximo: <strong>${cremaLimit}</strong> cremes, <strong>${frutaLimit}</strong> fruta, <strong>${complementoLimit}</strong> complementos e <strong>${coberturaLimit}</strong> cobertura. <strong>${n}</strong> selecionados`;
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
  openOverlay(cartOverlay);
  showToast('Adicionado ao carrinho!');
});

// ---- Render do carrinho ----
function renderCart() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  cartFabCount.textContent = count;

  if (cart.length === 0) {
    cartItemsEl.innerHTML = '';
    cartItemsEl.style.display = 'none';
    cartEmptyEl.style.display = 'flex';
    cartCustomerEl.style.display = 'none';
    cartFooterEl.style.display = 'none';
  } else {
    cartItemsEl.style.display = 'flex';
    cartEmptyEl.style.display = 'none';
    cartCustomerEl.style.display = 'block';
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

function showToast(message) {
  const toast = document.getElementById('cartToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
}

// ---- Checkout WhatsApp ----
document.getElementById('checkout').addEventListener('click', () => {
  if (cart.length === 0) return;
  const customer = Object.fromEntries(Object.entries(customerFields).map(([key, field]) => [key, field.value.trim()]));
  const requiredFields = [customerFields.name, customerFields.address, customerFields.neighborhood, customerFields.payment];
  const missingField = requiredFields.find((field) => !field.value.trim());
  if (missingField) {
    missingField.focus();
    showToast('Preencha os dados da entrega.');
    return;
  }

  let msg = '*Novo pedido — Leão de Judá Açaí* 🍇\n\n';
  msg += `*Cliente:* ${customer.name}\n`;
  msg += `*Endereço:* ${customer.address}\n`;
  msg += `*Bairro:* ${customer.neighborhood}\n`;
  if (customer.reference) msg += `*Referência:* ${customer.reference}\n`;
  msg += `*Pagamento:* ${customer.payment}\n\n`;
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
document.getElementById('viewCartBtn').addEventListener('click', () => openOverlay(cartOverlay));
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
