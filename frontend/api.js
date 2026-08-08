// Configuration
// Detect environment: file:// protocol, localhost, or remote deployment.
// For local dev (including opening index.html directly from disk), always use localhost backend.
const _hostname = window.location.hostname;
const _isLocal = !_hostname || _hostname === 'localhost' || _hostname === '127.0.0.1';
const API_BASE = _isLocal
    ? 'http://localhost:3000/api'
    : 'https://sleep-nominated-assurance-tennis.trycloudflare.com/api';

class API {
    static getToken() {
        return localStorage.getItem('bv_token');
    }

    static async request(endpoint, options = {}) {
        const token = this.getToken();
        const headers = {
            ...(options.headers || {})
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (options.body && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) {
            // Unauthorized
            localStorage.removeItem('bv_token');
            localStorage.removeItem('bv_user');
            window.location.reload();
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'API Error');
            return data;
        }
        
        if (!response.ok) throw new Error('API Error');
        return response; // For blobs/downloads
    }

    static async login(username, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: { username, password }
        });
    }

    static async register(username, password) {
        return this.request('/auth/register', {
            method: 'POST',
            body: { username, password }
        });
    }

    static async getFiles(folderId = 'root') {
        return this.request(`/files?folder_id=${folderId}`);
    }

    static async getFolders(parentId = 'root') {
        return this.request(`/folders?parent_id=${parentId}`);
    }

    static async uploadFile(file, folderId = 'root') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder_id', folderId);

        return this.request('/files/upload', {
            method: 'POST',
            body: formData
        });
    }

    static async createFolder(name, parentId = 'root') {
        return this.request('/folders', {
            method: 'POST',
            body: { name, parent_id: parentId }
        });
    }

    static async deleteFile(id) {
        return this.request(`/files/${id}`, { method: 'DELETE' });
    }

    static async restoreFile(id) {
        return this.request(`/files/${id}/restore`, { method: 'POST' });
    }

    static async deleteFilePermanently(id) {
        return this.request(`/files/${id}/permanent`, { method: 'DELETE' });
    }

    static async deleteFolder(id) {
        return this.request(`/folders/${id}`, { method: 'DELETE' });
    }
    
    static async updateFile(id, data) {
        return this.request(`/files/${id}`, { method: 'PATCH', body: data });
    }

    static async updateFolder(id, data) {
        return this.request(`/folders/${id}`, { method: 'PATCH', body: data });
    }

    static async getStorageInfo() {
        return this.request('/user/storage');
    }

    static async getStarredFiles() {
        return this.request('/files/filter/starred');
    }

    static async getRecentFiles() {
        return this.request('/files/filter/recent');
    }

    static async getTrashFiles() {
        return this.request('/files/filter/trash');
    }

    static async searchFiles(q) {
        return this.request(`/files/filter/search?q=${encodeURIComponent(q)}`);
    }

    static async getStarredFolders() {
        return this.request('/folders/filter/starred');
    }

    static async searchFolders(q) {
        return this.request(`/folders/filter/search?q=${encodeURIComponent(q)}`);
    }

    static async createShare(itemType, itemId) {
        return this.request('/shares', {
            method: 'POST',
            body: { item_type: itemType, item_id: itemId, allow_download: true }
        });
    }

    static get API_BASE() {
        return API_BASE;
    }

    static getViewUrl(fileId) {
        return `${API_BASE}/files/${fileId}/view`;
    }

    static getDownloadUrl(fileId) {
        return `${API_BASE}/files/${fileId}/download`;
    }
}
