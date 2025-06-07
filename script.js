// Animate hero heading
anime({
  targets: '#intro',
  translateY: [-50, 0],
  opacity: [0, 1],
  easing: 'easeOutExpo',
  duration: 1500
});

// Animate skill cards on load
anime({
  targets: '.skill-card',
  translateY: [50, 0],
  opacity: [0, 1],
  delay: anime.stagger(200, { start: 1000 }),
  duration: 1000,
  easing: 'easeOutQuad'
});

// Animate navbar on scroll
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 50) {
    navbar.style.backgroundColor = '#2c2c2c';
  } else {
    navbar.style.backgroundColor = '#1f1f1f';
  }
});
