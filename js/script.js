const MOBILE_BREAKPOINT = 860;

function openGameDetails() {
  const overlay = document.getElementById("game-detalhes");
  if (!overlay) {
    return;
  }

  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    overlay.style.width = "100%";
    return;
  }

  const sidebar = document.getElementById("lateral");
  const sidebarWidth = sidebar ? Math.round(sidebar.getBoundingClientRect().width) : 314;
  overlay.style.width = `calc(100% - ${sidebarWidth}px)`;
}

function closeGameDetails() {
  const overlay = document.getElementById("game-detalhes");
  if (overlay) {
    overlay.style.width = "0";
  }
}

function openPostDetails() {
  const overlay = document.getElementById("post-detalhes");
  if (overlay) {
    overlay.style.height = "100%";
  }
}

function closePostDetails() {
  const overlay = document.getElementById("post-detalhes");
  if (overlay) {
    overlay.style.height = "0";
  }
}

window.games = openGameDetails;
window.closeNav = closeGameDetails;
window.post = openPostDetails;
window.closePost = closePostDetails;

function setResultState(resultEl, message, isError) {
  if (!resultEl) {
    return;
  }

  resultEl.textContent = message;
  resultEl.classList.add("visible");
  resultEl.classList.toggle("error", Boolean(isError));
}

function payloadFromForm(form, kind) {
  const data = new FormData(form);

  if (kind === "newsletter") {
    return {
      email: data.get("emailNews") || data.get("email") || "",
      _subject: "Nova inscricao na newsletter - Loxodonta",
      _template: "table",
      _captcha: "false"
    };
  }

  return {
    name: data.get("seunome") || data.get("name") || "",
    email: data.get("seuemail") || data.get("email") || "",
    message: data.get("mensagem") || data.get("message") || "",
    _subject: "Novo contato via site - Loxodonta",
    _template: "table",
    _captcha: "false"
  };
}

async function submitStaticForm(form) {
  const resultTarget = form.dataset.resultTarget || "";
  const resultEl = form.querySelector(".form-result") || (resultTarget ? document.querySelector(resultTarget) : null);
  const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
  const kind = form.dataset.formKind || "contact";
  const formEmail = form.dataset.formEmail || "loxodonta@loxodonta.com.br";
  const loadingText = form.dataset.loading || "Enviando...";
  const successText = form.dataset.success || "Enviado com sucesso!";
  const errorText = form.dataset.error || "Nao foi possivel enviar agora. Tente novamente.";
  const hideContainerSelector = form.dataset.hideOnSuccess || "";

  if (submitButton) {
    submitButton.disabled = true;
  }
  setResultState(resultEl, loadingText, false);

  try {
    const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(formEmail)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payloadFromForm(form, kind))
    });

    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok || responseBody.success === false) {
      throw new Error(responseBody.message || "submit_error");
    }

    setResultState(resultEl, successText, false);
    form.reset();

    if (hideContainerSelector) {
      const container = document.querySelector(hideContainerSelector);
      if (container) {
        container.style.display = "none";
      }
    }
  } catch (error) {
    setResultState(resultEl, errorText, true);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
}

function setupForms() {
  const forms = document.querySelectorAll("form.js-static-form");
  if (forms.length === 0) {
    return;
  }

  forms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitStaticForm(form);
    });
  });
}

function setupMobileMenu() {
  const lateral = document.getElementById("lateral");
  if (!lateral) {
    return;
  }

  const toggleButton = lateral.querySelector(".menu-toggle");
  const menu = lateral.querySelector("ul");
  if (!toggleButton || !menu) {
    return;
  }

  toggleButton.addEventListener("click", () => {
    const isOpen = lateral.classList.toggle("open");
    toggleButton.setAttribute("aria-expanded", String(isOpen));
  });

  menu.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= MOBILE_BREAKPOINT) {
        lateral.classList.remove("open");
        toggleButton.setAttribute("aria-expanded", "false");
      }
    });
  });
}

function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") {
        return;
      }

      const targetId = hash.slice(1);
      const target = document.getElementById(targetId);
      if (!target) {
        return;
      }

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupMobileMenu();
  setupSmoothScroll();
  setupForms();
});
