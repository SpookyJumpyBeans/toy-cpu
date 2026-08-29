LIBRARY IEEE ;
USE IEEE.STD_LOGIC_1164.ALL;
use IEEE.numeric_std.all;

entity counter_synchreset is
  port (
    reset       : in std_logic;
    clock       : in std_logic;
    clear       : in std_logic;
    t_counter   : out std_logic_vector(1 downto 0)
    );
end counter_synchreset;

architecture rtl of counter_synchreset is
	COMPONENT d_ff
	PORT(reset 	: IN STD_LOGIC;
		clock :	IN STD_LOGIC;
		d		:	IN STD_LOGIC;
		q 		: 	OUT STD_LOGIC);
	END COMPONENT;

	SIGNAL s : STD_LOGIC_VECTOR(1 DOWNTO 0); -- state
	SIGNAL next_state	: STD_LOGIC_VECTOR(1 DOWNTO 0); -- state: next

BEGIN 

-- current state logic 
s0_ff : d_ff
	PORT MAP(reset => reset, 
			clock => clock, 
			d => next_state(0), 
			q => s(0)
			);
s1_ff : d_ff
	PORT MAP(reset => reset, 
			clock => clock, 
			d => next_state(1), 
			q => s(1)
			);

-- next state logic 
next_state(0) <= (not clear) and (not s(0));
next_state(1) <= (not clear) and (s(1) xor s(0));

-- output logic 
t_counter <= s;
	
END rtl;

