$ErrorActionPreference = 'Stop'

Write-Host 'Starting safe-prisma-push (PowerShell)...'

function Get-DatabaseUrl {
  if (-not [string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
    return $env:DATABASE_URL
  }

  $envFile = Join-Path (Get-Location) '.env.local'
  if (-not (Test-Path $envFile)) {
    return $null
  }

  $line = Get-Content $envFile | Where-Object {
    $_ -match '^\s*DATABASE_URL\s*=' -and $_ -notmatch '^\s*#'
  } | Select-Object -First 1

  if ([string]::IsNullOrWhiteSpace($line)) {
    return $null
  }

  $value = ($line -split '=', 2)[1].Trim()
  if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  return $value
}

$dbUrl = Get-DatabaseUrl
if ([string]::IsNullOrWhiteSpace($dbUrl)) {
  Write-Error 'DATABASE_URL is not set (or not found in .env.local). Aborting to avoid accidental operations.'
}

[Uri]$uri = $dbUrl
if ($uri.Scheme -ne 'mysql') {
  Write-Error 'DATABASE_URL must use mysql:// for this script.'
}

$dbName = $uri.AbsolutePath.TrimStart('/')
if ([string]::IsNullOrWhiteSpace($dbName)) {
  Write-Error 'Unable to parse database name from DATABASE_URL.'
}

$hostName = $uri.Host
$port = if ($uri.Port -gt 0) { $uri.Port } else { 3306 }

$userInfo = $uri.UserInfo
if ([string]::IsNullOrWhiteSpace($userInfo) -or $userInfo -notmatch ':') {
  Write-Error 'Unable to parse username/password from DATABASE_URL.'
}

$parts = $userInfo -split ':', 2
$dbUser = [Uri]::UnescapeDataString($parts[0])
$dbPass = [Uri]::UnescapeDataString($parts[1])

$backupDir = Join-Path (Get-Location) 'data\db-backups'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$ts = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$dumpFile = Join-Path $backupDir ("db-backup-$ts.sql")

Write-Host "Creating backup at $dumpFile"

$mysqldump = Get-Command mysqldump -ErrorAction SilentlyContinue
$docker = Get-Command docker -ErrorAction SilentlyContinue

if ($mysqldump) {
  $env:MYSQL_PWD = $dbPass
  & $mysqldump.Source --single-transaction --no-tablespaces --host=$hostName --port=$port --user=$dbUser $dbName 2>$null | Out-File -FilePath $dumpFile -Encoding utf8
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
} elseif ($docker -and ($hostName -eq '127.0.0.1' -or $hostName -eq 'localhost') -and $port -eq 3306) {
  $containerExists = (& docker ps --format "{{.Names}}") | Where-Object { $_ -eq 'mysql-local' }
  if (-not $containerExists) {
    Write-Error 'mysqldump is not in PATH and docker container mysql-local is not running. Aborting.'
  }

  $dockerDumpCmd = ('MYSQL_PWD="{0}" mysqldump --single-transaction --no-tablespaces -u"{1}" {2}' -f $dbPass, $dbUser, $dbName)
  & docker exec mysql-local sh -c $dockerDumpCmd 2>$null | Out-File -FilePath $dumpFile -Encoding utf8
} else {
  Write-Error 'mysqldump is not in PATH and no supported docker fallback is available. Aborting.'
}

if (-not (Test-Path $dumpFile) -or (Get-Item $dumpFile).Length -le 0) {
  Write-Error 'Backup file was not created or is empty. Aborting before prisma db push.'
}

Write-Host "Backup created: $dumpFile"
Write-Host 'Running npx prisma db push...'
$env:DATABASE_URL = $dbUrl
npx prisma db push
if ($LASTEXITCODE -ne 0) {
  Write-Error 'prisma db push failed. Aborting.'
}
Write-Host 'Running npx prisma generate...'
npx prisma generate
if ($LASTEXITCODE -ne 0) {
  Write-Error 'prisma generate failed.'
}
Write-Host 'Safe prisma push completed.'
