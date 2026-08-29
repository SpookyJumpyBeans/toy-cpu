LIBRARY ieee;
USE ieee.std_logic_1164.all; 

LIBRARY work;

ENTITY control_signals_logic IS 
  PORT
    (
      t0 : in std_logic;
      t1 : in std_logic;
      t2 : in std_logic;
      t3 : in std_logic;
      i0 : in std_logic;
      i1 : in std_logic;
      i2 : in std_logic;
      i3 : in std_logic;
      i4 : in std_logic;
      i5 : in std_logic;
      i6 : in std_logic;
      i7 : in std_logic;
      b0 : in std_logic;
      b1 : in std_logic;
      b2 : in std_logic;
      b3 : in std_logic;
      pce : out std_logic;
      ire : out std_logic;
      rfe : out std_logic; 
      mae : out std_logic;
      memwe : out std_logic;
      memoe : out std_logic;
      s1 : out std_logic;
      s2 : out std_logic;
      s3 : out std_logic;
      s4 : out std_logic
      );
END control_signals_logic;

ARCHITECTURE csl OF control_signals_logic IS
BEGIN

pce <= t1 OR (t2 AND i6 AND (b1 OR b2 OR b0)) OR (t3 AND i6 AND b3);
 
ire <= t0;

rfe <= (t2 AND (i0 OR i1 OR i2 OR i3 OR i5)) OR 
    (t2 AND i6 AND (b0 OR b1 OR b2)) OR 
    (t3 AND i6 AND b3);
	 
mae <= (i6 AND b3 AND t2);

memwe <= (i4 AND t2);

memoe <= t0 OR (i3 AND t2) OR (i6 AND t2 AND (b0 OR b1 OR b2 OR b3)) OR (i6 AND b3 AND t3);

s1 <= (i3 AND t2) OR (i4 AND t2);

s2 <= (i6 AND b3 and t3);

s3 <= (i3 AND t2) OR (i6 AND b3 and t3);
 
s4 <= (i6 AND t2 AND (b0 OR b1 OR b2));

END csl;