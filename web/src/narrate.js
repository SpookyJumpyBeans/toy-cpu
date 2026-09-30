// One sentence or two per clock cycle, describing what the hardware just did.
// Returned as small HTML: the values are all numbers formatted here, never user text.

import { disassemble, hex } from './isa.js';

const c = (v) => `<code>${hex(v)}</code>`;
const reg = (n) => `<code>R${n}</code>`;
const op = (text) => `<b>${text}</b>`;

export function narrate(trace, memory) {
  const { t, fields, values: v, j } = trace;
  const { r, icode, a, b } = fields;

  if (t === 0) {
    const imm = icode === 6 ? memory[(v.pc + 1) & 0xff] : undefined;
    return `Fetch. The address bus carries PC = ${c(v.pc)}; memory returns ${c(v.dataIn)}, `
      + `which latches into IR. It decodes as ${op(disassemble(v.dataIn, imm))}.`;
  }

  if (t === 1) {
    if (icode === 7 && r === 0) {
      return j
        ? `Branch taken. ${reg(a)} = ${c(v.rd1)} is ≤ 0, so j steers MUX_j to the ALU, `
          + `which passes ${reg(b)} through: PC ← ${c(v.pcNext)}.`
        : `Branch not taken. ${reg(a)} = ${c(v.rd1)} is > 0, so MUX_j keeps PC + 1: `
          + `PC ← ${c(v.pcNext)}.`;
    }
    if (r === 1) {
      return `Hold. The r bit makes PCinc zero, so PC ← PC + 0 = ${c(v.pcNext)}. `
        + `The machine will fetch this same byte forever — that is how a program halts.`;
    }
    return `Advance. PC ← PC + 1 = ${c(v.pcNext)}, and oldPC keeps ${c(v.pc)}.`;
  }

  if (t === 3) {
    return `Execute, part 2 of 2. S2 puts MA = ${c(v.ma)} on the address bus; memory returns `
      + `${c(v.dataIn)} and S3 steers it into the register file: ${reg(a)} ← ${c(v.wd3)}. `
      + `PC steps past the immediate to ${c(v.pcNext)}.`;
  }

  // T2: execute and write back.
  switch (icode) {
    case 0:
      return `Execute. The ALU passes ${reg(b)} = ${c(v.rd2)} straight through and MUX3 routes it `
        + `to the register file: ${reg(a)} ← ${c(v.wd3)}.`;
    case 1:
      return `Execute. The ALU adds ${reg(a)} + ${reg(b)} = ${c(v.rd1)} + ${c(v.aluB)} = `
        + `${c(v.aluOut)}; ${reg(a)} ← ${c(v.wd3)}.`;
    case 2:
      return `Execute. The ALU ANDs ${reg(a)} & ${reg(b)} = ${c(v.rd1)} & ${c(v.aluB)} = `
        + `${c(v.aluOut)}; ${reg(a)} ← ${c(v.wd3)}.`;
    case 3:
      return `Execute. S1 puts the ALU's output — ${reg(b)} = ${c(v.addr)} — on the address `
        + `bus; memory returns ${c(v.dataIn)} and S3 steers it into the register file: `
        + `${reg(a)} ← ${c(v.wd3)}.`;
    case 4:
      return `Execute. S1 puts ${reg(b)} = ${c(v.addr)} on the address bus and memwe strobes: `
        + `Mem[${c(v.addr)}] ← ${reg(a)} = ${c(v.dataOut)}.`;
    case 5:
      return [
        `Execute. The ALU inverts every bit: ${reg(a)} ← ~${c(v.rd1)} = ${c(v.wd3)}.`,
        `Execute. The ALU negates: ${reg(a)} ← −${c(v.rd1)} = ${c(v.wd3)} in two's complement.`,
        `Execute. Logical NOT: ${reg(a)} was ${c(v.rd1)}, so ${reg(a)} ← ${c(v.wd3)}.`,
        `Execute. The ALU reads oldPC: ${reg(a)} ← ${c(v.wd3)}, the address of this instruction.`,
      ][b];
    case 6:
      if (b === 3) {
        return `Execute, part 1 of 2. Memory returns the immediate ${c(v.dataIn)} and it latches `
          + `into MA. The counter skips its usual clear at T2: this instruction needs a T3.`;
      }
      return `Execute. PC now points at the immediate byte ${c(v.dataIn)}; S4 feeds it to the `
        + `ALU's B input and ${reg(a)} ← ${c(v.wd3)}. PC steps over it to ${c(v.pcNext)}.`;
    case 7:
      return r === 1
        ? `Nothing to execute. The PC did not move, so the next fetch is this same byte: halted.`
        : `Nothing to do: a branch finishes at T1. The counter clears and the next `
          + `instruction begins.`;
    default:
      return '';
  }
}
