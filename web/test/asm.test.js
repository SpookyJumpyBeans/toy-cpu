import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assemble } from '../src/asm.js';
import { disassemble, hasImmediate } from '../src/isa.js';

const bytes = (source) => {
  const { memory, errors } = assemble(source);
  assert.deepEqual(errors, []);
  return memory;
};

test('encodes every operation in the instruction set', () => {
  const cases = [
    ['mov r2, r1', [0x09]],
    ['add r0, r3', [0x13]],
    ['and r2, r1', [0x29]],
    ['ld r2, [r1]', [0x39]],
    ['st r1, [r2]', [0x46]],
    ['not r1', [0x54]],
    ['neg r1', [0x55]],
    ['lnot r1', [0x56]],
    ['rdpc r1', [0x57]],
    ['ldi r1, 0x55', [0x64, 0x55]],
    ['addi r1, 1', [0x65, 0x01]],
    ['andi r1, 0x0F', [0x66, 0x0f]],
    ['ldind r3, [0x67]', [0x6f, 0x67]],
    ['ble r1, r2', [0x76]],
    ['halt', [0xf0]],
    ['nop', [0x00]],
  ];
  for (const [src, expected] of cases) {
    assert.deepEqual([...bytes(src).slice(0, expected.length)], expected, src);
  }
});

test('immediates accept hex, binary, decimal and negative decimal', () => {
  assert.equal(bytes('ldi r0, 0x7f')[1], 0x7f);
  assert.equal(bytes('ldi r0, 0b1010')[1], 10);
  assert.equal(bytes('ldi r0, 200')[1], 200);
  assert.equal(bytes('ldi r0, -5')[1], 0xfb);
  assert.equal(bytes('ldi r0, -0b101')[1], 0xfb);
});

test('labels resolve forwards and backwards', () => {
  const mem = bytes(`
    ldi r2, end
  start:
    ldi r3, start
  end:
    halt`);
  assert.equal(mem[1], 4);   // end
  assert.equal(mem[3], 2);   // start
});

test('.org and .byte place data', () => {
  const mem = bytes('ldind r0, [data]\nhalt\n.org 0x40\ndata: .byte 7, 0xAA');
  assert.equal(mem[1], 0x40);
  assert.equal(mem[0x40], 7);
  assert.equal(mem[0x41], 0xaa);
});

test('reports errors with line numbers and keeps going', () => {
  const { errors } = assemble('ldi r1, 5\nfrob r1\nmov r4, r1\nldi r1, 300\nldi r1, nowhere');
  assert.deepEqual(errors.map((e) => e.line), [2, 3, 4, 5]);
  assert.match(errors[0].message, /unknown instruction 'frob'/);
  assert.match(errors[1].message, /r0-r3/);
  assert.match(errors[2].message, /does not fit/);
  assert.match(errors[3].message, /undefined label 'nowhere'/);
});

test('rejects operand-count mistakes, duplicate labels and overlaps', () => {
  assert.match(assemble('add r1').errors[0].message, /takes 2 operands/);
  assert.match(assemble('halt r1').errors[0].message, /takes 0 operands/);
  assert.match(assemble('a: nop\na: nop').errors[0].message, /defined twice/);
  assert.match(assemble('nop\n.org 0\nnop').errors[0].message, /overlaps/);
  assert.match(assemble('.org 0xFF\nldi r0, 1').errors[0].message, /past the end/);
});

test('the listing maps each statement to its address and source line', () => {
  const { listing } = assemble('; header\nldi r1, 3\nloop: add r0, r1\n.byte 9');
  assert.deepEqual(listing.map((l) => [l.addr, l.line, l.kind]),
    [[0, 2, 'code'], [2, 3, 'code'], [3, 4, 'data']]);
});

test('disassembly round-trips through the assembler', () => {
  for (let op = 0; op < 256; op++) {
    const imm = hasImmediate(op) ? 0x42 : undefined;
    const text = disassemble(op, imm).replace(/\s*;.*$/, '');
    if (op & 0x80 && op !== 0xf0) continue;   // r=1 has no mnemonic of its own
    const mem = bytes(text);
    assert.equal(mem[0], op, text);
    if (imm !== undefined) assert.equal(mem[1], imm, text);
  }
});
