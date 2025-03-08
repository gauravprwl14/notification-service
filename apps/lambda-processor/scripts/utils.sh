#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    local level=$1
    shift
    local message=$*
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} ${timestamp} - $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} ${timestamp} - $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} ${timestamp} - $message"
            ;;
    esac
}

# Function to check requirements
check_requirements() {
    local requirements=("aws" "node" "npm" "zip")
    for cmd in "${requirements[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log "ERROR" "$cmd is required but not installed."
            exit 1
        fi
    done

    # Check Node.js version
    local node_version=$(node -v | cut -d'v' -f2)
    if [[ "${node_version%%.*}" -lt 18 ]]; then
        log "ERROR" "Node.js version 18 or higher is required"
        exit 1
    fi
}

# Function to increase file descriptor limit
increase_file_limits() {
    if [ "$(uname)" == "Darwin" ]; then
        ulimit -n 4096 2>/dev/null || log "WARN" "Could not increase file descriptor limit"
    else
        ulimit -n 65536 2>/dev/null || log "WARN" "Could not increase file descriptor limit"
    fi
}

# Function to write JSON to file safely
write_json_to_file() {
    local content="$1"
    local file="$2"
    echo "$content" > "$file"
}

# Function to create a temporary directory
create_temp_dir() {
    mktemp -d
}

# Function to cleanup a directory
cleanup_dir() {
    local dir="$1"
    if [ -d "$dir" ]; then
        rm -rf "$dir"
    fi
}

# Function to cleanup a file
cleanup_file() {
    local file="$1"
    if [ -f "$file" ]; then
        rm -f "$file"
    fi
}

# Export functions
export -f log
export -f check_requirements
export -f increase_file_limits
export -f write_json_to_file
export -f create_temp_dir
export -f cleanup_dir
export -f cleanup_file 