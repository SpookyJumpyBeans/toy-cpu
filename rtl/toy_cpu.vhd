LIBRARY ieee;
USE ieee.std_logic_1164.all; 

ENTITY toy_cpu IS 
  PORT
    (
      reset :  IN  STD_LOGIC;
      clock :  IN  STD_LOGIC;
      data_in :  IN  STD_LOGIC_VECTOR(7 DOWNTO 0);
      memoe :  OUT  STD_LOGIC;
      memwe :  OUT  STD_LOGIC;
      addr_bus :  OUT  STD_LOGIC_VECTOR(7 DOWNTO 0);
      data_out :  OUT  STD_LOGIC_VECTOR(7 DOWNTO 0)
      );
END toy_cpu;

ARCHITECTURE bdf_type OF toy_cpu IS 

  COMPONENT controller
    PORT(reset : IN STD_LOGIC;
         clock : IN STD_LOGIC;
         b_fld : IN STD_LOGIC_VECTOR(1 DOWNTO 0);
         icode : IN STD_LOGIC_VECTOR(2 DOWNTO 0);
         s1 : OUT STD_LOGIC;
         s2 : OUT STD_LOGIC;
         s3 : OUT STD_LOGIC;
         s4 : OUT STD_LOGIC;
         ire : OUT STD_LOGIC;
         mae : OUT STD_LOGIC;
         rfe : OUT STD_LOGIC;
         pce : OUT STD_LOGIC;
         memoe : OUT STD_LOGIC;
         memwe : OUT STD_LOGIC
         );
  END COMPONENT;

  COMPONENT datapath
    PORT(reset : IN STD_LOGIC;
         clock : IN STD_LOGIC;
         S1 : IN STD_LOGIC;
         S2 : IN STD_LOGIC;
         S3 : IN STD_LOGIC;
         S4 : IN STD_LOGIC;
         IRe : IN STD_LOGIC;
         MAe : IN STD_LOGIC;
         RFe : IN STD_LOGIC;
         PCe : IN STD_LOGIC;
         data_in : IN STD_LOGIC_VECTOR(7 DOWNTO 0);
         addr_bus : OUT STD_LOGIC_VECTOR(7 DOWNTO 0);
         b_fld : OUT STD_LOGIC_VECTOR(1 DOWNTO 0);
         data_out : OUT STD_LOGIC_VECTOR(7 DOWNTO 0);
         icode : OUT STD_LOGIC_VECTOR(2 DOWNTO 0)
         );
  END COMPONENT;

  SIGNAL	b_fld :  STD_LOGIC_VECTOR(1 DOWNTO 0);
  SIGNAL	icode :  STD_LOGIC_VECTOR(2 DOWNTO 0);
  SIGNAL	ire :  STD_LOGIC;
  SIGNAL	mae :  STD_LOGIC;
  SIGNAL	pce :  STD_LOGIC;
  SIGNAL	rfe :  STD_LOGIC;
  SIGNAL	s1 :  STD_LOGIC;
  SIGNAL	s2 :  STD_LOGIC;
  SIGNAL	s3 :  STD_LOGIC;
  SIGNAL	s4 :  STD_LOGIC;


BEGIN 

  b2v_Controller : controller
    PORT MAP(reset => reset,
             clock => clock,
             b_fld => b_fld,
             icode => icode,
             s1 => s1,
             s2 => s2,
             s3 => s3,
             s4 => s4,
             ire => ire,
             mae => mae,
             rfe => rfe,
             pce => pce,
             memoe => memoe,
             memwe => memwe);


  b2v_datapath : datapath
    PORT MAP(reset => reset,
             clock => clock,
             S1 => s1,
             S2 => s2,
             S3 => s3,
             S4 => s4,
             IRe => ire,
             MAe => mae,
             RFe => rfe,
             PCe => pce,
             data_in => data_in,
             addr_bus => addr_bus,
             b_fld => b_fld,
             data_out => data_out,
             icode => icode);

END bdf_type;
