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
