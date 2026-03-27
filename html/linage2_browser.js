/*
  LinAge2 Browser Interface

  This module handles the browser-side execution of LinAge2 biological age calculations.
  It loads training data, processes user input, and renders results with visualizations.

  Licensed under Creative Commons Attribution 4.0 International (CC BY 4.0)
  Based on: Fung C, Vialle RA, Ahadi S, et al. (2025). "Sex-Specific Clocks for Biological Age"
*/

import {
  parseCsv,
  buildParamsMap,
  runLinAge2,
  buildNumericTable,
  buildStringTable,
} from "./linage2_core.js?v=10";

// ============================================================================
// DATA LOADING
// ============================================================================

/**
 * Fetch text content from a file path
 * @param {string} path - File path to fetch
 * @returns {Promise<string>} File contents as text
 */
async function fetchText(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.text();
}

/** Cache for loaded training data artifacts */
let cachedArtifacts = null;

/**
 * Load all required training data artifacts for LinAge2 calculation
 * Results are cached after first load for performance
 * @returns {Promise<Object>} Training data artifacts
 */
async function loadArtifacts() {
  if (cachedArtifacts) return cachedArtifacts;
  const [
    mergedDataText,
    codeBookText,
    paramsText,
    logNoLogText,
    vMatFText,
    vMatMText,
    diagFText,
    diagMText,
    sanityText,
  ] = await Promise.all([
    fetchText("../data/mergedDataNHANES9902.csv"),
    fetchText("../data/codebook_linAge2.csv"),
    fetchText("../data/paraInit.csv"),
    fetchText("../data/logNoLog.csv"),
    fetchText("../data/vMatDat99_F_pre.csv"),
    fetchText("../data/vMatDat99_M_pre.csv"),
    fetchText("../data/diagDat99_F_pre.csv"),
    fetchText("../data/diagDat99_M_pre.csv"),
    fetchText("../user_data/userData_sanity.csv").catch(() => null),
  ]);

  const mergedData = buildNumericTable(parseCsv(mergedDataText));
  const codeBook = buildStringTable(parseCsv(codeBookText));
  const params = buildParamsMap(parseCsv(paramsText));
  const logNoLog = parseCsv(logNoLogText);
  const vMatF = parseCsv(vMatFText).rows.map((r) => r.map((v) => Number(v)));
  const vMatM = parseCsv(vMatMText).rows.map((r) => r.map((v) => Number(v)));
  const diagF = parseCsv(diagFText).rows.map((r, i) => Number(r[i]));
  const diagM = parseCsv(diagMText).rows.map((r, i) => Number(r[i]));
  const sanityData = sanityText ? buildNumericTable(parseCsv(sanityText)) : null;

  cachedArtifacts = {
    mergedData,
    codeBook,
    params,
    logNoLog,
    vMatF,
    vMatM,
    diagF,
    diagM,
    sanityData,
  };
  return cachedArtifacts;
}

// ============================================================================
// CALCULATION INTERFACE
// ============================================================================

/**
 * Run LinAge2 calculation on CSV text input
 * @param {string} csvText - CSV formatted user data
 * @returns {Promise<Object>} Calculation results with output table and CSV
 */
export async function runLinAge2FromCsvText(csvText) {
  try {
    console.log('Loading artifacts...');
    const artifacts = await loadArtifacts();
    console.log('Artifacts loaded:', Object.keys(artifacts));

    console.log('Parsing CSV...');
    const parsed = parseCsv(csvText);
    console.log('Parsed CSV:', { columns: parsed.columns, rowCount: parsed.rows.length });

    console.log('Building numeric table...');
    const userData = buildNumericTable(parsed);
    console.log('User data columns:', Object.keys(userData.data));

    console.log('Running LinAge2 calculation...');
    return runLinAge2({
      mergedData: artifacts.mergedData,
      userData,
      sanityData: artifacts.sanityData,
      codeBook: artifacts.codeBook,
      params: artifacts.params,
      logNoLog: artifacts.logNoLog,
      vMatF: artifacts.vMatF,
      vMatM: artifacts.vMatM,
      diagF: artifacts.diagF,
      diagM: artifacts.diagM,
    });
  } catch (err) {
    console.error('Error in runLinAge2FromCsvText:', err);
    console.error('Error stack:', err.stack);
    throw err;
  }
}

// ============================================================================
// UI INTEGRATION
// ============================================================================

/**
 * Global function called by UI to compute biological age
 * Reads CSV from form, runs calculation, and displays results
 */
window.computeLinAge2 = async function computeLinAge2() {
  const csvText = document.getElementById("csvOutput").value;
  // Validation is now handled by form_controller.js before calling this function
  // Just check if we have data
  if (!csvText) {
    throw new Error("No CSV data available. Please ensure form is filled out correctly.");
  }
  const output = document.getElementById("linage2Output");
  const container = document.getElementById("linage2Result");
  const summary = document.getElementById("linage2Summary");
  const chart = document.getElementById("linage2Chart");
  // Visibility is now controlled via CSS classes by form_controller.js
  output.value = "Running LinAge2... this may take a few minutes in the browser.";
  summary.textContent = "";
  try {
    console.log('Starting LinAge2 calculation...');
    console.log('CSV text length:', csvText.length);
    console.log('CSV preview:', csvText.substring(0, 200));

    const result = await runLinAge2FromCsvText(csvText);
    console.log('Calculation complete!');
    console.log('Result columns:', result.columns);

    output.value = result.csv;
    renderLinAge2(result.csv, summary, chart);
  } catch (err) {
    console.error('Calculation failed:', err);
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    output.value = `Error: ${err.message}\n\nCheck browser console (F12) for details.`;
    summary.textContent = "";
    if (chart) {
      const ctx = chart.getContext("2d");
      ctx.clearRect(0, 0, chart.width, chart.height);
    }
    throw err; // Re-throw so form_controller can also log it
  }
};

// ============================================================================
// RESULTS RENDERING
// ============================================================================

/**
 * Render LinAge2 calculation results to the page
 * @param {string} csvText - Output CSV from calculation
 * @param {HTMLElement} summaryEl - Container for summary statistics
 * @param {HTMLCanvasElement} canvasEl - Canvas for chart visualization
 */
function renderLinAge2(csvText, summaryEl, canvasEl) {
  const parsed = parseCsv(csvText);
  if (!parsed.rows.length) return;
  const cols = parsed.columns;
  const row = parsed.rows[0];
  const valueMap = {};
  cols.forEach((c, i) => {
    valueMap[c] = Number(row[i]);
  });

  const seqn = row[cols.indexOf("SEQN")] || "";
  const sex = row[cols.indexOf("RIAGENDR")] || "";
  const ageMonths = row[cols.indexOf("RIDAGEEX")] || "";
  const chronAge = valueMap.chronAge;
  const linAge2 = valueMap.linAge2;
  const bioAgeDel = valueMap.bioAge_del;

  const deltaSign = Number.isFinite(bioAgeDel) && bioAgeDel > 0 ? '+' : '';
  const deltaClass = Number.isFinite(bioAgeDel)
    ? (bioAgeDel > 0 ? 'delta-positive' : bioAgeDel < 0 ? 'delta-negative' : 'delta-neutral')
    : '';

  let deltaInterpretation = '';
  if (Number.isFinite(bioAgeDel)) {
    if (bioAgeDel > 0) {
      deltaInterpretation = '<div class="result-note">Aging faster than chronological age</div>';
    } else if (bioAgeDel < 0) {
      deltaInterpretation = '<div class="result-note">Aging slower than chronological age</div>';
    } else {
      deltaInterpretation = '<div class="result-note">Same as chronological age</div>';
    }
  }

  summaryEl.innerHTML = `
    <div class="key-results">
      <div class="key-result-item">
        <div class="result-label">Chronological Age</div>
        <div class="result-value">${Number.isFinite(chronAge) ? chronAge.toFixed(2) : "—"} years</div>
      </div>
      <div class="key-result-item highlight-primary">
        <div class="result-label">LinAge2 (Biological Age)</div>
        <div class="result-value">${Number.isFinite(linAge2) ? linAge2.toFixed(2) : "—"} years</div>
      </div>
      <div class="key-result-item ${deltaClass}">
        <div class="result-label">Delta (Biological - Chronological)</div>
        <div class="result-value">${Number.isFinite(bioAgeDel) ? deltaSign + bioAgeDel.toFixed(2) : "—"} years</div>
        ${deltaInterpretation}
      </div>
    </div>
    <div class="metadata-results">
      <div><strong>SEQN:</strong> ${seqn}</div>
      <div><strong>Sex:</strong> ${sex === "1" ? "Male" : sex === "2" ? "Female" : "Unknown"}</div>
      <div><strong>Age (months):</strong> ${ageMonths}</div>
    </div>
  `;

  // Extract PC values based on sex, with ordered labels matching R output
  // Male PCs: 1, 2, 5, 6, 8, 11, 15, 16, 17, 19, 24, 25, 27, 31, 33, 36, 42
  // Female PCs: 1, 2, 4, 6, 11, 13, 20, 22, 23, 24, 28, 31, 32, 35, 37, 38, 39
  const maleOrder = [1, 2, 5, 6, 8, 11, 15, 16, 17, 19, 24, 25, 27, 31, 33, 36, 42];
  const femaleOrder = [1, 2, 4, 6, 11, 13, 20, 22, 23, 24, 28, 31, 32, 35, 37, 38, 39];

  const isMale = sex === "1";
  const pcOrder = isMale ? maleOrder : femaleOrder;
  const suffix = isMale ? "M" : "F";

  const pcEntries = pcOrder
    .map((pcNum, idx) => {
      const colName = `PC${pcNum}${suffix}`;
      const value = valueMap[colName];
      return {
        name: `${String(idx + 1).padStart(2, '0')}_PC${pcNum}${suffix}`,
        value: value
      };
    })
    .filter((v) => Number.isFinite(v.value));

  drawBarChart(canvasEl, pcEntries, sex);
}

// ============================================================================
// VISUALIZATION - PRINCIPAL COMPONENTS CHART
// ============================================================================

/**
 * Biological system color mapping for principal components
 * Colors assigned based on dominant biomarker loadings in each PC
 * Matches scientific figure conventions from the published paper
 */
const PC_SYSTEM_COLORS = {
  // Males
  '1M': '#E74C3C',   // PC1M - Overall aging/mortality (red)
  '2M': '#3498DB',   // PC2M - Metabolic (blue)
  '5M': '#2ECC71',   // PC5M - Cardiovascular (green)
  '6M': '#9B59B6',   // PC6M - Renal (purple)
  '8M': '#F39C12',   // PC8M - Inflammatory (orange)
  '11M': '#1ABC9C',  // PC11M - Metabolic (teal)
  '15M': '#E67E22',  // PC15M - Liver (dark orange)
  '16M': '#34495E',  // PC16M - Hematologic (dark grey)
  '17M': '#16A085',  // PC17M - Metabolic (dark teal)
  '19M': '#8E44AD',  // PC19M - Inflammatory (dark purple)
  '24M': '#27AE60',  // PC24M - Cardiovascular (dark green)
  '25M': '#2980B9',  // PC25M - Renal (dark blue)
  '27M': '#C0392B',  // PC27M - Hematologic (dark red)
  '31M': '#D35400',  // PC31M - Metabolic (burnt orange)
  '33M': '#7F8C8D',  // PC33M - Multi-system (grey)
  '36M': '#16A085',  // PC36M - Inflammatory (teal-green)
  '42M': '#95A5A6',  // PC42M - Multi-system (light grey)

  // Females
  '1F': '#E74C3C',   // PC1F - Overall aging/mortality (red)
  '2F': '#3498DB',   // PC2F - Metabolic (blue)
  '4F': '#2ECC71',   // PC4F - Cardiovascular (green)
  '6F': '#9B59B6',   // PC6F - Renal (purple)
  '11F': '#1ABC9C',  // PC11F - Metabolic (teal)
  '13F': '#F39C12',  // PC13F - Inflammatory (orange)
  '20F': '#E67E22',  // PC20F - Liver (dark orange)
  '22F': '#34495E',  // PC22F - Hematologic (dark grey)
  '23F': '#16A085',  // PC23F - Metabolic (dark teal)
  '24F': '#8E44AD',  // PC24F - Inflammatory (dark purple)
  '28F': '#27AE60',  // PC28F - Cardiovascular (dark green)
  '31F': '#2980B9',  // PC31F - Renal (dark blue)
  '32F': '#C0392B',  // PC32F - Hematologic (dark red)
  '35F': '#D35400',  // PC35F - Metabolic (burnt orange)
  '37F': '#7F8C8D',  // PC37F - Multi-system (grey)
  '38F': '#16A085',  // PC38F - Inflammatory (teal-green)
  '39F': '#95A5A6',  // PC39F - Multi-system (light grey)
};

/** Legend mapping colors to biological systems */
const SYSTEM_LEGEND = {
  '#E74C3C': 'Overall Aging',
  '#3498DB': 'Metabolic',
  '#2ECC71': 'Cardiovascular',
  '#9B59B6': 'Renal',
  '#F39C12': 'Inflammatory',
  '#E67E22': 'Liver',
  '#34495E': 'Hematologic',
  '#7F8C8D': 'Multi-system'
};

/**
 * Get color for a principal component based on biological system
 * @param {string} pcName - PC name (e.g., "01_PC5M")
 * @returns {string} Hex color code
 */
function getColorForPC(pcName) {
  // Extract PC number and sex suffix (e.g., "01_PC5M" -> "5M")
  const match = pcName.match(/PC(\d+)([MF])$/);
  if (!match) return '#d3d3d3'; // fallback grey
  const key = `${match[1]}${match[2]}`;
  return PC_SYSTEM_COLORS[key] || '#d3d3d3';
}

/**
 * Draw color-coded bar chart of principal component contributions
 * Matches R ggplot2 styling with biological system color coding
 * @param {HTMLCanvasElement} canvas - Canvas element for drawing
 * @param {Array<{name: string, value: number}>} data - PC data to plot
 * @param {string} sex - Sex indicator ("1" for male, "2" for female)
 */
function drawBarChart(canvas, data, sex) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!data.length) {
    ctx.fillStyle = "#666";
    ctx.font = "14px Arial";
    ctx.fillText("No PC values available to plot.", 20, 30);
    return;
  }

  // Match R ggplot2 styling (increased bottom padding for legend)
  const padding = { left: 60, right: 30, top: 40, bottom: 120 };
  const width = canvas.width - padding.left - padding.right;
  const height = canvas.height - padding.top - padding.bottom;

  // Fixed Y-axis range to match R: -5 to 5
  const yMin = -5;
  const yMax = 5;
  const yRange = yMax - yMin;

  // Calculate scale
  const barWidth = width / data.length;
  const yScale = height / yRange;

  // Helper to convert value to Y coordinate
  const valueToY = (val) => padding.top + height - ((val - yMin) * yScale);
  const zeroY = valueToY(0);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw horizontal grid lines (every 0.5 units)
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 0.5;
  for (let y = -5; y <= 5; y += 0.5) {
    const yPos = valueToY(y);
    ctx.beginPath();
    ctx.moveTo(padding.left, yPos);
    ctx.lineTo(padding.left + width, yPos);
    ctx.stroke();
  }

  // Draw Y-axis with labels
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + height);
  ctx.stroke();

  // Y-axis labels (every 0.5 units)
  ctx.fillStyle = "#000";
  ctx.font = "11px Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let y = -5; y <= 5; y += 0.5) {
    const yPos = valueToY(y);
    ctx.fillText(y.toFixed(1), padding.left - 8, yPos);
  }

  // Y-axis title
  ctx.save();
  ctx.translate(15, padding.top + height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.font = "12px Arial";
  ctx.fillText("PC values", 0, 0);
  ctx.restore();

  // Draw X-axis
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + height);
  ctx.lineTo(padding.left + width, padding.top + height);
  ctx.stroke();

  // Draw bars (color-coded by biological system)
  data.forEach((d, i) => {
    const barX = padding.left + i * barWidth + barWidth * 0.1;
    const barW = barWidth * 0.8;
    const value = Math.max(yMin, Math.min(yMax, d.value)); // Clamp to range
    const barH = Math.abs(value) * yScale;
    const barY = value >= 0 ? valueToY(value) : zeroY;

    // Set color based on PC's biological system
    ctx.fillStyle = getColorForPC(d.name);
    ctx.fillRect(barX, barY, barW, barH);
  });

  // Draw value labels on top of bars
  ctx.fillStyle = "#000";
  ctx.font = "10px Arial";
  ctx.textAlign = "center";
  data.forEach((d, i) => {
    const barX = padding.left + i * barWidth + barWidth * 0.5;
    const value = Math.max(yMin, Math.min(yMax, d.value));
    const labelY = value >= 0 ? valueToY(value) - 4 : valueToY(value) + 12;
    ctx.fillText(d.value.toFixed(2), barX, labelY);
  });

  // X-axis labels (rotated 15 degrees to match R)
  ctx.fillStyle = "#000";
  ctx.font = "11px Arial";
  ctx.textAlign = "left";
  data.forEach((d, i) => {
    const x = padding.left + i * barWidth + barWidth * 0.5;
    const y = padding.top + height + 8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(15 * Math.PI / 180);
    ctx.fillText(d.name, 0, 0);
    ctx.restore();
  });

  // Title
  const sexLabel = sex === "1" ? "Male" : sex === "2" ? "Female" : "Unknown";
  ctx.fillStyle = "#000";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`Principal Component Contributions (${sexLabel})`, canvas.width / 2, 20);

  // Subtitle explaining PCs
  ctx.font = "11px Arial";
  ctx.fillStyle = "#666";
  ctx.fillText("Each PC represents a weighted combination of biomarkers predictive of biological aging", canvas.width / 2, 36);

  // Draw legend at bottom
  const legendY = padding.top + height + 70;
  const legendX = padding.left;
  ctx.font = "10px Arial";
  ctx.textAlign = "left";

  // Title for legend
  ctx.fillStyle = "#000";
  ctx.font = "bold 11px Arial";
  ctx.fillText("Biological Systems:", legendX, legendY);

  // Draw legend items
  ctx.font = "10px Arial";
  const legendItems = Object.entries(SYSTEM_LEGEND);
  const itemsPerRow = 4;
  const itemWidth = (width) / itemsPerRow;
  const rowHeight = 16;

  legendItems.forEach(([color, label], idx) => {
    const row = Math.floor(idx / itemsPerRow);
    const col = idx % itemsPerRow;
    const x = legendX + col * itemWidth;
    const y = legendY + 16 + row * rowHeight;

    // Draw colored box
    ctx.fillStyle = color;
    ctx.fillRect(x, y - 8, 12, 12);

    // Draw border around box
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y - 8, 12, 12);

    // Draw label
    ctx.fillStyle = "#333";
    ctx.fillText(label, x + 16, y);
  });
}
