LIBRARY ieee;
USE ieee.std_logic_1164.all; 

ENTITY datapath IS 
  PORT
    (
      reset :  IN  STD_LOGIC;
      clock :  IN  STD_LOGIC;
      S1 :  IN  STD_LOGIC;
      S2 :  IN  STD_LOGIC;
      S3 :  IN  STD_LOGIC;
      S4 :  IN  STD_LOGIC;
      IRe :  IN  STD_LOGIC;
      MAe :  IN  STD_LOGIC;
      RFe :  IN  STD_LOGIC;
      PCe :  IN  STD_LOGIC;
      data_in :  IN  STD_LOGIC_VECTOR(7 DOWNTO 0);
      addr_bus :  OUT  STD_LOGIC_VECTOR(7 DOWNTO 0);
      data_out :  OUT  STD_LOGIC_VECTOR(7 DOWNTO 0);
      icode :  OUT  STD_LOGIC_VECTOR(2 DOWNTO 0);
      b_fld :  OUT  STD_LOGIC_VECTOR(1 DOWNTO 0)
      );
END datapath;

ARCHITECTURE bdf_type OF datapath IS 

  COMPONENT alu
    GENERIC (N : INTEGER
             );
    PORT(r : IN STD_LOGIC;
         a : IN STD_LOGIC_VECTOR(7 DOWNTO 0);
         b : IN STD_LOGIC_VECTOR(7 DOWNTO 0);
         b_fld : IN STD_LOGIC_VECTOR(1 DOWNTO 0);
         icode : IN STD_LOGIC_VECTOR(2 DOWNTO 0);
         pc : IN STD_LOGIC_VECTOR(7 DOWNTO 0);
         j : OUT STD_LOGIC;
         pcinc : OUT STD_LOGIC_VECTOR(7 DOWNTO 0);
         y : OUT STD_LOGIC_VECTOR(7 DOWNTO 0)
         );
  END COMPONENT;

  COMPONENT increment
    GENERIC (N : INTEGER
             );
    PORT(a : IN STD_LOGIC_VECTOR(7 DOWNTO 0);
         incr : IN STD_LOGIC_VECTOR(7 DOWNTO 0);
         q : OUT STD_LOGIC_VECTOR(7 DOWNTO 0)
         );
  END COMPONENT;

  COMPONENT register_n
    GENERIC (N : INTEGER
             );
    PORT(reset : IN STD_LOGIC;
         clock : IN STD_LOGIC;
         enable : IN STD_LOGIC;
         d : IN STD_LOGIC_VECTOR(7 DOWNTO 0);
         q : OUT STD_LOGIC_VECTOR(7 DOWNTO 0)
         );
  END COMPONENT;

  COMPONENT mux_2
    PORT(sel : IN STD_LOGIC;
         in0 : IN STD_LOGIC_VECTOR(7 DOWNTO 0);
         in1 : IN STD_LOGIC_VECTOR(7 DOWNTO 0);
         y : OUT STD_LOGIC_VECTOR(7 DOWNTO 0)
         );
  END COMPONENT;

  COMPONENT register_file
    PORT(reset : IN STD_LOGIC;
         clock : IN STD_LOGIC;
         we3 : IN STD_LOGIC;
         a1 : IN STD_LOGIC_VECTOR(1 DOWNTO 0);
         a2 : IN STD_LOGIC_VECTOR(1 DOWNTO 0);
         a3 : IN STD_LOGIC_VECTOR(1 DOWNTO 0);
         wd3 : IN STD_LOGIC_VECTOR(7 DOWNTO 0);
         rd1 : OUT STD_LOGIC_VECTOR(7 DOWNTO 0);
         rd2 : OUT STD_LOGIC_VECTOR(7 DOWNTO 0)
         );
  END COMPONENT;

  SIGNAL	Addr :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	alu_A :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	alu_B :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	ALUout :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	IncrPCout :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	IRout :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	M1out :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	M2out :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	M3out :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	Mjout :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	PCinc :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	PCnext :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	PCout :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	PCprev :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	SYNTHESIZED_WIRE_0 :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	SYNTHESIZED_WIRE_1 :  STD_LOGIC_VECTOR(7 DOWNTO 0);
  SIGNAL	SYNTHESIZED_WIRE_2 :  STD_LOGIC;


BEGIN 



  b2v_ALU : alu
    GENERIC MAP(N => 8
                )
    PORT MAP(r => IRout(7),
             a => alu_A,
             b => alu_B,
             b_fld => IRout(1 DOWNTO 0),
             icode => IRout(6 DOWNTO 4),
             pc => PCprev,
             j => SYNTHESIZED_WIRE_2,
             pcinc => PCinc,
             y => ALUout);


  b2v_IncrPC : increment
    GENERIC MAP(N => 8
                )
    PORT MAP(a => PCout,
             incr => PCinc,
             q => IncrPCout);




  b2v_IR : register_n
    GENERIC MAP(N => 8
                )
    PORT MAP(reset => reset,
             clock => clock,
             enable => IRe,
             d => data_in,
             q => IRout);


  b2v_MA : register_n
    GENERIC MAP(N => 8
                )
    PORT MAP(reset => reset,
             clock => clock,
             enable => MAe,
             d => data_in,
             q => Addr);


  b2v_MUX1 : mux_2
    PORT MAP(sel => S1,
             in0 => PCout,
             in1 => ALUout,
             y => M1out);


  b2v_MUX2 : mux_2
    PORT MAP(sel => S2,
             in0 => M1out,
             in1 => Addr,
             y => addr_bus);


  b2v_MUX3 : mux_2
    PORT MAP(sel => S3,
             in0 => ALUout,
             in1 => data_in,
             y => M3out);


  b2v_MUX4 : mux_2
    PORT MAP(sel => S4,
             in0 => SYNTHESIZED_WIRE_1,
             in1 => data_in,
             y => alu_B);

	data_out <= alu_A;


  b2v_MUX_j : mux_2
    PORT MAP(sel => SYNTHESIZED_WIRE_2,
             in0 => IncrPCout,
             in1 => ALUout,
             y => PCnext);


  b2v_PC : register_n
    GENERIC MAP(N => 8
                )
    PORT MAP(reset => reset,
             clock => clock,
             enable => PCe,
             d => PCnext,
             q => PCout);


  b2v_PCold : register_n
    GENERIC MAP(N => 8
                )
    PORT MAP(reset => reset,
             clock => clock,
             enable => PCe,
             d => PCout,
             q => PCprev);


  b2v_RF : register_file
    PORT MAP(reset => reset,
             clock => clock,
             we3 => RFe,
             a1 => IRout(3 DOWNTO 2),
             a2 => IRout(1 DOWNTO 0),
             a3 => IRout(3 DOWNTO 2),
             wd3 => M3out,
             rd1 => alu_A,
             rd2 => SYNTHESIZED_WIRE_1);



  -- r <= IRout(7);
  b_fld(1 DOWNTO 0) <= IRout(1 DOWNTO 0);
  icode(2 DOWNTO 0) <= IRout(6 DOWNTO 4);

END bdf_type;
