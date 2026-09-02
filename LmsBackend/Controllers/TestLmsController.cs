using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace LmsBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestLmsController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public TestLmsController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpPost]
    public async Task<IActionResult> ExecuteTest([FromBody] TestLmsRequest request)
    {
        var connectionString = "";
        try 
        {
            connectionString = DecryptConnectionString();
        } 
        catch (Exception ex) 
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }

        try
        {
            using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync();

            using var command = new SqlCommand("PRC_LN_TestAccountingFlow", connection);
            command.CommandType = CommandType.StoredProcedure;
            command.CommandTimeout = 300; // Increased to 5 minutes for heavy EOD simulations

            command.Parameters.AddWithValue("@AppliedAmount", request.AppliedAmount);
            command.Parameters.AddWithValue("@SanctionAmount", request.SanctionAmount);
            command.Parameters.AddWithValue("@Tenure", request.Tenure);
            command.Parameters.AddWithValue("@InterestRate", request.InterestRate);
            command.Parameters.AddWithValue("@FirstInstallmentDate", request.FirstInstallmentDate);
            command.Parameters.AddWithValue("@EndDate", request.EndDate);
            command.Parameters.AddWithValue("@CreatedBy", request.CreatedBy);
            command.Parameters.AddWithValue("@Action", request.Action); // 'COMMIT' or 'SIMULATE'

            using var reader = await command.ExecuteReaderAsync();
            var results = new Dictionary<string, List<Dictionary<string, object>>>();

            // The procedure returns multiple result sets in order.
            string[] tableNames = {
                "CreateLoanResponse",
                "LoanDetail",
                "LoanEnquiry",
                "ProcessDisbursementResponse",
                "DisbursementEnquiry",
                "DisbursementDetail",
                "RepaymentSchedule",
                "DailyAccrual",
                "ChargeSchedule",
                "AccountingDetails"
            };

            int tableIndex = 0;

            do
            {
                var tableData = new List<Dictionary<string, object>>();
                while (await reader.ReadAsync())
                {
                    var row = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        var colName = reader.GetName(i);
                        var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                        row[colName] = value;
                    }
                    tableData.Add(row);
                }

                // If the script outputs more result sets than expected, just name them dynamically
                var tableName = tableIndex < tableNames.Length ? tableNames[tableIndex] : $"ResultSet_{tableIndex + 1}";
                results[tableName] = tableData;
                tableIndex++;

            } while (await reader.NextResultAsync());

            return Ok(new { success = true, data = results });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    private string DecryptConnectionString()
    {
        // If a plain connection string is configured, use it directly
        var plain = _configuration.GetConnectionString("DefaultConnection");
        if (!string.IsNullOrWhiteSpace(plain) &&
            (plain.Contains("Server", StringComparison.OrdinalIgnoreCase) ||
             plain.Contains("Data Source", StringComparison.OrdinalIgnoreCase)))
        {
            return plain;
        }

        var sqlkey = _configuration.GetValue<string>("ConnectionStrings:sqlkey");
        var sqliv = _configuration.GetValue<string>("ConnectionStrings:sqliv");
        var encryptedString = _configuration.GetValue<string>("ConnectionStrings:SqlConnectionString");

        if (string.IsNullOrEmpty(sqlkey) || string.IsNullOrEmpty(encryptedString))
            return _configuration.GetConnectionString("DefaultConnection") ?? "";

        // Try all common padding modes — handles any encryption origin
        var paddingModes = new[] { PaddingMode.PKCS7, PaddingMode.Zeros, PaddingMode.None, PaddingMode.ANSIX923 };

        byte[] keyBytes = Convert.FromBase64String(sqlkey!);
        byte[] ivBytes = Convert.FromBase64String(sqliv!);
        byte[] cipherBytes = Convert.FromBase64String(encryptedString!);

        Exception? lastEx = null;

        foreach (var paddingMode in paddingModes)
        {
            try
            {
                using var tdes = TripleDES.Create();
                tdes.Key = keyBytes;
                tdes.IV = ivBytes;
                tdes.Mode = CipherMode.CBC;
                tdes.Padding = paddingMode;

                using var decryptor = tdes.CreateDecryptor();
                byte[] plainBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
                var result = Encoding.UTF8.GetString(plainBytes).TrimEnd('\0');

                // A valid connection string should contain at least "Server" or "Data Source"
                if (result.Contains("Server", StringComparison.OrdinalIgnoreCase) ||
                    result.Contains("Data Source", StringComparison.OrdinalIgnoreCase))
                {
                    return result;
                }
            }
            catch (Exception ex)
            {
                lastEx = ex;
            }
        }

        throw new Exception($"Failed to decrypt connection string with any padding mode. Last error: {lastEx?.Message}");
    }
}

public class TestLmsRequest
{
    public decimal AppliedAmount { get; set; }
    public decimal SanctionAmount { get; set; }
    public int Tenure { get; set; }
    public decimal InterestRate { get; set; }
    public DateTime FirstInstallmentDate { get; set; }
    public DateTime EndDate { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string Action { get; set; } = "SIMULATE";
}
