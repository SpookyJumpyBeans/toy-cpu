LIBRARY ieee;
USE ieee.std_logic_1164.all; 

ENTITY sequencer IS 
  PORT
    (
      reset :  IN  STD_LOGIC;
      clock :  IN  STD_LOGIC;
      b_fld :  IN  STD_LOGIC_VECTOR(1 DOWNTO 0);
      icode :  IN  STD_LOGIC_VECTOR(2 DOWNTO 0);
      t0 :  OUT  STD_LOGIC;
      t1 :  OUT  STD_LOGIC;
      t2 :  OUT  STD_LOGIC;
      t3 :  OUT  STD_LOGIC
      );
END sequencer;

ARCHITECTURE bdf_type OF sequencer IS 

  COMPONENT counter_synchreset
    PORT(reset : IN STD_LOGIC;
         clock : IN STD_LOGIC;
         clear : IN STD_LOGIC;
         t_counter : OUT STD_LOGIC_VECTOR(1 DOWNTO 0)
         );
  END COMPONENT;

 -- declare signals as needed here
 
SIGNAL t_cnt : STD_LOGIC_VECTOR(1 DOWNTO 0);
SIGNAL clr : STD_LOGIC;

BEGIN 

  counter0 : counter_synchreset
    PORT MAP(reset => reset,
             clock => clock,
             clear => clr,
				 t_counter => t_cnt);
	
   
t0 <= (not t_cnt(1)) and (not t_cnt(0));
t1 <= (not t_cnt(1)) and        t_cnt(0);
t2 <=        t_cnt(1)  and (not t_cnt(0));
t3 <=        t_cnt(1)  and        t_cnt(0);
clr <=  t_cnt(1) and (not t_cnt(0)) and
       ( (not icode(2)) or (not icode(1)) or icode(0) or
         (not b_fld(1)) or (not b_fld(0)) );

		
		

END bdf_type;