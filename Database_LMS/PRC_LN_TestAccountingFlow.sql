CREATE OR ALTER PROCEDURE PRC_LN_TestAccountingFlow
(
    @AppliedAmount DECIMAL(18,2),
    @SanctionAmount DECIMAL(18,2),
    @Tenure INT,
    @InterestRate DECIMAL(18,6),
    @FirstInstallmentDate DATE,
    @EndDate DATE,
    @CreatedBy VARCHAR(100),
    @Action VARCHAR(20) = 'SIMULATE' -- Pass 'COMMIT' to save, 'SIMULATE' will ROLLBACK after returning data
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Start the test transaction
    BEGIN TRAN

    BEGIN TRY
        ------------------------------------------------------------
        -- 1. PREPARE LOAN CREATE TYPE
        ------------------------------------------------------------
        DECLARE @Loans [LoanCreateType]

        INSERT INTO @Loans
        (
            ExternalApplicationID,
            RequestID,
            CustomerID,
            ProductCode,
            AppliedAmount,
            SanctionAmount,
            RepaymentType,
            InstallmentFrequency,
            Tenure,
            InterestRate,
            FirstInstallmentDate,
            CreatedBy
        )
        VALUES
        (
            'EXT001',
            'REQ001',
            'CUST001',
            'VL001',
            @AppliedAmount,
            @SanctionAmount,
            'EMI',
            'MONTHLY',
            @Tenure,
            @InterestRate,
            @FirstInstallmentDate,
            @CreatedBy
        )

        ------------------------------------------------------------
        -- 2. CREATE LOAN
        ------------------------------------------------------------
        DECLARE @RC VARCHAR(3), @RM VARCHAR(MAX)

        EXEC PRC_LN_CreateLoan
            @Loans = @Loans,
            @ResponseCode = @RC OUTPUT,
            @ResponseMsg = @RM OUTPUT

        -- Select Output 1: Loan Creation Response
        SELECT 'CreateLoan' AS Step, @RC AS ResponseCode, @RM AS ResponseMsg

        -- Select Output 2 & 3: Details
        SELECT * FROM GS_LN_LoanDetail ORDER BY CreatedDate DESC
        SELECT * FROM GS_LN_LoanEnquiry ORDER BY CreatedDate DESC

        ------------------------------------------------------------
        -- 3. GET LOAN ACCOUNT NUMBER
        ------------------------------------------------------------
        DECLARE @LoanAccountNo VARCHAR(20)

        SELECT TOP 1
            @LoanAccountNo = LoanAccountNo
        FROM GS_LN_LoanDetail
        ORDER BY CreatedDate DESC

        ------------------------------------------------------------
        -- 4. PROCESS DISBURSEMENT
        ------------------------------------------------------------
        DECLARE @RCD VARCHAR(10), @RMD VARCHAR(MAX)

        EXEC PRC_LN_ProcessDisbursement
            @LoanAccountNo = @LoanAccountNo,
            @ExternalApplicationID = 'EXT001',
            @DisbursementAmount = @SanctionAmount,
            @DisbursalMode = 'NEFT',
            @DisbursalType = 'FULL',
            @CreatedBy = @CreatedBy,
            @InterestRate = @InterestRate,
            @Tenure = @Tenure,
            @FirstInstallmentDate = @FirstInstallmentDate,
            @ResponseCode = @RCD OUTPUT,
            @ResponseMsg = @RMD OUTPUT

        -- Select Output 4: Disbursement Response
        SELECT 'ProcessDisbursement' AS Step, @RCD AS ResponseCode, @RMD AS ResponseMsg

        ------------------------------------------------------------
        -- 5. RUN EOD UNTIL END DATE
        ------------------------------------------------------------
        DECLARE @currentdate DATETIME
        
        SET @currentdate = (SELECT TodayDate FROM GS_LN_ApplicationDate(NOLOCK))
        
        WHILE @currentdate < @EndDate
        BEGIN 
            EXEC PRC_LN_ProcessEOD

            SET @currentdate = (SELECT TodayDate FROM GS_LN_ApplicationDate(NOLOCK))
        END

        PRINT 'EOD Completed Successfully'

        ------------------------------------------------------------
        -- 6. FINAL RESULTS TO RETURN
        ------------------------------------------------------------
        SELECT * FROM GS_LN_DisbursementEnquiry (NOLOCK) WHERE LoanAccountNo = @LoanAccountNo
        SELECT * FROM GS_LN_DisbursementDetail  (NOLOCK) WHERE LoanAccountNo = @LoanAccountNo
        SELECT * FROM GS_LN_RepaymentSchedule   (NOLOCK) WHERE LoanAccountNo = @LoanAccountNo
        SELECT * FROM GS_LN_DailyAccrual        (NOLOCK) WHERE LoanAccountNo = @LoanAccountNo
        SELECT * FROM GS_LN_ChargeSchedule      (NOLOCK) WHERE LoanAccountNo = @LoanAccountNo
        SELECT * FROM GS_LN_Accounting_Details  (NOLOCK) WHERE LoanAccountNo = @LoanAccountNo

        ------------------------------------------------------------
        -- 7. COMMIT OR ROLLBACK LOGIC
        ------------------------------------------------------------
        IF @Action = 'COMMIT'
        BEGIN
            COMMIT TRAN
            PRINT 'Transaction Committed'
        END
        ELSE
        BEGIN
            ROLLBACK TRAN
            PRINT 'Transaction Rolled Back (Simulation Mode)'
        END

    END TRY
    BEGIN CATCH
        -- In case of any error, ensure we rollback
        IF @@TRANCOUNT > 0
            ROLLBACK TRAN;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO
