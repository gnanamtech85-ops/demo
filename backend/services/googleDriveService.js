const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

class GoogleDriveService {
    constructor() {
        this.oauth2Client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        
        this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    }

    // Extract folder ID from Google Drive share link
    extractFolderId(driveLink) {
        const patterns = [
            /\/folders\/([a-zA-Z0-9-_]+)/,
            /id=([a-zA-Z0-9-_]+)/,
            /\/drive\/folders\/([a-zA-Z0-9-_]+)/
        ];

        for (const pattern of patterns) {
            const match = driveLink.match(pattern);
            if (match) {
                return match[1];
            }
        }
        throw new Error('Invalid Google Drive folder link');
    }

    // Get OAuth2 URL for authentication
    getAuthUrl() {
        const scopes = [
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ];

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent'
        });
    }

    // Exchange authorization code for tokens
    async getTokens(code) {
        const { tokens } = await this.oauth2Client.getToken(code);
        return tokens;
    }

    // Set access tokens
    setCredentials(accessToken, refreshToken = null) {
        this.oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken
        });
    }

    // Refresh access token
    async refreshAccessToken(refreshToken) {
        this.oauth2Client.setCredentials({
            refresh_token: refreshToken
        });
        
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        return credentials;
    }

    // Get user info
    async getUserInfo(accessToken) {
        this.setCredentials(accessToken);
        const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
        
        const { data } = await oauth2.userinfo.get();
        return data;
    }

    // Get folder info and photos
    async getFolderPhotos(folderId, accessToken) {
        this.setCredentials(accessToken);
        
        try {
            // Get folder info
            const folderResponse = await this.drive.files.get({
                fileId: folderId,
                fields: 'id,name,description,createdTime,modifiedTime'
            });

            // Get all photos in folder
            const photosResponse = await this.drive.files.list({
                q: `'${folderId}' in parents and mimeType contains 'image/'`,
                fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webViewLink,webContentLink)',
                orderBy: 'createdTime desc'
            });

            return {
                folder: folderResponse.data,
                photos: photosResponse.data.files || []
            };
        } catch (error) {
            console.error('Error fetching folder photos:', error);
            throw new Error('Failed to fetch photos from Google Drive');
        }
    }

    // Get photo download URL
    getPhotoDownloadUrl(fileId, accessToken) {
        this.setCredentials(accessToken);
        return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${accessToken}`;
    }

    // Generate download links for selected photos
    async generateDownloadLinks(photoIds, accessToken) {
        this.setCredentials(accessToken);
        const downloadUrls = [];

        for (const photoId of photoIds) {
            try {
                const fileResponse = await this.drive.files.get({
                    fileId: photoId,
                    fields: 'id,name,webContentLink'
                });
                
                downloadUrls.push({
                    id: photoId,
                    name: fileResponse.data.name,
                    downloadUrl: fileResponse.data.webContentLink
                });
            } catch (error) {
                console.error(`Error getting download link for ${photoId}:`, error);
            }
        }

        return downloadUrls;
    }

    // Get folder thumbnail
    getFolderThumbnail(folderId, accessToken) {
        return `https://drive.google.com/thumbnail?id=${folderId}&sz=w300-h300-c`;
    }

    // Validate access token
    async validateAccessToken(accessToken) {
        try {
            this.setCredentials(accessToken);
            await this.drive.about.get();
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = new GoogleDriveService();