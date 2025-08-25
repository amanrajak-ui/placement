// solve.js
// Usage: node solve.js input.json
const fs = require('fs');

function absBig(a){ return a < 0n ? -a : a; }
function gcdBig(a,b){
  a = absBig(a); b = absBig(b);
  while (b !== 0n){ const t = a % b; a = b; b = t; }
  return a;
}

function decodeBaseToBigInt(sRaw, base){
  const s = String(sRaw).trim();
  if (base < 2 || base > 36) throw new Error('Invalid base: ' + base);
  let acc = 0n;
  for (const ch of s){
    let d;
    if (ch >= '0' && ch <= '9') d = ch.charCodeAt(0) - 48;
    else if (ch >= 'A' && ch <= 'Z') d = ch.charCodeAt(0) - 55;
    else if (ch >= 'a' && ch <= 'z') d = ch.charCodeAt(0) - 87;
    else throw new Error('Invalid character in value: ' + ch);
    if (d >= base) throw new Error(`Digit '${ch}' >= base ${base}`);
    acc = acc * BigInt(base) + BigInt(d);
  }
  return acc;
}

// Lagrange interpolation at x=0 using exact rationals (BigInt)
function lagrangeAtZeroRational(points){
  // points: [{x:BigInt, y:BigInt}, ...]
  const k = points.length;
  let sum_num = 0n;
  let sum_den = 1n; // sum_num / sum_den

  for (let i = 0; i < k; ++i){
    let numer = 1n;
    let denom = 1n;
    for (let j = 0; j < k; ++j){
      if (i === j) continue;
      numer *= -points[j].x;           // product of (0 - x_j)
      denom *= (points[i].x - points[j].x); // product of (x_i - x_j)
    }
    if (denom === 0n) throw new Error('Duplicate x detected');
    const term_num = points[i].y * numer;
    const term_den = denom;

    // sum = sum + term -> common denominator
    sum_num = sum_num * term_den + term_num * sum_den;
    sum_den = sum_den * term_den;

    // reduce occasionally to keep numbers smaller
    const g = gcdBig(sum_num, sum_den);
    if (g > 1n){
      sum_num /= g;
      sum_den /= g;
    }
  }

  const gFinal = gcdBig(sum_num, sum_den);
  sum_num /= gFinal;
  sum_den /= gFinal;
  if (sum_den < 0n){ sum_den = -sum_den; sum_num = -sum_num; }
  return { num: sum_num, den: sum_den };
}

function main(){
  const path = process.argv[2] || 'input.json';
  let raw;
  try { raw = fs.readFileSync(path, 'utf8'); }
  catch (e){ console.error('Cannot open file:', path); process.exit(1); }

  let j;
  try { j = JSON.parse(raw); }
  catch (e){ console.error('Invalid JSON:', e.message); process.exit(1); }

  if (!j.keys || typeof j.keys.k === 'undefined'){ console.error("JSON missing keys.k"); process.exit(1); }
  const k = Number(j.keys.k);

  const points = [];
  for (const key of Object.keys(j)){
    if (key === 'keys') continue;
    const entry = j[key];
    if (!entry || typeof entry.base === 'undefined' || typeof entry.value === 'undefined') continue;
    if (!/^-?\d+$/.test(key)) continue; // skip non-numeric keys
    const xi = BigInt(key);
    const base = Number(entry.base);
    let yi;
    try { yi = decodeBaseToBigInt(entry.value, base); }
    catch (e){ console.error(`Decode error for key ${key}:`, e.message); process.exit(1); }
    points.push({ x: xi, y: yi });
  }

  if (points.length < k){ console.error(`Not enough points: have ${points.length}, need k=${k}`); process.exit(1); }
  // deterministic: sort by x and take first k
  points.sort((A,B) => (A.x < B.x ? -1 : A.x > B.x ? 1 : 0));
  const chosen = points.slice(0, k);

  let res;
  try { res = lagrangeAtZeroRational(chosen); }
  catch (e){ console.error('Interpolation error:', e.message); process.exit(1); }

  const chosenStr = chosen.map(p => `(${p.x.toString()},${p.y.toString()})`).join(' ');
  console.log('Decoded points used (k=' + k + '):', chosenStr);
  if (res.den === 1n) {
    console.log('Secret c = f(0) =', res.num.toString());
  } else {
    console.log('Secret c = f(0) =', res.num.toString() + ' / ' + res.den.toString(), '(rational)');
  }
}

main();
