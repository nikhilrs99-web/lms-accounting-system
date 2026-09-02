USE [GS_DLP_LMS]
GO
/****** Object:  StoredProcedure [dbo].[PRC_LN_GenerateSchedule_EMI]    Script Date: 16-03-2026 12:28:02 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

--exec [PRC_LN_GenerateSchedule_EMI] 150000.00 ,20,36,'2024-03-28','2024-05-02'
CREATE PROCEDURE [dbo].[PRC_LN_GenerateSchedule_EMI] (
	@LoanAmount DECIMAL(18, 4)
	, @InterestRate DECIMAL(9, 6)
	, @Tenure INT
	, @DisbursementDate DATE
	, @FirstInstallmentDate DATE
	)
AS
BEGIN
	DECLARE @MonthlyInterestAmount DECIMAL(18, 4) = @InterestRate / (12 * 100)
	DECLARE @EMI DECIMAL(18, 4)

	SET @EMI = floor((@LoanAmount * @MonthlyInterestAmount) / (1 - POWER(1 + @MonthlyInterestAmount, - @Tenure))) ---EMI

	DECLARE @PrincipalPayment DECIMAL(18, 4)
	DECLARE @StartDate DATE = dateadd(month, 1, @FirstInstallmentDate)
	DECLARE @RemainingBalance DECIMAL(18, 4) = @LoanAmount
	DECLARE @Month1 INT = 1
		, @yea INT
		, @Month INT = 1
	DECLARE @Daydiff INT

	SET @Tenure = @Tenure

	IF OBJECT_ID('tempdb..#GenerateAmortizationSchedule_EMI') IS NOT NULL
		DROP TABLE #GenerateAmortizationSchedule_EMI

	CREATE TABLE #GenerateAmortizationSchedule_EMI (
		ScheduleID INT
		, NoOfDays INT
		, ScheduleDate DATE
		, OpeningPrincipal DECIMAL(18, 4)
		, EMI DECIMAL(18, 4)
		, ScheduledInterest DECIMAL(18, 4)
		, ScheduledPrincipal DECIMAL(18, 4)
		, ClosingPrincipal DECIMAL(18, 4)
		, LastAccDate DATE
		)

	-- Populate the schedule for each month
	WHILE @Month1 <= @Tenure
	BEGIN
		IF (@Month1 = 1)
		BEGIN
			--  set @yea=      (SELECT datepart(dy,CAST(DATEPART(YYYY,@FirstInstallmentDate) AS varchar(4)) + '1231'))  ---to cahnged based on yar 
			SET @MonthlyInterestAmount = round((@LoanAmount  * @InterestRate) / (365 * 100), 4)* DATEDIFF(day, @DisbursementDate, @FirstInstallmentDate)
			SET @Daydiff = (
					SELECT DATEDIFF(day, @DisbursementDate, @FirstInstallmentDate)
					)
			SET @RemainingBalance = @LoanAmount - (@EMI - @MonthlyInterestAmount)
			SET @PrincipalPayment = @EMI - @MonthlyInterestAmount

			INSERT INTO #GenerateAmortizationSchedule_EMI (
				ScheduleID
				, ScheduleDate
				, OpeningPrincipal
				, EMI
				, ScheduledPrincipal
				, ScheduledInterest
				, ClosingPrincipal
				, NoOfDays
				, LastAccDate
				)
			VALUES (
				@Month
				, @FirstInstallmentDate
				, @RemainingBalance + @PrincipalPayment
				, @EMI
				, @PrincipalPayment
				, @MonthlyInterestAmount
				, @RemainingBalance
				, @Daydiff
				, @DisbursementDate
				)
		END
		ELSE
		BEGIN
			SET @Daydiff = (
					SELECT datepart(day, EOMONTH((ScheduleDate)))
					FROM #GenerateAmortizationSchedule_EMI
					WHERE ScheduleID = (@Month1 - 1)
					)
			SET @MonthlyInterestAmount = round((@RemainingBalance  * @InterestRate) / 36500, 4)* @Daydiff
			SET @RemainingBalance = (
					SELECT min(ClosingPrincipal)
					FROM #GenerateAmortizationSchedule_EMI
					WHERE ScheduleID = (@Month1 - 1)
					) - (@EMI - @MonthlyInterestAmount)
			SET @PrincipalPayment = @EMI - @MonthlyInterestAmount

			INSERT INTO #GenerateAmortizationSchedule_EMI (
				ScheduleID
				, ScheduleDate
				, OpeningPrincipal
				, EMI
				, ScheduledPrincipal
				, ScheduledInterest
				, ClosingPrincipal
				, NoOfDays
				)
			VALUES (
				@Month
				, DATEADD(MONTH, @Month1 - 1, @FirstInstallmentDate)
				, @RemainingBalance + @PrincipalPayment
				, @EMI
				, @PrincipalPayment
				, @MonthlyInterestAmount
				, @RemainingBalance
				, @Daydiff
				)
		END

		IF (@Tenure = @Month1)
		BEGIN
			UPDATE #GenerateAmortizationSchedule_EMI
			SET EMI = EMI + ClosingPrincipal
				, ScheduledPrincipal = ScheduledPrincipal + ClosingPrincipal
				, ClosingPrincipal = '0.00'
			WHERE ScheduleID = @Month1
				AND ClosingPrincipal > 0

			UPDATE #GenerateAmortizationSchedule_EMI
			SET EMI = EMI + (ClosingPrincipal)
				, ScheduledPrincipal = ScheduledPrincipal + ClosingPrincipal
				, ClosingPrincipal = '0.00'
			WHERE ScheduleID = @Month1
				AND ClosingPrincipal < 0
		END

		-- Increment month
		SET @Month1 = @Month1 + 1
		SET @Month = @Month + 1
	END

	--return 
	--select ScheduleID,ScheduleDate,ScheduledPrincipal, ScheduledInterest,EMI,NoOfDays, LastAccDate from #GenerateAmortizationSchedule_EMI
	--Select sum(EMI) Total_Amount ,Sum(ScheduledPrincipal) Principal_Amount,Sum(ScheduledInterest) Toatal_Interest from #GenerateAmortizationSchedule_EMI
	SELECT ScheduleID
		, NoOfDays
		, ScheduleDate
		, OpeningPrincipal
		, ScheduledInterest
		, ScheduledPrincipal
		, EMI
		, ClosingPrincipal
		, LastAccDate
	FROM #GenerateAmortizationSchedule_EMI
END
GO
