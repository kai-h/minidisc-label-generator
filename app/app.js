const PT_TO_MM = 0.352777778;
const PAGE = { width: 210, height: 297 };
const BLEED = 2;
const CROP_GAP = 2;
const SPINE_CROP_GAP = 0.8;
const CROP_LEN = 2.5;
const CROP_STROKE = 0.25 * PT_TO_MM;

const labelSizes = {
  disc: { width: 35.7, height: 52.7, chamfer: 1.5 },
  spine: { width: 59, height: 3.5 },
  case: { width: 71, height: 52 },
};

const state = {
  labels: [],
  selectedIndex: 0,
  isSyncingControls: false,
  logo: {
    style: "auto",
    corner: "bottom-right",
    disc: true,
    case: true,
    spine: false,
  },
};

const builtInLogos = {
  black: "./assets/minidisc-logo-black.svg",
  white: "./assets/minidisc-logo-white.svg",
};

const controls = {};
document.querySelectorAll("input, select, textarea").forEach((el) => {
  controls[el.id] = el;
});

const LOGO_CONTROL_IDS = new Set(["logo-style", "logo-corner", "logo-disc", "logo-case", "logo-spine"]);

const sheetHost = document.getElementById("sheet-host");

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const fontStack = (labelConfig) => `"'${escapeXml(labelConfig.font)}', Arial, sans-serif"`;

function textLines(value) {
  return String(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function currentLabelFromControls() {
  return {
    album: controls.album.value,
    artist: controls.artist.value,
    year: controls.year.value,
    font: controls.font.value,
    discBg: controls["disc-bg"].value,
    discText: controls["disc-text"].value,
    caseBg: controls["case-bg"].value,
    caseText: controls["case-text"].value,
    spineBg: controls["spine-bg"].value,
    spineText: controls["spine-text"].value,
    discLayout: controls["disc-layout"].value,
    caseLayout: controls["case-layout"].value,
    tracks: textLines(controls.tracks.value),
    spineAuto: controls["spine-auto"].checked,
    spineFreeform: controls["spine-freeform"].value,
    discImage: state.labels[state.selectedIndex]?.discImage || "",
    caseImage: state.labels[state.selectedIndex]?.caseImage || "",
  };
}

function createLabel(overrides = {}) {
  return {
    album: "Blue Hour",
    artist: "Mika Vale",
    year: "2026",
    font: "Inter",
    discBg: "#f7f2e8",
    discText: "#18202a",
    caseBg: "#111820",
    caseText: "#f4f1e8",
    spineBg: "#f4f1e8",
    spineText: "#111820",
    discLayout: "square",
    caseLayout: "tracks",
    tracks: ["01 Night Drive", "02 Glass Station", "03 Blue Hour", "04 Static Bloom", "05 Magnetic Sky", "06 Last Train"],
    spineAuto: true,
    spineFreeform: "BLUE HOUR : MIKA VALE",
    discImage: "",
    caseImage: "",
    ...overrides,
  };
}

function syncLogoSettings() {
  if (controls["logo-corner"].value === "top-left") {
    controls["logo-corner"].value = "bottom-right";
  }
  state.logo = {
    style: controls["logo-style"].value,
    corner: controls["logo-corner"].value,
    disc: controls["logo-disc"].checked,
    case: controls["logo-case"].checked,
    spine: controls["logo-spine"].checked,
  };
}

function saveSelectedLabel() {
  if (state.isSyncingControls || !state.labels.length) return;
  state.labels[state.selectedIndex] = currentLabelFromControls();
}

function labelForCopy(index) {
  saveSelectedLabel();
  if (controls["sheet-mode"].value !== "multiple") return state.labels[state.selectedIndex];
  return state.labels[index % state.labels.length] || state.labels[0];
}

function syncLabelControls() {
  const labelConfig = state.labels[state.selectedIndex];
  if (!labelConfig) return;
  state.isSyncingControls = true;
  controls.album.value = labelConfig.album;
  controls.artist.value = labelConfig.artist;
  controls.year.value = labelConfig.year;
  controls.font.value = labelConfig.font;
  controls["disc-bg"].value = labelConfig.discBg;
  controls["disc-text"].value = labelConfig.discText;
  controls["case-bg"].value = labelConfig.caseBg;
  controls["case-text"].value = labelConfig.caseText;
  controls["spine-bg"].value = labelConfig.spineBg;
  controls["spine-text"].value = labelConfig.spineText;
  controls["disc-layout"].value = labelConfig.discLayout;
  controls["case-layout"].value = labelConfig.caseLayout;
  controls.tracks.value = labelConfig.tracks.join("\n");
  controls["spine-auto"].checked = labelConfig.spineAuto;
  controls["spine-freeform"].value = labelConfig.spineFreeform;
  controls["disc-image"].value = "";
  controls["case-image"].value = "";
  state.isSyncingControls = false;
}

function syncLabelPicker() {
  const picker = controls["selected-label"];
  picker.innerHTML = state.labels
    .map((labelConfig, index) => {
      const name = labelConfig.album || `Label ${index + 1}`;
      return `<option value="${index}">Label ${index + 1}: ${escapeXml(name)}</option>`;
    })
    .join("");
  picker.value = String(Math.min(state.selectedIndex, state.labels.length - 1));
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function chamferPath({ x, y, width, height, chamfer }) {
  return [
    `M ${x + chamfer} ${y}`,
    `H ${x + width}`,
    `V ${y + height}`,
    `H ${x}`,
    `V ${y + chamfer}`,
    "Z",
  ].join(" ");
}

function bleedBox(label) {
  return {
    x: label.x - BLEED,
    y: label.y - BLEED,
    width: label.width + BLEED * 2,
    height: label.height + BLEED * 2,
  };
}

function labelAt(kind, x, y) {
  return { ...labelSizes[kind], x, y };
}

function sheetCopies() {
  const count = Number(controls.copies.value);
  const rotateSpines = controls["spine-orientation"].value === "rotated";
  const caseXs = [8, 86];
  const caseYs = [8, 73, 138, 203];
  const discMainYs = [8, 73, 138, 203];
  const discBottomXs = [8, 49, 90, 131];

  return Array.from({ length: count }, (_, index) => {
    const caseCol = index % 2;
    const caseRow = Math.floor(index / 2);
    const caseX = caseXs[caseCol];
    const caseY = caseYs[caseRow];
    const discX = index < 4 ? 168 : discBottomXs[index - 4];
    const discY = index < 4 ? discMainYs[index] : 238.5;

    return {
      disc: labelAt("disc", discX, discY),
      case: labelAt("case", caseX, caseY),
      spine: rotateSpines
        ? {
            ...labelAt("spine", caseX + labelSizes.case.width + BLEED + 0.8, caseY),
            width: labelSizes.spine.height,
            height: labelSizes.spine.width,
            rotated: true,
          }
        : { ...labelAt("spine", caseX + 6, caseY + 56.5), rotated: false },
    };
  });
}

function cropMarks(label, includeChamfer = false, gap = CROP_GAP) {
  const left = label.x;
  const right = label.x + label.width;
  const top = label.y;
  const bottom = label.y + label.height;
  const marks = [
    [left, top - gap, left, top - gap - CROP_LEN],
    [left, bottom + gap, left, bottom + gap + CROP_LEN],
    [right, top - gap, right, top - gap - CROP_LEN],
    [right, bottom + gap, right, bottom + gap + CROP_LEN],
    [left - gap, top, left - gap - CROP_LEN, top],
    [right + gap, top, right + gap + CROP_LEN, top],
    [left - gap, bottom, left - gap - CROP_LEN, bottom],
    [right + gap, bottom, right + gap + CROP_LEN, bottom],
  ];
  const lines = marks
    .map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`)
    .join("");

  const chamfer = includeChamfer
    ? `<line x1="${label.x}" y1="${label.y + label.chamfer}" x2="${label.x + label.chamfer}" y2="${label.y}" />
       <line x1="${label.x + label.chamfer + 0.5}" y1="${label.y + 0.5}" x2="${label.x + label.chamfer + 2.2}" y2="${label.y + 2.2}" />`
    : "";

  return `<g class="crop-marks">${lines}${chamfer}</g>`;
}

function imageFill(href, box, mode = "cover") {
  if (!href) return "";
  const preserve = mode === "contain" ? "xMidYMid meet" : "xMidYMid slice";
  return `<image href="${href}" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" preserveAspectRatio="${preserve}" />`;
}

function placeholderArt(box, variant = "disc") {
  const dark = variant === "case";
  const base = dark ? "#18212b" : "#dfe6e1";
  const mid = dark ? "#2a3945" : "#aeb9b2";
  const accent = dark ? "#d9b36c" : "#0f6f77";
  const soft = dark ? "#334553" : "#f5efe2";
  const cx = box.x + box.width * 0.5;
  const cy = box.y + box.height * 0.5;

  return `<g>
    <rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="${base}" />
    <rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height * 0.34}" fill="${soft}" opacity="0.82" />
    <circle cx="${cx}" cy="${cy}" r="${Math.min(box.width, box.height) * 0.31}" fill="none" stroke="${accent}" stroke-width="1.1" opacity="0.78" />
    <circle cx="${cx}" cy="${cy}" r="${Math.min(box.width, box.height) * 0.13}" fill="${accent}" opacity="0.75" />
    <path d="M ${box.x - 2} ${box.y + box.height * 0.72} L ${box.x + box.width * 0.35} ${box.y + box.height * 0.45} L ${box.x + box.width + 2} ${box.y + box.height * 0.82}" fill="none" stroke="${mid}" stroke-width="1.3" opacity="0.9" />
    <path d="M ${box.x + box.width * 0.12} ${box.y + box.height + 2} L ${box.x + box.width * 0.82} ${box.y - 2}" fill="none" stroke="#ffffff" stroke-width="0.65" opacity="${dark ? "0.18" : "0.55"}" />
    <path d="M ${box.x + box.width * 0.72} ${box.y + box.height + 2} L ${box.x + box.width + 2} ${box.y + box.height * 0.55}" fill="none" stroke="#ffffff" stroke-width="0.65" opacity="${dark ? "0.14" : "0.48"}" />
  </g>`;
}

function colorLuminance(hex) {
  const clean = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(clean.slice(index, index + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function logoEnabled(placement) {
  return Boolean(state.logo[placement]);
}

function logoHref(placement, labelConfig) {
  const style = state.logo.style;
  if (style === "none") return "";
  if (style === "black" || style === "white") return builtInLogos[style];

  const bg = labelConfig[`${placement}Bg`] || labelConfig.caseBg;
  return colorLuminance(bg) < 0.45 ? builtInLogos.white : builtInLogos.black;
}

function logoUse(label, placement, labelConfig) {
  const href = logoHref(placement, labelConfig);
  if (!href || !logoEnabled(placement)) return "";
  const width = placement === "spine" ? 10 : 12;
  const height = placement === "spine" ? 2.3 : 5;
  const margin = placement === "spine" ? 0.6 : 1.2;
  const corner = placement === "disc" && state.logo.corner === "bottom-left" ? "bottom-right" : state.logo.corner;
  const x = corner.endsWith("left") ? label.x + margin : label.x + label.width - width - margin;
  const y = corner.startsWith("top") ? label.y + margin : label.y + label.height - height - margin;
  return `<image href="${href}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" />`;
}

function renderDisc(label, copyIndex, labelConfig) {
  const clipId = `disc-clip-${copyIndex}`;
  const path = chamferPath(label);
  const bg = labelConfig.discBg;
  const text = labelConfig.discText;
  const layout = labelConfig.discLayout;
  const album = escapeXml(labelConfig.album);
  const artist = escapeXml(labelConfig.artist);
  const year = escapeXml(labelConfig.year);
  let body = `<rect x="${label.x - BLEED}" y="${label.y - BLEED}" width="${label.width + BLEED * 2}" height="${label.height + BLEED * 2}" fill="${bg}" />
    <path d="${path}" fill="${bg}" />`;

  if (layout === "full") {
    body += `<g clip-path="url(#${clipId})">${labelConfig.discImage ? imageFill(labelConfig.discImage, bleedBox(label)) : placeholderArt(bleedBox(label), "disc")}</g>`;
  } else if (layout === "square") {
    const size = 31.5;
    const img = { x: label.x + 2.1, y: label.y + 10.6, width: size, height: size };
    body += `<g clip-path="url(#${clipId})">${labelConfig.discImage ? imageFill(labelConfig.discImage, img) : placeholderArt(img, "disc")}</g>`;
  }

  if (layout !== "full") {
    body += `<text x="${label.x + 2.2}" y="${label.y + 5.7}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="3.4" font-weight="700">${album}</text>`;
    body += `<text x="${label.x + 2.2}" y="${label.y + label.height - 6.2}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="2.6" font-weight="600">${artist}</text>`;
    body += `<text x="${label.x + 2.2}" y="${label.y + label.height - 2.6}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="2.2">${year}</text>`;
  }

  body += logoUse(label, "disc", labelConfig);

  return `<clipPath id="${clipId}"><path d="${path}" /></clipPath>${cropMarks(label, true)}<g>${body}</g>`;
}

function renderCase(label, copyIndex, labelConfig) {
  const clipId = `case-clip-${copyIndex}`;
  const bg = labelConfig.caseBg;
  const text = labelConfig.caseText;
  const layout = labelConfig.caseLayout;
  const album = escapeXml(labelConfig.album);
  const artist = escapeXml(labelConfig.artist);
  const year = escapeXml(labelConfig.year);
  const tracks = labelConfig.tracks || [];
  let body = `<rect x="${label.x - BLEED}" y="${label.y - BLEED}" width="${label.width + BLEED * 2}" height="${label.height + BLEED * 2}" fill="${bg}" />
    <rect x="${label.x}" y="${label.y}" width="${label.width}" height="${label.height}" fill="${bg}" />`;

  if (layout === "image") {
    body += `<g clip-path="url(#${clipId})">${labelConfig.caseImage ? imageFill(labelConfig.caseImage, bleedBox(label)) : placeholderArt(bleedBox(label), "case")}</g>`;
  } else {
    body += `<text x="${label.x + 5}" y="${label.y + 8}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="5.2" font-weight="700">${album}</text>`;
    body += `<text x="${label.x + 5}" y="${label.y + 13}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="3" font-weight="600">${artist} - ${year}</text>`;
    tracks.slice(0, 12).forEach((line, index) => {
      body += `<text x="${label.x + 5}" y="${label.y + 22 + index * 3.2}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="2.35">${escapeXml(line)}</text>`;
    });
  }

  if (layout === "image") {
    body += `<rect x="${label.x + 4}" y="${label.y + 4}" width="${label.width - 8}" height="13" fill="${bg}" opacity="0.88" />`;
    body += `<text x="${label.x + 6}" y="${label.y + 9.5}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="4.2" font-weight="700">${album}</text>`;
    body += `<text x="${label.x + 6}" y="${label.y + 14}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="2.5">${artist} - ${year}</text>`;
  }

  body += logoUse(label, "case", labelConfig);
  return `<clipPath id="${clipId}"><rect x="${label.x}" y="${label.y}" width="${label.width}" height="${label.height}" /></clipPath>${cropMarks(label)}<g>${body}</g>`;
}

function renderSpine(label, labelConfig) {
  const bg = labelConfig.spineBg;
  const text = labelConfig.spineText;
  const spineText = labelConfig.spineAuto
    ? `${labelConfig.album} : ${labelConfig.artist}`
    : labelConfig.spineFreeform;

  if (label.rotated) {
    const local = { x: 0, y: 0, width: labelSizes.spine.width, height: labelSizes.spine.height };
    return `${cropMarks(label, false, SPINE_CROP_GAP)}
    <g transform="translate(${label.x + label.width} ${label.y}) rotate(90)">
      <rect x="0" y="0" width="${local.width}" height="${local.height}" fill="${bg}" />
      <text x="2" y="2.55" fill="${text}" font-family=${fontStack(labelConfig)} font-size="2.1" font-weight="700">${escapeXml(spineText)}</text>
      ${logoUse(local, "spine", labelConfig)}
    </g>`;
  }

  return `${cropMarks(label, false, SPINE_CROP_GAP)}
  <g>
    <rect x="${label.x}" y="${label.y}" width="${label.width}" height="${label.height}" fill="${bg}" />
    <text x="${label.x + 2}" y="${label.y + 2.55}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="2.1" font-weight="700">${escapeXml(spineText)}</text>
    ${logoUse(label, "spine", labelConfig)}
  </g>`;
}

function renderSheet() {
  const copies = sheetCopies();
  const labelConfigs = copies.map((_, index) => labelForCopy(index));
  const cases = copies.map((copy, index) => renderCase(copy.case, index, labelConfigs[index])).join("");
  const spines = copies.map((copy, index) => renderSpine(copy.spine, labelConfigs[index])).join("");
  const discs = copies.map((copy, index) => renderDisc(copy.disc, index, labelConfigs[index])).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE.width}mm" height="${PAGE.height}mm" viewBox="0 0 ${PAGE.width} ${PAGE.height}">
    <style>
      .crop-marks line { stroke: #8f969c; stroke-width: ${CROP_STROKE}; vector-effect: non-scaling-stroke; }
      text { dominant-baseline: alphabetic; }
    </style>
    <rect width="${PAGE.width}" height="${PAGE.height}" fill="#fff" />
    ${cases}
    ${spines}
    ${discs}
  </svg>`;
  sheetHost.innerHTML = svg;
  return svg;
}

function syncSheetMode() {
  const labelSetField = document.getElementById("label-set-field");
  labelSetField.classList.toggle("hidden", controls["sheet-mode"].value !== "multiple");
  syncLabelPicker();
}

function download(name, contents, type) {
  const blob = new Blob([contents], { type });
  downloadBlob(name, blob);
}

function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

async function prepareSvgForPdf(svg) {
  const clone = svg.cloneNode(true);
  const images = Array.from(clone.querySelectorAll("image"));

  await Promise.all(
    images.map(async (image) => {
      const href = image.getAttribute("href");
      if (!href || href.startsWith("data:")) return;

      const response = await fetch(href);
      const text = await response.text();
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
      image.setAttribute("href", dataUrl);
    }),
  );

  return clone;
}

async function downloadPdf() {
  renderSheet();
  const svg = sheetHost.querySelector("svg");
  const jsPDF = window.jspdf?.jsPDF;
  const svg2pdf = window.svg2pdf?.svg2pdf || window.svg2pdf;

  if (!svg || !jsPDF || typeof svg2pdf !== "function") {
    window.print();
    return;
  }

  const button = document.getElementById("print-pdf");
  const previousText = button.textContent;
  button.textContent = "...";
  button.disabled = true;

  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
      hotfixes: ["px_scaling"],
    });
    const pdfSvg = await prepareSvgForPdf(svg);
    await svg2pdf(pdfSvg, pdf, { x: 0, y: 0, width: PAGE.width, height: PAGE.height });
    downloadBlob("minidisc-labels.pdf", pdf.output("blob"));
  } catch (error) {
    console.error(error);
    window.print();
  } finally {
    button.textContent = previousText;
    button.disabled = false;
  }
}

async function handleImageUpload(event, key) {
  saveSelectedLabel();
  state.labels[state.selectedIndex][key] = await fileToDataUrl(event.target.files[0]);
  renderSheet();
}

controls["disc-image"].addEventListener("change", (event) => handleImageUpload(event, "discImage"));
controls["case-image"].addEventListener("change", (event) => handleImageUpload(event, "caseImage"));

controls["selected-label"].addEventListener("change", () => {
  if (state.isSyncingControls) return;
  saveSelectedLabel();
  state.selectedIndex = Number(controls["selected-label"].value);
  syncLabelControls();
  renderSheet();
});

document.getElementById("add-label").addEventListener("click", () => {
  saveSelectedLabel();
  state.labels.push(createLabel({ album: `Label ${state.labels.length + 1}`, artist: "", year: "" }));
  state.selectedIndex = state.labels.length - 1;
  syncLabelPicker();
  syncLabelControls();
  renderSheet();
});

document.getElementById("duplicate-label").addEventListener("click", () => {
  saveSelectedLabel();
  const source = state.labels[state.selectedIndex];
  state.labels.splice(state.selectedIndex + 1, 0, {
    ...source,
    tracks: [...source.tracks],
  });
  state.selectedIndex += 1;
  syncLabelPicker();
  syncLabelControls();
  renderSheet();
});

document.getElementById("delete-label").addEventListener("click", () => {
  if (state.labels.length === 1) return;
  state.labels.splice(state.selectedIndex, 1);
  state.selectedIndex = Math.max(0, state.selectedIndex - 1);
  syncLabelPicker();
  syncLabelControls();
  renderSheet();
});

document.querySelectorAll("input, select, textarea").forEach((el) => {
  if (el.type === "file" || el.id === "selected-label") return;
  el.addEventListener("input", () => {
    if (LOGO_CONTROL_IDS.has(el.id)) {
      syncLogoSettings();
    } else {
      saveSelectedLabel();
      syncLabelPicker();
    }
    renderSheet();
  });
  el.addEventListener("change", () => {
    if (LOGO_CONTROL_IDS.has(el.id)) {
      syncLogoSettings();
    } else {
      saveSelectedLabel();
      syncLabelPicker();
    }
    renderSheet();
  });
});

controls["sheet-mode"].addEventListener("change", syncSheetMode);

document.getElementById("download-svg").addEventListener("click", () => {
  download("minidisc-labels.svg", renderSheet(), "image/svg+xml");
});

document.getElementById("print-pdf").addEventListener("click", () => {
  downloadPdf();
});

document.getElementById("reset-art").addEventListener("click", () => {
  saveSelectedLabel();
  state.labels[state.selectedIndex].discImage = "";
  state.labels[state.selectedIndex].caseImage = "";
  controls["disc-image"].value = "";
  controls["case-image"].value = "";
  renderSheet();
});

state.labels = [
  createLabel(),
  createLabel({
    album: "Silver Map",
    artist: "Arlo Chen",
    year: "1999",
    tracks: ["01 North Pier", "02 Silver Map", "03 Rooms Above", "04 Broadcast"],
  }),
  createLabel({
    album: "Signal Garden",
    artist: "Nia Kade",
    year: "2003",
    tracks: ["01 Folded Signal", "02 Seed Tone", "03 Garden Wall", "04 Receiver"],
  }),
  createLabel({
    album: "Late Static",
    artist: "Mika Vale",
    year: "2001",
    tracks: ["01 Late Static", "02 Soft Error", "03 Return Path", "04 Wake"],
  }),
];
syncLogoSettings();
syncLabelPicker();
syncLabelControls();
syncSheetMode();
renderSheet();
