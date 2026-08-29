library IEEE;
use IEEE.std_logic_1164.all;
use IEEE.numeric_std.all;

entity alu is
  generic (N: integer := 8);
  port(
    a           : in std_logic_vector(N-1 downto 0);
    b           : in std_logic_vector(N-1 downto 0);
    icode       : in std_logic_vector(2 downto 0);
    b_fld       : in std_logic_vector(1 downto 0);
    pc          : in std_logic_vector(N-1 downto 0);
    r           : in std_logic;
    y           : out std_logic_vector(N-1 downto 0);
    pcinc       : out std_logic_vector(N-1 downto 0);
    j           : out std_logic
    );
end alu;

architecture rtl of alu is

  signal a_internal     : unsigned(N-1 downto 0);
  signal b_internal     : unsigned(N-1 downto 0);
  signal y_internal     : unsigned(N-1 downto 0);
  signal pc_internal    : unsigned(N-1 downto 0);
  constant zero         : signed(N-1 downto 0) := (others => '0');
  signal eq             : std_logic;
  signal lt             : std_logic;

begin

  a_input : a_internal <= unsigned(a);
  b_input : b_internal <= unsigned(b);
  pc_input : pc_internal <= unsigned(pc);
  eq <= '1' when (signed(a_internal) = zero) else '0';
  lt <= '1' when (signed(a_internal) < zero) else '0';
  
  y_logic : process(a_internal,b_internal,pc_internal,icode,r,b_fld,eq)
  begin
    case icode is
      when "000" =>
        y_internal <= b_internal;
      when "001" =>
        y_internal <= a_internal + b_internal;
      when "010" =>
        y_internal <= a_internal and b_internal;
      when "011" =>
        y_internal <= b_internal;
      when "100" =>
        y_internal <= b_internal;
      when "101" =>
        case b_fld is
          when "00" =>
            y_internal <= not(a_internal);
          when "01" =>
            y_internal <= unsigned(-(signed(a_internal)));
          when "10" =>
            if (eq = '1') then
              y_internal(0) <= '1';
              y_internal(N-1 downto 1) <= (others => '0');
            else
              y_internal <= (others => '0');
            end if;
          when "11" =>
            y_internal <= pc_internal;
          when others => y_internal <= (others => '0');
        end case;
      when "110" =>
        case b_fld is
          when "00" =>
            y_internal <= b_internal;
          when "01" =>
            y_internal <= a_internal + b_internal;
          when "10" =>
            y_internal <= a_internal and b_internal;
          when "11" =>
            y_internal <= b_internal;
          when others => y_internal <= (others => '0');
        end case;
      when "111" =>
        y_internal <= b_internal;
      when others => y_internal <= (others => '0');
    end case;
  end process;

  y_output : y <= std_logic_vector(y_internal);

  pcinc_logic : process(icode,r)
  begin
    if (r = '1') then
      pcinc <= (others => '0');
    else
      pcinc(0) <= '1';
      pcinc(N-1 downto 1) <= (others => '0');
    end if;
  end process;


  j_logic : process(icode,r,eq,lt)
  begin
    if ((r='0') and ((eq = '1') or (lt = '1')) and (icode = "111")) then
      j <= '1';
    else
      j <= '0';
    end if;
  end process;

end rtl;
