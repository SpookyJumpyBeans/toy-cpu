// A two-pass assembler for the toy ISA.
//
//   label:                 a name for the current address
//   ldi   r1, 0x55         ; comments run from ';' to end of line
//   ldind r3, [data]       ; labels work anywhere an immediate does
//   ble   r1, r2           ; branch target comes from a register
//   .org  0x48             ; continue assembling at this address
//   .byte 1, 2, 0xFF       ; raw data
//
// Branches jump to an address held in a register, so a loop loads its own
// address into one first: `ldi r2, loop` then `ble r1, r2`.

import { HALT, encode } from './isa.js';

const REG_OPS = { mov: 0, add: 1, and: 2, ble: 7 };
const MEM_OPS = { ld: 3, st: 4 };
const UNARY_OPS = { not: 0, neg: 1, lnot: 2, rdpc: 3 };
const IMM_OPS = { ldi: 0, addi: 1, andi: 2 };

class AsmError extends Error {}

function parseRegister(token) {
  const m = /^r([0-3])$/i.exec(token ?? '');
  if (!m) throw new AsmError(`expected a register r0-r3, got '${token ?? ''}'`);
  return Number(m[1]);
}

function parseBracketed(token, what) {
  const m = /^\[(.+)\]$/.exec(token ?? '');
  if (!m) throw new AsmError(`expected [${what}], got '${token ?? ''}'`);
  return m[1].trim();
}

function parseNumber(token) {
  const t = token.trim();
  let value;
  if (/^-?0x[0-9a-f]+$/i.test(t)) value = parseInt(t, 16);
  else if (/^-?0b[01]+$/i.test(t)) value = parseInt(t.replace(/0b/i, ''), 2);
  else if (/^-?\d+$/.test(t)) value = parseInt(t, 10);
  else return null;
  return value;
}

function resolveByte(token, labels) {
  if (token === undefined || token === '') throw new AsmError('missing operand');
  const n = parseNumber(token);
  if (n !== null) {
    if (n < -128 || n > 255) throw new AsmError(`${token} does not fit in a byte`);
    return n & 0xff;
  }
  if (!/^[a-z_]\w*$/i.test(token)) throw new AsmError(`bad operand '${token}'`);
  if (!labels.has(token)) throw new AsmError(`undefined label '${token}'`);
  return labels.get(token);
}

function splitOperands(rest) {
  if (!rest.trim()) return [];
  return rest.split(',').map((s) => s.trim());
}

/** Bytes an instruction or directive occupies, without resolving labels. */
function sizeOf(mnemonic, operands) {
  if (mnemonic === '.byte') return operands.length;
  if (mnemonic in IMM_OPS || mnemonic === 'ldind') return 2;
  return 1;
}

function expectCount(mnemonic, operands, n) {
  if (operands.length !== n) {
    throw new AsmError(`${mnemonic} takes ${n} operand${n === 1 ? '' : 's'}, got ${operands.length}`);
  }
}

function encodeLine(mnemonic, operands, labels) {
  if (mnemonic === 'halt') { expectCount(mnemonic, operands, 0); return [HALT]; }
  if (mnemonic === 'nop') { expectCount(mnemonic, operands, 0); return [0x00]; }
  if (mnemonic === '.byte') {
    if (operands.length === 0) throw new AsmError('.byte needs at least one value');
    return operands.map((o) => resolveByte(o, labels));
  }
  if (mnemonic in REG_OPS) {
    expectCount(mnemonic, operands, 2);
    return [encode({ icode: REG_OPS[mnemonic], a: parseRegister(operands[0]), b: parseRegister(operands[1]) })];
  }
  if (mnemonic in MEM_OPS) {
    expectCount(mnemonic, operands, 2);
    const b = parseRegister(parseBracketed(operands[1], 'register'));
    return [encode({ icode: MEM_OPS[mnemonic], a: parseRegister(operands[0]), b })];
  }
  if (mnemonic in UNARY_OPS) {
    expectCount(mnemonic, operands, 1);
    return [encode({ icode: 5, a: parseRegister(operands[0]), b: UNARY_OPS[mnemonic] })];
  }
  if (mnemonic in IMM_OPS) {
    expectCount(mnemonic, operands, 2);
    return [encode({ icode: 6, a: parseRegister(operands[0]), b: IMM_OPS[mnemonic] }),
      resolveByte(operands[1], labels)];
  }
  if (mnemonic === 'ldind') {
    expectCount(mnemonic, operands, 2);
    return [encode({ icode: 6, a: parseRegister(operands[0]), b: 3 }),
      resolveByte(parseBracketed(operands[1], 'address'), labels)];
  }
  throw new AsmError(`unknown instruction '${mnemonic}'`);
}

/**
 * Assemble source text into a 256-byte memory image.
 * Returns { memory, listing, labels, errors }; `errors` is empty on success.
 */
export function assemble(source) {
  const errors = [];
  const labels = new Map();
  const statements = [];

  // Pass 1: find every label's address and every statement's size.
  let addr = 0;
  source.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    let text = raw.replace(/;.*$/, '').trim();
    try {
      const labelMatch = /^([a-z_]\w*)\s*:\s*(.*)$/i.exec(text);
      if (labelMatch) {
        const name = labelMatch[1];
        if (labels.has(name)) throw new AsmError(`label '${name}' is defined twice`);
        labels.set(name, addr);
        text = labelMatch[2];
      }
      if (!text) return;
      const [head, ...restParts] = text.split(/\s+/);
      const mnemonic = head.toLowerCase();
      const operands = splitOperands(restParts.join(' '));
      if (mnemonic === '.org') {
        expectCount(mnemonic, operands, 1);
        const target = parseNumber(operands[0]);
        if (target === null || target < 0 || target > 255) throw new AsmError(`.org needs an address 0-255`);
        addr = target;
        return;
      }
      const size = sizeOf(mnemonic, operands);
      statements.push({ line, addr, mnemonic, operands, source: raw.trim() });
      addr += size;
    } catch (err) {
      if (!(err instanceof AsmError)) throw err;
      errors.push({ line, message: err.message });
    }
  });

  // Pass 2: encode, now that every label has an address.
  const memory = new Uint8Array(256);
  const owner = new Array(256).fill(null);
  const listing = [];
  for (const st of statements) {
    try {
      const bytes = encodeLine(st.mnemonic, st.operands, labels);
      bytes.forEach((value, i) => {
        const at = st.addr + i;
        if (at > 255) throw new AsmError('program runs past the end of memory (0xFF)');
        if (owner[at] !== null) throw new AsmError(`overlaps line ${owner[at]} at address ${at}`);
        owner[at] = st.line;
        memory[at] = value;
      });
      listing.push({
        addr: st.addr,
        bytes,
        line: st.line,
        source: st.source,
        kind: st.mnemonic === '.byte' ? 'data' : 'code',
      });
    } catch (err) {
      if (!(err instanceof AsmError)) throw err;
      errors.push({ line: st.line, message: err.message });
    }
  }
  errors.sort((x, y) => x.line - y.line);
  return { memory, listing, labels, errors };
}
