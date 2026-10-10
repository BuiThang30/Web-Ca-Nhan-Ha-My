const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

// Mở / đóng menu trên mobile
navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Đánh dấu active theo route hiện tại (/home, /about, ...)
let currentPath = location.pathname.replace(/\/+$/, '');
if (currentPath === '') {
  currentPath = '/home';
}

navLinks.querySelectorAll('a').forEach((link) => {
  const isActive = link.getAttribute('href') === currentPath;

  link.classList.toggle('active', isActive);

  if (isActive) {
    link.setAttribute('aria-current', 'page');
  }
});