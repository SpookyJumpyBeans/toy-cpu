LIBRARY ieee;
USE ieee.std_logic_1164.all; 

entity demux_4 IS
  port
    (
      sel :     in  std_logic_vector(1 downto 0);
      y :       in std_logic;
      out0 :     out std_logic;
      out1 :     out std_logic;
      out2 :     out std_logic;
      out3 :       out std_logic
      );
end demux_4;

architecture rtl of demux_4 is 

begin 

  out0 <= y when (sel = "00") else '0';
  out1 <= y when (sel = "01") else '0';
  out2 <= y when (sel = "10") else '0';
  out3 <= y when (sel = "11") else '0';

end rtl;
