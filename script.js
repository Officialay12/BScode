// ========== DOM Elements ==========
const editor = document.getElementById("editor");
const lineNums = document.getElementById("line-nums");
const consoleOut = document.getElementById("console-out");
const runBtn = document.getElementById("btn-run");
const clearBtn = document.getElementById("btn-clear");
const newBtn = document.getElementById("btn-new");
const copyBtn = document.getElementById("btn-copy");
const aiBtn = document.getElementById("btn-ai");
const aiPanel = document.getElementById("ai-panel");
const aiClose = document.getElementById("ai-close");
const aiGoBtn = document.getElementById("ai-go-btn");
const aiInput = document.getElementById("ai-input");
const aiStatus = document.getElementById("ai-status");
const examplesBtn = document.getElementById("btn-examples");
const examplesMenu = document.getElementById("ex-menu");
const inputRow = document.getElementById("input-row");
const runtimeInput = document.getElementById("runtime-input");
const inputSubmit = document.getElementById("input-submit");

// ========== Editor Helpers ==========
function updateLineNumbers() {
  const lines = editor.value.split("\n");
  const count = lines.length;
  const lcEl = document.getElementById("line-count");
  if (lcEl) lcEl.textContent = count;
  let nums = "";
  for (let i = 1; i <= count; i++) nums += i + "\n";
  lineNums.textContent = nums;
  lineNums.scrollTop = editor.scrollTop;
}

function updateCursor() {
  const before = editor.value.substring(0, editor.selectionStart);
  const lines = before.split("\n");
  const clEl = document.getElementById("cur-line");
  const ccEl = document.getElementById("cur-col");
  if (clEl) clEl.textContent = lines.length;
  if (ccEl) ccEl.textContent = lines[lines.length - 1].length + 1;
}

editor.addEventListener("input", () => {
  updateLineNumbers();
  updateCursor();
});
editor.addEventListener("scroll", () => {
  lineNums.scrollTop = editor.scrollTop;
});
editor.addEventListener("click", updateCursor);
editor.addEventListener("keyup", updateCursor);
editor.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = editor.selectionStart;
    editor.value =
      editor.value.substring(0, start) +
      "  " +
      editor.value.substring(editor.selectionEnd);
    editor.selectionStart = editor.selectionEnd = start + 2;
    updateLineNumbers();
  }
});

// ========== Console ==========
function printLine(text, cls = "cout-out") {
  const line = document.createElement("div");
  line.className = `cout-line ${cls}`;
  line.textContent = String(text);
  consoleOut.appendChild(line);
  consoleOut.scrollTop = consoleOut.scrollHeight;
}

function clearConsole() {
  consoleOut.innerHTML = "";
  printLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "cout-sys");
  printLine("     BScode BASIC Interpreter v1.0", "cout-sys");
  printLine("     Ready. Press RUN or use BScode AI.", "cout-sys");
  printLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "cout-sys");
  printLine("", "cout-sys");
}

function copyOutput() {
  const text = Array.from(consoleOut.querySelectorAll(".cout-line"))
    .map((l) => l.textContent)
    .join("\n");
  navigator.clipboard
    .writeText(text)
    .then(() => {
      setStatus("Output copied!", "ok");
    })
    .catch(() => {
      setStatus("Copy failed — try manually", "err");
    });
}

function setStatus(msg, type = "ok") {
  const el = document.getElementById("sb-msg");
  if (el) {
    el.textContent = msg;
    el.className = `sb-${type}`;
  }
}

// ========== BASIC Interpreter ==========
let runtimeResolve = null,
  programRunning = false,
  stopProgram = false;

function showInput(show) {
  inputRow.style.display = show ? "flex" : "none";
  if (show) setTimeout(() => runtimeInput.focus(), 30);
}

function submitInput() {
  const val = runtimeInput.value;
  runtimeInput.value = "";
  if (runtimeResolve) {
    printLine(val, "cout-input");
    showInput(false);
    runtimeResolve(val);
    runtimeResolve = null;
  }
}
inputSubmit.addEventListener("click", submitInput);
runtimeInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") submitInput();
});

function waitForInput(promptMsg) {
  return new Promise((resolve) => {
    if (promptMsg) printLine(promptMsg, "cout-prompt");
    showInput(true);
    runtimeResolve = resolve;
  });
}

function normaliseExpr(expr) {
  expr = expr.replace(/\bAND\b/gi, "&&");
  expr = expr.replace(/\bOR\b/gi, "||");
  expr = expr.replace(/\bNOT\b/gi, "!");
  expr = expr.replace(/\bMOD\b/gi, "%");
  expr = expr.replace(/<>/g, "!=");
  expr = expr.replace(/([^!<>=])=([^=])/g, (m, a, b) => `${a}==${b}`);
  expr = expr.replace(/^=([^=])/, "==$1");
  return expr;
}

function evaluate(expr, vars) {
  expr = String(expr).trim();
  if (!expr) return 0;

  const safeVars = {};
  for (const [k, v] of Object.entries(vars)) {
    safeVars[k.replace(/\$$/, "")] = v;
  }

  expr = expr.replace(/([A-Z_][A-Z0-9_]*)\$/gi, "$1");
  expr = normaliseExpr(expr);

  expr = expr.replace(/\bABS\s*\(/gi, "Math.abs(");
  expr = expr.replace(/\bINT\s*\(/gi, "Math.floor(");
  expr = expr.replace(/\bSQR\s*\(/gi, "Math.sqrt(");
  expr = expr.replace(/\bSQRT\s*\(/gi, "Math.sqrt(");
  expr = expr.replace(/\bRND\s*\([^)]*\)/gi, "Math.random()");
  expr = expr.replace(/\bRND\b/gi, "Math.random()");
  expr = expr.replace(/\bLEN\s*\(/gi, "_LEN(");
  expr = expr.replace(/\bMID\$\s*\(/gi, "_MID(");
  expr = expr.replace(/\bLEFT\$\s*\(/gi, "_LEFT(");
  expr = expr.replace(/\bRIGHT\$\s*\(/gi, "_RIGHT(");
  expr = expr.replace(/\bSTR\$\s*\(/gi, "String(");
  expr = expr.replace(/\bVAL\s*\(/gi, "parseFloat(");
  expr = expr.replace(/\bCHR\$\s*\(/gi, "_CHR(");
  expr = expr.replace(/\bASC\s*\(/gi, "_ASC(");
  expr = expr.replace(/\bUCASE\$\s*\(/gi, "_UCASE(");
  expr = expr.replace(/\bLCASE\$\s*\(/gi, "_LCASE(");

  try {
    const fn = new Function(
      ...Object.keys(safeVars),
      "_LEN",
      "_MID",
      "_LEFT",
      "_RIGHT",
      "_CHR",
      "_ASC",
      "_UCASE",
      "_LCASE",
      `"use strict"; return (${expr});`,
    );
    return fn(
      ...Object.values(safeVars),
      (s) => String(s).length,
      (s, start, len) => String(s).substr(start - 1, len),
      (s, n) => String(s).substr(0, n),
      (s, n) => String(s).slice(-n),
      (n) => String.fromCharCode(n),
      (s) => String(s).charCodeAt(0),
      (s) => String(s).toUpperCase(),
      (s) => String(s).toLowerCase(),
    );
  } catch (e) {
    throw new Error(`Expression error in: ${expr} (${e.message})`);
  }
}

function parsePrint(rest, vars) {
  const parts = [];
  let i = 0;
  let current = "";
  let inStr = false;

  while (i < rest.length) {
    const ch = rest[i];

    if (ch === '"') {
      if (inStr) {
        parts.push({ text: current, raw: true, sep: null });
        current = "";
        inStr = false;
      } else {
        if (current.trim()) {
          parts.push({ text: current.trim(), raw: false, sep: null });
          current = "";
        }
        inStr = true;
      }
      i++;
      continue;
    }

    if (!inStr && (ch === ";" || ch === ",")) {
      if (current.trim()) {
        parts.push({ text: current.trim(), raw: false, sep: null });
        current = "";
      }
      if (parts.length > 0) {
        parts[parts.length - 1].sep = ch;
      } else {
        parts.push({ text: "", raw: true, sep: ch });
      }
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  if (inStr) {
    parts.push({ text: current, raw: true, sep: null });
  } else if (current.trim()) {
    parts.push({ text: current.trim(), raw: false, sep: null });
  }

  const trailingSemi = parts.length > 0 && parts[parts.length - 1].sep === ";";
  const resolved = parts.map((p) => {
    let val = p.raw ? p.text : String(evaluate(p.text, vars));
    return { val, sep: p.sep };
  });

  return { resolved, trailingSemi };
}

function executePrint(rest, vars) {
  if (!rest.trim()) {
    printLine("");
    return;
  }

  const { resolved, trailingSemi } = parsePrint(rest, vars);

  let output = "";
  for (let i = 0; i < resolved.length; i++) {
    const { val, sep } = resolved[i];
    output += val;
    if (sep === "," && i < resolved.length - 1) {
      const col = output.length % 14;
      output += " ".repeat(14 - col);
    }
  }

  if (trailingSemi) {
    const lines = consoleOut.querySelectorAll(".cout-line.cout-out");
    if (lines.length > 0) {
      lines[lines.length - 1].textContent += output;
    } else {
      const div = document.createElement("div");
      div.className = "cout-line cout-out";
      div.textContent = output;
      consoleOut.appendChild(div);
    }
  } else {
    printLine(output, "cout-out");
  }
  consoleOut.scrollTop = consoleOut.scrollHeight;
}

function splitStatements(line) {
  const parts = [];
  let current = "";
  let inStr = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inStr = !inStr;
    if (!inStr && ch === ":") {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseIfStatement(s) {
  let inStr = false;
  let thenPos = -1;
  let elsePos = -1;

  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    const upper4 = s.substring(i).toUpperCase();
    if (
      thenPos === -1 &&
      upper4.startsWith("THEN") &&
      (i === 0 || /\s/.test(s[i - 1])) &&
      (upper4[4] === undefined || /[\s\d"]/.test(upper4[4]))
    ) {
      thenPos = i;
    }
    if (
      thenPos !== -1 &&
      upper4.startsWith("ELSE") &&
      (i === 0 || /\s/.test(s[i - 1])) &&
      (upper4[4] === undefined || /[\s\d"]/.test(upper4[4]))
    ) {
      elsePos = i;
      break;
    }
  }

  if (thenPos === -1) return null;

  const ifBody = s.substring(2);
  const bodyThenPos = thenPos - 2;

  let condExpr = ifBody.substring(0, bodyThenPos).trim();
  let thenPart, elsePart;

  if (elsePos !== -1) {
    thenPart = s.substring(thenPos + 4, elsePos).trim();
    elsePart = s.substring(elsePos + 4).trim();
  } else {
    thenPart = s.substring(thenPos + 4).trim();
    elsePart = "";
  }

  return { condExpr, thenPart, elsePart };
}

async function execStatement(s, vars, order, gosubStack, forStack) {
  const result = { jumped: false, jumpIdx: -1, end: false };
  if (!s || !s.trim()) return result;

  const upper = s.trim().toUpperCase();
  const strim = s.trim();

  if (upper.startsWith("REM") || upper.startsWith("'"))
    return { ...result, breakBlock: true };
  if (upper === "END" || upper === "STOP") return { ...result, end: true };
  if (upper === "CLS") {
    consoleOut.innerHTML = "";
    return result;
  }

  if (
    upper.startsWith("PRINT") &&
    (upper.length === 5 || !/[A-Z0-9]/.test(upper[5]))
  ) {
    const rest = strim.substring(5).trim();
    executePrint(rest, vars);
    return result;
  }
  if (upper === "?") {
    executePrint("", vars);
    return result;
  }
  if (upper.startsWith("? ")) {
    executePrint(strim.substring(2).trim(), vars);
    return result;
  }

  if (
    upper.startsWith("INPUT") &&
    (upper.length === 5 || !/[A-Z0-9]/.test(upper[5]))
  ) {
    let rest = strim.substring(5).trim();
    let prompt = "";
    if (rest.startsWith('"')) {
      const qi = rest.indexOf('"', 1);
      if (qi !== -1) {
        prompt = rest.substring(1, qi);
        rest = rest.substring(qi + 1).replace(/^[;,\s]+/, "");
      }
    }
    const varNames = rest
      .split(",")
      .map((v) => v.trim().replace(/\$$/, "").toUpperCase())
      .filter(Boolean);
    if (varNames.length === 0) varNames.push("INPUTVAR");

    for (let vi = 0; vi < varNames.length; vi++) {
      const raw = await waitForInput(vi === 0 ? prompt || "? " : "? ");
      const num = parseFloat(raw);
      vars[varNames[vi]] = isNaN(num) ? raw : num;
    }
    return result;
  }

  if (
    upper.startsWith("GOTO") &&
    (upper.length === 4 || !/[A-Z0-9]/.test(upper[4]))
  ) {
    const target = parseInt(strim.substring(4).trim());
    const newIdx = order.indexOf(target);
    if (newIdx === -1) throw new Error(`Line ${target} not found (GOTO)`);
    result.jumped = true;
    result.jumpIdx = newIdx;
    return result;
  }

  if (
    upper.startsWith("GOSUB") &&
    (upper.length === 5 || !/[A-Z0-9]/.test(upper[5]))
  ) {
    const target = parseInt(strim.substring(5).trim());
    const newIdx = order.indexOf(target);
    if (newIdx === -1) throw new Error(`Line ${target} not found (GOSUB)`);
    result.jumped = true;
    result.jumpIdx = newIdx;
    result.isGosub = true;
    return result;
  }

  if (upper === "RETURN") {
    if (!gosubStack.length) throw new Error("RETURN without GOSUB");
    result.jumped = true;
    result.jumpIdx = gosubStack.pop();
    result.isReturn = true;
    return result;
  }

  if (upper.startsWith("FOR") && !/[A-Z0-9]/.test(upper[3] || " ")) {
    const forMatch = strim.match(
      /^FOR\s+([A-Z_$][A-Z0-9_$]*)\s*=\s*(.*?)\s+TO\s+(.*?)(?:\s+STEP\s+(.+))?$/i,
    );
    if (!forMatch) throw new Error(`Invalid FOR statement: ${strim}`);
    const vn = forMatch[1].toUpperCase().replace(/\$$/, "");
    const fromVal = evaluate(forMatch[2], vars);
    const toVal = evaluate(forMatch[3], vars);
    const stepVal = forMatch[4] ? evaluate(forMatch[4], vars) : 1;
    const existingFor = forStack.find((f) => f.vn === vn);
    if (!existingFor) {
      vars[vn] = fromVal;
      result.isFor = true;
      result.forInfo = { vn, to: toVal, step: stepVal };
    }
    return result;
  }

  if (upper.startsWith("NEXT")) {
    const nextVar =
      strim.substring(4).trim().toUpperCase().replace(/\$$/, "") || null;
    if (!forStack.length) throw new Error("NEXT without FOR");
    let forIdx = forStack.length - 1;
    if (nextVar) {
      forIdx = forStack.map((f) => f.vn).lastIndexOf(nextVar);
      if (forIdx === -1)
        throw new Error(`NEXT ${nextVar} without matching FOR`);
    }
    const f = forStack[forIdx];
    vars[f.vn] += f.step;
    const cont = f.step > 0 ? vars[f.vn] <= f.to : vars[f.vn] >= f.to;
    if (cont) {
      result.jumped = true;
      result.jumpIdx = f.retLine + 1;
      result.isNext = true;
    } else {
      forStack.splice(forIdx, 1);
    }
    return result;
  }

  if (upper.startsWith("IF") && !/[A-Z0-9]/.test(upper[2] || " ")) {
    const parsed = parseIfStatement(strim);
    if (!parsed) throw new Error(`IF without THEN: ${strim}`);

    let { condExpr, thenPart, elsePart } = parsed;
    condExpr = condExpr
      .replace(/\bAND\b/gi, "&&")
      .replace(/\bOR\b/gi, "||")
      .replace(/\bNOT\b/gi, "!")
      .replace(/\bMOD\b/gi, "%");

    const condition = !!evaluate(condExpr, vars);
    const branch = condition ? thenPart : elsePart;
    if (!branch || !branch.trim()) return result;

    const lineTarget = parseInt(branch.trim());
    if (!isNaN(lineTarget) && String(lineTarget) === branch.trim()) {
      const ti = order.indexOf(lineTarget);
      if (ti === -1) throw new Error(`Line ${lineTarget} not found (IF THEN)`);
      result.jumped = true;
      result.jumpIdx = ti;
      return result;
    }

    const inlines = splitStatements(branch);
    for (const part of inlines) {
      const r = await execStatement(part, vars, order, gosubStack, forStack);
      if (r.end || r.jumped || r.breakBlock) return r;
    }
    return result;
  }

  if (upper.startsWith("DIM") && !/[A-Z0-9]/.test(upper[3] || " ")) {
    const dimMatch = strim.match(/^DIM\s+([A-Z_$][A-Z0-9_$]*)\s*\((\d+)\)/i);
    if (dimMatch) {
      const arrName = dimMatch[1].toUpperCase().replace(/\$$/, "") + "_ARR";
      const size = parseInt(dimMatch[2]) + 1;
      vars[arrName] = new Array(size).fill(0);
    }
    return result;
  }

  const letMatch = strim.match(
    /^(?:LET\s+)?([A-Z_$][A-Z0-9_$]*)\s*(?:\((\d+)\))?\s*=\s*([\s\S]*)$/i,
  );
  if (letMatch) {
    const rawName = letMatch[1].toUpperCase().replace(/\$$/, "");
    const arrIdx = letMatch[2] !== undefined ? parseInt(letMatch[2]) : null;
    const valExpr = letMatch[3].trim();
    const val = evaluate(valExpr, vars);
    if (arrIdx !== null) {
      const arrName = rawName + "_ARR";
      if (!vars[arrName]) vars[arrName] = [];
      vars[arrName][arrIdx] = val;
    } else {
      vars[rawName] = val;
    }
    return result;
  }

  console.warn("BScode: unrecognised statement:", strim);
  return result;
}

async function executeBasic(src) {
  const linesMap = {};
  const order = [];
  for (const rawLine of src.split("\n")) {
    const match = rawLine.trim().match(/^(\d+)\s*([\s\S]*)/);
    if (match) {
      const num = parseInt(match[1]);
      linesMap[num] = match[2].trim();
      if (!order.includes(num)) order.push(num);
    }
  }
  order.sort((a, b) => a - b);

  if (order.length === 0) {
    printLine("No numbered BASIC lines found.", "cout-err");
    return;
  }

  const vars = {};
  const gosubStack = [];
  const forStack = [];
  let idx = 0;

  while (idx < order.length && !stopProgram) {
    const lineNum = order[idx];
    const stmt = linesMap[lineNum];
    if (!stmt) {
      idx++;
      continue;
    }

    await new Promise((r) => setTimeout(r, 0));
    if (stopProgram) return;

    const statements = splitStatements(stmt);
    let jumped = false;

    for (let si = 0; si < statements.length; si++) {
      if (stopProgram) return;
      const s = statements[si];
      if (!s) continue;

      let r;
      try {
        r = await execStatement(s, vars, order, gosubStack, forStack);
      } catch (err) {
        throw new Error(`Line ${lineNum}: ${err.message}`);
      }

      if (r.end) {
        idx = order.length;
        jumped = true;
        break;
      }
      if (r.breakBlock) break;

      if (r.isFor) {
        forStack.push({
          vn: r.forInfo.vn,
          to: r.forInfo.to,
          step: r.forInfo.step,
          retLine: idx,
        });
        continue;
      }

      if (r.jumped) {
        if (r.isGosub) {
          gosubStack.push(idx + 1);
        }
        if (r.isNext) {
          idx = r.jumpIdx;
        } else {
          idx = r.jumpIdx;
        }
        jumped = true;
        break;
      }
    }

    if (!jumped) idx++;
  }
}

async function runProgram() {
  if (programRunning) {
    stopProgram = true;
    return;
  }
  const code = editor.value.trim();
  if (!code) {
    setStatus("Nothing to run", "err");
    return;
  }
  clearConsole();
  programRunning = true;
  stopProgram = false;

  runBtn.innerHTML =
    '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="1"/></svg><span>STOP</span>';
  runBtn.classList.add("running", "stopping");

  const runBadge = document.getElementById("run-badge");
  if (runBadge) runBadge.classList.add("show");
  setStatus("Running...", "info");

  const start = performance.now();
  try {
    await executeBasic(code);
  } catch (err) {
    printLine(`ERROR: ${err.message}`, "cout-err");
    setStatus(`Error: ${err.message}`, "err");
  }

  const elapsed = ((performance.now() - start) / 1000).toFixed(3);
  programRunning = false;
  stopProgram = false;
  showInput(false);

  runBtn.innerHTML =
    '<svg viewBox="0 0 16 16" fill="currentColor"><polygon points="3,1 13,8 3,15"/></svg><span>RUN</span>';
  runBtn.classList.remove("running", "stopping");
  if (runBadge) runBadge.classList.remove("show");

  printLine(`\n─── Program ended (${elapsed}s) ───`, "cout-sys");
  if (!document.getElementById("sb-msg")?.textContent.startsWith("Error")) {
    setStatus(`Finished in ${elapsed}s`, "ok");
  }
}

// ========== Examples ==========
const EXAMPLES = {
  hello:
    '10 REM Hello World\n20 PRINT "Hello, World!"\n30 PRINT "Welcome to BScode BASIC"\n40 END',
  calc: '10 INPUT "Enter A: "; A\n20 INPUT "Enter B: "; B\n30 PRINT "Sum     = "; A+B\n40 PRINT "Diff    = "; A-B\n50 PRINT "Product = "; A*B\n60 IF B <> 0 THEN PRINT "Quotient= "; A/B\n70 END',
  loop: '10 INPUT "Count to: "; N\n20 FOR I=1 TO N\n30 PRINT "Number: "; I\n40 NEXT I\n50 PRINT "Done!"\n60 END',
  grade:
    '10 INPUT "Enter score (0-100): "; S\n20 IF S >= 80 THEN PRINT "Grade: A" ELSE IF S >= 70 THEN PRINT "Grade: B" ELSE IF S >= 60 THEN PRINT "Grade: C" ELSE PRINT "Grade: F"\n30 END',
  table:
    '10 INPUT "Enter a number: "; N\n20 PRINT "Multiplication Table for "; N\n30 PRINT "------------------------"\n40 FOR I=1 TO 10\n50 PRINT N; " x "; I; " = "; N*I\n60 NEXT I\n70 END',
  interest:
    '10 INPUT "Principal (P): "; P\n20 INPUT "Annual Rate % (R): "; R\n30 INPUT "Time in years (T): "; T\n40 LET SI = (P*R*T)/100\n50 LET AMT = P + SI\n60 PRINT "Simple Interest = "; SI\n70 PRINT "Total Amount    = "; AMT\n80 END',
  even: '10 INPUT "Enter a number: "; N\n20 IF N MOD 2 = 0 THEN PRINT N; " is EVEN" ELSE PRINT N; " is ODD"\n30 END',
  goto: '10 LET I = 1\n20 PRINT I\n30 LET I = I + 1\n40 IF I <= 5 THEN GOTO 20\n50 PRINT "Loop complete!"\n60 END',
  fizzbuzz:
    '10 FOR I = 1 TO 20\n20 IF I MOD 15 = 0 THEN PRINT "FizzBuzz" ELSE IF I MOD 3 = 0 THEN PRINT "Fizz" ELSE IF I MOD 5 = 0 THEN PRINT "Buzz" ELSE PRINT I\n30 NEXT I\n40 END',
  prime:
    '10 INPUT "Enter a number: "; N\n20 IF N < 2 THEN PRINT N; " is NOT prime" : GOTO 90\n30 IF N = 2 THEN PRINT N; " is PRIME" : GOTO 90\n40 LET I = 2\n50 IF I * I > N THEN PRINT N; " is PRIME" : GOTO 90\n60 IF N MOD I = 0 THEN PRINT N; " is NOT prime" : GOTO 90\n70 LET I = I + 1\n80 GOTO 50\n90 END',
};

function loadExample(key) {
  if (EXAMPLES[key]) {
    editor.value = EXAMPLES[key];
    updateLineNumbers();
    clearConsole();
    setStatus(`Loaded: ${key}`, "ok");
  }
  examplesMenu.classList.remove("open");
}

// ========== BScode AI ==========
const AI_CHIPS = [
  "Area of a circle",
  "Sum of two numbers",
  "Even or odd checker",
  "Factorial calculator",
  "Average of 3 numbers",
  "Simple interest calculator",
  "Celsius to Fahrenheit",
  "Multiplication table",
  "Fibonacci sequence",
  "Prime number checker",
];

const chipsContainer = document.getElementById("ai-chips-container");
if (chipsContainer) {
  AI_CHIPS.forEach((ch) => {
    const chip = document.createElement("div");
    chip.className = "ai-chip";
    chip.textContent = ch;
    chip.onclick = () => {
      aiInput.value = ch;
      aiInput.focus();
    };
    chipsContainer.appendChild(chip);
  });
}

async function generateAI() {
  const prompt = aiInput.value.trim();
  if (!prompt) {
    aiStatus.textContent = "⚠️ Please enter a description first";
    return;
  }

  aiGoBtn.disabled = true;
  aiGoBtn.textContent = "Generating...";
  aiStatus.textContent = "🧠 BScode AI is thinking...";

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: prompt }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Server error ${response.status}`);
    }

    if (!data.code) {
      throw new Error("Empty response from server");
    }

    const hasLineNumbers = data.code.match(/^\d+/m);
    if (!hasLineNumbers) {
      throw new Error("Generated code missing line numbers. Please try again.");
    }

    editor.value = data.code;
    updateLineNumbers();
    clearConsole();
    setStatus("✨ Code generated! Press RUN to execute.", "ok");
    aiPanel.classList.remove("open");
    aiStatus.textContent = "✅ Code generated!";
    setTimeout(() => {
      aiStatus.textContent = "";
    }, 3000);
  } catch (error) {
    console.error("BScode AI Error:", error);
    aiStatus.textContent = `❌ ${error.message}`;
    setStatus(`BScode AI Error: ${error.message}`, "err");
  } finally {
    aiGoBtn.disabled = false;
    aiGoBtn.textContent = "Generate ✦";
  }
}

// ========== Event Binding ==========
runBtn.onclick = runProgram;
clearBtn.onclick = clearConsole;
copyBtn.onclick = copyOutput;

newBtn.onclick = () => {
  if (confirm("Clear the editor and start fresh?")) {
    editor.value = "";
    updateLineNumbers();
    clearConsole();
    setStatus("New file", "ok");
  }
};

aiBtn.onclick = () => {
  aiPanel.classList.add("open");
  setTimeout(() => aiInput.focus(), 50);
};
aiClose.onclick = () => aiPanel.classList.remove("open");
aiGoBtn.onclick = generateAI;
aiInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") generateAI();
});

aiPanel.addEventListener("click", (e) => {
  if (e.target === aiPanel) aiPanel.classList.remove("open");
});

examplesBtn.onclick = (e) => {
  e.stopPropagation();
  examplesMenu.classList.toggle("open");
};
document.querySelectorAll(".ex-item").forEach((el) => {
  el.addEventListener("click", () => loadExample(el.dataset.example));
});
document.addEventListener("click", (e) => {
  const exWrap = document.getElementById("ex-wrap");
  if (exWrap && !exWrap.contains(e.target))
    examplesMenu.classList.remove("open");
});

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    runProgram();
  }
  if (e.key === "Escape") {
    if (aiPanel.classList.contains("open")) aiPanel.classList.remove("open");
    examplesMenu.classList.remove("open");
  }
});

// ========== Init ==========
updateLineNumbers();
clearConsole();
setStatus("✅ BScode IDE Ready — Press RUN or use BScode AI", "ok");
