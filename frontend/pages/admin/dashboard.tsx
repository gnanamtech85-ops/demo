import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/pages/_app';
import { useRouter } from 'next/router';
import { drivesAPI, authAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import { useQuery } from 'react-query';

interface SharedDrive {
  id: string;
  title: string;
  description: string;
  folderName: string;
  totalPhotos: number;
  createdAt: string;
  status: string;
}

export default function AdminDashboard() {
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();
  const [showCreateDrive, setShowCreateDrive] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/client/dashboard');
    }
  }, [user, router]);

  // Check Google Drive connection status
  const { data: profile } = useQuery(['profile'], authAPI.getProfile, {
    onSuccess: (data) => {
      setGoogleConnected(data.data.user.googleDriveConnected);
    }
  });

  // Fetch admin's shared drives
  const { data: drivesData, isLoading, refetch } = useQuery(
    ['admin-drives'],
    () => drivesAPI.getDrives(),
    {
      enabled: !!user && user.role === 'admin',
    }
  );

  const handleCreateDrive = () => {
    if (!googleConnected) {
      toast.error('Please connect your Google Drive account first');
      return;
    }
    setShowCreateDrive(true);
  };

  const handleConnectGoogle = async () => {
    try {
      const response = await authAPI.getGoogleAuthUrl();
      const { authUrl } = response.data;
      
      // Open Google OAuth in new window
      const authWindow = window.open(
        authUrl,
        'google-auth',
        'width=500,height=600'
      );

      // Listen for the auth completion message
      const handleMessage = async (event: MessageEvent) => {
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          try {
            await authAPI.handleGoogleCallback({
              code: event.data.code,
              token: localStorage.getItem('authToken') || ''
            });
            setGoogleConnected(true);
            toast.success('Google Drive connected successfully!');
            authWindow?.close();
            window.removeEventListener('message', handleMessage);
          } catch (error) {
            toast.error('Failed to connect Google Drive');
          }
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (error) {
      toast.error('Failed to initiate Google Drive connection');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center mr-3">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {user.username}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Google Drive Connection Status */}
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${googleConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  Google Drive {googleConnected ? 'Connected' : 'Not Connected'}
                </span>
                {!googleConnected && (
                  <button
                    onClick={handleConnectGoogle}
                    className="ml-3 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Connect
                  </button>
                )}
              </div>

              <button
                onClick={logout}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Drives</dt>
                    <dd className="text-lg font-medium text-gray-900">{drivesData?.data.sharedDrives?.length || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Clients</dt>
                    <dd className="text-lg font-medium text-gray-900">0</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Photos</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {drivesData?.data.sharedDrives?.reduce((sum: number, drive: any) => sum + drive.totalPhotos, 0) || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 2h10m-2 0V4a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V8z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Downloads</dt>
                    <dd className="text-lg font-medium text-gray-900">0</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Shared Drives</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your Google Drive photo collections
                </p>
              </div>
              <button
                onClick={handleCreateDrive}
                disabled={!googleConnected}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Drive
              </button>
            </div>
          </div>
        </div>

        {/* Drives List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading drives...</p>
            </div>
          ) : drivesData?.data.sharedDrives?.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No shared drives</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new shared drive.</p>
              {!googleConnected && (
                <div className="mt-6">
                  <button
                    onClick={handleConnectGoogle}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Connect Google Drive
                  </button>
                </div>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {drivesData?.data.sharedDrives?.map((drive: SharedDrive) => (
                <li key={drive.id}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{drive.title}</div>
                        <div className="text-sm text-gray-500">{drive.description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {drive.totalPhotos} photos • Created {formatDate(drive.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(drive.status)}`}>
                        {drive.status}
                      </span>
                      <button
                        onClick={() => router.push(`/admin/drive/${drive.id}`)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => router.push(`/admin/drive/${drive.id}/stats`)}
                        className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                      >
                        Stats
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Create Drive Modal */}
        {showCreateDrive && (
          <CreateDriveModal
            onClose={() => setShowCreateDrive(false)}
            onSuccess={() => {
              setShowCreateDrive(false);
              refetch();
            }}
          />
        )}
      </main>
    </div>
  );
}

// Create Drive Modal Component
interface CreateDriveModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateDriveModal({ onClose, onSuccess }: CreateDriveModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    driveLink: '',
    title: '',
    description: '',
    allowedClients: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await drivesAPI.createDrive(formData);
      toast.success('Shared drive created successfully!');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create drive');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Shared Drive</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Google Drive Link</label>
              <input
                type="url"
                value={formData.driveLink}
                onChange={(e) => setFormData({ ...formData, driveLink: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://drive.google.com/drive/folders/..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter drive title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter drive description"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Drive'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}