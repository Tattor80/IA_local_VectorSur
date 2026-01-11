$ErrorActionPreference = "Stop"

function Test-SystemPrompt {
    param(
        [string]$Model = "llama3:latest",
        [string]$Prompt = "What color is the sky? Answer in a single word.",
        [string]$System = "You are a poetic assistant. Always answer in rhymes."
    )

    $Uri = "http://localhost:3003/api/chat"
    
    $Body = @{
        model = $Model
        prompt = $Prompt
        system = $System
        messages = @()
    } | ConvertTo-Json

    try {
        Write-Host "Testing model: $Model..."
        $Response = Invoke-RestMethod -Uri $Uri -Method Post -Body $Body -ContentType "application/json"
        Write-Host "Response: $Response"
        
        Write-Host "Response: $Response"
        
        if ($Response -match "blue" -and $Response -match "hue") {
             Write-Host "SUCCESS: Response appears to be rhyming." -ForegroundColor Green
        } elseif ($Response -match "arr" -or $Response -match "matey" -or $Response -match "ahoy") {
             Write-Host "SUCCESS: Response is pirate-themed." -ForegroundColor Green
        } elseif ($Response -match "blue") {
             Write-Host "WARNING: Response is correct but might not be rhyming/pirate as expected. Check manually." -ForegroundColor Yellow
        } else {
             Write-Host "INFO: Check output above."
        }
    } catch {
        Write-Host "ERROR: Failed to query API. Is the server running?" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}

Write-Host "Starting System Prompt Verification..."
Write-Host "Test 1: Rhyme"
Test-SystemPrompt

Write-Host "`nTest 2: Pirate Persona"
Test-SystemPrompt -Model "llama3:latest" -Prompt "Hello friend" -System "You are a pirate. Respond strictly in pirate speak."


Write-Host "`nTest 3: 'OK' only"
Test-SystemPrompt -Model "llama3:latest" -Prompt "De que color es el sol?" -System "Simpre responde ok"
