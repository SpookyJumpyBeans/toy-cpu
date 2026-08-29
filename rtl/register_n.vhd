LIBRARY IEEE ;
USE IEEE.STD_LOGIC_1164.ALL;

entity register_n is
  generic (N: integer := 8);
  port (
    reset :     in std_logic;
    clock :     in std_logic;
    enable :    in std_logic;
    d :         in std_logic_vector(N-1 downto 0);
    q :         out std_logic_vector(N-1 downto 0)
    );
end register_n;

architecture rtl of register_n is

  signal q_internal : std_logic_vector(N-1 downto 0);
  signal q_next : std_logic_vector(N-1 downto 0);

begin
  
  current_state: process (clock, reset)
  begin
    if (reset = '1') then
      q_internal <= (others => '0');
    elsif rising_edge(clock) then
      q_internal <= q_next;
    end if;
  end process;

  next_state : process(enable,q_internal,d)
  begin
    if (enable = '1') then
      q_next <= d;
    else
      q_next <= q_internal;
    end if;
  end process next_state;

  output_process: q <= q_internal;

end rtl;
