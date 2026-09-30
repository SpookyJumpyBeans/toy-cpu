import { assemble } from './asm.js';
import { resetState, step } from './cpu.js';
import { createDatapath } from './datapath.js';
import { hex } from './isa.js';
import { narrate } from './narrate.js';
import { PROGRAMS } from './programs.js';

const $ = (id) => document.getElementById(id);
const MAX_HISTORY = 20000;
const PHASES = ['Fetch', 'Advance PC', 'Execute', 'Execute (2 of 2)'];
const SIGNALS = ['pce', 'ire', 'rfe', 'mae', 'memoe', 'memwe', 's1', 's2', 's3', 's4', 'j', 'clr'];

const datapath = createDatapath($('datapath'));

let program = null;         // { listing, memory }
let timeline = [];           // [{ state, trace }]
let timer = null;

const current = () => timeline[timeline.length - 1];

// --- loading -----------------------------------------------------------------

function load(source) {
  const result = assemble(source);
  renderErrors(result.errors);
  if (result.errors.length) return false;
  program = result;
  timeline = [{ state: resetState(result.memory), trace: null }];
  pause();
  renderListing();
  render();
  return true;
}

function selectProgram(id) {
  const p = PROGRAMS.find((x) => x.id === id) ?? PROGRAMS[0];
  $('program').value = p.id;
  $('blurb').textContent = p.blurb;
  $('source').value = p.source;
  load(p.source);
  if (location.hash.slice(1) !== p.id) window.history.replaceState(null, '', `#${p.id}`);
}

// --- stepping ----------------------------------------------------------------

function stepCycle() {
  const { state } = current();
  if (state.halted) { pause(); return false; }
  const out = step(state);
  timeline.push(out);
  if (timeline.length > MAX_HISTORY) timeline.splice(1, timeline.length - MAX_HISTORY);
  render();
  if (out.state.halted) pause();
  return true;
}

function stepInstruction() {
  do {
    if (!stepCycle()) return;
  } while (!current().trace.instructionDone);
}

function back() {
  if (timeline.length > 1) { timeline.pop(); render(); }
}

function reset() {
  pause();
  timeline = timeline.slice(0, 1);
  render();
}

function speed() {
  return Number($('speed').value);
}

function play() {
  if (current().state.halted) reset();
  pause();
  $('run').textContent = 'Pause';
  $('run').setAttribute('aria-pressed', 'true');
  timer = setInterval(() => { if (!stepCycle()) pause(); }, 1000 / speed());
}

function pause() {
  clearInterval(timer);
  timer = null;
  $('run').textContent = 'Run';
  $('run').setAttribute('aria-pressed', 'false');
}

// --- rendering ---------------------------------------------------------------

function render() {
  const { state, trace } = current();
  datapath.update(state, trace);
  renderController(state, trace);
  renderHighlight(state, trace);
  renderMemory(state, trace);

  $('narration').innerHTML = trace
    ? narrate(trace, state.mem)
    : 'Reset. PC = <code>0x00</code> and every register is cleared. Step to fetch the first instruction.';

  // CPI over retired instructions only; an instruction still in flight would inflate it.
  const done = timeline.filter((h) => h.trace?.instructionDone);
  const retired = done.length;
  const retiredCycles = retired ? done[retired - 1].trace.cycle + 1 : 0;
  const cpi = retired ? (retiredCycles / retired).toFixed(2) : '—';
  $('stats').textContent = `cycle ${state.cycle} · ${retired} instruction${retired === 1 ? '' : 's'} · CPI ${cpi}`;
  $('halted').hidden = !state.halted;
  $('back').disabled = timeline.length <= 1;
  $('step').disabled = state.halted;
  $('stepInstr').disabled = state.halted;
}

function renderController(state, trace) {
  const t = trace ? trace.t : null;
  document.querySelectorAll('.tstate').forEach((node) => {
    node.classList.toggle('on', Number(node.dataset.t) === t);
  });
  $('phase').textContent = trace ? `T${t} — ${PHASES[t]}` : 'Idle';
  const sig = trace ? { ...trace.signals, j: trace.j, clr: trace.clr } : {};
  for (const name of SIGNALS) {
    const chip = $(`sig_${name}`);
    chip.classList.toggle('on', !!sig[name]);
    chip.classList.toggle('dont-care', name === 'j' && trace && !trace.signals.pce);
  }
}

function renderListing() {
  const list = $('listing');
  list.replaceChildren(...program.listing.map((entry) => {
    const li = document.createElement('li');
    li.dataset.addr = entry.addr;
    li.className = entry.kind;
    const code = entry.source.replace(/;.*$/, '').trim();
    const comment = (entry.source.match(/;.*$/) || [''])[0];
    li.innerHTML = `<span class="addr">${hex(entry.addr)}</span>`
      + `<span class="bytes">${entry.bytes.map((b) => hex(b).slice(2)).join(' ')}</span>`
      + `<span class="src"></span><span class="comment"></span>`;
    li.querySelector('.src').textContent = code;
    li.querySelector('.comment').textContent = comment;
    return li;
  }));
}

function renderHighlight(state, trace) {
  const addr = trace ? trace.instrAddr : state.pc;
  let found = null;
  for (const li of $('listing').children) {
    const on = Number(li.dataset.addr) === addr && li.classList.contains('code');
    li.classList.toggle('current', on);
    if (on) found = li;
  }
  // Scroll the listing box only. scrollIntoView would also scroll the page,
  // yanking the datapath out of view on every step.
  if (found) {
    const list = $('listing');
    const y = found.offsetTop;
    const h = found.offsetHeight;
    if (y < list.scrollTop) list.scrollTop = y;
    else if (y + h > list.scrollTop + list.clientHeight) list.scrollTop = y + h - list.clientHeight;
  }
}

function renderMemory(state, trace) {
  const table = $('memory');
  if (!table.dataset.built) {
    const head = '<tr><th></th>' + [...Array(16).keys()].map((c) => `<th>${c.toString(16).toUpperCase()}</th>`).join('') + '</tr>';
    const rows = [...Array(16).keys()].map((r) => `<tr><th>${r.toString(16).toUpperCase()}0</th>`
      + [...Array(16).keys()].map((c) => `<td id="m${r * 16 + c}"></td>`).join('') + '</tr>');
    table.innerHTML = head + rows.join('');
    table.dataset.built = '1';
  }
  const initial = program.memory;
  const occupied = new Set(program.listing.flatMap((e) => e.bytes.map((_, i) => e.addr + i)));
  const sig = trace ? trace.signals : {};
  for (let a = 0; a < 256; a++) {
    const cell = $(`m${a}`);
    cell.textContent = hex(state.mem[a]).slice(2);
    cell.className = [
      occupied.has(a) ? 'prog' : '',
      state.mem[a] !== initial[a] ? 'changed' : '',
      a === state.pc ? 'pc' : '',
      trace && sig.memoe && trace.values.addr === a ? 'read' : '',
      trace && sig.memwe && trace.values.addr === a ? 'write' : '',
    ].filter(Boolean).join(' ');
  }
}

function renderErrors(errors) {
  const box = $('asmErrors');
  box.replaceChildren(...errors.map((e) => {
    const p = document.createElement('p');
    p.textContent = `line ${e.line}: ${e.message}`;
    return p;
  }));
  box.hidden = errors.length === 0;
}

// --- wiring ------------------------------------------------------------------

function init() {
  $('program').replaceChildren(...PROGRAMS.map((p) => new Option(p.name, p.id)));
  $('signals').replaceChildren(...SIGNALS.map((name) => {
    const chip = document.createElement('span');
    chip.id = `sig_${name}`;
    chip.className = 'chip';
    chip.textContent = name === 's1' || name === 's2' || name === 's3' || name === 's4'
      ? name.toUpperCase() : name;
    return chip;
  }));

  $('program').addEventListener('change', (e) => selectProgram(e.target.value));
  $('reset').addEventListener('click', reset);
  $('back').addEventListener('click', () => { pause(); back(); });
  $('step').addEventListener('click', () => { pause(); stepCycle(); });
  $('stepInstr').addEventListener('click', () => { pause(); stepInstruction(); });
  $('run').addEventListener('click', () => (timer ? pause() : play()));
  $('speed').addEventListener('input', () => {
    $('speedValue').textContent = `${speed()} Hz`;
    if (timer) play();
  });
  $('assemble').addEventListener('click', () => load($('source').value));

  document.addEventListener('keydown', (e) => {
    if (e.target.closest('textarea, select, input')) return;
    if (e.key === ' ') { e.preventDefault(); timer ? pause() : play(); }
    else if (e.key === 'ArrowRight' && e.shiftKey) { pause(); stepInstruction(); }
    else if (e.key === 'ArrowRight') { pause(); stepCycle(); }
    else if (e.key === 'ArrowLeft') { pause(); back(); }
    else if (e.key.toLowerCase() === 'r') reset();
  });

  window.addEventListener('hashchange', () => selectProgram(location.hash.slice(1)));
  $('speedValue').textContent = `${speed()} Hz`;
  selectProgram(location.hash.slice(1));
}

init();
