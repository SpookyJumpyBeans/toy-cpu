LIBRARY IEEE ;
USE IEEE.STD_LOGIC_1164.ALL;

entity d_ff is
  port (
    reset : in std_logic;
    clock : in std_logic;
    d : in std_logic;
    q : out std_logic
    );
end d_ff;

architecture rtl of d_ff is

begin
  
  current_state: process (clock, reset)
  begin
    if (reset = '1') then
      q <= '0';
    elsif rising_edge(clock) then
      q <= d;
    end if;
  end process;

end rtl;
