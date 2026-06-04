const exportSelect = document.querySelector("[data-export-select]");
const exportButtons = document.querySelectorAll("[data-export-format]");
const slides = [...document.querySelectorAll(".slide")];

function slideName(slide, index) {
  const label = slide.getAttribute("aria-label") || `Slide ${index + 1}`;
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fillSelect() {
  slides.forEach((slide, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${index + 1}. ${slide.getAttribute("aria-label")}`;
    exportSelect.append(option);
  });
}

function addInlineDownloadButtons() {
  slides.forEach((slide, index) => {
    const panel = document.createElement("div");
    panel.className = "slide-downloads";
    panel.innerHTML = `
      <button type="button" data-inline-export="${index}" data-format="png">Stáhnout PNG</button>
      <button type="button" data-inline-export="${index}" data-format="jpg">Stáhnout JPG</button>
    `;
    slide.before(panel);
  });
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function inlineImages(clone) {
  const images = [...clone.querySelectorAll("img")];

  await Promise.all(images.map(async (image) => {
    const source = image.getAttribute("src");

    if (!source || source.startsWith("data:")) {
      return;
    }

    const absoluteUrl = new URL(source, window.location.href).href;
    const response = await fetch(absoluteUrl);
    const blob = await response.blob();
    image.setAttribute("src", await blobToDataUrl(blob));
  }));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function renderSlideBlob(slide, format) {
  const clone = slide.cloneNode(true);
  const width = slide.offsetWidth;
  const height = slide.offsetHeight;
  const styleText = await fetch("carousel.css").then((response) => response.text());

  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  clone.style.margin = "0";
  await inlineImages(clone);

  const html = `
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <style>${styleText}</style>
      </head>
      <body style="margin:0;background:transparent;">
        ${clone.outerHTML}
      </body>
    </html>
  `;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <foreignObject width="100%" height="100%">
        ${html}
      </foreignObject>
    </svg>
  `;

  const image = new Image();
  image.decoding = "async";
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = svgUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (format === "jpg") {
    context.fillStyle = "#c9e6e4";
    context.fillRect(0, 0, width, height);
  }

  context.drawImage(image, 0, 0);
  URL.revokeObjectURL(svgUrl);

  const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
  return new Promise((resolve) => canvas.toBlob(resolve, mimeType, 0.95));
}

async function exportSlide(slide, format) {
  const blob = await renderSlideBlob(slide, format);
  const extension = format === "jpg" ? "jpg" : "png";
  const filename = `fill-me-in-${slideName(slide, slides.indexOf(slide))}.${extension}`;
  downloadBlob(blob, filename);
}

async function withBusy(button, callback) {
  const allButtons = [...exportButtons, ...document.querySelectorAll("[data-inline-export]")];
  allButtons.forEach((item) => {
    item.disabled = true;
  });
  const originalText = button.textContent;
  button.textContent = "Připravuju...";

  try {
    await callback();
  } finally {
    button.textContent = originalText;
    allButtons.forEach((item) => {
      item.disabled = false;
    });
  }
}

fillSelect();
addInlineDownloadButtons();

exportButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const slide = slides[Number(exportSelect.value)];
    const format = button.dataset.exportFormat;
    withBusy(button, () => exportSlide(slide, format));
  });
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-inline-export]");

  if (!button) {
    return;
  }

  const slide = slides[Number(button.dataset.inlineExport)];
  withBusy(button, () => exportSlide(slide, button.dataset.format));
});

window.carouselExporter = {
  render: async (index, format = "png") => {
    const blob = await renderSlideBlob(slides[index], format);
    return {
      size: blob.size,
      type: blob.type
    };
  }
};
