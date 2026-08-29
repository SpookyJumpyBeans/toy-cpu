LIBRARY ieee;
USE ieee.std_logic_1164.all; 

entity mux_4 IS
  generic (N: integer := 8);
  port
    (
      sel :     in  std_logic_vector(1 downto 0);
      in0 :     in std_logic_vector(N-1 downto 0);
      in1 :     in std_logic_vector(N-1 downto 0);
      in2 :     in std_logic_vector(N-1 downto 0);
      in3 :     in std_logic_vector(N-1 downto 0);
      y :       out std_logic_vector(N-1 downto 0)
      );
end mux_4;

architecture rtl of mux_4 is 

begin 

  y <= in3 when (sel = "11") else
       in2 when (sel = "10") else
       in1 when (sel = "01") else in0;

end rtl;
