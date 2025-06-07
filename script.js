// Animate the intro text using anime.js
anime({
  targets: '#animated-text',
  translateY: [-50, 0],
  opacity: [0, 1],
  duration: 1500,
  easing: 'easeOutExpo'
});

// Fade in sections on scroll
const sections = document.querySelectorAll("section");
const options = {
  threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      anime({
        targets: entry.target,
        opacity: [0, 1],
        translateY: [40, 0],
        duration: 1000,
        easing: 'easeOutQuad'
      });
      observer.unobserve(entry.target); // Animate only once
    }
  });
}, options);

sections.forEach(section => {
  section.style.opacity = 0;
  observer.observe(section);
});
