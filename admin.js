const form = document.querySelector("[data-editor-form]");
const statusNode = document.querySelector("[data-status]");

let currentContent = {};

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.classList.toggle("error", isError);
}

function populateForm(content) {
  currentContent = content;

  [...form.elements].forEach((field) => {
    if (!field.name || !(field.name in content)) {
      return;
    }

    field.value = Array.isArray(content[field.name])
      ? content[field.name].join("\n")
      : content[field.name];
  });
}

function collectForm() {
  const nextContent = { ...currentContent };
  const formData = new FormData(form);

  for (const [name, value] of formData.entries()) {
    nextContent[name] = name === "tickerItems"
      ? value.split("\n").map((item) => item.trim()).filter(Boolean)
      : value.trim();
  }

  return nextContent;
}

async function loadContent() {
  setStatus("Načítám...");
  const response = await fetch("/api/content");

  if (!response.ok) {
    throw new Error("Texty se nepodařilo načíst.");
  }

  populateForm(await response.json());
  setStatus("Připraveno.");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Ukládám...");

  try {
    const response = await fetch("/api/content", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(collectForm())
    });

    if (!response.ok) {
      throw new Error("Uložení selhalo.");
    }

    currentContent = collectForm();
    setStatus("Uloženo. Obnov landing page a uvidíš změny.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

loadContent().catch((error) => setStatus(error.message, true));
