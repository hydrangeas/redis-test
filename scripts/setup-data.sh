#!/bin/bash
# scripts/setup-data.sh

set -e

echo "Setting up data directory structure..."

# データディレクトリの作成
mkdir -p data/{secure/{population,budget/2024,statistics},public}

# 権限設定
chmod -R 755 data/
find data -name "*.json" -exec chmod 644 {} \;

echo "Data directory structure created successfully!"
echo ""
echo "Directory structure:"
echo "data/"
echo "├── secure/"
echo "│   ├── population/"
echo "│   ├── budget/"
echo "│   │   └── 2024/"
echo "│   └── statistics/"
echo "└── public/"