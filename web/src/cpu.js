// A cycle-accurate model of the toy CPU, ported from rtl/.
//
// Each clock cycle is evaluated the way the hardware evaluates it: decode the
// instruction register, compute every control signal from the time state, let
// the combinational datapath settle, then update every enabled register at once
// on the clock edge. Names follow the RTL so a trace can be read side by side
// with the VHDL.

import { decode } from './isa.js';

const u8 = (v) => v & 0xff;
const signed8 = (v) => (v & 0x80 ? v - 256 : v);

/** alu.vhd - Y as a function of the decoded instruction. `pc` is the oldPC input. */
export function alu(a, b, icode, bFld, pc) {
  switch (icode) {
    case 0: return b;                                   // copy
    case 1: return u8(a + b);                           // add
    case 2: return a & b;                               // and
    case 3: return b;                                   // load: address = R[b]
    case 4: return b;                                   // store: address = R[b]
    case 5:
      return [u8(~a), u8(-a), a === 0 ? 1 : 0, pc][bFld];   // not, neg, lnot, read PC
    case 6:
      return [b, u8(a + b), a & b, b][bFld];            // ldi, addi, andi, ldind
    case 7: return b;                                   // branch target = R[b]
    default: return 0;
  }
}

/** control_signals_logic.vhd, equation for equation. */
export function controlSignals(t, icode, bFld) {
  const [t0, t1, t2, t3] = [t === 0, t === 1, t === 2, t === 3];
  const i = (n) => icode === n;
  const [b0, b1, b2, b3] = [bFld === 0, bFld === 1, bFld === 2, bFld === 3];
  return {
    pce: t1 || (t2 && i(6) && (b1 || b2 || b0)) || (t3 && i(6) && b3),
    ire: t0,
    rfe: (t2 && (i(0) || i(1) || i(2) || i(3) || i(5)))
      || (t2 && i(6) && (b0 || b1 || b2))
      || (t3 && i(6) && b3),
    mae: i(6) && b3 && t2,
    memwe: i(4) && t2,
    memoe: t0 || (i(3) && t2) || (i(6) && t2 && (b0 || b1 || b2 || b3)) || (i(6) && b3 && t3),
    s1: (i(3) && t2) || (i(4) && t2),
    s2: i(6) && b3 && t3,
    s3: (i(3) && t2) || (i(6) && b3 && t3),
    s4: i(6) && t2 && (b0 || b1 || b2),
  };
}

/** sequencer.vhd: the counter clears at T2, except for the indirect load, which needs T3. */
export const clearsAtT2 = (icode, bFld) => !(icode === 6 && bFld === 3);

/** Which ALU inputs this instruction actually consumes. */
function aluOperands(icode, bFld) {
  const usesA = icode === 1 || icode === 2
    || (icode === 5 && bFld !== 3)
    || (icode === 6 && (bFld === 1 || bFld === 2));
  const usesB = icode <= 4 || icode === 7 || (icode === 6 && bFld !== 3);
  const usesPc = icode === 5 && bFld === 3;
  return { usesA, usesB, usesPc };
}

/**
 * The wires carrying a value that something consumes this cycle.
 * Names match the wire ids in the datapath drawing.
 */
export function activeNets(sig, t, fields, j) {
  const { r, icode, b } = fields;
  const addrUsed = sig.memoe || sig.memwe;
  const aluFeedsRf = sig.rfe && !sig.s3;
  const aluFeedsAddr = addrUsed && !sig.s2 && sig.s1;
  const aluFeedsPc = sig.pce && j;
  const aluUsed = aluFeedsRf || aluFeedsAddr || aluFeedsPc;
  const { usesA, usesB, usesPc } = aluOperands(icode, b);
  const evaluatesBranch = sig.pce && icode === 7 && r === 0;

  const on = {
    mem_to_datain: sig.memoe,
    datain_ir: sig.ire,
    datain_ma: sig.mae,
    datain_mux3: sig.rfe && sig.s3,
    datain_mux4: aluUsed && sig.s4,
    ir_fields: t >= 1,
    rd1_alu: (aluUsed && usesA) || evaluatesBranch,
    rd1_dataout: sig.memwe,
    rd2_mux4: aluUsed && usesB && !sig.s4,
    mux4_alu: aluUsed && usesB,
    oldpc_alu: aluUsed && usesPc,
    aluout_mux3: aluFeedsRf,
    aluout_muxj: aluFeedsPc,
    aluout_mux1: aluFeedsAddr,
    mux3_rf: sig.rfe,
    pc_incr: sig.pce && !j,
    pcinc_incr: sig.pce && !j,
    incr_muxj: sig.pce && !j,
    muxj_pc: sig.pce,
    pc_oldpc: sig.pce,
    pc_mux1: addrUsed && !sig.s2 && !sig.s1,
    mux1_mux2: addrUsed && !sig.s2,
    ma_mux2: addrUsed && sig.s2,
    mux2_addr: addrUsed,
  };
  return Object.keys(on).filter((k) => on[k]);
}

export function resetState(memory = []) {
  const mem = new Uint8Array(256);
  memory.forEach((v, addr) => { mem[addr] = u8(v); });
  return {
    pc: 0, pcOld: 0, ir: 0, ma: 0,
    regs: [0, 0, 0, 0],
    mem,
    t: 0,
    cycle: 0,
    instrAddr: 0,
    halted: false,
  };
}

const cloneState = (s) => ({ ...s, regs: [...s.regs], mem: new Uint8Array(s.mem) });

/**
 * Advance one clock cycle. Returns the next state and a trace of the cycle:
 * the control signals, the values on every bus while it was in progress, and
 * the registers it wrote on the edge.
 */
export function step(state) {
  const s = state;
  const fields = decode(s.ir);
  const { r, icode, a, b } = fields;
  const sig = controlSignals(s.t, icode, b);

  // Combinational settle. S1 (ALU drives the address) and S4 (memory drives
  // ALU B) are never both high, so computing Y from RD2 first, then the address,
  // then data_in, then the final Y, follows the real dependency order.
  const rd1 = s.regs[a];
  const rd2 = s.regs[b];
  const yFromRd2 = alu(rd1, rd2, icode, b, s.pcOld);
  const m1 = sig.s1 ? yFromRd2 : s.pc;
  const addr = sig.s2 ? s.ma : m1;
  const dataIn = sig.memoe ? s.mem[addr] : 0;
  const aluB = sig.s4 ? dataIn : rd2;
  const aluOut = alu(rd1, aluB, icode, b, s.pcOld);
  const wd3 = sig.s3 ? dataIn : aluOut;
  const j = r === 0 && icode === 7 && signed8(rd1) <= 0;
  const pcInc = r ? 0 : 1;
  const incr = u8(s.pc + pcInc);
  const pcNext = j ? aluOut : incr;
  const dataOut = rd1;
  const clr = s.t === 2 && clearsAtT2(icode, b);

  // Clock edge: every enabled register takes its input from the settled values.
  const next = cloneState(s);
  const writes = [];
  if (sig.ire) { next.ir = dataIn; writes.push({ target: 'IR', value: dataIn }); }
  if (sig.mae) { next.ma = dataIn; writes.push({ target: 'MA', value: dataIn }); }
  if (sig.pce) {
    next.pc = pcNext;
    next.pcOld = s.pc;
    writes.push({ target: 'PC', value: pcNext }, { target: 'oldPC', value: s.pc });
  }
  if (sig.rfe) { next.regs[a] = wd3; writes.push({ target: `R${a}`, value: wd3 }); }
  if (sig.memwe) { next.mem[addr] = dataOut; writes.push({ target: 'MEM', addr, value: dataOut }); }
  next.t = clr ? 0 : (s.t + 1) & 3;
  next.cycle = s.cycle + 1;
  if (s.t === 0) next.instrAddr = s.pc;

  const instructionDone = next.t === 0;
  // With r set, PCinc is zero and the machine re-executes the same byte forever.
  if (instructionDone && r === 1 && next.pc === next.instrAddr) next.halted = true;

  const trace = {
    cycle: s.cycle,
    t: s.t,
    instrAddr: s.t === 0 ? s.pc : s.instrAddr,
    // At T0 the IR still holds the previous instruction; show what is being fetched.
    ir: s.t === 0 ? dataIn : s.ir,
    fields: s.t === 0 ? decode(dataIn) : fields,
    signals: sig,
    clr,
    j,
    values: { rd1, rd2, aluB, aluOut, dataIn, dataOut, addr, m1, wd3, incr, pcNext, pcInc,
      pc: s.pc, pcOld: s.pcOld, ma: s.ma },
    writes,
    active: activeNets(sig, s.t, fields, j),
    instructionDone,
    halted: next.halted,
  };
  return { state: next, trace };
}

/** Run until halt or a cycle budget runs out. Returns the final state and every trace. */
export function run(state, maxCycles = 10000) {
  let s = state;
  const traces = [];
  while (!s.halted && traces.length < maxCycles) {
    const out = step(s);
    s = out.state;
    traces.push(out.trace);
  }
  return { state: s, traces };
}
