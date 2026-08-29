LIBRARY IEEE ;
USE IEEE.STD_LOGIC_1164.ALL;

ENTITY register_file IS 
  PORT
    (
      reset :  IN  STD_LOGIC;
      clock :  IN  STD_LOGIC;
      a1 :  IN  STD_LOGIC_VECTOR(1 DOWNTO 0);
      a2 :  IN  STD_LOGIC_VECTOR(1 DOWNTO 0);
      a3 :  IN  STD_LOGIC_VECTOR(1 DOWNTO 0);
      we3 :  IN  STD_LOGIC;
      wd3 :  IN  STD_LOGIC_VECTOR(7 DOWNTO 0);
      rd1 :  OUT  STD_LOGIC_VECTOR(7 DOWNTO 0);
      rd2 :  OUT  STD_LOGIC_VECTOR(7 DOWNTO 0);
		    q0_out : OUT STD_LOGIC_VECTOR(7 downto 0);
    q1_out : OUT STD_LOGIC_VECTOR(7 downto 0);
    q2_out : OUT STD_LOGIC_VECTOR(7 downto 0);
    q3_out : OUT STD_LOGIC_VECTOR(7 downto 0)
      );
END register_file;

architecture rtl of register_file is

  component demux_4
    port (
      sel :     in  std_logic_vector(1 downto 0);
      y :       in std_logic;
      out0 :     out std_logic;
      out1 :     out std_logic;
      out2 :     out std_logic;
      out3 :       out std_logic
      );
  end component;
  
  component mux_4
  generic (N : integer);
		port (
			sel :     in  std_logic_vector(1 downto 0);
			in0 :     in std_logic_vector(N-1 downto 0);
			in1 :     in std_logic_vector(N-1 downto 0);
			in2 :     in std_logic_vector(N-1 downto 0);
			in3 :     in std_logic_vector(N-1 downto 0);
			y :       out std_logic_vector(N-1 downto 0)
      );
	end component;
	
	component register_n
	generic (N : integer);
		port (
		 reset :     in std_logic;
		 clock :     in std_logic;
		 enable :    in std_logic;
		 d :         in std_logic_vector(N-1 downto 0);
		 q :         out std_logic_vector(N-1 downto 0)
      );
	end component;
	
	signal we_0, we_1, we_2, we_3 : std_logic;
	signal q0, q1, q2, q3 : std_logic_vector(7 downto 0);
	
begin

we_demux : demux_4
	port map (
	sel => a3,
	y => we3,
	out0 => we_0,
	out1 => we_1,
	out2 => we_2,
	out3 => we_3
	);

-- four registers 

R0 : register_n	
	generic map (N => 8)
	port map (
	reset => reset,
	clock => clock,
	enable => we_0,
	d => wd3,
	q => q0
	);

R1 : register_n	
	generic map (N => 8)
	port map (
	reset => reset,
	clock => clock,
	enable => we_1,
	d => wd3,
	q => q1
	);
	
R2 : register_n	
	generic map (N => 8)
	port map (
	reset => reset,
	clock => clock,
	enable => we_2,
	d => wd3,
	q => q2
	);
	
R3 : register_n	
	generic map (N => 8)
	port map (
	reset => reset,
	clock => clock,
	enable => we_3,
	d => wd3,
	q => q3
	);

-- RD1 and RD2 read operations

RD_1 : mux_4
	generic map (N => 8)
	port map (
		sel => a1,
		in0 => q0,
		in1 => q1,
		in2 => q2, 
		in3 => q3,
		y => rd1
		);

RD_2 : mux_4
	generic map (N => 8)
	port map (
		sel => a2,
		in0 => q0,
		in1 => q1,
		in2 => q2, 
		in3 => q3,
		y => rd2
		);
 
 q0_out <= q0;
q1_out <= q1;
q2_out <= q2;
q3_out <= q3;

end rtl;
