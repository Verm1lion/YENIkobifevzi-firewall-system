import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiPlay,
  FiPause,
  FiSearch,
  FiRefreshCw,
  FiShield,
  FiCheck,
  FiX,
} from 'react-icons/fi'
import apiService from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

// Validation schema
const ruleSchema = yup.object().shape({
  rule_name: yup.string().required('Rule name is required').min(3, 'Rule name must be at least 3 characters'),
  description: yup.string().max(500, 'Description must be less than 500 characters'),
  action: yup.string().required('Action is required').oneOf(['ALLOW', 'DENY', 'DROP', 'REJECT']),
  direction: yup.string().required('Direction is required').oneOf(['IN', 'OUT', 'BOTH']),
  protocol: yup.string().required('Protocol is required').oneOf(['TCP', 'UDP', 'ICMP', 'ANY']),
  priority: yup.number().min(1, 'Priority must be at least 1').max(1000, 'Priority must be at most 1000'),
})

const FirewallRulesPage = () => {
  const queryClient = useQueryClient()

  // State
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [selectedRules, setSelectedRules] = useState([])
  const [filters, setFilters] = useState({
    search: '',
    enabled: null,
    action: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(25)

  // Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(ruleSchema),
    defaultValues: {
      enabled: true,
      priority: 100,
      action: 'ALLOW',
      direction: 'IN',
      protocol: 'TCP',
    }
  })

  // Queries
  const {
    data: rulesData,
    isLoading: rulesLoading,
    error: rulesError,
    refetch: refetchRules
  } = useQuery({
    queryKey: ['firewallRules', currentPage, pageSize, filters],
    queryFn: () => apiService.getFirewallRules({
      page: currentPage,
      per_page: pageSize,
      ...filters
    }),
    keepPreviousData: true,
  })

  const { data: firewallStats } = useQuery({
    queryKey: ['firewallStats'],
    queryFn: apiService.getFirewallStats,
    refetchInterval: 30000,
  })

  // Mutations
  const createRuleMutation = useMutation({
    mutationFn: apiService.createFirewallRule,
    onSuccess: () => {
      toast.success('Firewall rule created successfully')
      queryClient.invalidateQueries(['firewallRules'])
      queryClient.invalidateQueries(['firewallStats'])
      setShowModal(false)
      reset()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create firewall rule')
    }
  })

  const updateRuleMutation = useMutation({
    mutationFn: ({ ruleId, data }) => apiService.updateFirewallRule(ruleId, data),
    onSuccess: () => {
      toast.success('Firewall rule updated successfully')
      queryClient.invalidateQueries(['firewallRules'])
      queryClient.invalidateQueries(['firewallStats'])
      setShowModal(false)
      setEditingRule(null)
      reset()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update firewall rule')
    }
  })

  const deleteRuleMutation = useMutation({
    mutationFn: apiService.deleteFirewallRule,
    onSuccess: () => {
      toast.success('Firewall rule deleted successfully')
      queryClient.invalidateQueries(['firewallRules'])
      queryClient.invalidateQueries(['firewallStats'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete firewall rule')
    }
  })

  // Event handlers
  const handleCreateRule = () => {
    setEditingRule(null)
    reset()
    setShowModal(true)
  }

  const handleEditRule = (rule) => {
    setEditingRule(rule)
    reset(rule)
    setShowModal(true)
  }

  const handleDeleteRule = async (rule) => {
    if (window.confirm(`Are you sure you want to delete rule "${rule.rule_name}"?`)) {
      deleteRuleMutation.mutate(rule.id)
    }
  }

  const onSubmit = (data) => {
    if (editingRule) {
      updateRuleMutation.mutate({
        ruleId: editingRule.id,
        data
      })
    } else {
      createRuleMutation.mutate(data)
    }
  }

  const getActionVariant = (action) => {
    switch (action) {
      case 'ALLOW': return 'text-green-600'
      case 'DENY': return 'text-red-600'
      case 'DROP': return 'text-yellow-600'
      case 'REJECT': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (rulesError) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> Failed to load firewall rules</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>Firewall Rules - KOBI Firewall</title>
      </Helmet>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Firewall Rules
            </h1>
            <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <FiShield className="flex-shrink-0 mr-1.5 h-5 w-5" />
                {firewallStats?.total_rules || 0} Total Rules
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <FiCheck className="flex-shrink-0 mr-1.5 h-5 w-5 text-green-400" />
                {firewallStats?.enabled_rules || 0} Active Rules
              </div>
            </div>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-2">
            <button
              onClick={handleCreateRule}
              className="btn btn-primary"
            >
              <FiPlus className="mr-2 h-4 w-4" />
              Add Rule
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="card-body">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <input
                  type="text"
                  placeholder="Search rules..."
                  className="form-control"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              <div>
                <select
                  className="form-control"
                  value={filters.enabled || ''}
                  onChange={(e) => setFilters({ ...filters, enabled: e.target.value === '' ? null : e.target.value === 'true' })}
                >
                  <option value="">All Statuses</option>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <div>
                <select
                  className="form-control"
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                >
                  <option value="">All Actions</option>
                  <option value="ALLOW">ALLOW</option>
                  <option value="DENY">DENY</option>
                  <option value="DROP">DROP</option>
                  <option value="REJECT">REJECT</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Rules Table */}
        <div className="card">
          {rulesLoading ? (
            <div className="p-6">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Rule Name</th>
                    <th>Status</th>
                    <th>Action</th>
                    <th>Direction</th>
                    <th>Protocol</th>
                    <th>Priority</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rulesData?.data?.map((rule) => (
                    <tr key={rule.id}>
                      <td>
                        <div>
                          <div className="font-medium text-gray-900">{rule.rule_name}</div>
                          {rule.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {rule.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          rule.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td>
                        <span className={`font-medium ${getActionVariant(rule.action)}`}>
                          {rule.action}
                        </span>
                      </td>
                      <td>{rule.direction}</td>
                      <td>{rule.protocol}</td>
                      <td>
                        <span className="text-sm font-mono">{rule.priority}</span>
                      </td>
                      <td>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditRule(rule)}
                            className="text-blue-600 hover:text-blue-500"
                          >
                            <FiEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule)}
                            className="text-red-600 hover:text-red-500"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rulesData?.data?.length === 0 && (
                <div className="p-6 text-center">
                  <p className="text-gray-500">No firewall rules found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rule Form Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      {editingRule ? 'Edit Rule' : 'Add Rule'}
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="form-label">Rule Name</label>
                        <input
                          type="text"
                          className="form-control"
                          {...register('rule_name')}
                        />
                        {errors.rule_name && (
                          <p className="mt-1 text-sm text-red-600">{errors.rule_name.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="form-label">Description</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          {...register('description')}
                        />
                        {errors.description && (
                          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Action</label>
                          <select className="form-control" {...register('action')}>
                            <option value="ALLOW">ALLOW</option>
                            <option value="DENY">DENY</option>
                            <option value="DROP">DROP</option>
                            <option value="REJECT">REJECT</option>
                          </select>
                          {errors.action && (
                            <p className="mt-1 text-sm text-red-600">{errors.action.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="form-label">Direction</label>
                          <select className="form-control" {...register('direction')}>
                            <option value="IN">Inbound</option>
                            <option value="OUT">Outbound</option>
                            <option value="BOTH">Both</option>
                          </select>
                          {errors.direction && (
                            <p className="mt-1 text-sm text-red-600">{errors.direction.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Protocol</label>
                          <select className="form-control" {...register('protocol')}>
                            <option value="TCP">TCP</option>
                            <option value="UDP">UDP</option>
                            <option value="ICMP">ICMP</option>
                            <option value="ANY">ANY</option>
                          </select>
                          {errors.protocol && (
                            <p className="mt-1 text-sm text-red-600">{errors.protocol.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="form-label">Priority</label>
                          <input
                            type="number"
                            min={1}
                            max={1000}
                            className="form-control"
                            {...register('priority')}
                          />
                          {errors.priority && (
                            <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="form-checkbox"
                            {...register('enabled')}
                          />
                          <span className="ml-2">Enable Rule</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting || createRuleMutation.isPending || updateRuleMutation.isPending}
                    >
                      {editingRule ? 'Update' : 'Create'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary mr-3"
                      onClick={() => {
                        setShowModal(false)
                        setEditingRule(null)
                        reset()
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default FirewallRulesPage