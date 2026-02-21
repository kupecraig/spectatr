#!/bin/bash
# Docker Volume Migration Script - Bash Version (Linux/Mac)
# Migrates Docker volumes from fantasy-union to spectatr

set -e  # Exit on error

echo "🐳 Docker Volume Migration: fantasy-union → spectatr"
echo "=================================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose not found. Please install docker-compose."
    exit 1
fi

echo "Step 1: Stopping existing containers..."
docker-compose down

echo ""
echo "Step 2: Checking for existing volumes..."
OLD_DB_VOLUME="fantasy-union-db-data"
NEW_DB_VOLUME="spectatr-db-data"

# Check if old volume exists
if ! docker volume inspect "$OLD_DB_VOLUME" > /dev/null 2>&1; then
    echo "⚠️  Warning: Old volume '$OLD_DB_VOLUME' not found."
    echo "   This is normal if this is a fresh installation."
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Migration cancelled."
        exit 0
    fi
else
    echo "✅ Found old volume: $OLD_DB_VOLUME"
fi

# Check if new volume already exists
if docker volume inspect "$NEW_DB_VOLUME" > /dev/null 2>&1; then
    echo "⚠️  Warning: New volume '$NEW_DB_VOLUME' already exists!"
    echo ""
    read -p "Overwrite existing volume? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Migration cancelled. Existing volume preserved."
        exit 0
    fi
    echo "Removing existing new volume..."
    docker volume rm "$NEW_DB_VOLUME"
fi

echo ""
echo "Step 3: Creating new volume and copying data..."
echo "This may take a few minutes depending on database size..."

# Create new volume and copy data using alpine container
docker run --rm \
    -v "$OLD_DB_VOLUME:/from:ro" \
    -v "$NEW_DB_VOLUME:/to" \
    alpine \
    sh -c "cp -av /from/. /to"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Volume migration successful!"
    echo ""
    echo "Step 4: Verifying migration..."
    
    # Get volume sizes for comparison
    OLD_SIZE=$(docker run --rm -v "$OLD_DB_VOLUME:/data:ro" alpine du -sh /data | cut -f1)
    NEW_SIZE=$(docker run --rm -v "$NEW_DB_VOLUME:/data:ro" alpine du -sh /data | cut -f1)
    
    echo "   Old volume size: $OLD_SIZE"
    echo "   New volume size: $NEW_SIZE"
    
    echo ""
    echo "📋 Summary:"
    echo "   • Old volume preserved: $OLD_DB_VOLUME"
    echo "   • New volume created: $NEW_DB_VOLUME"
    echo "   • Data copied successfully"
    echo ""
    echo "🔄 Next Steps:"
    echo "   1. Update docker-compose.yml with new volume name"
    echo "   2. Start containers: docker-compose up -d"
    echo "   3. Verify database connection and data"
    echo "   4. After verification, remove old volume: docker volume rm $OLD_DB_VOLUME"
    echo ""
    echo "💡 Rollback Instructions:"
    echo "   If issues occur, restore docker-compose.yml and run:"
    echo "   docker-compose down && docker-compose up -d"
    echo ""
else
    echo ""
    echo "❌ Migration failed!"
    echo "   Old volume preserved, no changes made."
    exit 1
fi
