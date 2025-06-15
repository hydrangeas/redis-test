#!/bin/bash
# scripts/setup-data.sh
# Setup script for data directory structure

set -e

echo "🚀 Setting up data directory structure..."

# Create data directories
echo "📁 Creating directories..."
mkdir -p data/{secure/{population,budget/2024,statistics},public}

# Create data catalog index
echo "📝 Creating data catalog..."
cat > data/index.json << 'EOF'
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-15T00:00:00Z",
  "categories": {
    "population": {
      "name": "人口統計",
      "description": "奈良県の人口統計データ",
      "path": "/secure/population",
      "files": ["2024.json", "2023.json"],
      "requiresAuth": true
    },
    "budget": {
      "name": "予算",
      "description": "奈良県の予算データ",
      "path": "/secure/budget",
      "files": ["2024/general.json", "2024/details.json"],
      "requiresAuth": true
    },
    "statistics": {
      "name": "統計データ",
      "description": "教育・健康・経済に関する統計データ",
      "path": "/secure/statistics",
      "files": ["education.json", "health.json", "economy.json"],
      "requiresAuth": true
    }
  }
}
EOF

# Create population data sample for 2024
echo "📊 Creating population data sample (2024)..."
cat > data/secure/population/2024.json << 'EOF'
{
  "year": "2024",
  "prefecture": "奈良県",
  "totalPopulation": 1324473,
  "households": 595890,
  "populationByCity": [
    {
      "city": "奈良市",
      "population": 354630,
      "households": 166584,
      "populationDensity": 1286.3
    },
    {
      "city": "橿原市",
      "population": 120548,
      "households": 53211,
      "populationDensity": 3054.2
    },
    {
      "city": "大和高田市",
      "population": 63025,
      "households": 29486,
      "populationDensity": 3847.3
    },
    {
      "city": "大和郡山市",
      "population": 84179,
      "households": 37632,
      "populationDensity": 2030.4
    },
    {
      "city": "天理市",
      "population": 65203,
      "households": 27318,
      "populationDensity": 765.0
    }
  ],
  "ageDistribution": {
    "0-14": {
      "count": 150234,
      "percentage": 11.3
    },
    "15-64": {
      "count": 765423,
      "percentage": 57.8
    },
    "65+": {
      "count": 408816,
      "percentage": 30.9
    }
  },
  "metadata": {
    "source": "奈良県統計課",
    "lastUpdated": "2024-12-01",
    "license": "CC BY 4.0",
    "dataCollectionMethod": "住民基本台帳",
    "notes": "令和6年1月1日現在の推計人口"
  }
}
EOF

# Create population data sample for 2023
echo "📊 Creating population data sample (2023)..."
cat > data/secure/population/2023.json << 'EOF'
{
  "year": "2023",
  "prefecture": "奈良県",
  "totalPopulation": 1330953,
  "households": 593245,
  "populationByCity": [
    {
      "city": "奈良市",
      "population": 356120,
      "households": 165892,
      "populationDensity": 1291.7
    },
    {
      "city": "橿原市",
      "population": 121235,
      "households": 52987,
      "populationDensity": 3071.7
    },
    {
      "city": "大和高田市",
      "population": 63542,
      "households": 29321,
      "populationDensity": 3879.0
    },
    {
      "city": "大和郡山市",
      "population": 84756,
      "households": 37421,
      "populationDensity": 2044.3
    },
    {
      "city": "天理市",
      "population": 65892,
      "households": 27156,
      "populationDensity": 773.2
    }
  ],
  "ageDistribution": {
    "0-14": {
      "count": 152456,
      "percentage": 11.5
    },
    "15-64": {
      "count": 772134,
      "percentage": 58.0
    },
    "65+": {
      "count": 406363,
      "percentage": 30.5
    }
  },
  "metadata": {
    "source": "奈良県統計課",
    "lastUpdated": "2023-12-01",
    "license": "CC BY 4.0",
    "dataCollectionMethod": "住民基本台帳",
    "notes": "令和5年1月1日現在の推計人口"
  }
}
EOF

# Create metadata for population category
echo "📋 Creating population metadata..."
cat > data/secure/population/metadata.json << 'EOF'
{
  "category": "population",
  "name": "人口統計データ",
  "description": "奈良県の人口統計に関するオープンデータ",
  "updateFrequency": "yearly",
  "dataFormat": "JSON",
  "fields": {
    "year": "データの年度",
    "prefecture": "都道府県名",
    "totalPopulation": "総人口",
    "households": "世帯数",
    "populationByCity": "市町村別人口データ",
    "ageDistribution": "年齢別人口分布"
  },
  "contact": {
    "organization": "奈良県統計課",
    "email": "statistics@pref.nara.lg.jp",
    "url": "https://www.pref.nara.jp/dd.aspx?menuid=1674"
  }
}
EOF

# Create budget general data
echo "💰 Creating budget data..."
cat > data/secure/budget/2024/general.json << 'EOF'
{
  "fiscalYear": "2024",
  "prefecture": "奈良県",
  "totalBudget": 548932000000,
  "generalAccount": 516243000000,
  "specialAccounts": 32689000000,
  "majorCategories": [
    {
      "category": "教育費",
      "amount": 119834000000,
      "percentage": 21.8,
      "description": "学校教育、社会教育等"
    },
    {
      "category": "民生費",
      "amount": 108456000000,
      "percentage": 19.8,
      "description": "福祉、子育て支援等"
    },
    {
      "category": "土木費",
      "amount": 87654000000,
      "percentage": 16.0,
      "description": "道路、河川、都市計画等"
    },
    {
      "category": "衛生費",
      "amount": 54893000000,
      "percentage": 10.0,
      "description": "保健衛生、環境保全等"
    },
    {
      "category": "総務費",
      "amount": 43915000000,
      "percentage": 8.0,
      "description": "一般管理、企画、統計等"
    }
  ],
  "metadata": {
    "source": "奈良県財政課",
    "lastUpdated": "2024-03-31",
    "license": "CC BY 4.0",
    "fiscalPeriod": "2024-04-01 to 2025-03-31",
    "approvalDate": "2024-03-28"
  }
}
EOF

# Create education statistics
echo "🎓 Creating education statistics..."
cat > data/secure/statistics/education.json << 'EOF'
{
  "year": "2024",
  "prefecture": "奈良県",
  "schools": {
    "elementary": {
      "count": 197,
      "students": 65432,
      "teachers": 3876,
      "studentTeacherRatio": 16.9
    },
    "juniorHigh": {
      "count": 104,
      "students": 34567,
      "teachers": 2543,
      "studentTeacherRatio": 13.6
    },
    "highSchool": {
      "count": 54,
      "students": 38901,
      "teachers": 2987,
      "studentTeacherRatio": 13.0
    },
    "university": {
      "count": 12,
      "students": 45678,
      "faculty": 2345
    }
  },
  "literacy": {
    "rate": 99.8,
    "internationalRanking": 3
  },
  "metadata": {
    "source": "奈良県教育委員会",
    "lastUpdated": "2024-10-01",
    "license": "CC BY 4.0",
    "surveyPeriod": "2024年度学校基本調査"
  }
}
EOF

# Create README for public directory
echo "📖 Creating README for public directory..."
cat > data/public/README.md << 'EOF'
# Public Data Directory

This directory is reserved for future public data that doesn't require authentication.
Currently, all data is placed under the `/secure` directory and requires API authentication.

## Future Use Cases
- General statistics that can be freely accessed
- Sample datasets for testing
- Public announcements and notices
EOF

# Create .htaccess for Apache environments
echo "🔒 Creating access control file..."
cat > data/.htaccess << 'EOF'
# Deny direct access to data files
# This ensures data is only accessible through the API

Order deny,allow
Deny from all

# Allow access to specific files if needed in the future
# <Files "public-file.json">
#   Allow from all
# </Files>
EOF

# Create .gitignore for data directory
echo "📝 Creating .gitignore..."
cat > data/.gitignore << 'EOF'
# Ignore temporary files
*.tmp
*.bak
*~

# Ignore OS-specific files
.DS_Store
Thumbs.db

# Ignore logs
*.log

# Keep the directory structure but ignore actual production data
# Uncomment the following lines for production:
# *.json
# !index.json
# !*/metadata.json
# !README.md
EOF

# Set appropriate permissions
echo "🔐 Setting file permissions..."
if [[ "$OSTYPE" != "msys"* ]] && [[ "$OSTYPE" != "cygwin"* ]]; then
  chmod -R 755 data/
  chmod 644 data/**/*.json 2>/dev/null || true
  chmod 644 data/.htaccess
  chmod 644 data/.gitignore
  chmod 644 data/public/README.md
fi

echo "✅ Data directory structure created successfully!"
echo ""
echo "📁 Directory structure:"
if command -v tree &> /dev/null; then
  tree data/ -a
else
  find data/ -type f | sort
fi