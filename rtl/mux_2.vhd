LIBRARY ieee;
USE ieee.std_logic_1164.all; 

entity mux_2 IS
  port
    (
      sel :     in  std_logic;
      in0 :     in std_logic_vector(7 downto 0);
      in1 :     in std_logic_vector(7 downto 0);
      y :       out std_logic_vector(7 downto 0)
      );
end mux_2;

architecture rtl of mux_2 is 

	signal not_sel :  STD_LOGIC;

begin 

  not_sel <= not(sel);
  y(7) <= (in1(7) and sel) or (in0(7) and not_sel);
  y(6) <= (in1(6) and sel) or (in0(6) and not_sel);
  y(5) <= (in1(5) and sel) or (in0(5) and not_sel);
  y(4) <= (in1(4) and sel) or (in0(4) and not_sel);
  y(3) <= (in1(3) and sel) or (in0(3) and not_sel);
  y(2) <= (in1(2) and sel) or (in0(2) and not_sel);
  y(1) <= (in1(1) and sel) or (in0(1) and not_sel);
  y(0) <= (in1(0) and sel) or (in0(0) and not_sel);

end rtl;
