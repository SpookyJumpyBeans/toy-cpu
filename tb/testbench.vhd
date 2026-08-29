LIBRARY ieee;
USE ieee.std_logic_1164.all; 

ENTITY testbench IS 
	generic (ProgramDataFile : STRING := "ProgramData.txt");
END testbench;

ARCHITECTURE bdf_type OF testbench IS 

  COMPONENT clock_reset_generation
    PORT(		 reset : OUT STD_LOGIC;
                         clock : OUT STD_LOGIC
                         );
  END COMPONENT;

  COMPONENT toy_cpu
    PORT(reset : IN STD_LOGIC;
         clock : IN STD_LOGIC;
         data_in : IN STD_LOGIC_VECTOR(7 DOWNTO 0);
         memoe : OUT STD_LOGIC;
         memwe : OUT STD_LOGIC;
         addr_bus : OUT STD_LOGIC_VECTOR(7 DOWNTO 0);
         data_out : OUT STD_LOGIC_VECTOR(7 DOWNTO 0)
         );
  END COMPONENT;

  COMPONENT ram
    GENERIC (filename : STRING
             );
    PORT(clock : IN STD_LOGIC;
         w : IN STD_LOGIC;
         r : IN STD_LOGIC;
         A : IN STD_LOGIC_VECTOR(7 DOWNTO 0);
         din : IN STD_LOGIC_VECTOR(7 DOWNTO 0);
         dout : OUT STD_LOGIC_VECTOR(7 DOWNTO 0)
         );
  END COMPONENT;

  SIGNAL	addr :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	data_in :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	data_out :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	reset :  STD_LOGIC;
  SIGNAL	clock :  STD_LOGIC;
  SIGNAL	write_enable :  STD_LOGIC;
  SIGNAL	output_enable :  STD_LOGIC;

BEGIN 

  b2v_ClockReset : clock_reset_generation
    PORT MAP(		 reset => reset,
                         clock => clock);

  b2v_CPU : toy_cpu
    PORT MAP(reset => reset,
             clock => clock,
             data_in => data_out,
             memoe => output_enable,
             memwe => write_enable,
             addr_bus => addr,
             data_out => data_in);

  b2v_Memory : ram
    GENERIC MAP(filename => ProgramDataFile)
    PORT MAP(clock => clock,
             w => write_enable,
             r => output_enable,
             A => addr,
             din => data_in,
             dout => data_out);

END bdf_type;
