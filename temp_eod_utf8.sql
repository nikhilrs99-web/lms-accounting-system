USE [GS_DLP_LMS]
GO
/****** Object:  StoredProcedure [dbo].[PRC_LN_AccountingInsert]    Script Date: 16-03-2026 12:28:02 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[PRC_LN_AccountingInsert] (
	@Module VARCHAR(10)
	, @ProductCode VARCHAR(20)
	, @TxnCode VARCHAR(20)
	, @LoanAccountNo VARCHAR(20)
	, @ActivityID VARCHAR(30)
	, @AcctgDate DATE
	, @ValueDate DATE
	, @PostingInput TT_LN_AccountingInput READONLY
	, @SourceCode VARCHAR(50)
	)
AS
BEGIN
	SET NOCOUNT ON
	SET XACT_ABORT ON

	BEGIN TRY
	BEGIN TRAN
		INSERT INTO GS_LN_Accounting_Details (
			LoanAccountNo
			, ActivityID
			, Module
			, TxnCode
			, AmtCode
			, Amount
			, GLMnemonic
			, Dr_Cr
			, AcctgDate
			, ValueDate
			, SourceCode
			)
		SELECT @LoanAccountNo
			, @ActivityID
			, R.Module
			, R.TxnCode
			, R.AmtCode
			, I.Amount
			, R.GLMnemonic
			, R.Dr_Cr
			, @AcctgDate
			, @ValueDate
			, @SourceCode
		FROM GS_LN_Accounting_PostingRule R
		JOIN @PostingInput I ON R.AmtCode = I.AmtCode
		WHERE R.Module = @Module
			AND R.ProductCode = @ProductCode
			AND R.TxnCode = @TxnCode
			AND R.IsActive = 1
		ORDER BY R.PostingSequence

		-- Balance Check (Safety)
		IF (
				SELECT SUM(CASE 
							WHEN Dr_Cr = 'D'
								THEN Amount
							ELSE - Amount
							END)
				FROM GS_LN_Accounting_Details(NOLOCK)
				WHERE ActivityID = @ActivityID
				) <> 0
		BEGIN
			RollBACK
		END

		Commit
	END TRY

	BEGIN CATCH
		INSERT INTO ErrorHandler (
			ERROR_MSG
			, ERROR_NUM
			, ERROR_LIN
			, ERROR_PROC
			, [BATCH-ID]
			, [SYSTEM-DATE]
			)
		VALUES (
			ERROR_MESSAGE()
			, ERROR_NUMBER()
			, ERROR_LINE()
			, ERROR_PROCEDURE()
			, 0
			, SYSDATETIME()
			)

		
	END CATCH
END
GO
USE [GS_DLP_LMS]
GO
/****** Object:  StoredProcedure [dbo].[PRC_LN_EOD_DailyAccrual]    Script Date: 16-03-2026 12:28:02 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [dbo].[PRC_LN_EOD_DailyAccrual]
AS
BEGIN
    SET NOCOUNT ON
    SET XACT_ABORT ON

    BEGIN TRY
        BEGIN TRAN

        DECLARE @BusinessDate DATE

        SELECT @BusinessDate = TodayDate
        FROM GS_LN_ApplicationDate

        ----------------------------------------------------
        -- Update Daily Accrual For All Active Loans
        ----------------------------------------------------

        UPDATE D
        SET 
            D.DailyInterest =
                ROUND((D.InterestRate * D.BalancePrincipal) / 36500, 4),

            D.TotalAccruedInterest =
                ISNULL(D.TotalAccruedInterest,0)
                + ROUND((D.InterestRate * D.BalancePrincipal) / 36500, 4),

            D.ModifiedDate = SYSDATETIME()
        FROM GS_LN_DailyAccrual D
        JOIN GS_LN_LoanDetail L
            ON L.LoanAccountNo = D.LoanAccountNo
        WHERE 
            L.LoanStatus = 'DISBURSED'

        ----------------------------------------------------
        --  Update DPD 
        ----------------------------------------------------
				IF OBJECT_ID('tempdb..#DPD') IS NOT NULL DROP TABLE #DPD

				SELECT
					S.LoanAccountNo,
					MIN(S.ScheduleDate) AS FirstOverdueDate
				INTO #DPD
				FROM GS_LN_RepaymentSchedule S
				JOIN GS_LN_LoanDetail L
					ON L.LoanAccountNo = S.LoanAccountNo
				WHERE
					L.LoanStatus = 'DISBURSED'
					AND S.ScheduleDate < @BusinessDate
					AND (
							ISNULL(S.EMI,0) > ISNULL(S.EMIPaid,0)
						)
				GROUP BY S.LoanAccountNo


					UPDATE D
					SET D.DPD =
						CASE 
							WHEN O.FirstOverdueDate IS NULL THEN 0
							ELSE DATEDIFF(DAY, O.FirstOverdueDate, @BusinessDate)
						END,
						D.ModifiedDate = SYSDATETIME()
					FROM GS_LN_DailyAccrual D
					LEFT JOIN #DPD O
						ON D.LoanAccountNo = O.LoanAccountNo


        COMMIT

    END TRY
    BEGIN CATCH
        ROLLBACK

        INSERT INTO ErrorHandler
        (
            ERROR_MSG,
            ERROR_NUM,
            ERROR_LIN,
            ERROR_PROC,
            [BATCH-ID],
            [SYSTEM-DATE]
        )
        VALUES
        (
            ERROR_MESSAGE(),
            ERROR_NUMBER(),
            ERROR_LINE(),
            ERROR_PROCEDURE(),
            0,
            SYSDATETIME()
        )


    END CATCH
END
GO
USE [GS_DLP_LMS]
GO
/****** Object:  StoredProcedure [dbo].[PRC_LN_EOD_MonthEndAccrual]    Script Date: 16-03-2026 12:28:02 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[PRC_LN_EOD_MonthEndAccrual]
AS
BEGIN
    SET NOCOUNT ON
    SET XACT_ABORT ON  

    DECLARE @BusinessDate DATE

    SELECT @BusinessDate = TodayDate
    FROM GS_LN_ApplicationDate

    BEGIN TRY

        BEGIN TRAN

       ------------------------------------------------------------
    -- Temp Tables
    ------------------------------------------------------------
    DROP TABLE IF EXISTS #AccrualData
    CREATE TABLE #AccrualData
    (
        LoanAccountNo     VARCHAR(100),
        ScheduleID        INT,
        ScheduleDate      DATE,
        ScheduledInterest DECIMAL(18,4),
        ProductCode       VARCHAR(100),
        DailyInterest     DECIMAL(18,4)
    )

    DROP TABLE IF EXISTS #MonthEnd
    CREATE TABLE #MonthEnd
    (
        LoanAccountNo  VARCHAR(100),
        ProductCode    VARCHAR(100),
        ScheduleID     INT,
        ScheduleDate   DATE NULL,
        DayDiff        INT NULL,
        DailyInterest  DECIMAL(18,4) NULL,
        AccrualAmount  DECIMAL(18,4)
    )

    ------------------------------------------------------------
    -- Accrual Logic
    ------------------------------------------------------------
IF @BusinessDate = EOMONTH(@BusinessDate)
BEGIN
	INSERT INTO #AccrualData (
		LoanAccountNo
		, ScheduleID
		, ScheduleDate
		, ScheduledInterest
		, ProductCode
		, DailyInterest
		)
	SELECT A.LoanAccountNo
		, B.ScheduleID
		, B.ScheduleDate
		, B.ScheduledInterest
		, A.ProductCode
		, (B.ScheduledInterest / NULLIF(B.NoOfDays, 0))
	FROM GS_LN_LoanDetail A
	JOIN GS_LN_RepaymentSchedule B ON A.LoanAccountNo = B.LoanAccountNo
		AND B.ScheduledInterest > ISNULL(B.InterestAccrued, 0)
		AND B.LastAccDate <= @BusinessDate
		AND DATEADD(DAY, - 1, B.ScheduleDate) >= B.LastAccDate
	WHERE A.LoanStatus = 'DISBURSED'

	INSERT INTO #MonthEnd (
		LoanAccountNo
		, ProductCode
		, ScheduleID
		, ScheduleDate
		, DayDiff
		, DailyInterest
		, AccrualAmount
		)
	SELECT A.LoanAccountNo
		, A.ProductCode
		, A.ScheduleID
		, A.ScheduleDate
		, D.DayDiff
		, A.DailyInterest
		, D.DayDiff * A.DailyInterest
	FROM #AccrualData A
	JOIN GS_LN_DisbursementDetail B ON A.LoanAccountNo = B.LoanAccountNo
	CROSS APPLY (
		SELECT CASE 
				WHEN A.ScheduleID = 1
					THEN B.DisbursementDate
				ELSE DATEADD(MONTH, - 1, A.ScheduleDate)
				END AS BaseDate
		) X
	CROSS APPLY (
		SELECT DATEDIFF(DAY, X.BaseDate, EOMONTH(X.BaseDate)) AS DayDiff
		) D
END
    ELSE

	-------------ScheduleDate-1 Accrual

    BEGIN
        INSERT INTO #MonthEnd
        (
            LoanAccountNo,
            ProductCode,
            ScheduleID,
            AccrualAmount
        )
        SELECT  A.LoanAccountNo,
                A.ProductCode,
                B.ScheduleID,
                ISNULL(B.ScheduledInterest,0) - ISNULL(B.InterestAccrued,0)
        FROM GS_LN_LoanDetail A
        JOIN GS_LN_RepaymentSchedule B
              ON A.LoanAccountNo = B.LoanAccountNo
             AND DATEADD(DAY,-1,B.ScheduleDate) = @BusinessDate
        WHERE A.LoanStatus = 'DISBURSED'
    END


        ------------------------------------------------------------
        -- Cursor Processing
        ------------------------------------------------------------
        DECLARE 
            @LoanAccountNo VARCHAR(20),
            @ProductCode   VARCHAR(20),
            @ScheduleID    INT,
            @AccrualAmount DECIMAL(18,4),
            @ActivityID    VARCHAR(40)

        DECLARE LoanCursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT LoanAccountNo,
               ProductCode,
               ScheduleID,
               AccrualAmount
        FROM #MonthEnd
        WHERE AccrualAmount > 0

        OPEN LoanCursor

        FETCH NEXT FROM LoanCursor
        INTO @LoanAccountNo,
             @ProductCode,
             @ScheduleID,
             @AccrualAmount

        WHILE @@FETCH_STATUS = 0
        BEGIN

            ---------------------------------------------------
            -- NO inner TRY/CATCH here
            ---------------------------------------------------

            DECLARE @Input TT_LN_AccountingInput

            INSERT INTO @Input
            VALUES ('INTACR', @AccrualAmount)

            SET @ActivityID =
                CONCAT('LA_',
                       @LoanAccountNo,'_',
                       FORMAT(@BusinessDate,'yyyyMMdd'),'_',
                       @ScheduleID)

            EXEC PRC_LN_AccountingInsert
                 @Module        = 'LN',
                 @ProductCode   = @ProductCode,
                 @TxnCode       = 'LA',
                 @LoanAccountNo = @LoanAccountNo,
                 @ActivityID    = @ActivityID,
                 @AcctgDate     = @BusinessDate,
                 @ValueDate     = @BusinessDate,
                 @PostingInput  = @Input,
                 @SourceCode    = 'EODACCR_102'

            UPDATE GS_LN_RepaymentSchedule
            SET InterestAccrued = ISNULL(InterestAccrued,0) + @AccrualAmount,
                LastAccDate     = DATEADD(DAY,1,@BusinessDate)
            WHERE LoanAccountNo = @LoanAccountNo
              AND ScheduleID    = @ScheduleID

            UPDATE GS_LN_DailyAccrual
            SET AccountingAccrued = ISNULL(AccountingAccrued,0) + @AccrualAmount,
                ModifiedDate      = SYSDATETIME()
            WHERE LoanAccountNo = @LoanAccountNo

            FETCH NEXT FROM LoanCursor
            INTO @LoanAccountNo,
                 @ProductCode,
                 @ScheduleID,
                 @AccrualAmount
        END

        CLOSE LoanCursor
        DEALLOCATE LoanCursor

        COMMIT

    END TRY
    BEGIN CATCH

        IF @@TRANCOUNT > 0
            ROLLBACK

        INSERT INTO ErrorHandler
        (
            ERROR_MSG,
            ERROR_NUM,
            ERROR_LIN,
            ERROR_PROC,
            [BATCH-ID],
            [SYSTEM-DATE]
        )
        VALUES
        (
            ERROR_MESSAGE(),
            ERROR_NUMBER(),
            ERROR_LINE(),
            ERROR_PROCEDURE(),
            0,
            SYSDATETIME()
        );

        THROW  -- Forces procedure failure

    END CATCH
END
GO
USE [GS_DLP_LMS]
GO
/****** Object:  StoredProcedure [dbo].[PRC_LN_ProcessDisbursement]    Script Date: 16-03-2026 12:28:02 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[PRC_LN_ProcessDisbursement] (
	@ExternalApplicationID VARCHAR(50)
	, @LoanAccountNo VARCHAR(16)
	, @DisbursementAmount DECIMAL(18, 4)
	, @DisbursalMode VARCHAR(20)-- NEFT / RTGS / IMPS
	, @DisbursalType VARCHAR(20)-- FULL, PARTIAL, TOPUP
	, @InterestRate DECIMAL(9, 6)
	, @Tenure INT
	, @FirstInstallmentDate DATE
	, @CreatedBy VARCHAR(50)
	, @ResponseCode VARCHAR(10) OUTPUT
	, @ResponseMsg VARCHAR(MAX) OUTPUT
	)
AS
BEGIN
	SET NOCOUNT ON
	SET XACT_ABORT ON

	

	BEGIN TRY
		BEGIN TRAN

		DECLARE @BusinessDate DATE

		SET @BusinessDate = (
				SELECT TodayDate
				FROM GS_LN_ApplicationDate(NOLOCK)
				)
		--SET @FirstInstallmentDate = (
		--		SELECT dateadd(month, 1, TodayDate)
		--		FROM GS_LN_ApplicationDate(NOLOCK)
		--		)

		DECLARE @DisActivityID VARCHAR(50)

		SET @DisActivityID = 'DIS' + CONVERT(VARCHAR(8), @BusinessDate, 112) + RIGHT(REPLICATE('0', 12) + CAST(NEXT VALUE FOR dbo.Seq_DIS_ActivityID AS VARCHAR(12)), 12)
		--------------------------------------------------
		-- 1 Basic Validations
		--------------------------------------------------
		SET @ResponseCode = '000'
		SET @ResponseMsg = 'SUCCESS'

		IF NOT EXISTS (
				SELECT 1
				FROM GS_LN_LoanDetail
				WHERE LoanAccountNo = @LoanAccountNo
				)
		BEGIN
			SET @ResponseCode = '001'
			SET @ResponseMsg = 'Invalid Loan Account Number'

			
		END

		IF NOT EXISTS (
				SELECT 1
				FROM GS_LN_LoanDetail
				WHERE LoanAccountNo = @LoanAccountNo
					AND LoanStatus = 'SANCTIONED'
				)
		BEGIN
			SET @ResponseCode = '002'
			SET @ResponseMsg = 'Loan is not in SANCTIONED status'

			
		END

		IF EXISTS (
				SELECT 1
				FROM GS_LN_DisbursementDetail
				WHERE LoanAccountNo = @LoanAccountNo
				)
		BEGIN
			SET @ResponseCode = '003'
			SET @ResponseMsg = 'Loan already disbursed'

			
		END

		--------------------------------------------------
		-- 2 Insert Disbursement Record
		--------------------------------------------------
		IF (@ResponseCode = '000')
		BEGIN
			INSERT INTO GS_LN_DisbursementDetail (
				LoanAccountNo
				, ExternalApplicationID
				, ActivityID
				, DisbursementDate
				, DisbursementAmount
				, FirstInstallmentDate
				, DisbursalMode
				, DisbursalType
				, CreatedDate
				, CreatedBy
				)
			SELECT LoanAccountNo
				, @ExternalApplicationID
				, @DisActivityID
				, @BusinessDate
				, @DisbursementAmount
				, @FirstInstallmentDate
				, @DisbursalMode
				, @DisbursalType
				, SYSDATETIME()
				, @CreatedBy
			FROM GS_LN_LoanDetail
			WHERE LoanAccountNo = @LoanAccountNo

			--------------------------------------------------
			-- 3 Initialize Live Accrual Table
			--------------------------------------------------
			INSERT INTO GS_LN_DailyAccrual (
				LoanAccountNo
				, OpeningPrincipal
				, BalancePrincipal
				, InterestRate
				, DailyInterest
				, TotalAccruedInterest
				, TotalInterestPaid
				, TotalPrincipalPaid
				, AccountingAccrued
				, AccountingCapitalized
				, DPD
				, CreatedDate
				)
			VALUES (
				@LoanAccountNo
				, @DisbursementAmount
				, @DisbursementAmount
				, @InterestRate
				, ROUND(((@DisbursementAmount * @InterestRate * 1) / 36500), 4)
				, 0
				, 0
				, 0
				, 0
				, 0
				, 0
				, SYSDATETIME()
				)

			--------------------------------------------------
			-- 4 Update Loan Status → ACTIVE
			--------------------------------------------------
			UPDATE GS_LN_LoanDetail
			SET LoanStatus = 'DISBURSED'
			WHERE LoanAccountNo = @LoanAccountNo

			--------------------------------------------------
			-- 5 Insert Disbursement Enquiry (Success)
			--------------------------------------------------
			INSERT INTO GS_LN_DisbursementEnquiry (
				ExternalApplicationID
				, ActivityID
				, LoanAccountNo
				, ResponseCode
				, ResponseMsg
				, STATUS
				, DisbursementAmount
				, CreatedDate
				, CreatedBy
				)
			SELECT @ExternalApplicationID
				, @DisActivityID
				, @LoanAccountNo
				, @ResponseCode
				, 'Loan Disbursed Successfully'
				, 'SUCCESS'
				, @DisbursementAmount
				, SYSDATETIME()
				, @CreatedBy
			FROM GS_LN_LoanDetail
			WHERE LoanAccountNo = @LoanAccountNo

			--------------------------------------------------
			-- 6 INSERT GS_LN_RepaymentSchedule
			--------------------------------------------------
			DROP TABLE IF EXISTS #RepaymentSchedule

			CREATE TABLE #RepaymentSchedule (
				LoanAccountNo VARCHAR(30)
				, ScheduleID INT
				, NoOfDays INT
				, ScheduleDate DATE
				, OpeningPrincipal DECIMAL(18, 4)
				, ScheduledInterest DECIMAL(18, 4)
				, ScheduledPrincipal DECIMAL(18, 4)
				, EMI DECIMAL(10, 2)
				, ClosingPrincipal DECIMAL(10, 2)
				, LastAccDate DATE
				)

			INSERT INTO #RepaymentSchedule (
				ScheduleID
				, NoOfDays
				, ScheduleDate
				, OpeningPrincipal
				, ScheduledInterest
				, ScheduledPrincipal
				, EMI
				, ClosingPrincipal
				, LastAccDate
				)
			EXEC [PRC_LN_GenerateSchedule_EMI] @DisbursementAmount
				, @InterestRate
				, @Tenure
				, @BusinessDate
				, @FirstInstallmentDate

			INSERT INTO GS_LN_RepaymentSchedule (
				LoanAccountNo
				, ScheduleID
				, NoOfDays
				, ScheduleDate
				, OpeningPrincipal
				, ScheduledInterest
				, ScheduledPrincipal
				, EMI
				, ClosingPrincipal
				, LastAccDate
				)
			SELECT @LoanAccountNo
				, ScheduleID
				, NoOfDays
				, ScheduleDate
				, OpeningPrincipal
				, ScheduledInterest
				, ScheduledPrincipal
				, EMI
				, ClosingPrincipal
				, LastAccDate
			FROM #RepaymentSchedule

			--------------------------------------------------
			-- 7 INSERT into Charges
			--------------------------------------------------
			INSERT INTO GS_LN_ChargeSchedule (
				LoanAccountNo
				, ScheduleID
				, ChargeReferenceID
				, ChargeCode
				, ChargeAmount
				, ChargePaid
				, ChargeAppliedDate
				)
			SELECT @LoanAccountNo
				, 0
				, @DisActivityID
				, ChargeCode
				, (@DisbursementAmount * PercentageRate)
				, (@DisbursementAmount * PercentageRate)
				, @BusinessDate
			FROM GS_LN_ChargeMaster(NOLOCK) A
			JOIN GS_LN_LoanDetail(NOLOCK) B ON A.ProductCode = B.ProductCode
			WHERE ChargeCode = 'PFEE'
				AND B.LoanAccountNo = @LoanAccountNo

			UNION ALL

			SELECT @LoanAccountNo
				, 0
				, @DisActivityID
				, C.ChargeCode
				, (@DisbursementAmount * A.PercentageRate * C.PercentageRate)
				, (@DisbursementAmount * A.PercentageRate * C.PercentageRate)
				, @BusinessDate
			FROM GS_LN_ChargeMaster(NOLOCK) A
			JOIN GS_LN_LoanDetail(NOLOCK) B ON A.ProductCode = B.ProductCode
			JOIN GS_LN_ChargeMaster(NOLOCK) C ON B.ProductCode = C.ProductCode
			WHERE A.ChargeCode = 'PFEE'
				AND C.ChargeCode = 'PGST'
				AND B.LoanAccountNo = @LoanAccountNo


			--------------------------------------------------
			-- 8 Accounting Call
			--------------------------------------------------
				
				DECLARE @ProductCode VARCHAR(20)
				DECLARE @PFEE Decimal(18,4)
				DECLARE @PGST Decimal(18,4)

				Set @ProductCode= (Select ProductCode from GS_LN_LoanDetail(Nolock) where LoanAccountNo=@LoanAccountNo)
				Set @PFEE=  (Select ChargePaid from GS_LN_ChargeSchedule(nolock) where LoanAccountNo=@LoanAccountNo and ChargeCode='PFEE' )
				Set @PGST=   (Select ChargePaid from GS_LN_ChargeSchedule(nolock) where LoanAccountNo=@LoanAccountNo and ChargeCode='PGST' )

				DECLARE @Input TT_LN_AccountingInput
				INSERT INTO @Input VALUES ('PRIN',@DisbursementAmount)
				INSERT INTO @Input VALUES ('PFEE',@PFEE)
				INSERT INTO @Input VALUES ('PGST',@PGST)

				EXEC PRC_LN_AccountingInsert
					@Module = 'LN',
					@ProductCode = @ProductCode,
					@TxnCode = 'LD',
					@LoanAccountNo = @LoanAccountNo,
					@ActivityID = @DisActivityID,
					@AcctgDate = @BusinessDate,
					@ValueDate = @BusinessDate,
					@PostingInput = @Input,
					@SourceCode = 'LD101'		

              END 

			  ELSE
			        Begin

			  INSERT INTO GS_LN_DisbursementEnquiry (
				ExternalApplicationID
				, ActivityID
				, LoanAccountNo
				, ResponseCode
				, ResponseMsg
				, STATUS
				, DisbursementAmount
				, CreatedDate
				, CreatedBy
				)
			SELECT @ExternalApplicationID
				, @DisActivityID
				, @LoanAccountNo
				, @ResponseCode
				, @ResponseMsg
				, 'FAILED'
				, @DisbursementAmount
				, SYSDATETIME()
				, @CreatedBy
			FROM GS_LN_LoanDetail
			WHERE LoanAccountNo = @LoanAccountNo

			END

			COMMIT
		
	END TRY

	BEGIN CATCH
		IF @@TRANCOUNT > 0
			ROLLBACK

		INSERT INTO ErrorHandler (
			ERROR_MSG
			, ERROR_NUM
			, ERROR_LIN
			, ERROR_PROC
			, [BATCH-ID]
			, [SYSTEM-DATE]
			)
		VALUES (
			ERROR_MESSAGE()
			, ERROR_NUMBER()
			, ERROR_LINE()
			, ERROR_PROCEDURE()
			, 0
			, SYSDATETIME()
			)

		SET @ResponseCode = '999'
		SET @ResponseMsg = ERROR_MESSAGE()
	END CATCH
END
GO
