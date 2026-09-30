// The datapath drawing, laid out after docs/datapath.png.
//
// Every wire id matches a net name from activeNets() in cpu.js, so animating a
// cycle is just "light up the nets the model says carried a value". Inputs 0
// are drawn on top of each mux and inputs 1 below, as in the schematic.

import { disassemble, hex } from './isa.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// [id, points] - each wire runs from its driver to its consumer. A wire that
// branches off another starts at the shared port, not at the tap, so it never
// appears to begin in the middle of an unlit segment.
const WIRES = [
  ['mem_to_datain', [[100, 270], [140, 270]]],
  ['datain_ir', [[140, 270], [140, 95], [170, 95]]],
  ['datain_ma', [[140, 270], [140, 472], [170, 472]]],
  ['datain_mux3', [[140, 270], [300, 270], [300, 198], [318, 198]]],
  ['datain_mux4', [[140, 270], [620, 270], [620, 212], [640, 212]]],
  ['ir_fields', [[270, 95], [380, 95]]],
  ['rd1_alu', [[550, 90], [700, 90]]],
  ['rd1_dataout', [[550, 90], [575, 90], [575, 24], [118, 24], [118, 90], [100, 90]]],
  ['rd2_mux4', [[550, 160], [640, 160]]],
  ['mux4_alu', [[666, 186], [700, 186]]],
  ['oldpc_alu', [[660, 349], [680, 349], [680, 240], [700, 240]]],
  ['aluout_mux3', [[790, 125], [830, 125], [830, 12], [306, 12], [306, 164], [318, 164]]],
  ['aluout_muxj', [[790, 125], [830, 125], [830, 296], [306, 296], [306, 366], [320, 366]]],
  ['aluout_mux1', [[790, 125], [830, 125], [830, 455], [686, 455], [686, 518], [700, 518]]],
  ['mux3_rf', [[344, 181], [380, 181]]],
  ['pc_oldpc', [[490, 349], [560, 349]]],
  ['pc_incr', [[490, 349], [520, 349], [520, 392], [440, 392], [440, 410]]],
  ['pcinc_incr', [[790, 195], [810, 195], [810, 433], [490, 433]]],
  ['incr_muxj', [[390, 433], [292, 433], [292, 332], [320, 332]]],
  ['muxj_pc', [[346, 349], [390, 349]]],
  ['pc_mux1', [[490, 349], [520, 349], [520, 484], [700, 484]]],
  ['mux1_mux2', [[726, 501], [760, 501], [760, 494], [780, 494]]],
  ['ma_mux2', [[270, 472], [300, 472], [300, 572], [764, 572], [764, 540], [780, 540]]],
  ['mux2_addr', [[806, 517], [860, 517], [860, 592], [118, 592], [118, 520], [100, 520]]],
];

// Bus value tags: [id, x, y, which nets make it visible, value key]
const TAGS = [
  ['tag_datain', 104, 262, ['mem_to_datain'], 'dataIn', 'data_in'],
  ['tag_dataout', 330, 16, ['rd1_dataout'], 'dataOut', 'data_out'],
  ['tag_rd1', 588, 82, ['rd1_alu'], 'rd1', ''],
  ['tag_rd2', 588, 152, ['rd2_mux4'], 'rd2', ''],
  ['tag_aluout', 796, 117, ['aluout_mux3', 'aluout_muxj', 'aluout_mux1'], 'aluOut', ''],
  ['tag_incr', 330, 425, ['incr_muxj'], 'incr', ''],
  ['tag_addr', 440, 584, ['mux2_addr'], 'addr', 'addr_bus'],
  ['tag_ma', 520, 564, ['ma_mux2'], 'ma', ''],
];

// [id, x, y, w, h, input-1 y offset ratio, select label]
const MUXES = [
  ['mux3', 318, 150, 26, 62, 's3', 'S3'],
  ['mux4', 640, 140, 26, 90, 's4', 'S4'],
  ['muxj', 320, 318, 26, 62, 'j', 'j'],
  ['mux1', 700, 470, 26, 62, 's1', 'S1'],
  ['mux2', 780, 480, 26, 72, 's2', 'S2'],
];

const el = (tag, attrs = {}, text) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
};

const pathD = (points) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');

function box(parent, id, x, y, w, h, title) {
  const g = el('g', { id, class: 'block' });
  g.append(el('rect', { x, y, width: w, height: h, rx: 6, class: 'block-body' }));
  g.append(el('text', { x: x + 8, y: y + 15, class: 'block-title' }, title));
  parent.append(g);
  return g;
}

function valueText(g, id, x, y, cls = 'block-value') {
  const t = el('text', { id, x, y, class: cls, 'text-anchor': 'middle' }, '');
  g.append(t);
  return t;
}

export function createDatapath(container) {
  const svg = el('svg', {
    viewBox: '0 0 900 610',
    class: 'datapath',
    role: 'img',
    'aria-label': 'Datapath of the toy CPU, animated one clock cycle at a time',
  });

  const defs = el('defs');
  defs.innerHTML = `
    <!-- userSpaceOnUse, not the default objectBoundingBox: a straight wire has a
         zero-height box, and a filter region sized from it would erase the wire. -->
    <filter id="glow" filterUnits="userSpaceOnUse" x="0" y="0" width="900" height="610">
      <feGaussianBlur stdDeviation="2.4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6"
      orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="arrow-idle"/></marker>
    <marker id="arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6"
      orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="arrow-on"/></marker>`;
  svg.append(defs);

  // Wires first, so blocks sit on top of their endpoints.
  const wireLayer = el('g', { class: 'wires' });
  const wires = new Map();
  for (const [id, points] of WIRES) {
    const g = el('g', { id, class: 'wire' });
    g.append(el('path', { d: pathD(points), class: 'wire-base', 'marker-end': 'url(#arrow)' }));
    g.append(el('path', { d: pathD(points), class: 'wire-flow' }));
    wireLayer.append(g);
    wires.set(id, g);
  }
  svg.append(wireLayer);

  const blocks = el('g', { class: 'blocks' });
  svg.append(blocks);

  // Memory: external to the CPU, drawn as the far-left column.
  const mem = box(blocks, 'blk_mem', 20, 40, 80, 520, 'MEM');
  mem.classList.add('block-external');
  const memMode = valueText(mem, 'mem_mode', 60, 290, 'mem-mode');
  const memAddr = valueText(mem, 'mem_addr', 60, 312, 'mem-detail');
  const memVal = valueText(mem, 'mem_val', 60, 332, 'mem-detail');
  mem.append(el('text', { x: 60, y: 80, class: 'port-label', 'text-anchor': 'middle' }, 'data_out →'));
  mem.append(el('text', { x: 60, y: 258, class: 'port-label', 'text-anchor': 'middle' }, '→ data_in'));
  mem.append(el('text', { x: 60, y: 508, class: 'port-label', 'text-anchor': 'middle' }, 'addr →'));

  const ir = box(blocks, 'blk_ir', 170, 60, 100, 70, 'IR');
  const irVal = valueText(ir, 'ir_val', 220, 95);
  const irAsm = valueText(ir, 'ir_asm', 220, 118, 'block-sub');

  const ma = box(blocks, 'blk_ma', 170, 440, 100, 64, 'MemAddr');
  const maVal = valueText(ma, 'ma_val', 220, 484);

  // Register file: four rows, one per register.
  const rf = box(blocks, 'blk_rf', 380, 50, 170, 190, 'Register file');
  const regRows = [0, 1, 2, 3].map((n) => {
    const y = 74 + n * 40;
    const row = el('g', { id: `reg${n}`, class: 'reg-row' });
    row.append(el('rect', { x: 396, y, width: 138, height: 32, rx: 4, class: 'reg-cell' }));
    row.append(el('text', { x: 408, y: y + 21, class: 'reg-name' }, `R${n}`));
    const v = el('text', { x: 522, y: y + 21, class: 'reg-value', 'text-anchor': 'end' }, '0x00');
    row.append(v);
    rf.append(row);
    return { row, v };
  });

  // ALU: the classic notched shape.
  const aluG = el('g', { id: 'blk_alu', class: 'block' });
  aluG.append(el('polygon', {
    points: '700,50 790,100 790,210 700,260 700,175 716,155 700,135',
    class: 'block-body',
  }));
  aluG.append(el('text', { x: 740, y: 98, class: 'block-title', 'text-anchor': 'middle' }, 'ALU'));
  const aluOp = valueText(aluG, 'alu_op', 752, 152, 'alu-op');
  const aluRes = valueText(aluG, 'alu_res', 752, 176);
  for (const [label, y] of [['A', 94], ['B', 190], ['PC', 244]]) {
    aluG.append(el('text', { x: 706, y, class: 'port-label' }, label));
  }
  for (const [label, y] of [['Y', 129], ['j', 164], ['PCinc', 199]]) {
    aluG.append(el('text', { x: 784, y, class: 'port-label', 'text-anchor': 'end' }, label));
  }
  blocks.append(aluG);

  const pc = box(blocks, 'blk_pc', 390, 320, 100, 58, 'PC');
  const pcVal = valueText(pc, 'pc_val', 440, 362);
  const oldPc = box(blocks, 'blk_oldpc', 560, 320, 100, 58, 'oldPC');
  const oldPcVal = valueText(oldPc, 'oldpc_val', 610, 362);

  const inc = box(blocks, 'blk_incr', 390, 410, 100, 46, 'Increment PC');
  const incVal = valueText(inc, 'incr_val', 440, 446, 'block-sub');

  const selects = new Map();
  for (const [id, x, y, w, h, key, label] of MUXES) {
    const g = el('g', { id: `blk_${id}`, class: 'block mux' });
    g.append(el('polygon', {
      points: `${x},${y} ${x + w},${y + h * 0.2} ${x + w},${y + h * 0.8} ${x},${y + h}`,
      class: 'block-body',
    }));
    g.append(el('text', { x: x + 5, y: y + 16, class: 'mux-port' }, '0'));
    g.append(el('text', { x: x + 5, y: y + h - 7, class: 'mux-port' }, '1'));
    const sel = el('text', { x: x + w / 2, y: y + h + 15, class: 'mux-select', 'text-anchor': 'middle' },
      `${label}=0`);
    g.append(sel);
    blocks.append(g);
    selects.set(id, { sel, key, label, g });
  }

  // Small annotation where the IR fields leave for the register file.
  svg.append(el('text', { x: 325, y: 88, class: 'port-label', 'text-anchor': 'middle' }, 'a, b'));

  const tagLayer = el('g', { class: 'tags' });
  const tags = TAGS.map(([id, x, y, nets, key, name]) => {
    const g = el('g', { id, class: 'tag' });
    const text = el('text', { x, y, class: 'tag-text' }, '');
    g.append(text);
    tagLayer.append(g);
    return { g, text, nets, key, name };
  });
  svg.append(tagLayer);

  container.replaceChildren(svg);

  // Restart a CSS animation on an element by forcing a reflow.
  const flash = (node) => {
    node.classList.remove('flash');
    void node.getBoundingClientRect();
    node.classList.add('flash');
  };

  /** Draw a cycle. `trace` is null right after reset. */
  function update(state, trace) {
    const active = new Set(trace ? trace.active : []);
    for (const [id, g] of wires) {
      const on = active.has(id);
      g.classList.toggle('active', on);
      g.querySelector('.wire-base').setAttribute('marker-end', on ? 'url(#arrow-on)' : 'url(#arrow)');
    }
    // Wires share segments (the ALU output trunk, taps off PC and RD1). Paint the
    // active ones last, so an idle wire's grey never covers a live one's glow.
    for (const [id, g] of wires) if (active.has(id)) wireLayer.append(g);

    for (const tag of tags) {
      const on = tag.nets.some((n) => active.has(n));
      tag.g.classList.toggle('visible', on);
      if (on) tag.text.textContent = `${tag.name ? tag.name + ' ' : ''}${hex(trace.values[tag.key])}`;
    }

    const sig = trace ? trace.signals : {};
    for (const { sel, key, label, g } of selects.values()) {
      const value = key === 'j' ? (trace ? trace.j : false) : !!sig[key];
      // j is combinational and is only meaningful while the PC is being written.
      const relevant = key === 'j' ? !!sig.pce : true;
      sel.textContent = `${label}=${value ? 1 : 0}`;
      sel.classList.toggle('high', value && relevant);
      sel.classList.toggle('dont-care', !relevant);
      // A mux is in use when any net into or out of it is carrying a value.
      const name = g.id.replace('blk_', '');
      g.classList.toggle('in-use', [...active].some((n) => n.split('_').includes(name)));
    }

    // Register and block values show the state after the clock edge.
    irVal.textContent = hex(state.ir);
    irAsm.textContent = trace ? disassemble(trace.ir, trace.fields.icode === 6
      ? state.mem[(trace.instrAddr + 1) & 0xff] : undefined) : '—';
    maVal.textContent = hex(state.ma);
    pcVal.textContent = hex(state.pc);
    oldPcVal.textContent = hex(state.pcOld);
    regRows.forEach(({ v }, n) => { v.textContent = hex(state.regs[n]); });

    const v = trace ? trace.values : null;
    const aluUsed = trace && ['rd1_alu', 'mux4_alu', 'oldpc_alu'].some((n) => active.has(n));
    aluG.classList.toggle('in-use', !!aluUsed);
    aluOp.textContent = aluUsed ? aluSymbol(trace.fields) : '';
    aluRes.textContent = aluUsed ? `= ${hex(v.aluOut)}` : '';
    incVal.textContent = trace && active.has('incr_muxj') ? `+${v.pcInc} → ${hex(v.incr)}` : '';

    const reading = !!sig.memoe;
    const writing = !!sig.memwe;
    mem.classList.toggle('in-use', reading || writing);
    memMode.textContent = writing ? 'WRITE' : reading ? 'READ' : '';
    memAddr.textContent = reading || writing ? `[${hex(v.addr)}]` : '';
    memVal.textContent = writing ? `← ${hex(v.dataOut)}` : reading ? `= ${hex(v.dataIn)}` : '';

    // Flash whatever latched on this edge.
    const targets = {
      IR: ir, MA: ma, PC: pc, oldPC: oldPc, MEM: mem,
      R0: regRows[0].row, R1: regRows[1].row, R2: regRows[2].row, R3: regRows[3].row,
    };
    for (const node of Object.values(targets)) node.classList.remove('flash');
    if (trace) for (const w of trace.writes) flash(targets[w.target]);
  }

  return { update };
}

function aluSymbol({ icode, b }) {
  if (icode === 1 || (icode === 6 && b === 1)) return 'A + B';
  if (icode === 2 || (icode === 6 && b === 2)) return 'A & B';
  if (icode === 5) return ['~A', '−A', '!A', 'PC'][b];
  if (icode === 7) return 'A ≤ 0 ?';
  return 'pass B';
}
