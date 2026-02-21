# Docker Volume Migration Script - PowerShell Version (Windows)
# Migrates Docker volumes from fantasy-union to spectatr

$ErrorActionPreference = "Stop"

Write-Host "[*] Docker Volume Migration: variable-theme -> spectatr" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "[X] Error: Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Check if docker-compose is available
try {
    Get-Command docker-compose -ErrorAction Stop | Out-Null
} catch {
    Write-Host "[X] Error: docker-compose not found. Please install docker-compose or Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Stopping existing containers..." -ForegroundColor Yellow
docker-compose down

Write-Host ""
Write-Host "Step 2: Checking for existing volumes..." -ForegroundColor Yellow
$OLD_DB_VOLUME = "variable-theme_postgres_data"
$NEW_DB_VOLUME = "spectatr_postgres_data"
$OLD_REDIS_VOLUME = "variable-theme_redis_data"
$NEW_REDIS_VOLUME = "spectatr_redis_data"

# Check if old volume exists
try {
    docker volume inspect $OLD_DB_VOLUME | Out-Null
    Write-Host "[OK] Found old volume: $OLD_DB_VOLUME" -ForegroundColor Green
} catch {
    Write-Host "[!] Warning: Old volume '$OLD_DB_VOLUME' not found." -ForegroundColor Yellow
    Write-Host "   This is normal if this is a fresh installation." -ForegroundColor Gray
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y' -and $continue -ne 'Y') {
        Write-Host "Migration cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# Check if new volume already exists
try {
    docker volume inspect $NEW_DB_VOLUME | Out-Null
    Write-Host "[!] Warning: New volume '$NEW_DB_VOLUME' already exists!" -ForegroundColor Yellow
    Write-Host ""
    $overwrite = Read-Host "Overwrite existing volume? (y/n)"
    if ($overwrite -ne 'y' -and $overwrite -ne 'Y') {
        Write-Host "Migration cancelled. Existing volume preserved." -ForegroundColor Yellow
        exit 0
    }
    Write-Host "Removing existing new volume..." -ForegroundColor Yellow
    docker volume rm $NEW_DB_VOLUME
} catch {
    # New volume doesn't exist - this is expected
}

Write-Host ""
Write-Host "Step 3: Creating new volumes and copying data..." -ForegroundColor Yellow
Write-Host "This may take a few minutes depending on database size..." -ForegroundColor Gray

# Migrate PostgreSQL volume
Write-Host ""
Write-Host "Migrating PostgreSQL volume..." -ForegroundColor Yellow
docker run --rm `
    -v "${OLD_DB_VOLUME}:/from:ro" `
    -v "${NEW_DB_VOLUME}:/to" `
    alpine `
    sh -c "cp -av /from/. /to"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[X] PostgreSQL migration failed!" -ForegroundColor Red
    exit 1
}

# Migrate Redis volume
Write-Host ""
Write-Host "Migrating Redis volume..." -ForegroundColor Yellow
docker run --rm `
    -v "${OLD_REDIS_VOLUME}:/from:ro" `
    -v "${NEW_REDIS_VOLUME}:/to" `
    alpine `
    sh -c "cp -av /from/. /to"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Volume migration successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Step 4: Verifying migration..." -ForegroundColor Yellow
    
    # Get volume sizes for comparison
    $OLD_DB_SIZE = docker run --rm -v "${OLD_DB_VOLUME}:/data:ro" alpine du -sh /data
    $NEW_DB_SIZE = docker run --rm -v "${NEW_DB_VOLUME}:/data:ro" alpine du -sh /data
    $OLD_REDIS_SIZE = docker run --rm -v "${OLD_REDIS_VOLUME}:/data:ro" alpine du -sh /data
    $NEW_REDIS_SIZE = docker run --rm -v "${NEW_REDIS_VOLUME}:/data:ro" alpine du -sh /data
    
    Write-Host "   PostgreSQL - Old: $($OLD_DB_SIZE.Split()[0]), New: $($NEW_DB_SIZE.Split()[0])" -ForegroundColor Gray
    Write-Host "   Redis - Old: $($OLD_REDIS_SIZE.Split()[0]), New: $($NEW_REDIS_SIZE.Split()[0])" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "[*] Summary:" -ForegroundColor Cyan
    Write-Host "   - Old volumes preserved: $OLD_DB_VOLUME, $OLD_REDIS_VOLUME" -ForegroundColor White
    Write-Host "   - New volumes created: $NEW_DB_VOLUME, $NEW_REDIS_VOLUME" -ForegroundColor White
    Write-Host "   - Data copied successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "[*] Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Start containers: docker-compose up -d" -ForegroundColor White
    Write-Host "   2. Verify database connection and data" -ForegroundColor White
    Write-Host "   3. After verification, remove old volumes:" -ForegroundColor White
    Write-Host "      docker volume rm $OLD_DB_VOLUME" -ForegroundColor Gray
    Write-Host "      docker volume rm $OLD_REDIS_VOLUME" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[*] Rollback Instructions:" -ForegroundColor Cyan
    Write-Host "   If issues occur, restore docker-compose.yml and run:" -ForegroundColor White
    Write-Host "   docker-compose down && docker-compose up -d" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "[X] Migration failed!" -ForegroundColor Red
    Write-Host "   Old volume preserved, no changes made." -ForegroundColor Yellow
    exit 1
}
