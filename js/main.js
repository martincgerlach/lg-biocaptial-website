const frame = document.querySelector(".site-frame");
const menuButton = document.querySelector(".menu-button");
const navLinks = document.querySelectorAll(".site-nav a");
const form = document.querySelector("#contact-form");
const statusMessage = document.querySelector("#form-status");

if (frame && menuButton) {
  menuButton.addEventListener("click", () => {
    const isOpen = frame.classList.toggle("nav-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    frame?.classList.remove("nav-open");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "Open navigation");
  });
});

if (form && statusMessage) {
  const submitButton = form.querySelector('button[type="submit"]');
  const placeholderKeys = new Set(["", "YOUR_WEB3FORMS_ACCESS_KEY"]);

  const setStatus = (message, type = "info") => {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("is-error", type === "error");
    statusMessage.classList.toggle("is-success", type === "success");
  };

  const buildMailtoUrl = (formData) => {
    const recipient = form.dataset.recipientEmail || "lene.gerlach@gmail.com";
    const firstName = String(formData.get("name") || "").trim();
    const lastName = String(formData.get("last_name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const subject = "New message from LG BioCapital website";
    const body = [
      `Name: ${fullName || "Not provided"}`,
      `Email: ${email || "Not provided"}`,
      "",
      "Message:",
      message,
    ].join("\n");

    return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);

    if (formData.get("botcheck")) {
      return;
    }

    const accessKey = String(formData.get("access_key") || "").trim();
    const endpoint = form.dataset.formEndpoint;

    if (endpoint && !placeholderKeys.has(accessKey)) {
      submitButton?.setAttribute("disabled", "true");
      setStatus("Sending your message...");

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
          headers: {
            Accept: "application/json",
          },
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.success === false) {
          throw new Error(result.message || "The message could not be sent.");
        }

        form.reset();
        setStatus("Thank you. Your message has been sent.", "success");
      } catch (error) {
        setStatus("Something went wrong. Please email Lene directly instead.", "error");
      } finally {
        submitButton?.removeAttribute("disabled");
      }

      return;
    }

    window.location.href = buildMailtoUrl(formData);
    setStatus("Your email app should open with the message. Press send there to deliver it.");
  });
}
