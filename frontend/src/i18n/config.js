import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Translation resources
const resources = {
  en: {
    translation: {
      app: {
        title: 'KOBI Firewall',
        description: 'Enterprise Security Solution'
      },
      nav: {
        dashboard: 'Dashboard',
        firewall: 'Firewall',
        rules: 'Rules',
        groups: 'Groups',
        network: 'Network',
        interfaces: 'Interfaces',
        routes: 'Routes',
        nat: 'NAT',
        dns: 'DNS Management',
        monitoring: 'Monitoring',
        logs: 'Logs',
        alerts: 'Alerts',
        reports: 'Reports',
        system: 'System',
        settings: 'Settings',
        updates: 'Updates',
        backup: 'Backup'
      },
      common: {
        enabled: 'Enabled',
        disabled: 'Disabled',
        enable: 'Enable',
        disable: 'Disable',
        actions: 'Actions',
        cancel: 'Cancel',
        save: 'Save',
        create: 'Create',
        update: 'Update',
        delete: 'Delete',
        edit: 'Edit',
        view: 'View',
        search: 'Search',
        filter: 'Filter',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success'
      },
      dashboard: {
        title: 'Dashboard',
        subtitle: 'System overview and monitoring',
        status: {
          healthy: 'System Healthy',
          unhealthy: 'System Issues'
        },
        stats: {
          firewallRules: 'Firewall Rules',
          blockedThreats: 'Blocked Threats',
          activeConnections: 'Active Connections',
          systemUptime: 'System Uptime',
          active: 'active',
          last24h: 'Last 24h',
          running: 'Running'
        },
        charts: {
          systemResources: 'System Resources',
          networkTraffic: 'Network Traffic'
        },
        recentAlerts: {
          title: 'Recent Security Alerts',
          noAlerts: 'No Security Alerts',
          allClear: 'All systems are operating normally'
        },
        systemStatus: {
          title: 'System Status',
          firewall: 'Firewall',
          dns: 'DNS Service',
          database: 'Database',
          logging: 'Logging'
        },
        threatAnalysis: {
          title: 'Threat Analysis'
        },
        viewAll: 'View All',
        error: {
          title: 'Dashboard Error',
          message: 'Failed to load dashboard data'
        }
      },
      firewallRules: {
        title: 'Firewall Rules',
        addRule: 'Add Rule',
        editRule: 'Edit Rule',
        totalRules: 'Total Rules',
        activeRules: 'Active Rules',
        syncAll: 'Sync All',
        searchPlaceholder: 'Search rules...',
        allStatuses: 'All Statuses',
        allActions: 'All Actions',
        allGroups: 'All Groups',
        selectedCount: '{{count}} rules selected',
        confirmDelete: 'Are you sure you want to delete rule "{{name}}"?',
        confirmSync: 'This will sync all enabled rules to the firewall. Continue?',
        table: {
          name: 'Rule Name',
          status: 'Status',
          action: 'Action',
          direction: 'Direction',
          protocol: 'Protocol',
          priority: 'Priority',
          hits: 'Hits'
        },
        form: {
          ruleName: 'Rule Name',
          description: 'Description',
          action: 'Action',
          direction: 'Direction',
          protocol: 'Protocol',
          priority: 'Priority',
          sourceIPs: 'Source IPs',
          destinationIPs: 'Destination IPs',
          sourcePorts: 'Source Ports',
          destinationPorts: 'Destination Ports',
          group: 'Group',
          noGroup: 'No Group',
          enabled: 'Enable Rule'
        },
        messages: {
          ruleCreated: 'Firewall rule created successfully',
          ruleUpdated: 'Firewall rule updated successfully',
          ruleDeleted: 'Firewall rule deleted successfully',
          bulkEnabled: 'Selected rules have been enabled',
          bulkDisabled: 'Selected rules have been disabled',
          syncStarted: 'Firewall synchronization started',
          createError: 'Failed to create firewall rule',
          updateError: 'Failed to update firewall rule',
          deleteError: 'Failed to delete firewall rule',
          toggleError: 'Failed to toggle rule status'
        },
        error: {
          title: 'Firewall Rules Error',
          message: 'Failed to load firewall rules'
        }
      },
      header: {
        toggleTheme: 'Toggle Theme',
        notifications: 'Notifications',
        viewAllNotifications: 'View All Notifications',
        profile: 'Profile',
        settings: 'Settings',
        logout: 'Logout'
      }
    }
  },
  tr: {
    translation: {
      app: {
        title: 'KOBI Güvenlik Duvarı',
        description: 'Kurumsal Güvenlik Çözümü'
      },
      nav: {
        dashboard: 'Ana Sayfa',
        firewall: 'Güvenlik Duvarı',
        rules: 'Kurallar',
        groups: 'Gruplar',
        network: 'Ağ',
        interfaces: 'Arayüzler',
        routes: 'Rotalar',
        nat: 'NAT',
        dns: 'DNS Yönetimi',
        monitoring: 'İzleme',
        logs: 'Loglar',
        alerts: 'Alarmlar',
        reports: 'Raporlar',
        system: 'Sistem',
        settings: 'Ayarlar',
        updates: 'Güncellemeler',
        backup: 'Yedekleme'
      },
      common: {
        enabled: 'Etkin',
        disabled: 'Pasif',
        enable: 'Etkinleştir',
        disable: 'Pasifleştir',
        actions: 'İşlemler',
        cancel: 'İptal',
        save: 'Kaydet',
        create: 'Oluştur',
        update: 'Güncelle',
        delete: 'Sil',
        edit: 'Düzenle',
        view: 'Görüntüle',
        search: 'Ara',
        filter: 'Filtrele',
        loading: 'Yükleniyor...',
        error: 'Hata',
        success: 'Başarılı'
      }
    }
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: localStorage.getItem('language') || 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  })

export default i18n