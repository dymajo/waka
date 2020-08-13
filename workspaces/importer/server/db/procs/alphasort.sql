CREATE FUNCTION [dbo].[fn_CreateAlphanumericSortValue]
(
	@ItemToSort varchar(200),
	@SortNumericsFirst bit = 1
)
RETURNS varchar(801)
WITH SCHEMABINDING
AS
	--==========================================================================================
	-- This function takes an alphanumeric string and encodes it so that it can be properly sorted
	--    against other alphanumeric strings
	-- The encoding will insert a three digit string before each numeric portion of the item to sort
	--    The three digits represent the number of digits in the numeric portion that it will precede (zero-padded)
	-- The encoding will also account for leading zeros in each numeric portion by adding a three digit
	--    string at the end of the item to sort, for each numeric portion.  Those three digits will
	--    represent the number of leading zeros in the numeric portion (zero-padded)
	-- Examples:
	-- ABC =	  ABC
	-- ABC1 =     ABC0011 000
	-- ABC1ABC1 = ABC0011ABC0011 000000
	-- ABC12    = ABC00212 000
	-- ABC012   = ABC00212 001
	--
	-- Worst case notes:
	--	The max count of leading zeros is -- all zeros = 200
	--  The max count of numbers -- all numbers = 200
	--  A single space separates the leading zero string from the rest
	--	Leading zeros get trimmed
	--  Each number portion gets 3 new characters in front (and 3 new characters at the end)
	--			1 leading zero nets 2 characters
	--			2 leading zeros net 1 character
	--			3 leading zeros net 0 characters
	--			>3 lose characters
	--  All characters just spits out the same string
	--  So, no leading zeros, but with numbers, adds the most characters
	--	So, the most number-sets = the most characters -- which is every other is a number
	--			= 100 numbers & 100 alphas
	--			= 100 * 3 characters each in front + 100 * 3 characters each at then + 1 space
	--			= 801 characters
	-- FYI. This function is specifically being used for ... (some domain specific stuff)... sorting at this time.
	--    As such, everything has been set up for that length, which is 200 characters
	--    A change in that length could require numerous changes to to code below -- be careful.
	--		(If you can have > 999 numbers/zeros to count)
	--==========================================================================================
BEGIN
  declare @WorkingItem varchar(200) = @ItemToSort
  declare @DigitCount int = 0
  declare @LeadingZeroCount int = 0
  declare @CurrentNumber varchar(200) = ''
  declare @Leftmost varchar(1) = ''
  declare @LeadingZeroString varchar(300) = ''

  --==========================================================================================
  -- With 200 character input, the worst case output should be 801 characters
  --==========================================================================================
  declare @SortValue varchar(801) = ''

  --==========================================================================================
  -- We will work thru the input string one character at a time
  --==========================================================================================
  declare @FirstIsCharacter bit = 0
  if (isnumeric(left(@WorkingItem, 1)) = 0)
		select @FirstIsCharacter = 1

  while (len(@WorkingItem) > 0)
	begin
    select @Leftmost = left(@WorkingItem, 1)

    --==========================================================================================
    -- Is the first character a number?
    --==========================================================================================
    if (isnumeric(@Leftmost) = 1 and @Leftmost != '-')
		begin
      while (isnumeric(@Leftmost) = 1 and @Leftmost != '-')
			begin
        --==========================================================================================
        -- Parse out all of the consecutive digits to get the current number
        --==========================================================================================
        if (@Leftmost = '0' and @DigitCount = 0)
				begin
          --==========================================================================================
          -- Leading zero -- just count how many we have in this set of digits
          --    We'll add the string for it to the end of our output below
          --==========================================================================================
          select @LeadingZeroCount = @LeadingZeroCount + 1
        end
				else
				begin
          --==========================================================================================
          -- Not a leading zero, so increment the digit count, and remember the current number value
          --==========================================================================================
          select @DigitCount = @DigitCount + 1
          select @CurrentNumber = @CurrentNumber + @Leftmost
        end

        --==========================================================================================
        -- Trim off the character we just checked, get the next character to check and continue the inner loop
        --==========================================================================================
        select @WorkingItem = substring(@WorkingItem, 2, 200)
        select @Leftmost = left(@WorkingItem, 1)
      end
      -- while (isnumeric(@Leftmost) = 1)

      --==========================================================================================
      -- We now have the current number from our input string
      --    Add the current number's leading zero string to the entire leading zero string, zero-padded
      --==========================================================================================
      if (@LeadingZeroCount < 10)
				select @LeadingZeroString = @LeadingZeroString + '00' + cast(@LeadingZeroCount as varchar)
			else if (@LeadingZeroCount < 100)
				select @LeadingZeroString = @LeadingZeroString + '0' + cast(@LeadingZeroCount as varchar)
			else
				select @LeadingZeroString = @LeadingZeroString + cast(@LeadingZeroCount as varchar)

      --==========================================================================================
      -- Add the current number's sort code, along with the current number, to the returned sort value
      --==========================================================================================
      if (@DigitCount < 10)
				select @SortValue = @SortValue + '00' + cast(@DigitCount as varchar) + @CurrentNumber
			else if (@DigitCount < 100)
				select @SortValue = @SortValue + '0' + cast(@DigitCount as varchar) + @CurrentNumber
			else
				select @SortValue = @SortValue + cast(@DigitCount as varchar) + @CurrentNumber

      --==========================================================================================
      -- Reset for the next iteration
      --==========================================================================================
      select @DigitCount = 0
      select @CurrentNumber = ''
      select @LeadingZeroCount = 0
    end
    -- if (isnumeric(@Leftmost) = 1)

    --==========================================================================================
    -- The character we are currently working with is not a number, just tag it onto our return value
    --    Ignoring whitespace
    --==========================================================================================
    if (@Leftmost != ' ')
			select @SortValue = @SortValue + @Leftmost

    --==========================================================================================
    -- Trim off the character we just checked and continue the main loop
    --==========================================================================================
    select @WorkingItem = substring(@WorkingItem, 2, 200)

  end
  -- while (len(@WorkingItem) > 0)

  if (@SortNumericsFirst = 0 and @FirstIsCharacter = 1)
		select @SortValue = '-999999999' + @SortValue

  --==========================================================================================
  -- Finally, tag on the leading zero value and return our sort value
  --==========================================================================================
  select @SortValue = @SortValue +  ' ' + @LeadingZeroString

  return @SortValue
END