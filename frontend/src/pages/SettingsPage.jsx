import React from 'react'
import { Helmet } from 'react-helmet-async'

const SettingsPage = () => {
  return (
    <>
      <Helmet>
        <title>Settings - KOBI Firewall</title>
      </Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage system configuration and preferences
          </p>
        </div>
        
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">General Settings</h3>
          </div>
          <div className="card-body">
            <p className="text-gray-500">Settings interface will be implemented here.</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default SettingsPage