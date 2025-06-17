# KOBI Firewall - Enterprise Security Solution

Modern, web-based firewall management system built with FastAPI and React.

## Features

- 🔐 **Authentication System** - Secure login/logout
- 📊 **Dashboard** - Real-time system monitoring
- 🛡️ **Firewall Rules** - Create, edit, and manage firewall rules
- 📝 **System Logs** - View and analyze system logs
- ⚙️ **Settings** - System configuration

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** - NoSQL database
- **JWT** - Authentication
- **Pydantic** - Data validation

### Frontend
- **React 18** - Modern UI library
- **Tailwind CSS** - Utility-first CSS framework
- **React Query** - Data fetching
- **React Router** - Navigation

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create admin user
python create_admin.py

# Start backend
python run_server.py