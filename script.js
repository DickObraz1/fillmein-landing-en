const landingConfig = {
  cartUrl: "https://www.dickobraz.cz/p/fill-me-in-gay-coloring-book?addtocart=1&quantity=1&return=cart",
  price: "399 Kč",
  cartButton: "Vložit do košíku",
  cartMissingNote: "Chybí Upgates URL. Doplň ji v administraci do pole URL košíku.",
  cartRedirecting: "Přesměrovávám..."
};

function setText(selector, value) {
  const element = document.querySelector(selector);

  if (element && typeof value === "string") {
    element.textContent = value;
  }
}

function applyContent(content) {
  Object.assign(landingConfig, {
    cartUrl: content.cartUrl || "",
    price: content.price || landingConfig.price,
    cartButton: content.cartButton || landingConfig.cartButton,
    cartMissingNote: content.cartMissingNote || landingConfig.cartMissingNote,
    cartRedirecting: content.cartRedirecting || landingConfig.cartRedirecting
  });

  if (content.siteTitle) {
    document.title = content.siteTitle;
  }

  document.querySelectorAll("[data-content]").forEach((element) => {
    const key = element.dataset.content;

    if (typeof content[key] === "string") {
      element.textContent = content[key];
    }
  });

  if (Array.isArray(content.tickerItems) && content.tickerItems.length) {
    const ticker = document.querySelector("[data-ticker]");
    ticker.textContent = "";

    content.tickerItems.forEach((item) => {
      const itemNode = document.createElement("span");
      itemNode.textContent = item;
      ticker.append(itemNode);
    });
  }

  setText("[data-price]", landingConfig.price);
  setText("[data-cart-button]", landingConfig.cartButton);
  setText("[data-cart-note]", content.cartNote);
}

async function loadContent() {
  try {
    const response = await fetch("/api/content", { cache: "no-store" });

    if (response.ok) {
      applyContent(await response.json());
    }
  } catch (error) {
    applyContent(landingConfig);
  }
}

loadContent();

document.querySelectorAll("img[data-fallback]").forEach((image) => {
  const showFallback = () => {
    const fallback = document.createElement("div");
    fallback.className = "image-fallback";
    fallback.textContent = `${image.dataset.fallback} nahraď obrázkem v /assets`;
    image.replaceWith(fallback);
  };

  image.addEventListener("error", showFallback, { once: true });

  if (image.complete && image.naturalWidth === 0) {
    showFallback();
  }
});

const cartButton = document.querySelector("[data-cart-button]");
const cartNote = document.querySelector("[data-cart-note]");

cartButton.addEventListener("click", () => {
  if (!landingConfig.cartUrl) {
    cartNote.textContent = landingConfig.cartMissingNote;
    cartButton.focus();
    return;
  }

  cartButton.textContent = landingConfig.cartRedirecting;
  window.location.href = landingConfig.cartUrl;
});
