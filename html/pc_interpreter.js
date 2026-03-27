/*
  LinAge2 Principal Component Interpreter

  This utility helps interpret what each PC represents by showing
  the top contributing biomarkers (highest absolute loadings).
*/

import { parseCsv } from "./linage2_core.js";

/**
 * Get the top N biomarkers contributing to a specific PC
 * @param {Array<Array<number>>} vMat - V matrix (biomarkers x PCs)
 * @param {Array<string>} biomarkerNames - Names of biomarkers in order
 * @param {number} pcIndex - PC number (1-indexed)
 * @param {number} topN - Number of top contributors to return
 * @returns {Array<{biomarker: string, loading: number}>}
 */
export function interpretPC(vMat, biomarkerNames, pcIndex, topN = 10) {
  if (pcIndex < 1 || pcIndex > vMat[0].length) {
    throw new Error(`PC${pcIndex} out of range`);
  }

  const colIdx = pcIndex - 1; // Convert to 0-indexed

  // Extract loadings for this PC
  const loadings = vMat.map((row, rowIdx) => ({
    biomarker: biomarkerNames[rowIdx] || `Unknown_${rowIdx}`,
    loading: row[colIdx],
    absLoading: Math.abs(row[colIdx])
  }));

  // Sort by absolute loading (descending)
  loadings.sort((a, b) => b.absLoading - a.absLoading);

  return loadings.slice(0, topN).map(({ biomarker, loading }) => ({
    biomarker,
    loading: Math.round(loading * 1000) / 1000
  }));
}

/**
 * Get biomarker names from the processed dataMat columns
 * These are the columns that remain after filtering (NA removal, etc.)
 */
export function getBiomarkerNamesFromData(dataMat) {
  // Remove SEQN and non-biomarker columns
  return dataMat.columns.filter(col =>
    col !== 'SEQN' &&
    !col.startsWith('PC') &&
    col !== 'chronAge' &&
    col !== 'linAge2' &&
    col !== 'bioAge_del' &&
    col !== 'RIAGENDR' &&
    col !== 'RIDAGEEX'
  );
}

/**
 * Generate a summary of all PCs used in the model
 * @param {Array<Array<number>>} vMat - V matrix
 * @param {Array<string>} biomarkerNames - Biomarker names
 * @param {Array<number>} pcIndices - PC numbers used in model (e.g., [1,2,5,6,8...])
 * @param {string} sex - 'M' or 'F'
 * @returns {string} HTML summary
 */
export function generatePCSummary(vMat, biomarkerNames, pcIndices, sex) {
  let html = `<div class="pc-interpretation">`;
  html += `<h3>Principal Component Interpretation (${sex === 'M' ? 'Male' : 'Female'} Model)</h3>`;
  html += `<p class="pc-intro">Each PC represents a weighted combination of biomarkers. Top contributors shown:</p>`;

  pcIndices.forEach(pcNum => {
    const topContributors = interpretPC(vMat, biomarkerNames, pcNum, 5);
    html += `<details class="pc-details">`;
    html += `  <summary><strong>PC${pcNum}</strong> - Top 5 Contributing Biomarkers</summary>`;
    html += `  <ul>`;
    topContributors.forEach(({ biomarker, loading }) => {
      const sign = loading >= 0 ? '+' : '';
      html += `    <li><strong>${biomarker}</strong>: ${sign}${loading}</li>`;
    });
    html += `  </ul>`;
    html += `</details>`;
  });

  html += `</div>`;
  return html;
}
