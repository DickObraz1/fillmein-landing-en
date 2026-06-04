const exportSelect = document.querySelector("[data-export-select]");
const exportButtons = document.querySelectorAll("[data-export-format]");
const slides = [...document.querySelectorAll(".slide")];
const downloadStatus = document.querySelector("[data-download-status]");
let lastDownloadUrl = "";

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
      <button type="button" data-inline-export="${index}" data-format="png" onclick="downloadInlineSlide(${index}, 'png', this)">Stáhnout PNG</button>
      <button type="button" data-inline-export="${index}" data-format="jpg" onclick="downloadInlineSlide(${index}, 'jpg', this)">Stáhnout JPG</button>
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
  if (lastDownloadUrl) {
    URL.revokeObjectURL(lastDownloadUrl);
  }

  const url = URL.createObjectURL(blob);
  lastDownloadUrl = url;
  const visibleLink = document.createElement("a");
  visibleLink.href = url;
  visibleLink.download = filename;
  visibleLink.textContent = `Soubor připravený ke stažení: ${filename}`;

  downloadStatus.classList.remove("error");
  downloadStatus.textContent = "";
  downloadStatus.append(visibleLink);

  const hiddenLink = document.createElement("a");
  hiddenLink.href = url;
  hiddenLink.download = filename;
  hiddenLink.style.display = "none";
  document.body.append(hiddenLink);
  hiddenLink.click();
  hiddenLink.remove();
}

async function renderSlideBlobWithLibrary(slide, format) {
  if (!window.htmlToImage) {
    throw new Error("Chybí exportní knihovna. Zkontroluj připojení k internetu a obnov stránku.");
  }

  const backgroundColor = format === "jpg" ? "#c9e6e4" : undefined;
  const blob = await withTimeout(
    window.htmlToImage.toBlob(slide, {
      backgroundColor,
      cacheBust: true,
      pixelRatio: 1,
      skipFonts: true
    }),
    12000,
    "Primární export trval moc dlouho."
  );

  if (!blob) {
    throw new Error("Prohlížeč nevytvořil exportní soubor.");
  }

  if (format === "jpg") {
    return convertBlobToJpeg(blob, slide.offsetWidth, slide.offsetHeight);
  }

  return blob;
}

async function convertBlobToJpeg(blob, width, height) {
  const image = new Image();
  const url = URL.createObjectURL(blob);

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Vykreslení JPG trvalo moc dlouho.")), 10000);
    image.onload = () => {
      clearTimeout(timeout);
      resolve();
    };
    image.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Prohlížeč nenačetl exportovaný obrázek."));
    };
    image.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#c9e6e4";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0);
  URL.revokeObjectURL(url);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
}

async function renderSlideBlobFallback(slide, format) {
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
    const timeout = setTimeout(() => reject(new Error("Vykreslení slidu trvalo moc dlouho.")), 10000);
    image.onload = () => {
      clearTimeout(timeout);
      resolve();
    };
    image.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Prohlížeč neumí vykreslit tento slide přes fallback export."));
    };
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

async function renderSlideBlob(slide, format) {
  try {
    return await withTimeout(
      renderSlideBlobWithLibrary(slide, format),
      14000,
      "Export přes knihovnu trval moc dlouho."
    );
  } catch (error) {
    console.warn("Primary export failed, trying fallback.", error);
    return withTimeout(
      renderSlideBlobFallback(slide, format),
      14000,
      "Fallback export trval moc dlouho."
    );
  }
}

function withTimeout(promise, milliseconds, message) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), milliseconds);

    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
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
  } catch (error) {
    downloadStatus.classList.add("error");
    downloadStatus.textContent = `Export se nepovedl: ${describeError(error)}`;
    console.error(error);
  } finally {
    button.textContent = originalText;
    allButtons.forEach((item) => {
      item.disabled = false;
    });
  }
}

function describeError(error) {
  if (error?.message) {
    return error.message;
  }

  if (error?.type) {
    return `Prohlížeč zablokoval vykreslení obrázku (${error.type}). Zkus obnovit stránku a exportovat znovu.`;
  }

  return String(error);
}

async function downloadToolbarSlide(format, button) {
  const slide = slides[Number(exportSelect.value)];
  await withBusy(button, () => exportSlide(slide, format));
}

async function downloadInlineSlide(index, format, button) {
  await withBusy(button, () => exportSlide(slides[index], format));
}

fillSelect();
addInlineDownloadButtons();

document.addEventListener("click", (event) => {
  const toolbarButton = event.target.closest("[data-export-format]");

  if (toolbarButton) {
    const slide = slides[Number(exportSelect.value)];
    withBusy(toolbarButton, () => exportSlide(slide, toolbarButton.dataset.exportFormat));
    return;
  }

  const button = event.target.closest("[data-inline-export]");

  if (!button) {
    return;
  }

  const slide = slides[Number(button.dataset.inlineExport)];
  withBusy(button, () => exportSlide(slide, button.dataset.format));
});
