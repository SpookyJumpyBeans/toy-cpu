LIBRARY ieee;
USE ieee.std_logic_1164.all; 

LIBRARY work;

ENTITY opcode_decoder IS 
  PORT
    (
      icode :  IN  STD_LOGIC_VECTOR(2 DOWNTO 0);
      b_fld :  IN  STD_LOGIC_VECTOR(1 DOWNTO 0);
      i0 :  OUT  STD_LOGIC;
      i1 :  OUT  STD_LOGIC;
      i2 :  OUT  STD_LOGIC;
      i3 :  OUT  STD_LOGIC;
      i4 :  OUT  STD_LOGIC;
      i5 :  OUT  STD_LOGIC;
      i6 :  OUT  STD_LOGIC;
      i7 :  OUT  STD_LOGIC;
      b0 :  OUT  STD_LOGIC;
      b1 :  OUT  STD_LOGIC;
      b2 :  OUT  STD_LOGIC;
      b3 :  OUT  STD_LOGIC
      );
END opcode_decoder;

ARCHITECTURE opd OF opcode_decoder IS
BEGIN

	
  i0 <= (NOT icode(2)) AND (NOT icode(1)) AND (NOT icode(0)); -- 000
  i1 <= (NOT icode(2)) AND (NOT icode(1)) AND       icode(0); -- 001
  i2 <= (NOT icode(2)) AND       icode(1)  AND (NOT icode(0)); -- 010
  i3 <= (NOT icode(2)) AND       icode(1)  AND       icode(0); -- 011
  i4 <=       icode(2)  AND (NOT icode(1)) AND (NOT icode(0)); -- 100
  i5 <=       icode(2)  AND (NOT icode(1)) AND       icode(0); -- 101
  i6 <=       icode(2)  AND       icode(1)  AND (NOT icode(0)); -- 110
  i7 <=       icode(2)  AND       icode(1)  AND       icode(0); -- 111
	 
 b0 <= (NOT b_fld(1)) AND (NOT b_fld(0)); -- 00
  b1 <= (NOT b_fld(1)) AND       b_fld(0); -- 01
  b2 <=       b_fld(1)  AND (NOT b_fld(0)); -- 10
  b3 <=       b_fld(1)  AND       b_fld(0); -- 11
	
END opd;