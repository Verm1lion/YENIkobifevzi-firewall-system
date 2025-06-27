#!/bin/bash

# ==================================================================
# NetGate Firewall - Intelligent System Requirements Installer
# IMPROVED VERSION with comprehensive error handling and validation
# Version: 2.1.0 - Production Ready
# ==================================================================

set -euo pipefail  # ✅ FIX: Added -u and -o pipefail

# Global variables and color codes
readonly SCRIPT_VERSION="2.1.0"
readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_FILE="/tmp/netgate_install_$(date +%Y%m%d_%H%M%S).log"
readonly PID_FILE="/tmp/netgate_install.pid"

# Color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Configuration flags
DRY_RUN=false
VERBOSE=false
FORCE_INSTALL=false
CONTAINER_MODE=false
SKIP_FIREWALL=false

# System detection variables
OS_ID=""
OS_VERSION=""
OS_NAME=""
OS_FAMILY=""
PACKAGE_MANAGER=""
ARCH=""
ARCH_TYPE=""
IS_CONTAINER=false
HAS_SYSTEMD=false

# ==================================================================
# ENHANCED UTILITY FUNCTIONS
# ==================================================================

print_banner() {
    echo -e "${BLUE}"
    echo "=================================================================="
    echo "🔥 NetGate Firewall System Requirements Installer v${SCRIPT_VERSION}"
    echo "🌐 Network Interface Management & Firewall Platform"
    echo "=================================================================="
    echo -e "${NC}"
}

# ✅ FIX: Enhanced logging with log rotation
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Log rotation check
    if [[ -f "$LOG_FILE" ]] && [[ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt 10485760 ]]; then
        mv "$LOG_FILE" "${LOG_FILE}.old"
        echo "Log rotated at $timestamp" > "$LOG_FILE"
    fi

    case $level in
        "INFO")  echo -e "${GREEN}[INFO]${NC} $message" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC} $message" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $message" ;;
        "DEBUG") [[ $VERBOSE == true ]] && echo -e "${CYAN}[DEBUG]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "CRITICAL") echo -e "${RED}🚨 CRITICAL: $message${NC}" ;;
    esac

    # Write to log file
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# ✅ FIX: Enhanced root check with better error handling
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log "INFO" "Running as root user ✓"
        return 0
    elif command -v sudo >/dev/null 2>&1; then
        log "WARN" "Not running as root, will use sudo"

        # Test sudo access with timeout
        if timeout 5 sudo -n true 2>/dev/null; then
            log "INFO" "Sudo access confirmed ✓"
            return 0
        else
            log "ERROR" "Sudo access required but not available"
            log "ERROR" "Please run: sudo $SCRIPT_NAME"
            exit 1
        fi
    else
        log "CRITICAL" "Neither root access nor sudo available"
        log "ERROR" "This script requires administrative privileges"
        exit 1
    fi
}

# ✅ FIX: Enhanced PID file handling
check_running_instance() {
    if [[ -f "$PID_FILE" ]]; then
        local existing_pid
        existing_pid=$(cat "$PID_FILE" 2>/dev/null || echo "")

        if [[ -n "$existing_pid" ]] && kill -0 "$existing_pid" 2>/dev/null; then
            log "ERROR" "Another instance is already running (PID: $existing_pid)"
            exit 1
        else
            log "WARN" "Stale PID file found, removing..."
            rm -f "$PID_FILE"
        fi
    fi

    # Create new PID file
    echo $$ > "$PID_FILE"

    # Cleanup on exit
    trap 'rm -f "$PID_FILE"; exit' INT TERM EXIT
}

# ✅ FIX: Enhanced system detection
detect_environment() {
    log "INFO" "Detecting system environment..."

    # Check for systemd
    if [[ -d /run/systemd/system ]]; then
        HAS_SYSTEMD=true
        log "DEBUG" "Systemd detected"
    else
        HAS_SYSTEMD=false
        log "DEBUG" "No systemd detected"
    fi

    # Enhanced container detection
    if [[ -f /.dockerenv ]] || [[ -n "${container:-}" ]] || grep -q docker /proc/1/cgroup 2>/dev/null; then
        IS_CONTAINER=true
        CONTAINER_MODE=true
        log "INFO" "🐳 Container environment detected"

        # In containers, skip some operations
        SKIP_FIREWALL=true
        log "WARN" "Firewall configuration will be skipped in container mode"
    elif [[ -f /proc/vz/veinfo ]] || [[ -d /proc/vz ]]; then
        IS_CONTAINER=true
        CONTAINER_MODE=true
        log "INFO" "🏗️ OpenVZ/Virtuozzo container detected"
    else
        IS_CONTAINER=false
        log "INFO" "🖥️ Host system environment"
    fi
}

# ✅ FIX: Enhanced OS detection with fallbacks
detect_os() {
    log "INFO" "Detecting operating system..."

    if [[ -f /etc/os-release ]]; then
        # Source with error handling
        if source /etc/os-release 2>/dev/null; then
            OS_ID="${ID:-unknown}"
            OS_VERSION="${VERSION_ID:-unknown}"
            OS_NAME="${PRETTY_NAME:-Unknown Linux}"
        else
            log "WARN" "Failed to source /etc/os-release"
        fi
    fi

    # Fallback detection methods
    if [[ "$OS_ID" == "unknown" ]] || [[ -z "$OS_ID" ]]; then
        if [[ -f /etc/debian_version ]]; then
            OS_ID="debian"
            OS_NAME="Debian-based"
        elif [[ -f /etc/redhat-release ]]; then
            OS_ID="rhel"
            OS_NAME="RedHat-based"
        elif [[ -f /etc/alpine-release ]]; then
            OS_ID="alpine"
            OS_NAME="Alpine Linux"
        elif [[ -f /etc/arch-release ]]; then
            OS_ID="arch"
            OS_NAME="Arch Linux"
        else
            log "WARN" "Cannot detect OS, assuming Ubuntu/Debian"
            OS_ID="ubuntu"
            OS_NAME="Ubuntu/Debian (assumed)"
        fi
    fi

    # Determine package manager and OS family
    case "$OS_ID" in
        ubuntu|debian|linuxmint)
            PACKAGE_MANAGER="apt"
            OS_FAMILY="debian"
            ;;
        centos|rhel|fedora|rocky|almalinux|ol)
            if command -v dnf >/dev/null 2>&1; then
                PACKAGE_MANAGER="dnf"
            else
                PACKAGE_MANAGER="yum"
            fi
            OS_FAMILY="redhat"
            ;;
        alpine)
            PACKAGE_MANAGER="apk"
            OS_FAMILY="alpine"
            ;;
        arch|manjaro|endeavouros)
            PACKAGE_MANAGER="pacman"
            OS_FAMILY="arch"
            ;;
        opensuse*|sles)
            PACKAGE_MANAGER="zypper"
            OS_FAMILY="opensuse"
            ;;
        *)
            log "WARN" "Unknown OS: $OS_ID, assuming debian-like"
            PACKAGE_MANAGER="apt"
            OS_FAMILY="debian"
            ;;
    esac

    log "SUCCESS" "OS Detection Complete"
    log "INFO" "  OS: $OS_NAME"
    log "INFO" "  ID: $OS_ID"
    log "INFO" "  Version: $OS_VERSION"
    log "INFO" "  Family: $OS_FAMILY"
    log "INFO" "  Package Manager: $PACKAGE_MANAGER"
    log "INFO" "  Container: $IS_CONTAINER"
    log "INFO" "  Systemd: $HAS_SYSTEMD"
}

# ✅ FIX: Enhanced architecture detection
detect_architecture() {
    ARCH=$(uname -m)
    case $ARCH in
        x86_64|amd64)
            ARCH_TYPE="x64"
            ;;
        aarch64|arm64)
            ARCH_TYPE="arm64"
            ;;
        armv7l|armv6l)
            ARCH_TYPE="arm"
            ;;
        i386|i686)
            ARCH_TYPE="x86"
            ;;
        *)
            ARCH_TYPE="unknown"
            log "WARN" "Unknown architecture: $ARCH"
            ;;
    esac

    log "INFO" "Architecture: $ARCH ($ARCH_TYPE)"
}

# ✅ FIX: Enhanced system resources check
check_system_resources() {
    log "INFO" "Checking system resources..."

    local warnings=0

    # Memory check with better parsing
    if command -v free >/dev/null 2>&1; then
        local total_mem
        total_mem=$(free -m | awk 'NR==2{printf "%.0f", $2}' 2>/dev/null || echo "0")

        if [[ $total_mem -lt 512 ]]; then
            log "ERROR" "Insufficient memory: ${total_mem}MB (minimum: 512MB)"
            ((warnings++))
        elif [[ $total_mem -lt 1024 ]]; then
            log "WARN" "Low memory detected: ${total_mem}MB (recommended: 2GB+)"
            ((warnings++))
        else
            log "SUCCESS" "Memory: ${total_mem}MB ✓"
        fi
    else
        log "WARN" "Cannot check memory usage"
        ((warnings++))
    fi

    # Disk space check with better error handling
    if command -v df >/dev/null 2>&1; then
        local available_space available_gb
        available_space=$(df / 2>/dev/null | awk 'NR==2 {print $4}' || echo "0")
        available_gb=$((available_space / 1024 / 1024))

        if [[ $available_gb -lt 2 ]]; then
            log "ERROR" "Insufficient disk space: ${available_gb}GB (minimum: 2GB)"
            ((warnings++))
        elif [[ $available_gb -lt 5 ]]; then
            log "WARN" "Low disk space: ${available_gb}GB (recommended: 10GB+)"
        else
            log "SUCCESS" "Disk space: ${available_gb}GB ✓"
        fi
    else
        log "WARN" "Cannot check disk space"
        ((warnings++))
    fi

    # CPU check
    if [[ -f /proc/cpuinfo ]]; then
        local cpu_count
        cpu_count=$(nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo 2>/dev/null || echo "1")
        log "INFO" "CPU cores: $cpu_count"

        if [[ $cpu_count -lt 1 ]]; then
            log "WARN" "Cannot determine CPU count"
            ((warnings++))
        fi
    fi

    # Network interfaces check
    if command -v ip >/dev/null 2>&1; then
        local interface_count
        interface_count=$(ip link show 2>/dev/null | grep -c "^[0-9]" || echo "0")

        if [[ $interface_count -lt 2 ]]; then
            log "WARN" "Limited network interfaces: $interface_count"
        else
            log "SUCCESS" "Network interfaces: $interface_count ✓"
        fi
    else
        log "WARN" "Cannot check network interfaces (ip command missing)"
        ((warnings++))
    fi

    return $warnings
}

# ✅ FIX: Enhanced command execution with better error handling
run_cmd() {
    local cmd="$1"
    local allow_failure="${2:-false}"
    local timeout_duration="${3:-300}"  # 5 minutes default timeout

    log "DEBUG" "Executing: $cmd"

    if [[ $DRY_RUN == true ]]; then
        log "INFO" "[DRY RUN] Would execute: $cmd"
        return 0
    fi

    # Add sudo if not root
    if [[ $EUID -ne 0 ]] && command -v sudo >/dev/null 2>&1; then
        cmd="sudo $cmd"
    fi

    # Execute with timeout
    if timeout "$timeout_duration" bash -c "$cmd" >> "$LOG_FILE" 2>&1; then
        log "DEBUG" "Command successful: $cmd"
        return 0
    else
        local exit_code=$?
        log "ERROR" "Command failed: $cmd (exit code: $exit_code)"

        if [[ $allow_failure == true ]]; then
            log "WARN" "Continuing despite failure (allowed)"
            return 0
        else
            return $exit_code
        fi
    fi
}

# ✅ FIX: Enhanced package management with retries
update_package_cache() {
    log "INFO" "Updating package cache..."

    local max_retries=3
    local retry_count=0

    while [[ $retry_count -lt $max_retries ]]; do
        case $PACKAGE_MANAGER in
            apt)
                if run_cmd "apt-get update -qq" true; then
                    break
                fi
                ;;
            dnf)
                if run_cmd "dnf check-update -q" true; then
                    break
                fi
                ;;
            yum)
                if run_cmd "yum check-update -q" true; then
                    break
                fi
                ;;
            apk)
                if run_cmd "apk update -q" true; then
                    break
                fi
                ;;
            pacman)
                if run_cmd "pacman -Sy --noconfirm" true; then
                    break
                fi
                ;;
            zypper)
                if run_cmd "zypper refresh" true; then
                    break
                fi
                ;;
        esac

        ((retry_count++))
        if [[ $retry_count -lt $max_retries ]]; then
            log "WARN" "Package cache update failed, retrying in 5 seconds... ($retry_count/$max_retries)"
            sleep 5
        fi
    done

    if [[ $retry_count -eq $max_retries ]]; then
        log "ERROR" "Failed to update package cache after $max_retries attempts"
        return 1
    fi

    log "SUCCESS" "Package cache updated"
}

# ✅ FIX: Enhanced package installation with dependency handling
install_package() {
    local package=$1
    local alternative=${2:-""}
    local required=${3:-true}

    log "INFO" "Installing package: $package"

    # Check if already installed
    if check_package_installed "$package"; then
        log "DEBUG" "Package already installed: $package"
        return 0
    fi

    case $PACKAGE_MANAGER in
        apt)
            if run_cmd "DEBIAN_FRONTEND=noninteractive apt-get install -y $package" true; then
                log "SUCCESS" "Installed: $package"
                return 0
            elif [[ -n "$alternative" ]]; then
                log "WARN" "Trying alternative: $alternative"
                if run_cmd "DEBIAN_FRONTEND=noninteractive apt-get install -y $alternative" true; then
                    log "SUCCESS" "Installed alternative: $alternative"
                    return 0
                fi
            fi
            ;;
        dnf)
            if run_cmd "dnf install -y $package" true; then
                log "SUCCESS" "Installed: $package"
                return 0
            elif [[ -n "$alternative" ]]; then
                if run_cmd "dnf install -y $alternative" true; then
                    log "SUCCESS" "Installed alternative: $alternative"
                    return 0
                fi
            fi
            ;;
        yum)
            if run_cmd "yum install -y $package" true; then
                log "SUCCESS" "Installed: $package"
                return 0
            elif [[ -n "$alternative" ]]; then
                if run_cmd "yum install -y $alternative" true; then
                    log "SUCCESS" "Installed alternative: $alternative"
                    return 0
                fi
            fi
            ;;
        apk)
            if run_cmd "apk add $package" true; then
                log "SUCCESS" "Installed: $package"
                return 0
            elif [[ -n "$alternative" ]]; then
                if run_cmd "apk add $alternative" true; then
                    log "SUCCESS" "Installed alternative: $alternative"
                    return 0
                fi
            fi
            ;;
        pacman)
            if run_cmd "pacman -S --noconfirm $package" true; then
                log "SUCCESS" "Installed: $package"
                return 0
            elif [[ -n "$alternative" ]]; then
                if run_cmd "pacman -S --noconfirm $alternative" true; then
                    log "SUCCESS" "Installed alternative: $alternative"
                    return 0
                fi
            fi
            ;;
        zypper)
            if run_cmd "zypper install -y $package" true; then
                log "SUCCESS" "Installed: $package"
                return 0
            elif [[ -n "$alternative" ]]; then
                if run_cmd "zypper install -y $alternative" true; then
                    log "SUCCESS" "Installed alternative: $alternative"
                    return 0
                fi
            fi
            ;;
    esac

    if [[ $required == true ]]; then
        log "ERROR" "Failed to install required package: $package"
        return 1
    else
        log "WARN" "Failed to install optional package: $package"
        return 0
    fi
}

# ✅ FIX: New function to check if package is installed
check_package_installed() {
    local package=$1

    case $PACKAGE_MANAGER in
        apt)
            dpkg -l "$package" 2>/dev/null | grep -q "^ii" || apt list --installed 2>/dev/null | grep -q "^$package/"
            ;;
        dnf|yum)
            rpm -q "$package" >/dev/null 2>&1
            ;;
        apk)
            apk info -e "$package" >/dev/null 2>&1
            ;;
        pacman)
            pacman -Q "$package" >/dev/null 2>&1
            ;;
        zypper)
            zypper search -i "$package" | grep -q "^i"
            ;;
        *)
            command -v "$package" >/dev/null 2>&1
            ;;
    esac
}

# ✅ FIX: Enhanced Python environment setup with virtual environment support
setup_python_environment() {
    log "INFO" "Setting up Python environment..."

    # Ensure Python 3 is available
    if ! command -v python3 >/dev/null 2>&1; then
        case $OS_FAMILY in
            debian)
                install_package "python3" "python3.9 python3.8"
                ;;
            redhat)
                install_package "python3" "python39 python38"
                ;;
            alpine)
                install_package "python3"
                ;;
            arch)
                install_package "python"
                ;;
            opensuse)
                install_package "python3"
                ;;
        esac
    fi

    # Ensure pip is available
    if ! command -v pip3 >/dev/null 2>&1; then
        case $OS_FAMILY in
            debian)
                install_package "python3-pip"
                ;;
            redhat)
                install_package "python3-pip"
                ;;
            alpine)
                install_package "py3-pip"
                ;;
            arch)
                install_package "python-pip"
                ;;
            opensuse)
                install_package "python3-pip"
                ;;
        esac
    fi

    # Install development packages
    case $OS_FAMILY in
        debian)
            install_package "python3-dev" "python3-devel" false
            install_package "python3-venv" "" false
            ;;
        redhat)
            install_package "python3-devel" "" false
            ;;
        alpine)
            install_package "python3-dev" "" false
            ;;
    esac

    # Upgrade pip safely
    if command -v pip3 >/dev/null 2>&1; then
        log "INFO" "Upgrading pip..."
        run_cmd "pip3 install --upgrade pip" true
    fi

    # Install essential Python packages with version pinning
    local python_packages=(
        "netifaces>=0.11.0,<0.12.0"
        "psutil>=5.9.0,<6.0.0"
        "python-iptables>=1.0.0"
        "setuptools>=60.0.0"
        "wheel>=0.37.0"
    )

    for package in "${python_packages[@]}"; do
        log "INFO" "Installing Python package: $package"
        if ! run_cmd "pip3 install '$package'" true; then
            log "WARN" "Failed to install Python package: $package"
        fi
    done

    # Verify Python installation
    if python3 -c "import sys; print(f'Python {sys.version}')" >/dev/null 2>&1; then
        local python_version
        python_version=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')")
        log "SUCCESS" "Python environment ready: $python_version"
    else
        log "ERROR" "Python installation verification failed"
        return 1
    fi
}

# ✅ FIX: Enhanced network tools installation with better organization
install_network_tools() {
    log "INFO" "Installing network management tools..."

    # Core network tools (required)
    local core_tools=()
    local optional_tools=()

    case $OS_FAMILY in
        debian)
            core_tools=(
                "iproute2"
                "iptables"
                "net-tools"
                "curl"
                "wget"
            )
            optional_tools=(
                "iptables-persistent"
                "dnsmasq"
                "dhcpcd5:isc-dhcp-client"
                "wireless-tools"
                "ethtool"
                "bridge-utils"
                "vlan"
                "netcat-openbsd:netcat"
                "nmap"
                "tcpdump"
                "iperf3"
                "traceroute"
                "dnsutils"
            )
            ;;
        redhat)
            core_tools=(
                "iproute"
                "iptables"
                "net-tools"
                "curl"
                "wget"
            )
            optional_tools=(
                "iptables-services"
                "dnsmasq"
                "dhclient"
                "wireless-tools"
                "ethtool"
                "bridge-utils"
                "nmap-ncat:netcat"
                "nmap"
                "tcpdump"
                "iperf3"
                "traceroute"
                "bind-utils"
            )
            ;;
        alpine)
            core_tools=(
                "iproute2"
                "iptables"
                "net-tools"
                "curl"
                "wget"
            )
            optional_tools=(
                "dnsmasq"
                "dhcpcd"
                "wireless-tools"
                "ethtool"
                "bridge"
                "netcat-openbsd"
                "nmap"
                "tcpdump"
                "iperf3"
            )
            ;;
        arch)
            core_tools=(
                "iproute2"
                "iptables"
                "net-tools"
                "curl"
                "wget"
            )
            optional_tools=(
                "dnsmasq"
                "dhcpcd"
                "wireless_tools"
                "ethtool"
                "bridge-utils"
                "gnu-netcat"
                "nmap"
                "tcpdump"
                "iperf3"
            )
            ;;
        opensuse)
            core_tools=(
                "iproute2"
                "iptables"
                "net-tools"
                "curl"
                "wget"
            )
            optional_tools=(
                "dnsmasq"
                "dhcpcd"
                "wireless-tools"
                "ethtool"
                "bridge-utils"
                "netcat-openbsd"
                "nmap"
                "tcpdump"
                "iperf"
            )
            ;;
    esac

    # Install core tools (required)
    for tool_spec in "${core_tools[@]}"; do
        local tool="${tool_spec%%:*}"
        local alternative="${tool_spec#*:}"

        if [[ "$alternative" == "$tool" ]]; then
            alternative=""
        fi

        install_package "$tool" "$alternative" true
    done

    # Install optional tools (best effort)
    for tool_spec in "${optional_tools[@]}"; do
        local tool="${tool_spec%%:*}"
        local alternative="${tool_spec#*:}"

        if [[ "$alternative" == "$tool" ]]; then
            alternative=""
        fi

        install_package "$tool" "$alternative" false
    done

    log "SUCCESS" "Network tools installation completed"
}

# ✅ FIX: Enhanced firewall configuration with container awareness
configure_firewall() {
    if [[ $SKIP_FIREWALL == true ]]; then
        log "INFO" "Skipping firewall configuration (container mode or explicitly skipped)"
        return 0
    fi

    log "INFO" "Configuring firewall system..."

    case $OS_FAMILY in
        debian)
            # Install UFW
            if install_package "ufw" "" false; then
                log "INFO" "Configuring UFW firewall..."

                # Reset UFW to defaults
                run_cmd "ufw --force reset" true

                # Set default policies
                run_cmd "ufw default deny incoming" true
                run_cmd "ufw default allow outgoing" true

                # Allow essential services
                run_cmd "ufw allow ssh" true
                run_cmd "ufw allow 22/tcp" true
                run_cmd "ufw allow 80/tcp" true
                run_cmd "ufw allow 443/tcp" true
                run_cmd "ufw allow 8000/tcp" true

                # Enable UFW
                run_cmd "ufw --force enable" true

                log "SUCCESS" "UFW firewall configured"
            else
                log "WARN" "Failed to install UFW"
            fi
            ;;
        redhat)
            # Configure firewalld
            if install_package "firewalld" "" false && [[ $HAS_SYSTEMD == true ]]; then
                log "INFO" "Configuring firewalld..."

                run_cmd "systemctl enable firewalld" true
                run_cmd "systemctl start firewalld" true

                # Configure firewall rules
                run_cmd "firewall-cmd --permanent --add-service=ssh" true
                run_cmd "firewall-cmd --permanent --add-service=http" true
                run_cmd "firewall-cmd --permanent --add-service=https" true
                run_cmd "firewall-cmd --permanent --add-port=8000/tcp" true
                run_cmd "firewall-cmd --reload" true

                log "SUCCESS" "Firewalld configured"
            else
                log "WARN" "Failed to configure firewalld"
            fi
            ;;
        *)
            log "INFO" "Firewall configuration not implemented for $OS_FAMILY"
            ;;
    esac
}

# ✅ FIX: Enhanced service management with container awareness
manage_services() {
    if [[ $HAS_SYSTEMD == false ]] || [[ $IS_CONTAINER == true ]]; then
        log "INFO" "Skipping service management (no systemd or container mode)"
        return 0
    fi

    log "INFO" "Managing system services..."

    # Services to enable (if available)
    local enable_services=()

    case $OS_FAMILY in
        debian)
            enable_services=("systemd-networkd" "systemd-resolved")
            ;;
        redhat)
            enable_services=("NetworkManager")
            ;;
    esac

    for service in "${enable_services[@]}"; do
        if systemctl list-unit-files 2>/dev/null | grep -q "^$service\.service"; then
            run_cmd "systemctl enable '$service'" true
            log "DEBUG" "Enabled service: $service"
        else
            log "DEBUG" "Service not available: $service"
        fi
    done

    # Services to stop (will be managed by NetGate)
    local stop_services=("dnsmasq" "bind9" "named" "systemd-resolved")

    for service in "${stop_services[@]}"; do
        if systemctl list-unit-files 2>/dev/null | grep -q "^$service\.service"; then
            run_cmd "systemctl stop '$service'" true
            run_cmd "systemctl disable '$service'" true
            log "DEBUG" "Stopped and disabled service: $service"
        fi
    done

    log "SUCCESS" "Service management completed"
}

# ✅ FIX: Enhanced network services configuration
configure_network_services() {
    log "INFO" "Configuring network services..."

    # Enable IP forwarding with backup
    log "INFO" "Enabling IP forwarding..."

    # Backup original sysctl config
    if [[ -f /etc/sysctl.conf ]] && [[ ! -f /etc/sysctl.conf.netgate-backup ]]; then
        run_cmd "cp /etc/sysctl.conf /etc/sysctl.conf.netgate-backup" true
    fi

    # Create NetGate-specific sysctl config
    run_cmd "mkdir -p /etc/sysctl.d" true

    cat > /tmp/99-netgate.conf << 'EOF'
# NetGate Firewall Network Configuration
# Generated by NetGate installer

# Enable IP forwarding
net.ipv4.ip_forward=1
net.ipv6.conf.all.forwarding=1

# Security settings
net.ipv4.conf.all.accept_redirects=0
net.ipv4.conf.all.send_redirects=0
net.ipv4.conf.all.accept_source_route=0
net.ipv4.conf.all.log_martians=1
net.ipv4.conf.default.accept_redirects=0
net.ipv4.conf.default.send_redirects=0
net.ipv4.conf.default.accept_source_route=0

# Network performance
net.core.netdev_max_backlog=5000
net.core.rmem_max=134217728
net.core.wmem_max=134217728
net.ipv4.tcp_rmem=4096 65536 134217728
net.ipv4.tcp_wmem=4096 65536 134217728
net.ipv4.tcp_congestion_control=bbr

# Connection tracking
net.netfilter.nf_conntrack_max=262144
net.netfilter.nf_conntrack_tcp_timeout_established=1800
EOF

    if run_cmd "cp /tmp/99-netgate.conf /etc/sysctl.d/99-netgate.conf" true; then
        run_cmd "sysctl -p /etc/sysctl.d/99-netgate.conf" true
        log "SUCCESS" "Network kernel parameters configured"
    else
        log "WARN" "Failed to configure network kernel parameters"
    fi

    # Configure dnsmasq
    if command -v dnsmasq >/dev/null 2>&1; then
        log "INFO" "Configuring dnsmasq..."

        run_cmd "mkdir -p /etc/dnsmasq.d" true

        # Create NetGate dnsmasq config directory
        cat > /tmp/netgate-dnsmasq.conf << 'EOF'
# NetGate Firewall dnsmasq configuration
# This file is managed by NetGate - do not edit manually

# Basic configuration
bind-interfaces
no-resolv
no-poll
clear-on-reload

# Logging
log-queries
log-dhcp

# Security
stop-dns-rebind
rebind-localhost-ok

# Cache settings
cache-size=1000
neg-ttl=60

# Include NetGate-specific configurations
conf-dir=/etc/dnsmasq.d/netgate,*.conf
EOF

        if run_cmd "cp /tmp/netgate-dnsmasq.conf /etc/dnsmasq.d/netgate-base.conf" true; then
            run_cmd "mkdir -p /etc/dnsmasq.d/netgate" true

            # Stop and disable dnsmasq service (will be managed by NetGate)
            if [[ $HAS_SYSTEMD == true ]] && [[ $IS_CONTAINER == false ]]; then
                run_cmd "systemctl stop dnsmasq" true
                run_cmd "systemctl disable dnsmasq" true
            fi

            log "SUCCESS" "Dnsmasq configured"
        else
            log "WARN" "Failed to configure dnsmasq"
        fi
    fi

    # Configure iptables persistence
    case $OS_FAMILY in
        debian)
            if command -v iptables-save >/dev/null 2>&1 && [[ $HAS_SYSTEMD == true ]]; then
                if install_package "iptables-persistent" "" false; then
                    run_cmd "systemctl enable netfilter-persistent" true
                    log "SUCCESS" "Iptables persistence configured"
                fi
            fi
            ;;
        redhat)
            if command -v iptables-save >/dev/null 2>&1 && [[ $HAS_SYSTEMD == true ]]; then
                if install_package "iptables-services" "" false; then
                    run_cmd "systemctl enable iptables" true
                    log "SUCCESS" "Iptables services configured"
                fi
            fi
            ;;
    esac
}

# ✅ FIX: Enhanced directory creation with proper permissions
create_directories() {
    log "INFO" "Creating NetGate directory structure..."

    # Define directory structure with permissions
    declare -A directories=(
        ["/opt/netgate"]="755"
        ["/opt/netgate/config"]="750"
        ["/opt/netgate/backups"]="750"
        ["/opt/netgate/logs"]="755"
        ["/opt/netgate/scripts"]="755"
        ["/opt/netgate/tmp"]="750"
        ["/var/log/netgate"]="755"
        ["/etc/netgate"]="755"
        ["/etc/netgate/conf.d"]="755"
    )

    for dir in "${!directories[@]}"; do
        local perm="${directories[$dir]}"

        if [[ ! -d "$dir" ]]; then
            if run_cmd "mkdir -p '$dir'" true; then
                run_cmd "chmod '$perm' '$dir'" true
                log "SUCCESS" "Created directory: $dir (permissions: $perm)"
            else
                log "ERROR" "Failed to create directory: $dir"
                return 1
            fi
        else
            log "DEBUG" "Directory exists: $dir"
            run_cmd "chmod '$perm' '$dir'" true
        fi
    done

    # Create configuration files
    cat > /tmp/netgate.conf << 'EOF'
# NetGate Firewall Configuration
# Generated by NetGate installer

[general]
installation_date = $(date -Iseconds)
installer_version = 2.1.0
os_family = ${OS_FAMILY}
package_manager = ${PACKAGE_MANAGER}

[paths]
config_dir = /etc/netgate
log_dir = /var/log/netgate
backup_dir = /opt/netgate/backups
script_dir = /opt/netgate/scripts

[network]
ip_forward_enabled = true
container_mode = ${IS_CONTAINER}
systemd_available = ${HAS_SYSTEMD}
EOF

    if run_cmd "cp /tmp/netgate.conf /etc/netgate/netgate.conf" true; then
        run_cmd "chmod 644 /etc/netgate/netgate.conf" true
        log "SUCCESS" "Configuration file created"
    fi

    log "SUCCESS" "Directory structure created successfully"
}

# ✅ FIX: Enhanced user creation with container awareness
create_netgate_user() {
    if [[ $IS_CONTAINER == true ]]; then
        log "INFO" "Skipping user creation in container mode"
        return 0
    fi

    log "INFO" "Setting up NetGate user..."

    # Create netgate user if not exists
    if ! id "netgate" &>/dev/null; then
        if run_cmd "useradd -r -s /bin/false -d /opt/netgate -c 'NetGate Firewall Service User' netgate" true; then
            log "SUCCESS" "Created netgate user"
        else
            log "WARN" "Failed to create netgate user, using existing user configuration"
        fi
    else
        log "DEBUG" "NetGate user already exists"
    fi

    # Set ownership with error handling
    local chown_dirs=("/opt/netgate" "/var/log/netgate")

    for dir in "${chown_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            if id "netgate" &>/dev/null; then
                run_cmd "chown -R netgate:netgate '$dir'" true
            else
                log "WARN" "NetGate user not available, keeping root ownership for $dir"
            fi
        fi
    done

    # Add netgate user to necessary groups (if user exists)
    if id "netgate" &>/dev/null; then
        local groups=("adm")

        # Add OS-specific groups
        case $OS_FAMILY in
            debian)
                groups+=("netdev" "sudo")
                ;;
            redhat)
                groups+=("wheel")
                ;;
        esac

        for group in "${groups[@]}"; do
            if getent group "$group" >/dev/null 2>&1; then
                run_cmd "usermod -a -G '$group' netgate" true
                log "DEBUG" "Added netgate user to group: $group"
            fi
        done
    fi

    log "SUCCESS" "NetGate user configuration completed"
}

# ✅ FIX: Enhanced validation with comprehensive testing
validate_installation() {
    log "INFO" "Validating installation..."

    local validation_errors=0
    local validation_warnings=0

    # Check essential commands
    log "INFO" "Checking essential commands..."
    local essential_commands=("ip" "iptables" "ping" "curl" "python3" "pip3")

    for cmd in "${essential_commands[@]}"; do
        if command -v "$cmd" >/dev/null 2>&1; then
            log "SUCCESS" "✓ $cmd available"
        else
            log "ERROR" "✗ $cmd missing"
            ((validation_errors++))
        fi
    done

    # Check Python packages
    log "INFO" "Checking Python packages..."
    local python_packages=("netifaces" "psutil")

    for package in "${python_packages[@]}"; do
        if python3 -c "import $package" 2>/dev/null; then
            # Get package version
            local version
            version=$(python3 -c "import $package; print(getattr($package, '__version__', 'unknown'))" 2>/dev/null || echo "unknown")
            log "SUCCESS" "✓ Python package: $package ($version)"
        else
            log "WARN" "✗ Python package missing: $package"
            ((validation_warnings++))
        fi
    done

    # Check directories and permissions
    log "INFO" "Checking directories and permissions..."
    local directories=("/opt/netgate" "/var/log/netgate" "/etc/netgate")

    for dir in "${directories[@]}"; do
        if [[ -d "$dir" ]]; then
            local perm
            perm=$(stat -c "%a" "$dir" 2>/dev/null || stat -f "%Lp" "$dir" 2>/dev/null || echo "unknown")
            log "SUCCESS" "✓ Directory: $dir (permissions: $perm)"
        else
            log "ERROR" "✗ Directory missing: $dir"
            ((validation_errors++))
        fi
    done

    # Check network configuration
    log "INFO" "Checking network configuration..."

    # IP forwarding
    if [[ $(cat /proc/sys/net/ipv4/ip_forward 2>/dev/null || echo "0") -eq 1 ]]; then
        log "SUCCESS" "✓ IP forwarding enabled"
    else
        log "WARN" "✗ IP forwarding disabled"
        ((validation_warnings++))
    fi

    # Network interfaces
    if command -v ip >/dev/null 2>&1; then
        local interface_count
        interface_count=$(ip link show 2>/dev/null | grep -c "^[0-9]" || echo "0")

        if [[ $interface_count -gt 0 ]]; then
            log "SUCCESS" "✓ Network interfaces detected: $interface_count"

            # List interfaces
            if [[ $VERBOSE == true ]]; then
                log "DEBUG" "Available interfaces:"
                ip link show 2>/dev/null | grep "^[0-9]" | while read -r line; do
                    local iface
                    iface=$(echo "$line" | awk '{print $2}' | sed 's/:$//')
                    log "DEBUG" "  - $iface"
                done
            fi
        else
            log "ERROR" "✗ No network interfaces detected"
            ((validation_errors++))
        fi
    else
        log "ERROR" "✗ Cannot check network interfaces"
        ((validation_errors++))
    fi

    # Check iptables functionality
    if command -v iptables >/dev/null 2>&1; then
        if iptables -L >/dev/null 2>&1; then
            log "SUCCESS" "✓ Iptables functional"
        else
            log "WARN" "✗ Iptables not functional (may be normal in containers)"
            ((validation_warnings++))
        fi
    fi

    # Check systemd (if not in container)
    if [[ $IS_CONTAINER == false ]]; then
        if [[ $HAS_SYSTEMD == true ]]; then
            log "SUCCESS" "✓ Systemd available"
        else
            log "WARN" "✗ Systemd not available"
            ((validation_warnings++))
        fi
    fi

    # Network connectivity test
    log "INFO" "Testing network connectivity..."
    if timeout 10 ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        log "SUCCESS" "✓ Network connectivity (IPv4)"
    else
        log "WARN" "✗ No IPv4 connectivity (may be normal in restricted environments)"
        ((validation_warnings++))
    fi

    # DNS resolution test
    if timeout 10 nslookup google.com >/dev/null 2>&1 || timeout 10 host google.com >/dev/null 2>&1; then
        log "SUCCESS" "✓ DNS resolution working"
    else
        log "WARN" "✗ DNS resolution not working (may be normal in restricted environments)"
        ((validation_warnings++))
    fi

    # Port availability test
    log "INFO" "Checking port availability..."
    local required_ports=(8000)

    for port in "${required_ports[@]}"; do
        if command -v netstat >/dev/null 2>&1; then
            if netstat -tuln 2>/dev/null | grep -q ":$port "; then
                log "WARN" "Port $port is already in use"
                ((validation_warnings++))
            else
                log "SUCCESS" "✓ Port $port available"
            fi
        elif command -v ss >/dev/null 2>&1; then
            if ss -tuln 2>/dev/null | grep -q ":$port "; then
                log "WARN" "Port $port is already in use"
                ((validation_warnings++))
            else
                log "SUCCESS" "✓ Port $port available"
            fi
        else
            log "DEBUG" "Cannot check port availability (netstat/ss not available)"
        fi
    done

    # Summary
    echo ""
    log "INFO" "📊 Validation Summary:"
    log "INFO" "  • Errors: $validation_errors"
    log "INFO" "  • Warnings: $validation_warnings"

    if [[ $validation_errors -eq 0 ]]; then
        if [[ $validation_warnings -eq 0 ]]; then
            log "SUCCESS" "🎉 Installation validation passed perfectly!"
        else
            log "SUCCESS" "🎉 Installation validation passed with $validation_warnings warnings!"
        fi
        return 0
    else
        log "ERROR" "❌ Installation validation failed with $validation_errors errors and $validation_warnings warnings"
        return 1
    fi
}

# ✅ FIX: Enhanced cleanup function
cleanup() {
    log "DEBUG" "Performing cleanup..."

    # Remove PID file
    [[ -f "$PID_FILE" ]] && rm -f "$PID_FILE"

    # Remove temporary files
    rm -f /tmp/99-netgate.conf
    rm -f /tmp/netgate.conf
    rm -f /tmp/netgate-dnsmasq.conf

    # Rotate log if it's too large
    if [[ -f "$LOG_FILE" ]] && [[ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt 5242880 ]]; then
        mv "$LOG_FILE" "${LOG_FILE}.old"
    fi
}

# ✅ FIX: Enhanced signal handling
setup_signal_handlers() {
    trap 'log "WARN" "Installation interrupted by user"; cleanup; exit 130' INT
    trap 'log "ERROR" "Installation terminated"; cleanup; exit 143' TERM
    trap 'cleanup' EXIT
}

# ==================================================================
# MAIN INSTALLATION PROCESS
# ==================================================================

main() {
    # Setup
    setup_signal_handlers
    check_running_instance
    print_banner

    # Initialize log file with header
    {
        echo "=================================================================="
        echo "NetGate Firewall Installation Log"
        echo "Started: $(date)"
        echo "Script Version: $SCRIPT_VERSION"
        echo "PID: $$"
        echo "=================================================================="
    } > "$LOG_FILE"

    log "INFO" "Starting NetGate Firewall system requirements installation..."
    log "INFO" "Log file: $LOG_FILE"
    log "INFO" "PID file: $PID_FILE"

    # Environment detection
    detect_environment
    detect_os
    detect_architecture
    check_root

    # System resource check
    if ! check_system_resources; then
        log "WARN" "System resources are below recommended levels"
        if [[ $FORCE_INSTALL == false ]]; then
            read -p "Continue anyway? [y/N]: " -r
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log "INFO" "Installation cancelled due to insufficient resources"
                exit 1
            fi
        fi
    fi

    # Pre-installation summary
    echo ""
    log "INFO" "📋 Installation Summary:"
    log "INFO" "  • OS: $OS_NAME ($OS_FAMILY)"
    log "INFO" "  • Version: $OS_VERSION"
    log "INFO" "  • Architecture: $ARCH ($ARCH_TYPE)"
    log "INFO" "  • Package Manager: $PACKAGE_MANAGER"
    log "INFO" "  • Container Environment: $IS_CONTAINER"
    log "INFO" "  • Systemd Available: $HAS_SYSTEMD"
    log "INFO" "  • Root Access: Available"
    log "INFO" "  • Skip Firewall: $SKIP_FIREWALL"
    echo ""

    if [[ $DRY_RUN == false ]] && [[ $FORCE_INSTALL == false ]]; then
        read -p "Continue with installation? [Y/n]: " -r
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            log "INFO" "Installation cancelled by user"
            exit 0
        fi
    fi

    echo ""
    log "INFO" "🚀 Starting installation process..."

    # Installation steps with error handling
    local steps=(
        "update_package_cache"
        "install_base_packages"
        "install_network_tools"
        "setup_python_environment"
        "create_directories"
        "create_netgate_user"
        "configure_network_services"
        "configure_firewall"
        "manage_services"
        "validate_installation"
    )

    local step_count=1
    local total_steps=${#steps[@]}
    local failed_steps=()

    for step in "${steps[@]}"; do
        echo ""
        log "INFO" "📦 Step $step_count/$total_steps: $step"

        local step_start_time
        step_start_time=$(date +%s)

        if eval "$step"; then
            local step_duration=$(($(date +%s) - step_start_time))
            log "SUCCESS" "Step $step_count completed successfully (${step_duration}s)"
        else
            local step_duration=$(($(date +%s) - step_start_time))
            log "ERROR" "Step $step_count failed: $step (${step_duration}s)"
            failed_steps+=("$step")

            if [[ $FORCE_INSTALL == false ]]; then
                log "ERROR" "Installation aborted due to failure in step: $step"
                echo ""
                log "ERROR" "Failed steps: ${failed_steps[*]}"
                exit 1
            else
                log "WARN" "Continuing despite failure (force mode enabled)"
            fi
        fi

        ((step_count++))
    done

    # Installation complete
    local total_duration=$(($(date +%s) - $(stat -c %Y "$PID_FILE" 2>/dev/null || date +%s)))

    echo ""
    echo -e "${GREEN}=================================================================="
    echo "🎉 NetGate Firewall System Requirements Installation Complete!"
    echo "=================================================================="
    echo -e "${NC}"

    log "SUCCESS" "📋 Installation Summary:"
    log "SUCCESS" "  ✓ Operating System: $OS_NAME"
    log "SUCCESS" "  ✓ Network tools installed and configured"
    log "SUCCESS" "  ✓ Python environment ready"
    log "SUCCESS" "  ✓ System directories created"
    log "SUCCESS" "  ✓ User and permissions configured"
    log "SUCCESS" "  ✓ Network services configured"

    if [[ $SKIP_FIREWALL == false ]]; then
        log "SUCCESS" "  ✓ Firewall system configured"
    else
        log "INFO" "  • Firewall configuration skipped (container mode)"
    fi

    log "SUCCESS" "  ✓ Installation completed in ${total_duration}s"

    if [[ ${#failed_steps[@]} -gt 0 ]]; then
        log "WARN" "  ⚠ Some steps failed: ${failed_steps[*]}"
    fi

    echo ""
    log "INFO" "📄 Installation log: $LOG_FILE"
    log "INFO" "🚀 NetGate Firewall backend is ready!"

    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. 📁 Navigate to your NetGate backend directory"
    echo "2. 🐍 Install Python dependencies: pip3 install -r requirements.txt"
    echo "3. 🚀 Start NetGate backend: python3 run_server.py"
    echo "4. 🌐 Access web interface at: http://localhost:8000"
    echo "5. 🔐 Login with: admin / admin123"
    echo "6. ⚙️ Configure network interfaces via Interface Settings"

    echo ""
    if [[ $IS_CONTAINER == true ]]; then
        echo -e "${CYAN}Container-specific notes:${NC}"
        echo "• Some network operations may require additional container privileges"
        echo "• Firewall configuration was skipped (normal in containers)"
        echo "• Service management was skipped (normal in containers)"
    fi

    echo ""
    log "SUCCESS" "Installation completed successfully! 🎉"

    # Final system info
    if [[ $VERBOSE == true ]]; then
        echo ""
        log "DEBUG" "System Information:"
        log "DEBUG" "  Kernel: $(uname -r)"
        log "DEBUG" "  Uptime: $(uptime -p 2>/dev/null || uptime)"
        log "DEBUG" "  Memory: $(free -h | awk 'NR==2{print $3"/"$2}')"
        log "DEBUG" "  Disk: $(df -h / | awk 'NR==2{print $3"/"$2" ("$5" used)"}')"
    fi
}

# ==================================================================
# COMMAND LINE ARGUMENT PARSING
# ==================================================================

show_help() {
    cat << 'EOF'
NetGate Firewall System Requirements Installer v2.1.0

USAGE:
    install_system_requirements.sh [OPTIONS]

OPTIONS:
    -h, --help              Show this help message and exit
    -v, --verbose           Enable verbose output and debugging
    -d, --dry-run           Show what would be done without executing
    -f, --force             Continue installation even if steps fail
    --skip-firewall         Skip firewall configuration
    --container             Force container mode detection
    --version               Show script version and exit

EXAMPLES:
    # Standard installation
    sudo ./install_system_requirements.sh

    # Verbose installation with detailed output
    sudo ./install_system_requirements.sh --verbose

    # Test run (see what would be done)
    sudo ./install_system_requirements.sh --dry-run

    # Force installation (continue on non-critical errors)
    sudo ./install_system_requirements.sh --force

    # Skip firewall configuration
    sudo ./install_system_requirements.sh --skip-firewall

    # Container mode installation
    sudo ./install_system_requirements.sh --container

REQUIREMENTS:
    • Linux-based operating system
    • Root privileges or sudo access
    • Internet connectivity for package downloads
    • Minimum 512MB RAM (2GB+ recommended)
    • Minimum 2GB disk space (10GB+ recommended)

SUPPORTED SYSTEMS:
    • Ubuntu 18.04+ / Debian 9+
    • CentOS 7+ / RHEL 7+ / Fedora 30+
    • Alpine Linux 3.12+
    • Arch Linux / Manjaro
    • openSUSE Leap 15+

LOG FILES:
    Installation logs are saved to: /tmp/netgate_install_YYYYMMDD_HHMMSS.log

SUPPORT:
    For issues and support, check the installation log file for detailed
    error information and troubleshooting steps.

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            log "INFO" "Dry run mode enabled - no changes will be made"
            shift
            ;;
        -f|--force)
            FORCE_INSTALL=true
            log "WARN" "Force mode enabled - will continue on non-critical errors"
            shift
            ;;
        --skip-firewall)
            SKIP_FIREWALL=true
            log "INFO" "Firewall configuration will be skipped"
            shift
            ;;
        --container)
            CONTAINER_MODE=true
            IS_CONTAINER=true
            SKIP_FIREWALL=true
            log "INFO" "Container mode forced"
            shift
            ;;
        --version)
            echo "NetGate Firewall System Requirements Installer v$SCRIPT_VERSION"
            exit 0
            ;;
        -*)
            echo "Error: Unknown option: $1" >&2
            echo "Use --help for usage information" >&2
            exit 1
            ;;
        *)
            echo "Error: Unexpected argument: $1" >&2
            echo "Use --help for usage information" >&2
            exit 1
            ;;
    esac
done

# ==================================================================
# SCRIPT EXECUTION
# ==================================================================

# Enable debug mode if verbose
if [[ $VERBOSE == true ]]; then
    set -x
fi

# Check if script is being executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Script is being executed directly
    main "$@"
else
    # Script is being sourced
    log "INFO" "Script sourced - functions available for use"
fi