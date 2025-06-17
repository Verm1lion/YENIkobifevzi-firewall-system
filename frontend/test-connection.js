import axios from 'axios'

const API_BASE = 'http://127.0.0.1:8000'

async function testConnection() {
  console.log('Testing backend connection...')
  console.log(`API Base: ${API_BASE}`)

  try {
    // Test 1: Simple connection
    console.log('\n1. Testing basic connection...')
    const response = await axios.get(`${API_BASE}/`, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    console.log('✅ Basic connection successful:', response.data)

    // Test 2: Health check
    console.log('\n2. Testing health endpoint...')
    const healthResponse = await axios.get(`${API_BASE}/health`, {
      timeout: 10000
    })
    console.log('✅ Health check successful:', healthResponse.data)

    // Test 3: API docs
    console.log('\n3. Testing API docs...')
    try {
      const docsResponse = await axios.get(`${API_BASE}/docs`, {
        timeout: 5000,
        validateStatus: function (status) {
          return status < 500; // Accept any status less than 500
        }
      })
      console.log('✅ API docs accessible:', docsResponse.status)
    } catch (e) {
      console.log('⚠️  API docs test skipped (expected for HTML endpoint)')
    }

    // Test 4: Login
    console.log('\n4. Testing login endpoint...')
    const loginResponse = await axios.post(`${API_BASE}/api/v1/auth/login`, {
      username: 'admin',
      password: 'admin123'
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    console.log('✅ Login successful:', {
      access_token: loginResponse.data.access_token ? 'Present' : 'Missing',
      user: loginResponse.data.user
    })

    // Test 5: Protected endpoint
    console.log('\n5. Testing protected endpoint...')
    const token = loginResponse.data.access_token
    const meResponse = await axios.get(`${API_BASE}/api/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    })
    console.log('✅ Protected endpoint successful:', meResponse.data)

    console.log('\n🎉 All tests passed! Backend is working correctly.')

  } catch (error) {
    console.error('\n❌ Test failed:')
    console.error('Error:', error.message)

    if (error.code) {
      console.error('Error Code:', error.code)
    }

    if (error.response) {
      console.error('Response Status:', error.response.status)
      console.error('Response Data:', error.response.data)
    } else if (error.request) {
      console.error('No response received. Check if backend is running on http://127.0.0.1:8000')
      console.error('Request details:', {
        method: error.config?.method,
        url: error.config?.url,
        timeout: error.config?.timeout
      })
    }

    console.log('\n🔧 Troubleshooting steps:')
    console.log('1. Check if backend is running: http://127.0.0.1:8000/health')
    console.log('2. Check if MongoDB is running')
    console.log('3. Check backend logs for errors')
    console.log('4. Try: cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload')
  }
}

testConnection()