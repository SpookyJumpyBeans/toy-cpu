// Built-in programs. The first four are the testbench programs from programs/,
// written as assembly; a test checks they assemble to the same bytes.

export function multiplyProgram(multiplicand = 13, multiplier = 11) {
  const bit = (n) => `; bit ${n}
    mov  r3, r2
    andi r3, ${'0x0' + (1 << n).toString(16).toUpperCase()}      ; isolate the bit: zero or not
    lnot r3              ; 1 if the bit is clear, 0 if set
    lnot r3              ; 0 if clear, 1 if set
    neg  r3              ; 0x00 if clear, 0xFF if set - a mask
    and  r3, r1          ; zero, or the shifted multiplicand
    add  r0, r3          ; accumulate${n < 3 ? `
    add  r1, r1          ; shift the multiplicand left` : ''}`;
  return `; ${multiplicand} x ${multiplier} by shift-and-add, with no multiply instruction
; and no branches. For each bit of the multiplier, turn the bit into a mask -
; 0xFF if set, 0x00 if clear - and add (multiplicand AND mask). The machine has
; no shift instruction, so "shift left" is adding a register to itself.
;
; r0 = product, r1 = multiplicand, r2 = multiplier (4 bits), r3 = scratch
    ldi  r1, ${multiplicand}
    ldi  r2, ${multiplier}
${[0, 1, 2, 3].map(bit).join('\n')}
    halt                 ; r0 = ${multiplicand * multiplier}
`;
}

export const PROGRAMS = [
  {
    id: 'multiply',
    name: 'Multiply 13 × 11',
    blurb: 'Shift-and-add with no branches: each multiplier bit becomes a 0x00/0xFF mask.',
    source: multiplyProgram(13, 11),
  },
  {
    id: 'sum',
    name: 'Sum 5 down to 0',
    blurb: 'A real loop. BLE jumps when its register is ≤ 0, so the counter runs up from -5.',
    source: `; 5 + 4 + 3 + 2 + 1 + 0 with a loop.
; BLE branches when its register is <= 0, which makes it a natural "keep going"
; test for a counter climbing from -5 to 0.
;
; r0 = sum, r1 = counter, r2 = loop address, r3 = scratch
    ldi  r1, -5          ; counter
    ldi  r2, loop        ; branches jump to an address held in a register
loop:
    mov  r3, r1
    neg  r3              ; the term to add is -counter
    add  r0, r3          ; sum += term
    addi r1, 1           ; counter++
    ble  r1, r2          ; counter <= 0 ? go round again
    halt                 ; r0 = 15
`,
  },
  {
    id: 'program0',
    name: 'ProgramData0 — smoke test',
    blurb: 'Immediate load, then a register copy. Testbench program 0.',
    source: `; programs/ProgramData0.txt - immediate load, minimal smoke test
    ldi r1, 0x14         ; 64 14
    mov r2, r1           ; 09
    halt                 ; F0
`,
  },
  {
    id: 'program1',
    name: 'ProgramData1 — register AND',
    blurb: '0x55 AND 0xFF, register to register. Testbench program 1.',
    source: `; programs/ProgramData1.txt - register-register AND
    ldi r1, 0x55         ; 64 55
    ldi r2, 0xFF         ; 68 FF
    and r2, r1           ; 29  r2 = 0xFF & 0x55
    halt                 ; F0
`,
  },
  {
    id: 'program2',
    name: 'ProgramData2 — store',
    blurb: 'Store to a register-held address. Testbench program 2.',
    source: `; programs/ProgramData2.txt - store to a register-held address
    ldi r1, 0x24         ; 64 24
    ldi r2, 0x48         ; 68 48
    st  r1, [r2]         ; 46  Mem[0x48] = 0x24
    halt                 ; F0
`,
  },
  {
    id: 'program3',
    name: 'ProgramData3 — indirect load',
    blurb: 'The only 4-cycle instruction: watch the counter skip its clear at T2. Testbench program 3.',
    source: `; programs/ProgramData3.txt - indirect load, the 4-cycle path
    ldi   r1, 0x48       ; 64 48
    ldi   r2, 0x67       ; 68 67
    st    r1, [r2]       ; 46  Mem[0x67] = 0x48
    ldind r3, [0x67]     ; 6F 67  r3 = Mem[0x67]
    halt                 ; F0
`,
  },
];
