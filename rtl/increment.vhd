library IEEE;
use IEEE.STD_LOGIC_1164.ALL;
use IEEE.numeric_std.all;

entity increment is
  generic (N: integer := 8);
  port (
    a: in std_logic_vector(N-1 downto 0);
    incr: in std_logic_vector(N-1 downto 0);
    q: out std_logic_vector(N-1 downto 0)
    );
end;

architecture rtl of increment is
  signal a_internal : unsigned(N-1 downto 0);
begin
  a_internal <= unsigned(a) + unsigned(incr);
  q <= std_logic_vector(a_internal);
end rtl;
