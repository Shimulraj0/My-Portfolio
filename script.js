// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// Page-load animations (hero section)
gsap.from(".hero-title", {
  duration: 1,
  y: -50,
  opacity: 0,
  ease: "bounce.out",
});
gsap.from(".hero-subtitle", {
  duration: 1,
  delay: 0.4,
  y: 50,
  opacity: 0,
  ease: "power2.out",
});

// Scroll-triggered section animations
document.querySelectorAll("section").forEach((sec) => {
  const header = sec.querySelector("h2");
  if (header) {
    gsap.from(header, {
      scrollTrigger: {
        trigger: sec,
        start: "top 85%",
        toggleActions: "play none none none",
      },
      opacity: 0,
      y: 30,
      duration: 0.8,
    });
  }

  const items = sec.querySelectorAll("p, li, img, .project-card");
  if (items.length) {
    gsap.from(items, {
      scrollTrigger: {
        trigger: sec,
        start: "top 85%",
        toggleActions: "play none none none",
      },
      opacity: 0,
      y: 20,
      stagger: 0.2,
      duration: 0.8,
    });
  }
});

// Optional: Scroll-scrubbed animation on project cards
gsap.timeline({
  scrollTrigger: {
    trigger: ".projects",
    start: "top center",
    end: "bottom center",
    scrub: true,
    pin: false,
  },
}).from(".project-card", {
  x: -100,
  opacity: 0,
  stagger: 0.2,
  ease: "power1.out",
});
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
