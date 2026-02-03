const JSZip = require('jszip');
const axios = require('axios');
const fileSaver = require('file-saver');

class DownloadService {
    constructor() {
        this.zip = new JSZip();
    }

    // Create ZIP file from selected photos
    async createZipFromPhotos(photos, accessToken) {
        try {
            const zip = new JSZip();
            const photoPromises = photos.map(async (photo) => {
                try {
                    const response = await axios.get(photo.downloadUrl, {
                        responseType: 'arraybuffer',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    });
                    
                    const fileName = `${photo.name}`;
                    zip.file(fileName, response.data);
                    
                    return { 
                        fileName, 
                        size: response.data.byteLength,
                        success: true 
                    };
                } catch (error) {
                    console.error(`Failed to download ${photo.name}:`, error);
                    return { 
                        fileName: photo.name, 
                        error: error.message,
                        success: false 
                    };
                }
            });

            const results = await Promise.all(photoPromises);
            const successfulDownloads = results.filter(r => r.success);
            const failedDownloads = results.filter(r => !r.success);

            if (successfulDownloads.length === 0) {
                throw new Error('No photos could be downloaded');
            }

            // Generate ZIP file
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            
            return {
                zipBlob,
                zipName: `photos-${Date.now()}.zip`,
                successfulDownloads,
                failedDownloads,
                totalFiles: photos.length,
                downloadedFiles: successfulDownloads.length
            };
        } catch (error) {
            console.error('Error creating ZIP file:', error);
            throw error;
        }
    }

    // Create ZIP file metadata
    createZipMetadata(downloadResult) {
        return {
            createdAt: new Date().toISOString(),
            totalFiles: downloadResult.totalFiles,
            downloadedFiles: downloadResult.downloadedFiles,
            failedFiles: downloadResult.failedDownloads.length,
            success: downloadResult.successfulDownloads.map(f => f.fileName),
            failed: downloadResult.failedDownloads.map(f => ({ 
                name: f.fileName, 
                error: f.error 
            }))
        };
    }

    // Get download statistics
    getDownloadStats(results) {
        const stats = {
            totalDownloads: 0,
            successfulDownloads: 0,
            failedDownloads: 0,
            totalSize: 0,
            successRate: 0
        };

        results.forEach(result => {
            stats.totalDownloads++;
            if (result.success) {
                stats.successfulDownloads++;
                stats.totalSize += result.size || 0;
            } else {
                stats.failedDownloads++;
            }
        });

        stats.successRate = stats.totalDownloads > 0 
            ? (stats.successfulDownloads / stats.totalDownloads) * 100 
            : 0;

        return stats;
    }

    // Clean up old ZIP files (placeholder for cleanup logic)
    cleanupOldFiles() {
        // Implementation for cleaning up temporary files
        // This would typically delete old ZIP files from storage
        console.log('Cleanup old download files');
    }
}

module.exports = new DownloadService();