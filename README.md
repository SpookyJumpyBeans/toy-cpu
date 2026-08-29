# Toy CPU — an 8-bit multi-cycle processor in VHDL

A small general-purpose CPU built from the gate level up: register file, ALU, datapath
multiplexing, a hardwired control unit, and a timing sequencer, all written in structural VHDL and
synthesized for a Cyclone V FPGA. No soft-core IP, no inferred processor blocks — every register,
mux, and decoder is an entity in [`rtl/`](rtl).

Coursework project, University of Virginia.

```mermaid
flowchart LR
  subgraph CTRL["controller — hardwired"]
    SEQ["sequencer<br/>2-bit counter → T0..T3"]
    DEC["opcode_decoder<br/>3→8 icode, 2→4 b_fld"]
    CSL["control_signals_logic<br/>sum-of-products"]
    SEQ --> CSL
    DEC --> CSL
  end

  subgraph DP["datapath — 8-bit"]
    PC["PC"] --> INC["+1"]
    INC --> MJ{"MUX_j"}
    MJ --> PC
    PC --> PCP["PC_prev"]
    IR["IR"] --> RF["register file<br/>4 x 8-bit"]
    RF -->|"rd1 = A"| ALU["ALU"]
    RF -->|"rd2"| M4{"MUX4"}
    M4 -->|"B"| ALU
    ALU --> M1{"MUX1"}
    PC --> M1
    M1 --> M2{"MUX2"}
    MA["MA"] --> M2
    M2 --> ADDR["addr_bus"]
    ALU --> M3{"MUX3"}
    M3 --> RF
    ALU -->|"j"| MJ
  end

  MEM[("memory<br/>256 x 8")] -->|data_in| IR
  MEM -->|data_in| M3
  MEM -->|data_in| M4
  MEM -->|data_in| MA
  RF -->|"data_out"| MEM
  ADDR --> MEM
  IR -->|"icode, b_fld"| CTRL
  CSL -->|"S1..S4, IRe, MAe, RFe, PCe, memoe, memwe"| DP
```

---

## Architecture

| | |
|---|---|
| Data width | 8 bits |
| Address width | 8 bits → 256-byte address space |
| Registers | 4 general-purpose (R0–R3), 8 bits each |
| Control | Hardwired — no microcode |
| Cycles per instruction | 3, except indirect load (4) |
| Memory interface | Single shared bus, `memoe` / `memwe` strobes |

**Instruction format.** One byte, no multi-byte opcodes:

```
 7     6  5  4     3  2     1  0
+---+ +----------+ +-----+ +-----+
| r | |  icode   | | rd  | |b_fld|
+---+ +----------+ +-----+ +-----+
```

`rd` selects the destination, which is also the first ALU operand — so the machine is
two-address (`rd ← rd op src`) rather than three-address. `b_fld` doubles as the second
register select and as a sub-opcode for the unary and immediate groups, which is how eight
opcodes cover more than eight operations.

## Instruction set

Derived from [`rtl/alu.vhd`](rtl/alu.vhd) and [`rtl/control_signals_logic.vhd`](rtl/control_signals_logic.vhd):

| icode | b_fld | Operation | Effect |
|---|---|---|---|
| `000` | reg | MOV | `Rd ← Rs` |
| `001` | reg | ADD | `Rd ← Rd + Rs` |
| `010` | reg | AND | `Rd ← Rd AND Rs` |
| `011` | reg | LOAD | `Rd ← Mem[Rs]` |
| `100` | reg | STORE | `Mem[Rs] ← Rd` |
| `101` | `00` | NOT | `Rd ← NOT Rd` |
| `101` | `01` | NEG | `Rd ← −Rd` |
| `101` | `10` | SEQZ | `Rd ← 1 if Rd = 0 else 0` |
| `101` | `11` | RDPC | `Rd ← PC` |
| `110` | `00` | LDI | `Rd ← Mem[PC+1]` (immediate) |
| `110` | `01` | ADDI | `Rd ← Rd + Mem[PC+1]` |
| `110` | `10` | ANDI | `Rd ← Rd AND Mem[PC+1]` |
| `110` | `11` | LDIND | `Rd ← Mem[Mem[PC+1]]` (indirect) |
| `111` | reg | BLEZ | `PC ← Rs` if `Rd ≤ 0`, signed |

## How the control unit works

The sequencer is a 2-bit counter decoded into four one-hot time states, T0–T3. Control signals
are pure sum-of-products over (time state × decoded opcode) — for example:

```vhdl
memoe <= t0 OR (i3 AND t2) OR (i6 AND t2 AND (b0 OR b1 OR b2 OR b3)) OR (i6 AND b3 AND t3);
```

T0 fetches, T1 advances the PC, T2 executes and writes back. The counter clears at T2 for every
instruction *except* the indirect load, which needs T3 to make its second memory access:

```vhdl
clr <= t2 AND NOT(icode = "110" AND b_fld = "11");
```

That one term is the whole variable-length-instruction mechanism. Getting it right was the part
of the design that took the most iteration — an unconditional clear at T2 silently truncates the
indirect load, and the failure shows up as a register holding an address instead of the value at
that address.

The conditional branch is resolved in the ALU rather than the control unit: `j` asserts when the
first operand is zero or negative, and steers `MUX_j` so the PC loads the branch target instead
of PC+1 at T1.

## Verification

Four programs run against a behavioral RAM model ([`tb/ram.vhd`](tb/ram.vhd)) that loads
`address/data` hex text files at time zero, exercising a different path each:

| Program | Exercises |
|---|---|
| [`ProgramData0`](programs/ProgramData0.txt) | Immediate load, minimal smoke test |
| [`ProgramData1`](programs/ProgramData1.txt) | Register-register AND — `0x55 AND 0xFF` |
| [`ProgramData2`](programs/ProgramData2.txt) | Store to a register-held address |
| [`ProgramData3`](programs/ProgramData3.txt) | Indirect load — the 4-cycle path |

Run one in ModelSim from the `sim/` directory:

```bash
vsim -do testbench3.do
```

Each script compiles the RTL in dependency order, elaborates the testbench with the matching
program file, and puts PC, IR, all four registers, and the full memory array on the wave view.

## Synthesis results

Quartus Prime 20.1.1, Cyclone V `5CGXFC7C7F23C8` — full reports in [`reports/`](reports):

| Metric | Value |
|---|---|
| Logic utilization | 73 ALMs of 56,480 (< 1%) |
| Registers | 66 (PC, PC_prev, IR, MA, 4×8 register file, 2-bit counter) |
| Pins | 28 of 268 |
| Block memory / DSP / PLL | none — pure logic and flip-flops |

**On timing:** the project has no `.sdc`, so Quartus fell back to its default 1 ns period and
reports a −6.18 ns setup slack against an implied 1 GHz clock. That number is an artifact of the
missing constraint, not a real closure failure, and no meaningful Fmax should be read from it.
Writing a proper constraint file and reporting an honest Fmax is the first thing this project
needs.

## Known gaps

- **No timing constraints.** See above.
- **`register_file.vhd` exposes `q0_out`–`q3_out`** for waveform debugging that the component
  declaration in `datapath.vhd` does not bind. Legal VHDL — unassociated outputs are left open —
  but it is debug scaffolding that should come out.
- **No assertion-based self-checking.** The testbenches are inspected visually in the wave view;
  they do not pass or fail on their own. Self-checking benches with expected-value assertions
  would make regressions visible without a human reading waveforms.
- **`r` (bit 7) is decoded but barely used** — it suppresses the PC increment and the branch.
  It is effectively dead in all four test programs.

## Repository layout

```
rtl/         synthesizable design - datapath, controller, ALU, register file, primitives
tb/          testbench, behavioral RAM with file loader, clock/reset generation
programs/    test programs as address/data hex text
sim/         ModelSim .do scripts, one per program
quartus/     project (.qpf) and settings (.qsf) files
reports/     synthesis, fitter, and timing summaries
```

## License

MIT — see [LICENSE](LICENSE).
