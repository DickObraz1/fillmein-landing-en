const landingConfig = {
  cartUrl: "https://www.dickobraz.com/p/fill-me-in-gay-coloring-book?addtocart=1&quantity=1&return=cart",
  price: "11 €",
  cartButton: "Pre-order for 11 €",
  cartMissingNote: "Cart URL missing. Add it in the admin panel under Cart URL.",
  cartRedirecting: "Redirecting..."
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
  setText("button[data-cart-button]", landingConfig.cartButton);
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
    fallback.textContent = `${image.dataset.fallback} — replace with image in /assets`;
    image.replaceWith(fallback);
  };

  image.addEventListener("error", showFallback, { once: true });

  if (image.complete && image.naturalWidth === 0) {
    showFallback();
  }
});

const cartButtons = document.querySelectorAll("[data-cart-button]");
const cartNote = document.querySelector("[data-cart-note]");

cartButtons.forEach((cartButton) => {
  cartButton.addEventListener("click", (event) => {
    event.preventDefault();

    if (!landingConfig.cartUrl) {
      if (cartNote) cartNote.textContent = landingConfig.cartMissingNote;
      cartButton.focus();
      return;
    }

    window.location.href = landingConfig.cartUrl;
  });
});
