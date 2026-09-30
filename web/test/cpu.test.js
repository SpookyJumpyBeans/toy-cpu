import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { assemble } from '../src/asm.js';
import { controlSignals, resetState, run, step } from '../src/cpu.js';
import { HALT, decode } from '../src/isa.js';
import { PROGRAMS, multiplyProgram } from '../src/programs.js';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const program = (id) => PROGRAMS.find((p) => p.id === id);

function runSource(source, maxCycles) {
  const { memory, errors } = assemble(source);
  assert.deepEqual(errors, []);
  return run(resetState(memory), maxCycles);
}

/** Parse programs/ProgramDataN.txt: lines of `address/data;` in hex. */
function testbenchImage(n) {
  const mem = new Uint8Array(256);
  const text = readFileSync(join(REPO, 'programs', `ProgramData${n}.txt`), 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = /^([0-9a-f]+)\/([0-9a-f]{2})/i.exec(line.trim());
    if (m) mem[parseInt(m[1], 16)] = parseInt(m[2], 16);
  }
  return mem;
}

/** Split a run's traces into one group per instruction. */
function instructions(traces) {
  const groups = [];
  let current = [];
  for (const t of traces) {
    current.push(t);
    if (t.instructionDone) { groups.push(current); current = []; }
  }
  return groups;
}

// --- faithfulness to the testbench programs ---------------------------------

for (const n of [0, 1, 2, 3]) {
  test(`program${n} assembles to exactly the bytes in ProgramData${n}.txt`, () => {
    const { memory, errors } = assemble(program(`program${n}`).source);
    assert.deepEqual(errors, []);
    assert.deepEqual([...memory], [...testbenchImage(n)]);
  });
}

test('ProgramData0: immediate load then copy', () => {
  const { state } = run(resetState(testbenchImage(0)));
  assert.equal(state.halted, true);
  assert.equal(state.regs[1], 0x14);
  assert.equal(state.regs[2], 0x14);
});

test('ProgramData1: 0x55 AND 0xFF', () => {
  const { state } = run(resetState(testbenchImage(1)));
  assert.equal(state.regs[1], 0x55);
  assert.equal(state.regs[2], 0x55);
});

test('ProgramData2: store to a register-held address', () => {
  const { state } = run(resetState(testbenchImage(2)));
  assert.equal(state.mem[0x48], 0x24);
});

test('ProgramData3: indirect load reads through memory', () => {
  const { state } = run(resetState(testbenchImage(3)));
  assert.equal(state.mem[0x67], 0x48);
  assert.equal(state.regs[3], 0x48);
});

// --- timing ------------------------------------------------------------------

test('every instruction takes 3 cycles except the indirect load, which takes 4', () => {
  for (const p of PROGRAMS) {
    const { memory } = assemble(p.source);
    const { traces } = run(resetState(memory));
    for (const group of instructions(traces)) {
      const { icode, b } = group[1].fields;       // decoded from T1 on
      const expected = icode === 6 && b === 3 ? 4 : 3;
      assert.equal(group.length, expected, `${p.id}: instruction at ${group[0].instrAddr}`);
    }
  }
});

test('the indirect load is the only instruction that reaches T3', () => {
  const { traces } = run(resetState(testbenchImage(3)));
  const t3 = traces.filter((t) => t.t === 3);
  assert.equal(t3.length, 1);
  assert.equal(t3[0].fields.icode, 6);
  assert.equal(t3[0].fields.b, 3);
});

test('a taken branch loads the PC at T1, through MUX_j, not at T2', () => {
  const { traces } = runSource(program('sum').source);
  // j is combinational: it stays high at T2 while the branch is still in the IR.
  // It only matters where the PC is enabled, which for a branch is T1 alone.
  const loads = traces.filter((t) => t.signals.pce && t.j);
  assert.equal(loads.length, 5);                    // five trips back round the loop
  for (const t of loads) {
    assert.equal(t.t, 1);
    assert.equal(t.fields.icode, 7);
    assert.ok(t.active.includes('aluout_muxj'));
    assert.equal(t.values.pcNext, t.values.aluOut);
  }
  const branchT2 = traces.filter((t) => t.t === 2 && t.fields.icode === 7 && t.fields.r === 0);
  assert.ok(branchT2.every((t) => !t.signals.pce && t.writes.length === 0), 'T2 of a branch is idle');
});

test('halt: r=1 zeroes PCinc, so the PC holds on its own address', () => {
  const { state, traces } = run(resetState([HALT]));
  assert.equal(state.halted, true);
  assert.equal(state.pc, 0);
  assert.equal(traces.length, 3);
});

test('read PC returns the address of the instruction itself, via oldPC', () => {
  const { state } = runSource('nop\nnop\nrdpc r1\nhalt');
  assert.equal(state.regs[1], 2);
});

test('a program with no halt stops at the cycle budget instead of hanging', () => {
  const { state, traces } = run(resetState([]), 300);
  assert.equal(state.halted, false);
  assert.equal(traces.length, 300);
});

// --- the showcase programs ---------------------------------------------------

test('multiply is correct for every pair of 4-bit operands', () => {
  for (let a = 0; a < 16; a++) {
    for (let b = 0; b < 16; b++) {
      const { state } = runSource(multiplyProgram(a, b));
      assert.equal(state.regs[0], a * b, `${a} x ${b}`);
    }
  }
});

test('multiply never branches', () => {
  const { memory } = assemble(program('multiply').source);
  const { traces } = run(resetState(memory));
  assert.ok(traces.every((t) => t.fields.icode !== 7 || t.fields.r === 1));
});

test('sum loop adds 5 + 4 + 3 + 2 + 1 + 0', () => {
  const { state } = runSource(program('sum').source);
  assert.equal(state.regs[0], 15);
});

// --- structural invariants ---------------------------------------------------

test('S1 and S4 are never both high, so the datapath has no combinational loop', () => {
  for (const p of PROGRAMS) {
    const { memory } = assemble(p.source);
    for (const t of run(resetState(memory)).traces) {
      assert.ok(!(t.signals.s1 && t.signals.s4), `${p.id} cycle ${t.cycle}`);
    }
  }
});

test('data_in is only consumed while memory is driving it', () => {
  for (const p of PROGRAMS) {
    const { memory } = assemble(p.source);
    for (const t of run(resetState(memory)).traces) {
      const s = t.signals;
      if (s.ire || s.mae || s.s3 || s.s4) assert.ok(s.memoe, `${p.id} cycle ${t.cycle}`);
    }
  }
});

test('T0 is the same fetch for every instruction', () => {
  const { memory } = assemble(program('sum').source);
  for (const t of run(resetState(memory)).traces.filter((x) => x.t === 0)) {
    assert.deepEqual(t.active.sort(),
      ['datain_ir', 'mem_to_datain', 'mux1_mux2', 'mux2_addr', 'pc_mux1']);
  }
});

test('control signals for the indirect load match the README walkthrough', () => {
  const { icode, b } = decode(0x6f);
  const t2 = controlSignals(2, icode, b);
  assert.deepEqual([t2.mae, t2.memoe, t2.rfe, t2.pce], [true, true, false, false]);
  const t3 = controlSignals(3, icode, b);
  assert.deepEqual([t3.s2, t3.s3, t3.rfe, t3.pce, t3.memoe], [true, true, true, true, true]);
});

test('step does not mutate the state it was given', () => {
  const s0 = resetState([0x64, 0x14, HALT]);
  const before = JSON.stringify({ ...s0, mem: [...s0.mem] });
  step(s0);
  assert.equal(JSON.stringify({ ...s0, mem: [...s0.mem] }), before);
});
