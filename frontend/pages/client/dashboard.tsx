import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/pages/_app';
import { useRouter } from 'next/router';
import { drivesAPI, photosAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import { useQuery } from 'react-query';

interface Photo {
  id: string;
  name: string;
  thumbnailUrl: string;
  isSelectedByUser: boolean;
  isLikedByUser: boolean;
  totalLikes: number;
  totalSelections: number;
  selectedByUsers: string[];
  likedByUsers: string[];
  webViewLink: string;
}

interface SharedDrive {
  id: string;
  title: string;
  description: string;
  folderName: string;
  sharedBy: {
    username: string;
    email: string;
  };
  createdAt: string;
}

export default function ClientDashboard() {
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();
  const [selectedDriveId, setSelectedDriveId] = useState<string>('');

  // Redirect if not client
  useEffect(() => {
    if (user && user.role !== 'client') {
      router.push('/admin/dashboard');
    }
  }, [user, router]);

  // Fetch client's shared drives
  const { data: drivesData, isLoading: drivesLoading } = useQuery(
    ['client-drives'],
    drivesAPI.getClientDrives,
    {
      enabled: !!user && user.role === 'client',
    }
  );

  // Fetch photos for selected drive
  const { data: photosData, isLoading: photosLoading, refetch: refetchPhotos } = useQuery(
    ['photos', selectedDriveId],
    () => photosAPI.getPhotos(selectedDriveId),
    {
      enabled: !!selectedDriveId,
    }
  );

  const handlePhotoSelect = async (photoId: string, select: boolean) => {
    try {
      await photosAPI.selectPhoto(photoId, select);
      refetchPhotos();
      toast.success(`Photo ${select ? 'selected' : 'unselected'}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update photo');
    }
  };

  const handlePhotoLike = async (photoId: string, like: boolean) => {
    try {
      await photosAPI.likePhoto(photoId, like);
      refetchPhotos();
      toast.success(`Photo ${like ? 'liked' : 'unliked'}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update photo');
    }
  };

  const handleDownloadSelected = async () => {
    const selectedPhotos = photosData?.data.photos?.filter((photo: Photo) => photo.isSelectedByUser);
    
    if (selectedPhotos.length === 0) {
      toast.error('No photos selected for download');
      return;
    }

    try {
      const response = await photosAPI.downloadSelected(selectedPhotos.map((p: Photo) => p.id));
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `photos-${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Download started successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Download failed');
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
              <div className="h-8 w-8 bg-green-600 rounded flex items-center justify-center mr-3">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Client Portal</h1>
                <p className="text-sm text-gray-600">Welcome back, {user.username}</p>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Sidebar - Drive Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">My Photo Collections</h3>
                
                {drivesLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
                  </div>
                ) : drivesData?.data.sharedDrives?.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h4 className="mt-2 text-sm font-medium text-gray-900">No collections</h4>
                    <p className="mt-1 text-sm text-gray-500">You haven't been assigned any photo collections yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {drivesData?.data.sharedDrives?.map((drive: any) => (
                      <button
                        key={drive.id}
                        onClick={() => setSelectedDriveId(drive.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          selectedDriveId === drive.id
                            ? 'bg-green-100 text-green-900'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-medium">{drive.title}</div>
                        <div className="text-xs text-gray-500">{drive.totalPhotos} photos</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content - Photo Gallery */}
          <div className="mt-8 lg:mt-0 lg:col-span-3">
            {!selectedDriveId ? (
              <div className="bg-white shadow rounded-lg p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Select a collection</h3>
                <p className="mt-1 text-sm text-gray-500">Choose a photo collection from the sidebar to start viewing photos.</p>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg">
                {/* Photo Gallery Header */}
                <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {photosData?.data.sharedDrive?.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {photosData?.data.sharedDrive?.description}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Shared by {photosData?.data.sharedDrive?.sharedBy?.username} • {formatDate(photosData?.data.sharedDrive?.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleDownloadSelected}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Selected
                      </button>
                    </div>
                  </div>
                </div>

                {/* Photo Grid */}
                {photosLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading photos...</p>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {photosData?.data.photos?.map((photo: Photo) => (
                        <PhotoCard
                          key={photo.id}
                          photo={photo}
                          onSelect={(select) => handlePhotoSelect(photo.id, select)}
                          onLike={(like) => handlePhotoLike(photo.id, like)}
                        />
                      ))}
                    </div>
                    
                    {photosData?.data.photos?.length === 0 && (
                      <div className="text-center py-8">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h4 className="mt-2 text-sm font-medium text-gray-900">No photos</h4>
                        <p className="mt-1 text-sm text-gray-500">This collection doesn't contain any photos.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Photo Card Component
interface PhotoCardProps {
  photo: Photo;
  onSelect: (select: boolean) => void;
  onLike: (like: boolean) => void;
}

function PhotoCard({ photo, onSelect, onLike }: PhotoCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative group">
      <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer relative">
        {!imageError ? (
          <img
            src={photo.thumbnailUrl}
            alt={photo.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isImageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setIsImageLoaded(true)}
            onError={() => setImageError(true)}
            onClick={() => window.open(photo.webViewLink, '_blank')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* Selection Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200">
          <div className="absolute top-2 left-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(!photo.isSelectedByUser);
              }}
              className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center transition-all ${
                photo.isSelectedByUser
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-transparent hover:bg-white hover:bg-opacity-20'
              }`}
            >
              {photo.isSelectedByUser && (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="absolute bottom-2 right-2 flex space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike(!photo.isLikedByUser);
              }}
              className={`p-1.5 rounded-full transition-all ${
                photo.isLikedByUser
                  ? 'bg-red-500 text-white'
                  : 'bg-white bg-opacity-80 text-gray-700 hover:bg-opacity-100'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Loading placeholder */}
        {!isImageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
          </div>
        )}
      </div>
      
      {/* Photo Info */}
      <div className="mt-2">
        <p className="text-xs text-gray-500 truncate">{photo.name}</p>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            {photo.totalLikes > 0 && (
              <span className="flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
                {photo.totalLikes}
              </span>
            )}
            {photo.totalSelections > 0 && (
              <span className="flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {photo.totalSelections}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}