// Instruction encoding, shared by the model, the assembler and the UI.
//
//    7     6  5  4     3  2     1  0
//    r      icode        a        b
//
// `a` is the destination and first operand, so the machine is two-address.
// `b` is the second register, or a sub-opcode for the unary and immediate
// groups - which is how eight opcodes cover fourteen operations.

/** `ble r0, r0` with r=1: PCinc is zero, so the PC never moves. The test programs end with it. */
export const HALT = 0xf0;

export function decode(byte) {
  return { r: (byte >> 7) & 1, icode: (byte >> 4) & 7, a: (byte >> 2) & 3, b: byte & 3 };
}

export function encode({ r = 0, icode, a = 0, b = 0 }) {
  return ((r & 1) << 7) | ((icode & 7) << 4) | ((a & 3) << 2) | (b & 3);
}

/** The immediate group reads its operand from the byte after the opcode. */
export const hasImmediate = (byte) => decode(byte).icode === 6;

export const hex = (v) => '0x' + (v & 0xff).toString(16).toUpperCase().padStart(2, '0');

const UNARY = ['not', 'neg', 'lnot', 'rdpc'];
const IMMEDIATE = ['ldi', 'addi', 'andi', 'ldind'];

/** Assembly text for one instruction; `imm` is the following byte when it has one. */
export function disassemble(byte, imm) {
  if (byte === HALT) return 'halt';
  const { r, icode, a, b } = decode(byte);
  const ra = `r${a}`;
  const rb = `r${b}`;
  const v = imm === undefined ? '??' : hex(imm);
  const text = [
    `mov ${ra}, ${rb}`,
    `add ${ra}, ${rb}`,
    `and ${ra}, ${rb}`,
    `ld ${ra}, [${rb}]`,
    `st ${ra}, [${rb}]`,
    `${UNARY[b]} ${ra}`,
    b === 3 ? `ldind ${ra}, [${v}]` : `${IMMEDIATE[b]} ${ra}, ${v}`,
    `ble ${ra}, ${rb}`,
  ][icode];
  return r ? `${text}  ; r=1` : text;
}

/** Register-transfer notation, as in the README's instruction table. */
export function rtl(byte) {
  if (byte === HALT) return 'PC ← PC';
  const { icode, a, b } = decode(byte);
  const A = `R${a}`;
  const B = `R${b}`;
  return [
    `${A} ← ${B}`,
    `${A} ← ${A} + ${B}`,
    `${A} ← ${A} & ${B}`,
    `${A} ← Mem[${B}]`,
    `Mem[${B}] ← ${A}`,
    [`${A} ← ~${A}`, `${A} ← −${A}`, `${A} ← !${A}`, `${A} ← PC`][b],
    [`${A} ← Mem[PC+1]`, `${A} ← ${A} + Mem[PC+1]`,
      `${A} ← ${A} & Mem[PC+1]`, `${A} ← Mem[Mem[PC+1]]`][b],
    `if ${A} ≤ 0: PC ← ${B}`,
  ][icode];
}
