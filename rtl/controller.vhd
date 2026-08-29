-- Copyright (C) 2020  Intel Corporation. All rights reserved.
-- Your use of Intel Corporation's design tools, logic functions 
-- and other software and tools, and any partner logic 
-- functions, and any output files from any of the foregoing 
-- (including device programming or simulation files), and any 
-- associated documentation or information are expressly subject 
-- to the terms and conditions of the Intel Program License 
-- Subscription Agreement, the Intel Quartus Prime License Agreement,
-- the Intel FPGA IP License Agreement, or other applicable license
-- agreement, including, without limitation, that your use is for
-- the sole purpose of programming logic devices manufactured by
-- Intel and sold by Intel or its authorized distributors.  Please
-- refer to the applicable agreement for further details, at
-- https://fpgasoftware.intel.com/eula.

-- PROGRAM		"Quartus Prime"
-- VERSION		"Version 20.1.1 Build 720 11/11/2020 SJ Lite Edition"
-- CREATED		"Thu Nov 13 22:13:22 2025"

LIBRARY ieee;
USE ieee.std_logic_1164.all; 

LIBRARY work;

ENTITY controller IS 
	PORT
	(
		reset :  IN  STD_LOGIC;
		clock :  IN  STD_LOGIC;
		b_fld :  IN  STD_LOGIC_VECTOR(1 DOWNTO 0);
		icode :  IN  STD_LOGIC_VECTOR(2 DOWNTO 0);
		pce :  OUT  STD_LOGIC;
		ire :  OUT  STD_LOGIC;
		rfe :  OUT  STD_LOGIC;
		mae :  OUT  STD_LOGIC;
		memwe :  OUT  STD_LOGIC;
		memoe :  OUT  STD_LOGIC;
		s1 :  OUT  STD_LOGIC;
		s2 :  OUT  STD_LOGIC;
		s3 :  OUT  STD_LOGIC;
		s4 :  OUT  STD_LOGIC
	);
END controller;

ARCHITECTURE bdf_type OF controller IS 

COMPONENT sequencer
	PORT(reset : IN STD_LOGIC;
		 clock : IN STD_LOGIC;
		 b_fld : IN STD_LOGIC_VECTOR(1 DOWNTO 0);
		 icode : IN STD_LOGIC_VECTOR(2 DOWNTO 0);
		 t0 : OUT STD_LOGIC;
		 t1 : OUT STD_LOGIC;
		 t2 : OUT STD_LOGIC;
		 t3 : OUT STD_LOGIC
	);
END COMPONENT;

COMPONENT opcode_decoder
	PORT(b_fld : IN STD_LOGIC_VECTOR(1 DOWNTO 0);
		 icode : IN STD_LOGIC_VECTOR(2 DOWNTO 0);
		 i0 : OUT STD_LOGIC;
		 i1 : OUT STD_LOGIC;
		 i2 : OUT STD_LOGIC;
		 i3 : OUT STD_LOGIC;
		 i4 : OUT STD_LOGIC;
		 i5 : OUT STD_LOGIC;
		 i6 : OUT STD_LOGIC;
		 i7 : OUT STD_LOGIC;
		 b0 : OUT STD_LOGIC;
		 b1 : OUT STD_LOGIC;
		 b2 : OUT STD_LOGIC;
		 b3 : OUT STD_LOGIC
	);
END COMPONENT;

COMPONENT control_signals_logic
	PORT(t0 : IN STD_LOGIC;
		 t1 : IN STD_LOGIC;
		 t2 : IN STD_LOGIC;
		 t3 : IN STD_LOGIC;
		 i0 : IN STD_LOGIC;
		 i1 : IN STD_LOGIC;
		 i2 : IN STD_LOGIC;
		 i3 : IN STD_LOGIC;
		 i4 : IN STD_LOGIC;
		 i5 : IN STD_LOGIC;
		 i6 : IN STD_LOGIC;
		 i7 : IN STD_LOGIC;
		 b0 : IN STD_LOGIC;
		 b1 : IN STD_LOGIC;
		 b2 : IN STD_LOGIC;
		 b3 : IN STD_LOGIC;
		 pce : OUT STD_LOGIC;
		 ire : OUT STD_LOGIC;
		 rfe : OUT STD_LOGIC;
		 mae : OUT STD_LOGIC;
		 memwe : OUT STD_LOGIC;
		 memoe : OUT STD_LOGIC;
		 s1 : OUT STD_LOGIC;
		 s2 : OUT STD_LOGIC;
		 s3 : OUT STD_LOGIC;
		 s4 : OUT STD_LOGIC
	);
END COMPONENT;

SIGNAL	SYNTHESIZED_WIRE_0 :  STD_LOGIC;
SIGNAL	SYNTHESIZED_WIRE_1 :  STD_LOGIC;
SIGNAL	SYNTHESIZED_WIRE_2 :  STD_LOGIC;
SIGNAL	SYNTHESIZED_WIRE_3 :  STD_LOGIC;
SIGNAL	SYNTHESIZED_WIRE_4 :  STD_LOGIC;
SIGNAL	SYNTHESIZED_WIRE_5 :  STD_LOGIC;
SIGNAL	SYNTHESIZED_WIRE_6 :  STD_LOGIC;
SIGNAL	SYNTHESIZED_WIRE_7 :  STD_LOGIC;
SIGNAL	SYNTHESIZED_WIRE_8 :  STD_LOGIC;
SIGNAL	SYNTHESIZED_WIRE_9 :  STD_LOGIC;
SIGNAL	SYNTHESIZED_WIRE_10 :  STD_LOGIC;
SIGNAL	SYNTHESIZED_WIRE_11 :  STD_LOGIC;
SIGNAL	SYNTHESIZED_WIRE_12 :  STD_LOGIC;
SIGNAL	SYNTHESIZED_WIRE_13 :  STD_LOGIC;
SIGNAL	SYNTHESIZED_WIRE_14 :  STD_LOGIC;
SIGNAL	SYNTHESIZED_WIRE_15 :  STD_LOGIC;


BEGIN 



b2v_inst : sequencer
PORT MAP(reset => reset,
		 clock => clock,
		 b_fld => b_fld,
		 icode => icode,
		 t0 => SYNTHESIZED_WIRE_0,
		 t1 => SYNTHESIZED_WIRE_1,
		 t2 => SYNTHESIZED_WIRE_2,
		 t3 => SYNTHESIZED_WIRE_3);


b2v_inst2 : opcode_decoder
PORT MAP(b_fld => b_fld,
		 icode => icode,
		 i0 => SYNTHESIZED_WIRE_4,
		 i1 => SYNTHESIZED_WIRE_5,
		 i2 => SYNTHESIZED_WIRE_6,
		 i3 => SYNTHESIZED_WIRE_7,
		 i4 => SYNTHESIZED_WIRE_8,
		 i5 => SYNTHESIZED_WIRE_9,
		 i6 => SYNTHESIZED_WIRE_10,
		 i7 => SYNTHESIZED_WIRE_11,
		 b0 => SYNTHESIZED_WIRE_12,
		 b1 => SYNTHESIZED_WIRE_13,
		 b2 => SYNTHESIZED_WIRE_14,
		 b3 => SYNTHESIZED_WIRE_15);


b2v_inst3 : control_signals_logic
PORT MAP(t0 => SYNTHESIZED_WIRE_0,
		 t1 => SYNTHESIZED_WIRE_1,
		 t2 => SYNTHESIZED_WIRE_2,
		 t3 => SYNTHESIZED_WIRE_3,
		 i0 => SYNTHESIZED_WIRE_4,
		 i1 => SYNTHESIZED_WIRE_5,
		 i2 => SYNTHESIZED_WIRE_6,
		 i3 => SYNTHESIZED_WIRE_7,
		 i4 => SYNTHESIZED_WIRE_8,
		 i5 => SYNTHESIZED_WIRE_9,
		 i6 => SYNTHESIZED_WIRE_10,
		 i7 => SYNTHESIZED_WIRE_11,
		 b0 => SYNTHESIZED_WIRE_12,
		 b1 => SYNTHESIZED_WIRE_13,
		 b2 => SYNTHESIZED_WIRE_14,
		 b3 => SYNTHESIZED_WIRE_15,
		 pce => pce,
		 ire => ire,
		 rfe => rfe,
		 mae => mae,
		 memwe => memwe,
		 memoe => memoe,
		 s1 => s1,
		 s2 => s2,
		 s3 => s3,
		 s4 => s4);


END bdf_type;