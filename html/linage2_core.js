// ######################################   FUNCTION DEFINITIONS   ######################################
const EPS = 1e-8;

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

// --------------------------- < READ, WRITE AND CLEAN DATA > ---------------------------
export function parseCsv(text) {
  const clean = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!clean) return { columns: [], rows: [] };
  const lines = clean.split("\n");
  const columns = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "") continue;
    rows.push(parseCsvLine(lines[i]));
  }
  return { columns, rows };
}

function toNumber(v) {
  if (v === null || v === undefined || v === "") return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function buildNumericTable(parsed) {
  const data = {};
  parsed.columns.forEach((col, idx) => {
    data[col] = parsed.rows.map((row) => toNumber(row[idx]));
  });
  return { columns: parsed.columns.slice(), data };
}

export function buildStringTable(parsed) {
  const data = {};
  parsed.columns.forEach((col, idx) => {
    data[col] = parsed.rows.map((row) => (row[idx] ?? "").trim());
  });
  return { columns: parsed.columns.slice(), data };
}

function getCol(table, name) {
  return table.data[name] || [];
}

function setCol(table, name, values) {
  if (!table.columns.includes(name)) table.columns.push(name);
  table.data[name] = values;
}

function selectRows(table, keepRows) {
  const out = { columns: table.columns.slice(), data: {} };
  out.columns.forEach((col) => {
    const src = table.data[col];
    const dst = [];
    for (let i = 0; i < keepRows.length; i += 1) {
      if (keepRows[i]) dst.push(src[i]);
    }
    out.data[col] = dst;
  });
  return out;
}

function selectColumns(table, columns) {
  const n = rowCount(table);
  const out = { columns: columns.slice(), data: {} };
  columns.forEach((col) => {
    out.data[col] = table.data[col] ? table.data[col].slice() : new Array(n).fill(NaN);
  });
  return out;
}

function rowCount(table) {
  const first = table.columns[0];
  return first ? table.data[first].length : 0;
}

// Select columns marked as data ("1" in codebook Data column).
function markIncsFromCodeBook(codeBook) {
  const vars = getCol(codeBook, "Var");
  const flags = getCol(codeBook, "Data").map((v) => Number(v));
  return vars.map((name, i) => ({ name, flag: flags[i] }));
}

// Drop everything not flagged as Data=1; keep SEQN.
function dropCols(dataSet, incList) {
  const incNames = incList.filter((x) => x.flag === 1).map((x) => x.name);
  const outCols = ["SEQN"];
  incNames.forEach((name) => {
    if (name !== "SEQN") outCols.push(name);
  });
  return selectColumns(dataSet, outCols);
}

// Build questionnaire matrix (everything NOT flagged as data).
// Includes all columns from masterData except those with flag===1,
// matching R behavior where columns not in codebook default to flag=0.
function qDataMatGen(masterData, incList) {
  // Build set of data columns (flag === 1)
  const dataColNames = new Set(incList.filter((x) => x.flag === 1).map((x) => x.name));

  // Keep all columns from masterData that are NOT data columns
  const outCols = masterData.columns.filter((col) => !dataColNames.has(col));

  // Ensure SEQN is first
  const finalCols = ["SEQN"];
  outCols.forEach((name) => {
    if (name !== "SEQN") finalCols.push(name);
  });

  return selectColumns(masterData, finalCols);
}

// Drop columns with NA fraction above cutoff (unless force-included).
function dropNAcolumns(dataSet, pNAcut, codeBook, incSwitch) {
  const nRows = rowCount(dataSet);
  const keepFlags = {};
  let forceInc = new Set();
  if (incSwitch === 1 && codeBook) {
    const vars = getCol(codeBook, "Var");
    const flags = getCol(codeBook, "ForceInc").map((v) => Number(v));
    vars.forEach((v, i) => {
      if (flags[i] === 1) forceInc.add(v);
    });
  }
  dataSet.columns.forEach((col) => {
    const vals = getCol(dataSet, col);
    let naCount = 0;
    for (let i = 0; i < vals.length; i += 1) {
      if (!Number.isFinite(vals[i])) naCount += 1;
    }
    const pNA = naCount / nRows;
    keepFlags[col] = pNA < pNAcut || forceInc.has(col);
  });
  const keptCols = dataSet.columns.filter((c) => keepFlags[c]);
  return selectColumns(dataSet, keptCols);
}

// Keep rows with no missing values.
function getNonNARows(dataSet) {
  const nRows = rowCount(dataSet);
  const keep = new Array(nRows).fill(true);
  dataSet.columns.forEach((col) => {
    const vals = getCol(dataSet, col);
    for (let i = 0; i < nRows; i += 1) {
      if (!Number.isFinite(vals[i])) keep[i] = false;
    }
  });
  return keep;
}

// Keep subjects within age bracket.
function selectAgeBracket(qMat, ageCutLower, ageCutUpper) {
  const ages = getCol(qMat, "RIDAGEYR");
  return ages.map((age) => age >= ageCutLower && age <= ageCutUpper);
}

// Keep non-accidental deaths (exclude UCOD_LEADING == 4).
function nonAccidDeathFlags(qMat) {
  const cod = getCol(qMat, "UCOD_LEADING").map((v) => (Number.isFinite(v) ? v : 0));
  return cod.map((v) => v !== 4);
}

// Digitize cotinine to smoking intensity bins.
function digiCot(dataMat) {
  const cot = getCol(dataMat, "LBXCOT").slice();
  const out = cot.map((v) => {
    if (!Number.isFinite(v)) return v;
    if (v < 10) return 0;
    if (v < 100) return 1;
    if (v < 200) return 2;
    return 3;
  });
  setCol(dataMat, "LBXCOT", out);
  return dataMat;
}

// --------------------- < CALCULATING DERIVED FEATURES FROM DATA > ---------------------
// Frailty / comorbidity index (binary disease burden).
function popPCFIfs1(qDataMat) {
  const names = [
    "BPQ020", "DIQ010", "HUQ010", "HUQ020", "HUQ050", "HUQ070", "KIQ020",
    "MCQ010", "MCQ053", "MCQ160A", "MCQ160B", "MCQ160C", "MCQ160D", "MCQ160E",
    "MCQ160F", "MCQ160G", "MCQ160I", "MCQ160J", "MCQ160K", "MCQ160L", "MCQ220",
    "OSQ010A", "OSQ010B", "OSQ010C", "OSQ060", "PFQ056",
  ];
  const cols = {};
  names.forEach((n) => { cols[n] = getCol(qDataMat, n).slice(); });
  const n = cols.BPQ020.length;
  function fill(col, val) {
    for (let i = 0; i < n; i += 1) {
      if (!Number.isFinite(col[i])) col[i] = val;
    }
  }
  fill(cols.BPQ020, 2);
  fill(cols.DIQ010, 2);
  fill(cols.HUQ010, 3);
  fill(cols.HUQ020, 3);
  fill(cols.HUQ050, 0);
  fill(cols.HUQ070, 2);
  fill(cols.KIQ020, 2);
  fill(cols.MCQ010, 2);
  fill(cols.MCQ053, 2);
  fill(cols.MCQ160A, 2);
  fill(cols.MCQ160B, 2);
  fill(cols.MCQ160C, 2);
  fill(cols.MCQ160D, 2);
  fill(cols.MCQ160E, 2);
  fill(cols.MCQ160F, 2);
  fill(cols.MCQ160G, 2);
  fill(cols.MCQ160I, 2);
  fill(cols.MCQ160J, 2);
  fill(cols.MCQ160K, 2);
  fill(cols.MCQ160L, 2);
  fill(cols.MCQ220, 2);
  fill(cols.OSQ010A, 2);
  fill(cols.OSQ010B, 2);
  fill(cols.OSQ010C, 2);
  fill(cols.OSQ060, 2);
  fill(cols.PFQ056, 2);
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    const binVec = [
      cols.BPQ020[i] === 1,
      cols.DIQ010[i] === 1 || cols.DIQ010[i] === 3,
      cols.KIQ020[i] === 1,
      cols.MCQ010[i] === 1,
      cols.MCQ053[i] === 1,
      cols.MCQ160A[i] === 1,
      cols.MCQ160C[i] === 1,
      cols.MCQ160D[i] === 1,
      cols.MCQ160E[i] === 1,
      cols.MCQ160F[i] === 1,
      cols.MCQ160G[i] === 1,
      cols.MCQ160I[i] === 1,
      cols.MCQ160J[i] === 1,
      cols.MCQ160K[i] === 1,
      cols.MCQ160L[i] === 1,
      cols.MCQ220[i] === 1,
      cols.OSQ010A[i] === 1,
      cols.OSQ010B[i] === 1,
      cols.OSQ010C[i] === 1,
      cols.OSQ060[i] === 1,
      cols.PFQ056[i] === 1,
      cols.HUQ070[i] === 1,
    ];
    const sum = binVec.reduce((a, b) => a + (b ? 1 : 0), 0);
    out[i] = sum / 22;
  }
  return out;
}

// Self-reported health status score.
function popPCFIfs2(qDataMat) {
  const HUQ010 = getCol(qDataMat, "HUQ010").slice();
  const HUQ020 = getCol(qDataMat, "HUQ020").slice();
  const n = HUQ010.length;
  for (let i = 0; i < n; i += 1) {
    if (!Number.isFinite(HUQ010[i])) HUQ010[i] = 3;
    if (!Number.isFinite(HUQ020[i])) HUQ020[i] = 3;
  }
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    const aVec = (HUQ010[i] === 4 ? 2 : 0) + (HUQ010[i] === 5 ? 4 : 0);
    const dVec = 1 - (HUQ020[i] === 1 ? 0.5 : 0) + (HUQ020[i] === 2 ? 1 : 0);
    out[i] = aVec * dVec;
  }
  return out;
}

// Healthcare visits score (HUQ050).
function popPCFIfs3(qDataMat) {
  const HUQ050 = getCol(qDataMat, "HUQ050").slice();
  const n = HUQ050.length;
  for (let i = 0; i < n; i += 1) {
    if (!Number.isFinite(HUQ050[i])) HUQ050[i] = 0;
    if (HUQ050[i] === 77 || HUQ050[i] === 99) HUQ050[i] = 0;
  }
  return HUQ050;
}

// LDL = total cholesterol - triglycerides/5 - HDL.
function populateLDL(dataMat) {
  const totC = getCol(dataMat, "LBDTCSI");
  const HDL = getCol(dataMat, "LBDHDLSI");
  const TG = getCol(dataMat, "LBDSTRSI");
  const n = totC.length;
  const LDL = new Array(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    if (Number.isFinite(totC[i]) && Number.isFinite(HDL[i]) && Number.isFinite(TG[i])) {
      LDL[i] = totC[i] - TG[i] / 5 - HDL[i];
    } else {
      LDL[i] = 0;
    }
  }
  return LDL;
}

function median(arr) {
  const vals = arr.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
  const n = vals.length;
  if (n === 0) return NaN;
  if (n % 2 === 1) return vals[(n - 1) / 2];
  return (vals[n / 2 - 1] + vals[n / 2]) / 2;
}

function mad(arr) {
  const med = median(arr);
  if (!Number.isFinite(med)) return NaN;
  const absDev = arr.filter((v) => Number.isFinite(v)).map((v) => Math.abs(v - med));
  const m = median(absDev);
  return m * 1.4826;
}

// Apply per-feature Box-Cox / log transforms.
function boxCoxTransform(boxCox, dataMat) {
  dataMat.columns.forEach((col) => {
    if (col === "SEQN") return;
    const lam = boxCox[col];
    if (lam === undefined || Number.isNaN(lam)) return;
    const vals = getCol(dataMat, col).slice();
    for (let i = 0; i < vals.length; i += 1) {
      const v = vals[i];
      if (!Number.isFinite(v)) continue;
      if (lam === 0) {
        vals[i] = v > 0 ? Math.log(v) : NaN;
      } else {
        vals[i] = (Math.pow(v, lam) - 1) / lam;
      }
    }
    setCol(dataMat, col, vals);
  });
  return dataMat;
}

// Normalize to z-scores vs. young 99/00 cohort, sex-stratified.
function normAsZscores_99_young_mf(dataSet, qDataMat, dataSet_ref, qDataMat_ref) {
  const years = getCol(qDataMat_ref, "yearsNHANES");
  const ages = getCol(qDataMat_ref, "RIDAGEYR");
  const sexRef = getCol(qDataMat_ref, "RIAGENDR");
  const seqSel = years.map((v) => v === 9900 || v === "9900");
  const ageSel = ages.map((v) => v <= 50);
  const selVec = seqSel.map((v, i) => v && ageSel[i]);

  const sexSelTemp = selVec.map((v, i) => v && sexRef[i] === 1);
  const sexSel = getCol(qDataMat, "RIAGENDR").map((v) => v === 1);

  const skipCols = new Set(["fs1Score", "fs2Score", "fs3Score", "LBXCOT", "LBDBANO"]);
  const out = { columns: dataSet.columns.slice(), data: {} };
  dataSet.columns.forEach((col) => {
    const vals = getCol(dataSet, col).slice();
    if (col === "SEQN" || skipCols.has(col)) {
      out.data[col] = vals;
      return;
    }
    const refVals = getCol(dataSet_ref, col);
    const refM = [];
    const refF = [];
    for (let i = 0; i < refVals.length; i += 1) {
      if (!selVec[i] || !Number.isFinite(refVals[i])) continue;
      if (sexSelTemp[i]) refM.push(refVals[i]);
      else refF.push(refVals[i]);
    }
    const medM = median(refM);
    const madM = mad(refM);
    const medF = median(refF);
    const madF = mad(refF);
    for (let i = 0; i < vals.length; i += 1) {
      const v = vals[i];
      if (!Number.isFinite(v)) continue;
      if (sexSel[i]) vals[i] = (v - medM) / (madM || EPS);
      else vals[i] = (v - medF) / (madF || EPS);
    }
    out.data[col] = vals;
  });
  return out;
}

// Fold extreme z-scores to a max absolute value.
function foldOutliers(dataMat, zScoreMax) {
  dataMat.columns.forEach((col) => {
    if (col === "SEQN") return;
    const vals = getCol(dataMat, col).slice();
    for (let i = 0; i < vals.length; i += 1) {
      if (!Number.isFinite(vals[i])) continue;
      if (Math.abs(vals[i]) > zScoreMax) vals[i] = Math.sign(vals[i]) * zScoreMax;
    }
    setCol(dataMat, col, vals);
  });
  return dataMat;
}

// Project data into precomputed SVD/PC coordinates.
function projectToSVD(inputMat, vMat) {
  const m = inputMat.length;
  const nSV = vMat[0].length;
  const out = new Array(m);
  for (let i = 0; i < m; i += 1) {
    const row = inputMat[i];
    const coords = new Array(nSV).fill(0);
    for (let pc = 0; pc < nSV; pc += 1) {
      let sum = 0;
      for (let j = 0; j < row.length; j += 1) {
        sum += row[j] * vMat[j][pc];
      }
      coords[pc] = sum;
    }
    out[i] = coords;
  }
  return out;
}

// Survival time (months to follow-up or death).
function getSurvTime(qMatrix) {
  return getCol(qMatrix, "PERMTH_EXM");
}

// Event/censor vector, optionally filtered by cause.
function getEventVec(qMatrix, cause) {
  const eventFlags = getCol(qMatrix, "MORTSTAT").slice();
  if (cause === 0) return eventFlags;
  const COD = getCol(qMatrix, "UCOD_LEADING");
  const out = eventFlags.slice();
  for (let i = 0; i < out.length; i += 1) {
    const c = COD[i];
    let keep = false;
    if (cause === 1) keep = c === 1;
    if (cause === 2) keep = c === 2;
    if (cause === 3) keep = c === 3;
    if (cause === 4) keep = c === 4;
    if (cause === 5) keep = c === 5;
    if (cause === 6) keep = c === 6;
    if (cause === 7) keep = c === 7;
    if (cause === 8) keep = c === 8;
    if (cause === 9) keep = c === 9;
    if (cause === 10) keep = c !== 1 && c !== 5;
    if (cause === 11) keep = c !== 4;
    if (cause === 12) keep = c === 1 || c === 5;
    out[i] = out[i] * (keep ? 1 : 0);
  }
  return out;
}

// Combine time and event into a survival object.
function makeSurvObject(qMatrix, cause) {
  return {
    time: getSurvTime(qMatrix),
    event: getEventVec(qMatrix, cause),
  };
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i += 1) s += a[i] * b[i];
  return s;
}

function matMul(A, B) {
  const m = A.length;
  const n = B[0].length;
  const k = B.length;
  const out = new Array(m);
  for (let i = 0; i < m; i += 1) {
    const row = new Array(n).fill(0);
    for (let j = 0; j < n; j += 1) {
      let sum = 0;
      for (let t = 0; t < k; t += 1) sum += A[i][t] * B[t][j];
      row[j] = sum;
    }
    out[i] = row;
  }
  return out;
}

function invertMatrix(A) {
  const n = A.length;
  const I = new Array(n);
  const M = new Array(n);
  for (let i = 0; i < n; i += 1) {
    I[i] = new Array(n).fill(0);
    I[i][i] = 1;
    M[i] = A[i].slice();
  }
  for (let i = 0; i < n; i += 1) {
    let maxRow = i;
    for (let k = i + 1; k < n; k += 1) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
    }
    if (Math.abs(M[maxRow][i]) < EPS) return null;
    [M[i], M[maxRow]] = [M[maxRow], M[i]];
    [I[i], I[maxRow]] = [I[maxRow], I[i]];
    const pivot = M[i][i];
    for (let j = 0; j < n; j += 1) {
      M[i][j] /= pivot;
      I[i][j] /= pivot;
    }
    for (let k = 0; k < n; k += 1) {
      if (k === i) continue;
      const factor = M[k][i];
      for (let j = 0; j < n; j += 1) {
        M[k][j] -= factor * M[i][j];
        I[k][j] -= factor * I[i][j];
      }
    }
  }
  return I;
}

// Cox proportional hazards fit (Newton-Raphson on partial likelihood).
function coxphFit(X, time, event, maxIter = 50) {
  const n = X.length;
  const p = X[0].length;
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => time[a] - time[b]);
  const t = order.map((i) => time[i]);
  const e = order.map((i) => event[i]);
  const Xs = order.map((i) => X[i]);
  let beta = new Array(p).fill(0);
  for (let iter = 0; iter < maxIter; iter += 1) {
    const eta = Xs.map((row) => dot(row, beta));
    const expEta = eta.map((v) => Math.exp(v));
    const riskSum = new Array(n).fill(0);
    const riskX = Array.from({ length: n }, () => new Array(p).fill(0));
    const riskXX = Array.from({ length: n }, () => new Array(p * p).fill(0));
    for (let i = n - 1; i >= 0; i -= 1) {
      riskSum[i] = expEta[i] + (i + 1 < n ? riskSum[i + 1] : 0);
      for (let k = 0; k < p; k += 1) {
        const prev = i + 1 < n ? riskX[i + 1][k] : 0;
        riskX[i][k] = prev + expEta[i] * Xs[i][k];
      }
      for (let a = 0; a < p; a += 1) {
        for (let b = 0; b < p; b += 1) {
          const idx = a * p + b;
          const prev = i + 1 < n ? riskXX[i + 1][idx] : 0;
          riskXX[i][idx] = prev + expEta[i] * Xs[i][a] * Xs[i][b];
        }
      }
    }
    let grad = new Array(p).fill(0);
    let hess = Array.from({ length: p }, () => new Array(p).fill(0));
    for (let i = 0; i < n; i += 1) {
      if (!e[i]) continue;
      const rSum = riskSum[i];
      const rX = riskX[i];
      const rXX = riskXX[i];
      for (let k = 0; k < p; k += 1) {
        grad[k] += Xs[i][k] - rX[k] / rSum;
      }
      for (let a = 0; a < p; a += 1) {
        for (let b = 0; b < p; b += 1) {
          const idx = a * p + b;
          hess[a][b] -= rXX[idx] / rSum - (rX[a] * rX[b]) / (rSum * rSum);
        }
      }
    }
    const hInv = invertMatrix(hess);
    if (!hInv) break;
    const step = matMul(hInv, grad.map((v) => [v])).map((r) => r[0]);
    let maxDelta = 0;
    for (let k = 0; k < p; k += 1) {
      beta[k] -= step[k];
      maxDelta = Math.max(maxDelta, Math.abs(step[k]));
    }
    if (maxDelta < 1e-6) break;
  }
  return { coefficients: beta };
}

function predictRisk(X, beta) {
  return X.map((row) => Math.exp(dot(row, beta)));
}

// Convert Cox risk ratio into biological age delta (Gompertz MRDT).
function calcBioAge(coxModel, nullModel, dataTable) {
  const betaNull = nullModel.coefficients[0];
  const MRDTfit = Math.log(2) / betaNull;
  const riskMod = predictRisk(dataTable, coxModel.coefficients);
  const riskNull = predictRisk(dataTable.map((r) => [r[0]]), [betaNull]);
  const out = new Array(riskMod.length);
  for (let i = 0; i < riskMod.length; i += 1) {
    const logRiskRatio = Math.log(riskMod[i] / riskNull[i]);
    out[i] = (logRiskRatio / Math.log(2)) * MRDTfit;
  }
  return out;
}

function tableToMatrix(table, columns) {
  const n = rowCount(table);
  const out = new Array(n);
  for (let i = 0; i < n; i += 1) {
    const row = [];
    for (let j = 0; j < columns.length; j += 1) {
      row.push(getCol(table, columns[j])[i]);
    }
    out[i] = row;
  }
  return out;
}

function matrixToTable(matrix, columns) {
  const out = { columns: columns.slice(), data: {} };
  columns.forEach((c, idx) => {
    out.data[c] = matrix.map((row) => row[idx]);
  });
  return out;
}

function buildBoxCoxMap(parsed) {
  const cols = parsed.columns.slice(1);
  const row = parsed.rows[1] || [];
  const map = {};
  cols.forEach((c, i) => {
    map[c] = toNumber(row[i + 1]);
  });
  return map;
}

function buildMatrixFromCsv(parsed) {
  return parsed.rows.map((row) => row.map((v) => toNumber(v)));
}

function makeCsv(table) {
  const cols = table.columns;
  const n = rowCount(table);
  let out = cols.join(",") + "\n";
  for (let i = 0; i < n; i += 1) {
    const row = cols.map((c) => {
      const v = getCol(table, c)[i];
      return Number.isFinite(v) ? String(v) : "";
    });
    out += row.join(",") + (i === n - 1 ? "" : "\n");
  }
  return out;
}

// ##############################################
// >>> MAIN LINAGE2 PIPELINE (JS PORT) <<<
// ##############################################
export function runLinAge2({
  mergedData,
  userData,
  sanityData,
  codeBook,
  params,
  logNoLog,
  vMatF,
  vMatM,
  diagF,
  diagM,
}) {
  // I) READ PARAMETERS
  const pNAcut = Number(params.NAcutOffpercent);
  const svCutP = Number(params.PCcutOffpercent);
  const ageLower = Number(params.lowerAgeLimit);
  const ageUpper = Number(params.upperAgeLimit);
  const useDerived = Number(params.derivedFeatFlag) === 1;

  // II) SELECT INPUT DATA MATRICES
  console.log('Processing data matrices...');
  console.log('mergedData columns:', mergedData.columns.slice(0, 10), '... (', mergedData.columns.length, 'total)');
  console.log('userData columns:', userData.columns.slice(0, 10), '... (', userData.columns.length, 'total)');

  const incList = markIncsFromCodeBook(codeBook);
  console.log('incList entries:', incList.length);

  let dataMat = dropCols(mergedData, incList);
  let dataMat_user = dropCols(userData, incList);
  console.log('dataMat columns after dropCols:', dataMat.columns.length);
  console.log('dataMat_user columns after dropCols:', dataMat_user.columns.length);

  const qDataMat = qDataMatGen(mergedData, incList);
  const qDataMat_user = qDataMatGen(userData, incList);
  console.log('qDataMat columns:', qDataMat.columns.slice(0, 10), '... (', qDataMat.columns.length, 'total)');
  console.log('qDataMat_user columns:', qDataMat_user.columns);

  // Append sanity data to user data (optional).
  if (sanityData) {
    const dataMat_sanity = dropCols(sanityData, incList);
    const qDataMat_sanity = qDataMatGen(sanityData, incList);
    dataMat_user = {
      columns: dataMat_user.columns,
      data: Object.fromEntries(
        dataMat_user.columns.map((c) => [
          c,
          dataMat_user.data[c].concat(dataMat_sanity.data[c] || []),
        ])
      ),
    };
    qDataMat_user.columns.forEach((c) => {
      qDataMat_user.data[c] = qDataMat_user.data[c].concat(qDataMat_sanity.data[c] || []);
    });
  }

  // Digitize cotinine (smoking intensity).
  dataMat = digiCot(dataMat);
  dataMat_user = digiCot(dataMat_user);

  // III) DERIVED FEATURES (frailty scores, LDL, albumin/creatinine ratio)
  if (useDerived) {
    const fs1Score = popPCFIfs1(qDataMat);
    const fs2Score = popPCFIfs2(qDataMat);
    const fs3Score = popPCFIfs3(qDataMat);
    setCol(dataMat, "fs1Score", fs1Score);
    setCol(dataMat, "fs2Score", fs2Score);
    setCol(dataMat, "fs3Score", fs3Score);

    const fs1Score_u = popPCFIfs1(qDataMat_user);
    const fs2Score_u = popPCFIfs2(qDataMat_user);
    const fs3Score_u = popPCFIfs3(qDataMat_user);
    setCol(dataMat_user, "fs1Score", fs1Score_u);
    setCol(dataMat_user, "fs2Score", fs2Score_u);
    setCol(dataMat_user, "fs3Score", fs3Score_u);

    const LDLV = populateLDL(dataMat);
    setCol(dataMat, "LDLV", LDLV);
    const LDLV_u = populateLDL(dataMat_user);
    setCol(dataMat_user, "LDLV", LDLV_u);

    const creaVals = getCol(dataMat, "URXUCRSI");
    const albuVals = getCol(dataMat, "URXUMASI");
    const crAlbRat = albuVals.map((v, i) => v / (creaVals[i] * 1.1312 * Math.pow(10, -4)));
    setCol(dataMat, "crAlbRat", crAlbRat);

    const creaVals_u = getCol(dataMat_user, "URXUCRSI");
    const albuVals_u = getCol(dataMat_user, "URXUMASI");
    const crAlbRat_u = albuVals_u.map((v, i) => v / (creaVals_u[i] * 1.1312 * Math.pow(10, -4)));
    setCol(dataMat_user, "crAlbRat", crAlbRat_u);
  }

  // Drop raw cholesterol features after LDL derivation.
  ["LBDHDLSI", "LBDSTRSI", "LBDTCSI"].forEach((col) => {
    if (dataMat.columns.includes(col)) {
      dataMat = selectColumns(dataMat, dataMat.columns.filter((c) => c !== col));
    }
    if (dataMat_user.columns.includes(col)) {
      dataMat_user = selectColumns(dataMat_user, dataMat_user.columns.filter((c) => c !== col));
    }
  });

  // IV) COHORT FILTERING
  const sansAge = getCol(qDataMat, "RIDAGEEX").map((v) => !Number.isFinite(v));
  let keepRows = sansAge.map((v) => !v);
  dataMat = selectRows(dataMat, keepRows);
  qDataMat.columns.forEach((c) => { qDataMat.data[c] = qDataMat.data[c].filter((_, i) => keepRows[i]); });

  keepRows = nonAccidDeathFlags(qDataMat);
  dataMat = selectRows(dataMat, keepRows);
  qDataMat.columns.forEach((c) => { qDataMat.data[c] = qDataMat.data[c].filter((_, i) => keepRows[i]); });

  keepRows = selectAgeBracket(qDataMat, ageLower, ageUpper);
  dataMat = selectRows(dataMat, keepRows);
  qDataMat.columns.forEach((c) => { qDataMat.data[c] = qDataMat.data[c].filter((_, i) => keepRows[i]); });

  // Drop features with excessive missingness; align user columns.
  dataMat = dropNAcolumns(dataMat, pNAcut, codeBook, 1);
  dataMat_user = selectColumns(dataMat_user, dataMat.columns);
  keepRows = getNonNARows(dataMat);
  dataMat = selectRows(dataMat, keepRows);
  qDataMat.columns.forEach((c) => { qDataMat.data[c] = qDataMat.data[c].filter((_, i) => keepRows[i]); });

  // V) NORMALIZATION AND TRANSFORMS
  const boxCox = buildBoxCoxMap(logNoLog);
  const dataMat_trans = boxCoxTransform(boxCox, dataMat);
  const dataMat_trans_user = boxCoxTransform(boxCox, dataMat_user);

  const dataMatNorm = normAsZscores_99_young_mf(dataMat_trans, qDataMat, dataMat_trans, qDataMat);
  const dataMatNorm_user = normAsZscores_99_young_mf(dataMat_trans_user, qDataMat_user, dataMat_trans, qDataMat);

  // Fold z-score outliers.
  const dataMatNorm_folded = foldOutliers(dataMatNorm, 6);
  const dataMatUser_folded = foldOutliers(dataMatNorm_user, 6);

  const dataCols = dataMatNorm_folded.columns.filter((c) => c !== "SEQN");
  const inputMat = tableToMatrix(dataMatNorm_folded, dataCols);
  const inputMat_user = tableToMatrix(dataMatUser_folded, dataCols);

  // VI) TRAIN/TEST SPLIT (99/00 vs 01/02)
  console.log('Splitting train/test data...');
  const years = getCol(qDataMat, "yearsNHANES");
  console.log('yearsNHANES column:', years.length, 'entries, first 5:', years.slice(0, 5));

  const trainSel = years.map((v) => v === 9900 || v === "9900");
  const testSel = years.map((v) => v === 102 || v === "102");
  console.log('Training samples:', trainSel.filter(Boolean).length);
  console.log('Testing samples:', testSel.filter(Boolean).length);

  const inputMat99 = inputMat.filter((_, i) => trainSel[i]);
  const inputMat01 = inputMat.filter((_, i) => testSel[i]);
  console.log('inputMat99 length:', inputMat99.length);
  console.log('inputMat01 length:', inputMat01.length);

  const riagendr = getCol(qDataMat, "RIAGENDR");
  console.log('RIAGENDR column:', riagendr.length, 'entries, first 5:', riagendr.slice(0, 5));

  const sexSel99 = riagendr.filter((_, i) => trainSel[i]);
  const sexSel01 = riagendr.filter((_, i) => testSel[i]);
  const sexSel_user = getCol(qDataMat_user, "RIAGENDR");
  console.log('sexSel99:', sexSel99.length, 'entries, first 5:', sexSel99.slice(0, 5));
  console.log('sexSel_user:', sexSel_user.length, 'entries, values:', sexSel_user);

  const inputMat99_M = inputMat99.filter((_, i) => sexSel99[i] === 1);
  const inputMat99_F = inputMat99.filter((_, i) => sexSel99[i] === 2);
  const inputMat01_M = inputMat01.filter((_, i) => sexSel01[i] === 1);
  const inputMat01_F = inputMat01.filter((_, i) => sexSel01[i] === 2);
  const inputMat_user_M = inputMat_user.filter((_, i) => sexSel_user[i] === 1);
  const inputMat_user_F = inputMat_user.filter((_, i) => sexSel_user[i] === 2);

  // VII) PCA/SVD PROJECTION (sex-specific)
  console.log('Projecting to SVD coordinates...');
  console.log('inputMat99_M length:', inputMat99_M.length);
  console.log('inputMat99_F length:', inputMat99_F.length);
  console.log('vMatM dimensions:', vMatM.length, 'x', vMatM[0]?.length);
  console.log('vMatF dimensions:', vMatF.length, 'x', vMatF[0]?.length);

  const pcMat99_M = projectToSVD(inputMat99_M, vMatM);
  const pcMat99_F = projectToSVD(inputMat99_F, vMatF);
  const pcMat01_M = projectToSVD(inputMat01_M, vMatM);
  const pcMat01_F = projectToSVD(inputMat01_F, vMatF);
  const pcMat_user_M = projectToSVD(inputMat_user_M, vMatM);
  const pcMat_user_F = projectToSVD(inputMat_user_F, vMatF);

  console.log('pcMat99_M length:', pcMat99_M.length);
  console.log('pcMat99_F length:', pcMat99_F.length);

  const rowsAll99 = pcMat99_M.length + pcMat99_F.length;
  const rowsAll01 = pcMat01_M.length + pcMat01_F.length;

  // Get column count from whichever sex has data
  let colsAll;
  if (pcMat99_M.length > 0) {
    colsAll = pcMat99_M[0].length;
  } else if (pcMat99_F.length > 0) {
    colsAll = pcMat99_F[0].length;
  } else {
    throw new Error('No training data available after filtering. This should not happen - check NHANES data files.');
  }
  console.log('colsAll:', colsAll);
  const pcMat99 = new Array(rowsAll99).fill(0).map(() => new Array(colsAll).fill(0));
  const pcMat01 = new Array(rowsAll01).fill(0).map(() => new Array(colsAll).fill(0));
  const pcMat_user = new Array(inputMat_user.length).fill(0).map(() => new Array(colsAll).fill(0));

  let idxM = 0;
  let idxF = 0;
  for (let i = 0; i < sexSel99.length; i += 1) {
    if (sexSel99[i] === 1) pcMat99[i] = pcMat99_M[idxM++];
    else pcMat99[i] = pcMat99_F[idxF++];
  }
  idxM = 0;
  idxF = 0;
  for (let i = 0; i < sexSel01.length; i += 1) {
    if (sexSel01[i] === 1) pcMat01[i] = pcMat01_M[idxM++];
    else pcMat01[i] = pcMat01_F[idxF++];
  }
  idxM = 0;
  idxF = 0;
  for (let i = 0; i < sexSel_user.length; i += 1) {
    if (sexSel_user[i] === 1) pcMat_user[i] = pcMat_user_M[idxM++];
    else pcMat_user[i] = pcMat_user_F[idxF++];
  }

  const pcDatMat = pcMat99.concat(pcMat01);
  // VIII) DIMENSIONALITY REDUCTION (scree cutoff)
  const scree_M = diagM.map((v) => v * v).map((v) => v / diagM.map((d) => d * d).reduce((a, b) => a + b, 0));
  const scree_F = diagF.map((v) => v * v).map((v) => v / diagF.map((d) => d * d).reduce((a, b) => a + b, 0));
  let svCut_M = Math.min(...scree_M.map((v, i) => (v < svCutP / 100 ? i + 1 : Infinity)));
  let svCut_F = Math.min(...scree_F.map((v, i) => (v < svCutP / 100 ? i + 1 : Infinity)));
  if (!Number.isFinite(svCut_M)) svCut_M = scree_M.length;
  if (!Number.isFinite(svCut_F)) svCut_F = scree_F.length;
  const svCut = Math.max(svCut_M, svCut_F);
  const maxPC = svCut;

  const pcDatMat_trunc = pcDatMat.map((row) => row.slice(0, maxPC));
  const pcMat_user_trunc = pcMat_user.map((row) => row.slice(0, maxPC));

  // IX) CLOCK CONSTRUCTION (Cox PH, sex-specific)
  const demoTrain = selectRows(qDataMat, trainSel);
  const demoTest = selectRows(qDataMat, testSel);
  const initAgeTrain = getCol(demoTrain, "RIDAGEEX");
  const initAgeTest = getCol(demoTest, "RIDAGEEX");
  const sexTrain = getCol(demoTrain, "RIAGENDR");
  const sexTest = getCol(demoTest, "RIAGENDR");

  const xTrainPCA = pcDatMat_trunc.filter((_, i) => trainSel[i]);
  const xTestPCA = pcDatMat_trunc.filter((_, i) => testSel[i]);

  const coxCovsTrain = initAgeTrain.map((age, i) => [age].concat(xTrainPCA[i], [sexTrain[i]]));
  const coxCovsTest = initAgeTest.map((age, i) => [age].concat(xTestPCA[i], [sexTest[i]]));

  const initAge_user = getCol(qDataMat_user, "RIDAGEEX");
  const coxCovs_user = initAge_user.map((age, i) => [age].concat(pcMat_user_trunc[i], [sexSel_user[i]]));

  const trainUseF = sexTrain.map((v) => v === 2);
  const trainUseM = sexTrain.map((v) => v === 1);
  const testUseF = sexTest.map((v) => v === 2);
  const testUseM = sexTest.map((v) => v === 1);

  const survObjTrainF = makeSurvObject(demoTrain, 0);
  const survObjTrainM = makeSurvObject(demoTrain, 0);
  const survObjTestF = makeSurvObject(demoTest, 0);
  const survObjTestM = makeSurvObject(demoTest, 0);

  const pcIdxM = [1, 2, 5, 6, 8, 11, 15, 16, 17, 19, 24, 25, 27, 31, 33, 36, 42].filter((v) => v <= maxPC);
  const pcIdxF = [1, 2, 4, 6, 11, 13, 20, 22, 23, 24, 28, 31, 32, 35, 37, 38, 39].filter((v) => v <= maxPC);

  function selectCoxCovs(cov, useSex, pcIdx) {
    const out = [];
    for (let i = 0; i < cov.length; i += 1) {
      if (!useSex[i]) continue;
      const row = [cov[i][0]];
      pcIdx.forEach((pc) => row.push(cov[i][pc]));
      out.push(row);
    }
    return out;
  }

  const coxCovsTrainF = selectCoxCovs(coxCovsTrain, trainUseF, pcIdxF);
  const coxCovsTrainM = selectCoxCovs(coxCovsTrain, trainUseM, pcIdxM);
  const coxCovsTestF = selectCoxCovs(coxCovsTest, testUseF, pcIdxF);
  const coxCovsTestM = selectCoxCovs(coxCovsTest, testUseM, pcIdxM);
  const coxCovs_user_F = selectCoxCovs(coxCovs_user, sexSel_user.map((v) => v === 2), pcIdxF);
  const coxCovs_user_M = selectCoxCovs(coxCovs_user, sexSel_user.map((v) => v === 1), pcIdxM);

  const survTrainF = {
    time: survObjTrainF.time.filter((_, i) => trainUseF[i]),
    event: survObjTrainF.event.filter((_, i) => trainUseF[i]),
  };
  const survTrainM = {
    time: survObjTrainM.time.filter((_, i) => trainUseM[i]),
    event: survObjTrainM.event.filter((_, i) => trainUseM[i]),
  };
  const survTestF = {
    time: survObjTestF.time.filter((_, i) => testUseF[i]),
    event: survObjTestF.event.filter((_, i) => testUseF[i]),
  };
  const survTestM = {
    time: survObjTestM.time.filter((_, i) => testUseM[i]),
    event: survObjTestM.event.filter((_, i) => testUseM[i]),
  };

  const nullModelF = coxphFit(coxCovsTrainF.map((r) => [r[0]]), survTrainF.time, survTrainF.event);
  const nullModelM = coxphFit(coxCovsTrainM.map((r) => [r[0]]), survTrainM.time, survTrainM.event);
  const coxModelF = coxphFit(coxCovsTrainF, survTrainF.time, survTrainF.event);
  const coxModelM = coxphFit(coxCovsTrainM, survTrainM.time, survTrainM.event);

  // X) BIOLOGICAL AGE CALCULATION
  const delBioAgeTestF = calcBioAge(coxModelF, nullModelF, coxCovsTestF);
  const delBioAgeTestM = calcBioAge(coxModelM, nullModelM, coxCovsTestM);
  const delBioAgeTrainF = calcBioAge(coxModelF, nullModelF, coxCovsTrainF);
  const delBioAgeTrainM = calcBioAge(coxModelM, nullModelM, coxCovsTrainM);

  const bioAgeTestF = coxCovsTestF.map((r, i) => r[0] + delBioAgeTestF[i]);
  const bioAgeTestM = coxCovsTestM.map((r, i) => r[0] + delBioAgeTestM[i]);
  const bioAgeTrainF = coxCovsTrainF.map((r, i) => r[0] + delBioAgeTrainF[i]);
  const bioAgeTrainM = coxCovsTrainM.map((r, i) => r[0] + delBioAgeTrainM[i]);

  const delBioAge_user_F = calcBioAge(coxModelF, nullModelF, coxCovs_user_F);
  const delBioAge_user_M = calcBioAge(coxModelM, nullModelM, coxCovs_user_M);
  const bioAge_user_F = coxCovs_user_F.map((r, i) => r[0] + delBioAge_user_F[i]);
  const bioAge_user_M = coxCovs_user_M.map((r, i) => r[0] + delBioAge_user_M[i]);

  const bioAge_user = new Array(sexSel_user.length).fill(0);
  let idxUF = 0;
  let idxUM = 0;
  for (let i = 0; i < sexSel_user.length; i += 1) {
    if (sexSel_user[i] === 2) bioAge_user[i] = bioAge_user_F[idxUF++];
    else bioAge_user[i] = bioAge_user_M[idxUM++];
  }

  // XI) OUTPUT ASSEMBLY
  const chronAge = coxCovs_user.map((r) => Math.round((r[0] / 12) * 100) / 100);
  const linAge2 = bioAge_user.map((v) => Math.round((v / 12) * 100) / 100);
  const bioAge_del = linAge2.map((v, i) => Math.round((v - chronAge[i]) * 100) / 100);
  const sex = getCol(qDataMat_user, "RIAGENDR");
  const ageMonths = getCol(qDataMat_user, "RIDAGEEX");

  setCol(dataMat_user, "RIAGENDR", sex);
  setCol(dataMat_user, "RIDAGEEX", ageMonths);
  setCol(dataMat_user, "chronAge", chronAge);
  setCol(dataMat_user, "linAge2", linAge2);
  setCol(dataMat_user, "bioAge_del", bioAge_del);

  // Add PC columns (only those used in the model) with M/F suffix
  // Create columns with NaN for opposite sex
  pcIdxM.forEach((pcNum) => {
    const colName = `PC${pcNum}M`;
    const values = sexSel_user.map((s, i) => {
      if (s === 1) {
        // Male - get PC value (pcNum is 1-indexed, array is 0-indexed)
        return pcMat_user_trunc[i][pcNum - 1];
      }
      return NaN; // Female - set to NaN
    });
    setCol(dataMat_user, colName, values);
  });

  pcIdxF.forEach((pcNum) => {
    const colName = `PC${pcNum}F`;
    const values = sexSel_user.map((s, i) => {
      if (s === 2) {
        // Female - get PC value (pcNum is 1-indexed, array is 0-indexed)
        return pcMat_user_trunc[i][pcNum - 1];
      }
      return NaN; // Male - set to NaN
    });
    setCol(dataMat_user, colName, values);
  });

  const outCols = dataMat_user.columns.slice();
  const outMat = matrixToTable(
    tableToMatrix(dataMat_user, outCols),
    outCols
  );

  return { outTable: outMat, csv: makeCsv(outMat) };
}

export function buildParamsMap(parsed) {
  const map = {};
  const rows = parsed.rows;
  for (let i = 0; i < rows.length; i += 1) {
    map[rows[i][1]] = rows[i][2];
  }
  return map;
}

export function buildVectorFromCsv(parsed) {
  const firstCol = parsed.columns[0];
  if (!firstCol) return [];
  const values = parsed.rows.map((r) => toNumber(r[0]));
  return values;
}
