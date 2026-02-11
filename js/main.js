// Kontaktformular
const form = document.getElementById("contact-form");
const status = document.getElementById("status-message");

form.addEventListener("submit", function(e) {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message").value.trim();

  if (!name || !email || !message) {
    status.textContent = "Please fill out all fields.";
    status.style.color = "red";
    return;
  }

  status.textContent = "Thank you! Your message has been sent.";
  status.style.color = "green";

  form.reset();
});

// Scroll-animation for profiltekst
const profileText = document.querySelectorAll(".profile-content p");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.1 }
);

profileText.forEach(p => observer.observe(p));
