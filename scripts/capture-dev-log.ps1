Set-Location 'D:\FS-Communication'
$job = Start-Job -ScriptBlock { Set-Location 'D:\FS-Communication'; npm run dev > dev.log 2>&1 }
Start-Sleep -Seconds 8
if ($job.State -eq 'Running') { Stop-Job -Job $job -Force }
Start-Sleep -Seconds 1
if (Test-Path 'dev.log') { Get-Content 'dev.log' -Tail 400 } else { Write-Output 'dev.log not found'; Get-Job | Select-Object Id,Name,State,HasMoreData,ChildJobs | Format-List }