vcom -2008 -work work {../rtl/d_ff.vhd}
vcom -2008 -work work {../rtl/counter_synchreset.vhd}
vcom -2008 -work work {../rtl/sequencer.vhd}
vcom -2008 -work work {../rtl/opcode_decoder.vhd}
vcom -2008 -work work {../rtl/control_signals_logic.vhd}
vcom -2008 -work work {../rtl/controller.vhd}
vcom -2008 -work work {../rtl/mux_2.vhd}
vcom -2008 -work work {../rtl/mux_4.vhd}
vcom -2008 -work work {../rtl/demux_4.vhd}
vcom -2008 -work work {../rtl/register_n.vhd}
vcom -2008 -work work {../rtl/register_file.vhd}
vcom -2008 -work work {../rtl/increment.vhd}
vcom -2008 -work work {../rtl/alu.vhd}
vcom -2008 -work work {../rtl/datapath.vhd}
vcom -2008 -work work {../rtl/toy_cpu.vhd}
vcom -2008 -work work {../tb/clock_reset_generation.vhd}
vcom -2008 -work work {../tb/ram.vhd}
vcom -2008 -work work {../tb/testbench.vhd}

vsim work.testbench -gProgramDataFile="../programs/ProgramData0.txt"

add wave -position insertpoint  -radix hexadecimal \
sim:/testbench/b2v_CPU/b2v_datapath/b2v_PC/q

add wave -position insertpoint -radix hexadecimal \
sim:/testbench/b2v_CPU/b2v_datapath/b2v_IR/q

add wave -position insertpoint -radix hexadecimal \
sim:/testbench/b2v_CPU/b2v_datapath/b2v_RF/R0/q \
sim:/testbench/b2v_CPU/b2v_datapath/b2v_RF/R1/q \
sim:/testbench/b2v_CPU/b2v_datapath/b2v_RF/R2/q \
sim:/testbench/b2v_CPU/b2v_datapath/b2v_RF/R3/q

add wave -position insertpoint -radix hexadecimal  \
sim:/testbench/b2v_Memory/memory_contents

run 800 ns