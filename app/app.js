const PT_TO_MM = 0.352777778;
const PAGE = { width: 210, height: 297 };
const BLEED = 2;
const IMAGE_BLEED = 1;
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

const pdfFonts = {
  Inter: "./assets/fonts/Inter.ttf",
  "IBM Plex Sans": "./assets/fonts/IBMPlexSans.ttf",
  "Source Sans 3": "./assets/fonts/SourceSans3.ttf",
  "Roboto Condensed": "./assets/fonts/RobotoCondensed.ttf",
  "Work Sans": "./assets/fonts/WorkSans.ttf",
  "Libre Baskerville": "./assets/fonts/LibreBaskerville.ttf",
  "Cormorant Garamond": "./assets/fonts/CormorantGaramond.ttf",
  "Playfair Display": "./assets/fonts/PlayfairDisplay.ttf",
  Spectral: "./assets/fonts/Spectral.ttf",
  "Space Grotesk": "./assets/fonts/SpaceGrotesk.ttf",
  "Bebas Neue": "./assets/fonts/BebasNeue.ttf",
  "Archivo Black": "./assets/fonts/ArchivoBlack.ttf",
  Oswald: "./assets/fonts/Oswald.ttf",
  Staatliches: "./assets/fonts/Staatliches.ttf",
  "Unica One": "./assets/fonts/UnicaOne.ttf",
};

const previewArtwork = [
  {
    disc: "./assets/album-covers/melodic-techno-minimal-album-cover-391x558.png",
    case: "./assets/album-covers/melodic-techno-minimal-album-cover-700x512.png",
  },
  {
    disc: "./assets/album-covers/synthwave-album-cover-391x558.png",
    case: "./assets/album-covers/synthwave-album-cover-700x512.png",
  },
  {
    disc: "./assets/album-covers/alt-singer-songwriter-light-album-cover-391x558.png",
    case: "./assets/album-covers/alt-singer-songwriter-light-album-cover-700x512.png",
  },
  {
    disc: "./assets/album-covers/melodic-techno-light-album-cover-391x558.png",
    case: "./assets/album-covers/melodic-techno-light-album-cover-700x512.png",
  },
  {
    disc: "./assets/album-covers/cyberpunk-city-album-cover-391x558.png",
    case: "./assets/album-covers/cyberpunk-city-album-cover-700x512.png",
  },
  {
    disc: "./assets/album-covers/alt-rock-amp-album-cover-391x558.png",
    case: "./assets/album-covers/alt-rock-amp-album-cover-700x512.png",
  },
];

const previewPalettes = [
  {
    discBg: "#f1e5d3",
    discText: "#172130",
    caseBg: "#111820",
    caseText: "#f5efe4",
    spineBg: "#efe3cf",
    spineText: "#172130",
  },
  {
    discBg: "#17142b",
    discText: "#ffd6f3",
    caseBg: "#120f25",
    caseText: "#fdd7fb",
    spineBg: "#f5d5ef",
    spineText: "#191129",
  },
  {
    discBg: "#efe0c9",
    discText: "#32271d",
    caseBg: "#2b241d",
    caseText: "#f4e7d2",
    spineBg: "#ead9be",
    spineText: "#2b241d",
  },
  {
    discBg: "#dce8e2",
    discText: "#223548",
    caseBg: "#172637",
    caseText: "#ecf2ec",
    spineBg: "#d9e7e0",
    spineText: "#213344",
  },
  {
    discBg: "#1d132d",
    discText: "#ffb5e8",
    caseBg: "#11101f",
    caseText: "#fbd0ee",
    spineBg: "#241331",
    spineText: "#ffcaef",
  },
  {
    discBg: "#d6c0a2",
    discText: "#241f1b",
    caseBg: "#211b17",
    caseText: "#f1dec2",
    spineBg: "#d8bea0",
    spineText: "#241f1b",
  },
];

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

const fontStack = (labelConfig) => `"${escapeXml(labelConfig.font)}"`;

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
    previewIndex: state.labels[state.selectedIndex]?.previewIndex || 0,
  };
}

function createLabel(overrides = {}) {
  const previewIndex = overrides.previewIndex || 0;
  return {
    album: "Blue Hour",
    artist: "Mika Vale",
    year: "2026",
    font: "Inter",
    ...previewPalette(previewIndex),
    discLayout: "square",
    caseLayout: "image-tracks",
    tracks: ["01 Night Drive", "02 Glass Station", "03 Blue Hour", "04 Static Bloom", "05 Magnetic Sky", "06 Last Train"],
    spineAuto: true,
    spineFreeform: "BLUE HOUR : MIKA VALE",
    discImage: "",
    caseImage: "",
    previewIndex,
    ...overrides,
  };
}

function previewImage(labelConfig, placement) {
  const index = labelConfig.previewIndex % previewArtwork.length;
  return previewArtwork[index][placement];
}

function previewPalette(index) {
  return previewPalettes[index % previewPalettes.length];
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
  syncSpineFreeform();
  syncTracklisting();
  syncImageClearButtons();
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

function imageBleedBox(label) {
  return {
    x: label.x - IMAGE_BLEED,
    y: label.y - IMAGE_BLEED,
    width: label.width + IMAGE_BLEED * 2,
    height: label.height + IMAGE_BLEED * 2,
  };
}

function labelAt(kind, x, y) {
  return { ...labelSizes[kind], x, y };
}

function sheetCopies() {
  const count = Number(controls.copies.value);
  const caseXs = [8, 86];
  const caseYs = [8, 73, 138, 203];
  const discMainYs = [8, 73, 138, 203];
  const discBottomXs = [86, 127, 168, 168];
  const usedCaseRows = Math.ceil(count / 2);
  const spineBlock = { x: 8, y: caseYs[usedCaseRows] || 203, gap: 5.4 };

  return Array.from({ length: count }, (_, index) => {
    const caseCol = index % 2;
    const caseRow = Math.floor(index / 2);
    const caseX = caseXs[caseCol];
    const caseY = caseYs[caseRow];
    const discX = index < 4 ? 168 : discBottomXs[index - 4];
    const discY = index < 4 ? discMainYs[index] : discMainYs[3];

    return {
      disc: labelAt("disc", discX, discY),
      case: labelAt("case", caseX, caseY),
      spine: { ...labelAt("spine", spineBlock.x, spineBlock.y + index * spineBlock.gap), rotated: false },
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
    ? `<line x1="${label.x}" y1="${label.y + label.chamfer}" x2="${label.x + label.chamfer}" y2="${label.y}" />`
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
    body += imageFill(labelConfig.discImage || previewImage(labelConfig, "disc"), imageBleedBox(label));
  } else if (layout === "square") {
    const size = 31.5;
    const img = { x: label.x + 2.1, y: label.y + 10.6, width: size, height: size };
    body += `<g clip-path="url(#${clipId})">${imageFill(labelConfig.discImage || previewImage(labelConfig, "disc"), img)}</g>`;
  }

  if (layout !== "full") {
    body += `<text x="${label.x + 2.2}" y="${label.y + 5.7}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="3.4" font-weight="bold">${album}</text>`;
    body += `<text x="${label.x + 2.2}" y="${label.y + label.height - 6.2}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="2.6" font-weight="bold">${artist}</text>`;
    body += `<text x="${label.x + 2.2}" y="${label.y + label.height - 2.6}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="2.2">${year}</text>`;
  }

  body += logoUse(label, "disc", labelConfig);

  return `<clipPath id="${clipId}"><path d="${path}" /></clipPath><g>${body}</g>${cropMarks(label, true)}`;
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
    body += imageFill(labelConfig.caseImage || previewImage(labelConfig, "case"), imageBleedBox(label));
  } else if (layout === "image-tracks") {
    const img = { x: label.x + 5, y: label.y + 16, width: 27, height: 27 };
    body += `<text x="${label.x + 5}" y="${label.y + 8}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="4.6" font-weight="bold">${album}</text>`;
    body += `<text x="${label.x + 5}" y="${label.y + 12.5}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="2.7" font-weight="bold">${artist} - ${year}</text>`;
    body += imageFill(labelConfig.caseImage || previewImage(labelConfig, "case"), img);
    tracks.slice(0, 8).forEach((line, index) => {
      body += `<text x="${label.x + 36}" y="${label.y + 18 + index * 3.25}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="2.25">${escapeXml(line)}</text>`;
    });
  } else {
    body += `<text x="${label.x + 5}" y="${label.y + 8}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="5.2" font-weight="bold">${album}</text>`;
    body += `<text x="${label.x + 5}" y="${label.y + 13}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="3" font-weight="bold">${artist} - ${year}</text>`;
    tracks.slice(0, 12).forEach((line, index) => {
      body += `<text x="${label.x + 5}" y="${label.y + 22 + index * 3.2}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="2.35">${escapeXml(line)}</text>`;
    });
  }

  if (layout === "image") {
    body += `<rect x="${label.x + 4}" y="${label.y + 4}" width="${label.width - 8}" height="13" fill="${bg}" opacity="0.88" />`;
    body += `<text x="${label.x + 6}" y="${label.y + 9.5}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="4.2" font-weight="bold">${album}</text>`;
    body += `<text x="${label.x + 6}" y="${label.y + 14}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="2.5">${artist} - ${year}</text>`;
  }

  body += logoUse(label, "case", labelConfig);
  return `<clipPath id="${clipId}"><rect x="${label.x}" y="${label.y}" width="${label.width}" height="${label.height}" /></clipPath><g>${body}</g>${cropMarks(label)}`;
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
      <text x="2" y="2.55" fill="${text}" font-family=${fontStack(labelConfig)} font-size="2.1" font-weight="bold">${escapeXml(spineText)}</text>
      ${logoUse(local, "spine", labelConfig)}
    </g>`;
  }

  return `<g>
    <rect x="${label.x}" y="${label.y}" width="${label.width}" height="${label.height}" fill="${bg}" />
    <text x="${label.x + 2}" y="${label.y + 2.55}" fill="${text}" font-family=${fontStack(labelConfig)} font-size="2.1" font-weight="bold">${escapeXml(spineText)}</text>
    ${logoUse(label, "spine", labelConfig)}
  </g>${cropMarks(label, false, SPINE_CROP_GAP)}`;
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

function syncSpineFreeform() {
  document.getElementById("spine-freeform-field").classList.toggle("hidden", controls["spine-auto"].checked);
}

function syncTracklisting() {
  document.getElementById("tracklisting-field").classList.toggle("hidden", controls["case-layout"].value === "image");
}

function syncImageClearButtons() {
  const labelConfig = state.labels[state.selectedIndex];
  document.getElementById("clear-disc-image").classList.toggle("hidden", !labelConfig?.discImage);
  document.getElementById("clear-case-image").classList.toggle("hidden", !labelConfig?.caseImage);
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

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function pdfFontFileName(fontFamily) {
  return `${fontFamily.replace(/[^a-z0-9]/gi, "")}.ttf`;
}

function usedFontFamilies(labelConfigs) {
  return [...new Set(labelConfigs.map((labelConfig) => labelConfig.font))];
}

async function registerPdfFonts(pdf, labelConfigs) {
  const fontFamilies = usedFontFamilies(labelConfigs);

  await Promise.all(
    fontFamilies.map(async (fontFamily) => {
      const path = pdfFonts[fontFamily];
      if (!path) return;

      const response = await fetch(path);
      if (!response.ok) throw new Error(`Unable to load PDF font: ${fontFamily}`);

      const fileName = pdfFontFileName(fontFamily);
      const base64 = arrayBufferToBase64(await response.arrayBuffer());
      pdf.addFileToVFS(fileName, base64);
      pdf.addFont(fileName, fontFamily, "normal");
      pdf.addFont(fileName, fontFamily, "bold");
    }),
  );
}

async function embedSvgFonts(svg, labelConfigs) {
  const rules = await Promise.all(
    usedFontFamilies(labelConfigs).map(async (fontFamily) => {
      const path = pdfFonts[fontFamily];
      if (!path) return "";

      const response = await fetch(path);
      if (!response.ok) throw new Error(`Unable to load SVG font: ${fontFamily}`);

      const base64 = arrayBufferToBase64(await response.arrayBuffer());
      return `@font-face { font-family: "${fontFamily}"; src: url("data:font/truetype;base64,${base64}") format("truetype"); font-weight: 400 900; font-style: normal; }`;
    }),
  );

  const style = svg.querySelector("style") || document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `${rules.filter(Boolean).join("\n")}\n${style.textContent}`;
  if (!style.parentNode) svg.insertBefore(style, svg.firstChild);
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

async function imageHrefToDataUrl(href) {
  if (href.startsWith("data:")) return href;

  const response = await fetch(href);
  if (!response.ok) throw new Error(`Unable to load image: ${href}`);
  return blobToDataUrl(await response.blob());
}

async function rasterizeImageForPdf(dataUrl, imageNode) {
  if (dataUrl.startsWith("data:image/svg")) return dataUrl;

  const image = await loadImage(dataUrl);
  const boxWidth = Number(imageNode.getAttribute("width"));
  const boxHeight = Number(imageNode.getAttribute("height"));
  const scale = 12;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(boxWidth * scale));
  canvas.height = Math.max(1, Math.round(boxHeight * scale));

  const context = canvas.getContext("2d");
  const boxRatio = canvas.width / canvas.height;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const preserve = imageNode.getAttribute("preserveAspectRatio") || "xMidYMid meet";
  const shouldCover = preserve.includes("slice");
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  let targetX = 0;
  let targetY = 0;
  let targetWidth = canvas.width;
  let targetHeight = canvas.height;

  if (shouldCover && imageRatio > boxRatio) {
    sourceWidth = image.naturalHeight * boxRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else if (shouldCover && imageRatio < boxRatio) {
    sourceHeight = image.naturalWidth / boxRatio;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  } else if (!shouldCover && imageRatio > boxRatio) {
    targetHeight = canvas.width / imageRatio;
    targetY = (canvas.height - targetHeight) / 2;
  } else if (!shouldCover && imageRatio < boxRatio) {
    targetWidth = canvas.height * imageRatio;
    targetX = (canvas.width - targetWidth) / 2;
  }

  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, targetX, targetY, targetWidth, targetHeight);
  return canvas.toDataURL("image/jpeg", 0.92);
}

async function prepareSvgForExport(svg, options = {}) {
  const clone = svg.cloneNode(true);
  const { embedFonts = false, labelConfigs = [], rasterizeImages = false } = options;
  const images = Array.from(clone.querySelectorAll("image"));

  if (embedFonts) await embedSvgFonts(clone, labelConfigs);

  await Promise.all(
    images.map(async (image) => {
      const href = image.getAttribute("href");
      if (!href) return;

      const dataUrl = await imageHrefToDataUrl(href);
      const exportUrl = rasterizeImages ? await rasterizeImageForPdf(dataUrl, image) : dataUrl;
      image.setAttribute("href", exportUrl);
      image.setAttributeNS("http://www.w3.org/1999/xlink", "href", exportUrl);
    }),
  );

  return clone;
}

async function downloadSvg() {
  renderSheet();
  const svg = sheetHost.querySelector("svg");
  if (!svg) return;
  const labelConfigs = sheetCopies().map((_, index) => labelForCopy(index));
  const preparedSvg = await prepareSvgForExport(svg, { embedFonts: true, labelConfigs });
  const contents = new XMLSerializer().serializeToString(preparedSvg);
  download("minidisc-labels.svg", contents, "image/svg+xml");
}

async function downloadPdf() {
  renderSheet();
  const svg = sheetHost.querySelector("svg");
  const labelConfigs = sheetCopies().map((_, index) => labelForCopy(index));
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
    await registerPdfFonts(pdf, labelConfigs);
    const pdfSvg = await prepareSvgForExport(svg, { rasterizeImages: true });
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
  syncImageClearButtons();
  renderSheet();
}

function clearImage(key, inputId) {
  saveSelectedLabel();
  state.labels[state.selectedIndex][key] = "";
  controls[inputId].value = "";
  syncImageClearButtons();
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
  state.labels.push(createLabel({
    album: `Label ${state.labels.length + 1}`,
    artist: "",
    year: "",
    previewIndex: state.labels.length % previewArtwork.length,
  }));
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
    if (el.id === "spine-auto") syncSpineFreeform();
    if (el.id === "case-layout") syncTracklisting();
    renderSheet();
  });
  el.addEventListener("change", () => {
    if (LOGO_CONTROL_IDS.has(el.id)) {
      syncLogoSettings();
    } else {
      saveSelectedLabel();
      syncLabelPicker();
    }
    if (el.id === "spine-auto") syncSpineFreeform();
    if (el.id === "case-layout") syncTracklisting();
    renderSheet();
  });
});

controls["sheet-mode"].addEventListener("change", syncSheetMode);

document.getElementById("download-svg").addEventListener("click", () => {
  downloadSvg();
});

document.getElementById("print-pdf").addEventListener("click", () => {
  downloadPdf();
});

document.getElementById("clear-disc-image").addEventListener("click", () => {
  clearImage("discImage", "disc-image");
});

document.getElementById("clear-case-image").addEventListener("click", () => {
  clearImage("caseImage", "case-image");
});

state.labels = [
  createLabel({ previewIndex: 0 }),
  createLabel({
    album: "Silver Map",
    artist: "Arlo Chen",
    year: "1999",
    tracks: ["01 North Pier", "02 Silver Map", "03 Rooms Above", "04 Broadcast"],
    previewIndex: 1,
  }),
  createLabel({
    album: "Signal Garden",
    artist: "Nia Kade",
    year: "2003",
    tracks: ["01 Folded Signal", "02 Seed Tone", "03 Garden Wall", "04 Receiver"],
    previewIndex: 2,
  }),
  createLabel({
    album: "Late Static",
    artist: "Mika Vale",
    year: "2001",
    tracks: ["01 Late Static", "02 Soft Error", "03 Return Path", "04 Wake"],
    previewIndex: 3,
  }),
  createLabel({
    album: "Neon Civic",
    artist: "Juno Trace",
    year: "2041",
    tracks: ["01 Neon Civic", "02 Glass Arcade", "03 Night Market", "04 Exit Ramp"],
    previewIndex: 4,
  }),
  createLabel({
    album: "Amp Weather",
    artist: "The Satellites",
    year: "2008",
    tracks: ["01 Amp Weather", "02 Feedback Coast", "03 Open Chord", "04 Last Rehearsal"],
    previewIndex: 5,
  }),
];
syncLogoSettings();
syncLabelPicker();
syncLabelControls();
syncSheetMode();
syncSpineFreeform();
syncTracklisting();
syncImageClearButtons();
renderSheet();
