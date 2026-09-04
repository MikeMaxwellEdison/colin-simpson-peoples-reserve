(function () {
  "use strict";

  const STORAGE_KEY = "colin-golf-calculator-v1";
  const FREQUENCY_MULTIPLIERS = { week: 52, month: 12, year: 1 };
  const CURRENT_YEAR = 2026;

  const roundWhole = (value) => Math.round(value);
  const formatNumber = (value) => new Intl.NumberFormat("en-NZ").format(roundWhole(value));

  function calculateSegments(rawSegments) {
    if (!Array.isArray(rawSegments) || rawSegments.length === 0) {
      throw new Error("Add at least one golfing era before calculating.");
    }

    let previousEnd = null;
    let totalGames = 0;
    let totalHoles = 0;
    let totalHits = 0;

    const segments = rawSegments.map((raw, index) => {
      const position = index + 1;
      const from = Number(raw.from);
      const to = Number(raw.to);
      const games = Number(raw.games);
      const frequency = String(raw.frequency || "");
      const holes = Number(raw.holes);
      const score = Number(raw.score);

      if (!Number.isInteger(from) || !Number.isInteger(to)) {
        throw new Error(`Era ${position}: enter both years as whole numbers.`);
      }
      if (from < 1900 || to > CURRENT_YEAR) {
        throw new Error(`Era ${position}: use years from 1900 to ${CURRENT_YEAR}.`);
      }
      if (to < from) {
        throw new Error(`Era ${position}: the final year must be the same as or later than the first year.`);
      }
      if (previousEnd !== null && from <= previousEnd) {
        throw new Error(`Era ${position}: start after ${previousEnd} so the eras do not overlap.`);
      }
      if (!Number.isFinite(games) || games <= 0) {
        throw new Error(`Era ${position}: enter an average number of games greater than zero.`);
      }
      if (!Object.prototype.hasOwnProperty.call(FREQUENCY_MULTIPLIERS, frequency)) {
        throw new Error(`Era ${position}: choose games per week, month or year.`);
      }
      if (holes !== 9 && holes !== 18) {
        throw new Error(`Era ${position}: choose a nine-hole or eighteen-hole scorecard.`);
      }
      if (!Number.isFinite(score) || score < holes) {
        throw new Error(`Era ${position}: enter a realistic average score for ${holes} holes.`);
      }

      const years = to - from + 1;
      const estimatedGames = years * games * FREQUENCY_MULTIPLIERS[frequency];
      const estimatedHoles = estimatedGames * holes;
      const estimatedHits = estimatedGames * score;

      previousEnd = to;
      totalGames += estimatedGames;
      totalHoles += estimatedHoles;
      totalHits += estimatedHits;

      return { from, to, games, frequency, holes, score, years, estimatedGames, estimatedHoles, estimatedHits };
    });

    return {
      segments,
      totalGames: roundWhole(totalGames),
      totalHoles: roundWhole(totalHoles),
      totalHits: roundWhole(totalHits),
      calculatedAt: new Date().toISOString(),
    };
  }

  function pdfEscape(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  function approximateTextX(text, fontSize, weightFactor = 0.52) {
    return Math.max(42, 421 - String(text).length * fontSize * weightFactor * 0.5);
  }

  function pdfText(text, y, font, size, colour, weightFactor) {
    const safeText = pdfEscape(text);
    const x = approximateTextX(text, size, weightFactor);
    return `${colour} rg BT /${font} ${size} Tf ${x.toFixed(1)} ${y} Td (${safeText}) Tj ET`;
  }

  function buildCertificatePdf(result) {
    if (!result || !Number.isFinite(Number(result.totalHits))) {
      throw new Error("A completed calculation is required to make the certificate.");
    }

    const calculatedDate = new Date(result.calculatedAt || Date.now());
    const dateLabel = calculatedDate.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" });
    const hitLabel = formatNumber(result.totalHits);
    const summary = `${formatNumber(result.totalGames)} estimated games  |  ${formatNumber(result.totalHoles)} estimated holes  |  ${result.segments.length} golfing era${result.segments.length === 1 ? "" : "s"}`;
    const dark = "0.035 0.035 0.030";
    const gold = "0.725 0.576 0.286";
    const brightGold = "0.839 0.714 0.416";
    const ivory = "0.953 0.933 0.882";

    const content = [
      `${dark} rg 0 0 842 595 re f`,
      `${gold} RG 2 w 22 22 798 551 re S`,
      `${gold} RG 0.7 w 30 30 782 535 re S`,
      ...(result.isSample ? [pdfText("LAYOUT PREVIEW - NOT A FINAL CALCULATION", 558, "F2", 8, brightGold, 0.62)] : []),
      `${gold} RG 0.8 w 302 510 m 540 510 l S`,
      pdfText("CS", 522, "F2", 25, brightGold, 0.58),
      pdfText("THE PEOPLE'S RESERVE", 487, "F2", 14, brightGold, 0.62),
      pdfText("CERTIFICATE OF GOLF ADDICTION", 443, "F2", 30, ivory, 0.55),
      pdfText("This certifies that", 400, "F3", 15, ivory, 0.48),
      pdfText("COLIN SIMPSON", 354, "F2", 37, brightGold, 0.58),
      pdfText("has, after careful family calculation, hit the little white ball an estimated", 317, "F1", 13, ivory, 0.48),
      pdfText(hitLabel, 245, "F2", hitLabel.length > 9 ? 50 : 59, brightGold, 0.58),
      pdfText("TIMES", 211, "F2", 15, ivory, 0.62),
      `${gold} RG 0.8 w 205 184 m 637 184 l S`,
      pdfText(summary, 157, "F1", 11, ivory, 0.48),
      pdfText("Compiled from scorecards, memory, optimism and selective accounting.", 116, "F3", 13, brightGold, 0.47),
      pdfText(`Issued ${dateLabel}`, 78, "F1", 9, ivory, 0.48),
      pdfText("The Family Statistics Department", 54, "F3", 10, ivory, 0.48),
    ].join("\n");

    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> /Contents 4 0 R >>",
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >>",
      "<< /Title (Colin Simpson - Certificate of Golf Addiction) /Author (The Family Statistics Department) /Subject (The People's Reserve - Father’s Day 2026) >>".replace("Father’s", "Father's"),
    ];

    let pdf = "%PDF-1.4\n%PEOPLES-RESERVE\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets[index + 1] = pdf.length;
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let index = 1; index <= objects.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 8 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return pdf;
  }

  function downloadCertificate(result) {
    const pdf = buildCertificatePdf(result);
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Colin-Simpson-Golf-Addiction-Certificate.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function initialiseCalculator() {
    const form = document.getElementById("golf-form");
    if (!form) return;

    const segmentsElement = document.getElementById("segments");
    const addButton = document.getElementById("add-segment");
    const statusElement = document.getElementById("form-status");
    const resultElement = document.getElementById("calculator-result");
    const resultNumber = document.getElementById("result-number");
    const resultGames = document.getElementById("result-games");
    const resultHoles = document.getElementById("result-holes");
    const resultEras = document.getElementById("result-eras");
    const savedDate = document.getElementById("saved-date");
    const certificateButton = document.getElementById("download-certificate");
    const dialog = document.getElementById("recalculate-dialog");
    const cancelButton = document.getElementById("cancel-recalculate");
    const downloadThenButton = document.getElementById("download-then-recalculate");
    const confirmButton = document.getElementById("confirm-recalculate");

    let currentResult = null;
    let pendingSegments = null;

    const emptySegment = (from = "") => ({ from, to: from, games: "", frequency: "week", holes: "9", score: "" });
    const safeNumberValue = (value) => /^\d*(?:\.\d*)?$/.test(String(value ?? "")) ? String(value ?? "") : "";

    const loadState = () => {
      try {
        return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") || {};
      } catch (_error) {
        return {};
      }
    };

    const collectSegments = () => Array.from(segmentsElement.querySelectorAll("[data-segment]")).map((segment) => ({
      from: segment.querySelector('[name="from"]')?.value ?? "",
      to: segment.querySelector('[name="to"]')?.value ?? "",
      games: segment.querySelector('[name="games"]')?.value ?? "",
      frequency: segment.querySelector('[name="frequency"]')?.value ?? "week",
      holes: segment.querySelector('[name="holes"]')?.value ?? "9",
      score: segment.querySelector('[name="score"]')?.value ?? "",
    }));

    const saveState = (result = currentResult) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ segments: collectSegments(), result }));
      } catch (_error) {
        // The calculator still works if private browsing blocks local storage.
      }
    };

    const updateSegmentLabels = () => {
      const cards = Array.from(segmentsElement.querySelectorAll("[data-segment]"));
      cards.forEach((card, index) => {
        card.querySelector("[data-segment-number]").textContent = String(index + 1).padStart(2, "0");
        card.querySelector("[data-segment-title]").textContent = `Golfing era ${index + 1}`;
        const remove = card.querySelector("[data-remove-segment]");
        remove.hidden = cards.length === 1;
        remove.setAttribute("aria-label", `Remove golfing era ${index + 1}`);
      });
    };

    const addSegment = (values = emptySegment()) => {
      const wrapper = document.createElement("fieldset");
      wrapper.className = "segment-card";
      wrapper.dataset.segment = "";
      wrapper.innerHTML = `
        <legend><span data-segment-number>01</span><strong data-segment-title>Golfing era</strong></legend>
        <button class="remove-segment" type="button" data-remove-segment aria-label="Remove golfing era">Remove</button>
        <div class="segment-fields">
          <label><span>From year</span><input name="from" type="number" inputmode="numeric" min="1900" max="${CURRENT_YEAR}" step="1" value="${safeNumberValue(values.from)}" placeholder="e.g. 1985" required /></label>
          <label><span>To year</span><input name="to" type="number" inputmode="numeric" min="1900" max="${CURRENT_YEAR}" step="1" value="${safeNumberValue(values.to)}" placeholder="e.g. 1994" required /></label>
          <label><span>Average games</span><input name="games" type="number" inputmode="decimal" min="0.1" max="365" step="0.1" value="${safeNumberValue(values.games)}" placeholder="e.g. 1.5" required /></label>
          <label><span>Games were played</span><select name="frequency"><option value="week"${values.frequency === "week" ? " selected" : ""}>per week</option><option value="month"${values.frequency === "month" ? " selected" : ""}>per month</option><option value="year"${values.frequency === "year" ? " selected" : ""}>per year</option></select></label>
          <label><span>Usual scorecard</span><select name="holes"><option value="9"${String(values.holes) === "9" ? " selected" : ""}>9 holes</option><option value="18"${String(values.holes) === "18" ? " selected" : ""}>18 holes</option></select></label>
          <label><span>Average score</span><input name="score" type="number" inputmode="decimal" min="9" max="250" step="0.1" value="${safeNumberValue(values.score)}" placeholder="e.g. 48" required /></label>
        </div>`;
      segmentsElement.appendChild(wrapper);
      updateSegmentLabels();
    };

    const showResult = (result, shouldFocus = false) => {
      currentResult = result;
      resultNumber.textContent = formatNumber(result.totalHits);
      resultGames.textContent = formatNumber(result.totalGames);
      resultHoles.textContent = formatNumber(result.totalHoles);
      resultEras.textContent = String(result.segments.length);
      const date = new Date(result.calculatedAt);
      savedDate.textContent = `Saved on this device · ${date.toLocaleString("en-NZ", { dateStyle: "long", timeStyle: "short" })}`;
      resultElement.hidden = false;
      if (shouldFocus) {
        resultElement.focus({ preventScroll: true });
        resultElement.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      }
    };

    const performCalculation = () => {
      statusElement.textContent = "";
      try {
        const result = calculateSegments(pendingSegments || collectSegments());
        pendingSegments = null;
        currentResult = result;
        saveState(result);
        showResult(result, true);
      } catch (error) {
        pendingSegments = null;
        statusElement.textContent = error instanceof Error ? error.message : "Check the golfing eras and try again.";
        statusElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    const saved = loadState();
    const initialSegments = Array.isArray(saved.segments) && saved.segments.length ? saved.segments : [emptySegment()];
    initialSegments.forEach(addSegment);
    if (saved.result) showResult(saved.result);

    segmentsElement.addEventListener("click", (event) => {
      const remove = event.target.closest("[data-remove-segment]");
      if (!remove) return;
      remove.closest("[data-segment]")?.remove();
      updateSegmentLabels();
      saveState();
    });

    form.addEventListener("input", () => {
      statusElement.textContent = "";
      saveState();
    });

    addButton.addEventListener("click", () => {
      const existing = collectSegments();
      const previousEnd = Number(existing.at(-1)?.to);
      addSegment(emptySegment(Number.isInteger(previousEnd) && previousEnd < CURRENT_YEAR ? previousEnd + 1 : ""));
      saveState();
      segmentsElement.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      pendingSegments = collectSegments();
      if (currentResult) {
        if (typeof dialog.showModal === "function") dialog.showModal();
        else if (window.confirm("Replace the previous saved result?")) performCalculation();
        else pendingSegments = null;
        return;
      }
      performCalculation();
    });

    cancelButton.addEventListener("click", () => {
      pendingSegments = null;
      dialog.close();
    });

    confirmButton.addEventListener("click", () => {
      dialog.close();
      performCalculation();
    });

    downloadThenButton.addEventListener("click", () => {
      if (currentResult) downloadCertificate(currentResult);
      dialog.close();
      window.setTimeout(performCalculation, 120);
    });

    certificateButton.addEventListener("click", () => {
      if (currentResult) downloadCertificate(currentResult);
    });

    dialog.addEventListener("cancel", () => {
      pendingSegments = null;
    });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculateSegments, buildCertificatePdf };
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialiseCalculator);
    else initialiseCalculator();
  }
})();
