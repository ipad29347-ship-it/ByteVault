class UI {
    static formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    static getIconForMime(mimeType) {
        if (!mimeType) return 'fa-file';
        if (mimeType.startsWith('image/')) return 'fa-file-image image';
        if (mimeType.startsWith('video/')) return 'fa-file-video video';
        if (mimeType.startsWith('audio/')) return 'fa-file-audio audio';
        if (mimeType === 'application/pdf') return 'fa-file-pdf pdf';
        if (mimeType.includes('zip') || mimeType.includes('tar')) return 'fa-file-zipper';
        if (mimeType.includes('text/') || mimeType.includes('document')) return 'fa-file-lines';
        return 'fa-file';
    }

    static createItemCard(item, type) {
        const div = document.createElement('div');
        div.className = 'item-card';
        div.dataset.id = item.id;
        div.dataset.type = type;
        if (item.starred) div.classList.add('is-starred');

        const iconClass = type === 'folder' ? 'fa-folder folder' : this.getIconForMime(item.mime_type);
        const icon = document.createElement('i');
        icon.className = `fa-solid ${iconClass} item-icon`;

        const name = document.createElement('span');
        name.className = 'item-name';
        name.textContent = item.name;
        name.title = item.name;

        const star = document.createElement('i');
        star.className = 'fa-solid fa-star item-star';

        div.appendChild(icon);
        div.appendChild(name);
        div.appendChild(star);

        if (type === 'file') {
            const details = document.createElement('div');
            details.className = 'item-details';
            
            const size = document.createElement('span');
            size.textContent = this.formatBytes(item.size);
            
            const date = document.createElement('span');
            date.textContent = new Date(item.updated_at).toLocaleDateString();

            details.appendChild(size);
            details.appendChild(date);
            div.appendChild(details);
        }

        return div;
    }

    static renderItems(folders = [], files = []) {
        const container = document.getElementById('file-container');
        const emptyState = document.getElementById('empty-state');
        if (!container) return;
        container.innerHTML = '';

        const safeFolders = Array.isArray(folders) ? folders : [];
        const safeFiles = Array.isArray(files) ? files : [];

        if (safeFolders.length === 0 && safeFiles.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
        } else {
            if (emptyState) emptyState.classList.add('hidden');
            
            safeFolders.forEach(folder => {
                container.appendChild(this.createItemCard(folder, 'folder'));
            });

            safeFiles.forEach(file => {
                container.appendChild(this.createItemCard(file, 'file'));
            });
        }
    }

    static showContextMenu(e, item, currentView = 'drive') {
        e.preventDefault();
        const menu = document.getElementById('context-menu');
        if (!menu) return;
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;
        menu.classList.remove('hidden');
        menu.dataset.id = item.dataset.id;
        menu.dataset.type = item.dataset.type;

        const isFolder = item.dataset.type === 'folder';
        const isTrash = currentView === 'trash';

        const openBtn = document.getElementById('ctx-open');
        const previewBtn = document.getElementById('ctx-preview');
        const downloadBtn = document.getElementById('ctx-download');
        const renameBtn = document.getElementById('ctx-rename');
        const starBtn = document.getElementById('ctx-star');
        const shareBtn = document.getElementById('ctx-share');
        const restoreBtn = document.getElementById('ctx-restore');
        const deleteBtn = document.getElementById('ctx-delete');

        if (isTrash) {
            if (openBtn) openBtn.style.display = 'none';
            if (renameBtn) renameBtn.style.display = 'none';
            if (starBtn) starBtn.style.display = 'none';
            if (shareBtn) shareBtn.style.display = 'none';
            if (previewBtn) previewBtn.style.display = isFolder ? 'none' : 'flex';
            if (downloadBtn) downloadBtn.style.display = isFolder ? 'none' : 'flex';
            if (restoreBtn) restoreBtn.style.display = 'flex';
            if (deleteBtn) {
                deleteBtn.style.display = 'flex';
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete Permanently';
            }
        } else {
            if (openBtn) openBtn.style.display = 'flex';
            if (renameBtn) renameBtn.style.display = 'flex';
            if (starBtn) starBtn.style.display = 'flex';
            if (shareBtn) shareBtn.style.display = 'flex';
            if (previewBtn) previewBtn.style.display = isFolder ? 'none' : 'flex';
            if (downloadBtn) downloadBtn.style.display = isFolder ? 'none' : 'flex';
            if (restoreBtn) restoreBtn.style.display = 'none';
            if (deleteBtn) {
                deleteBtn.style.display = 'flex';
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Move to Trash';
            }
        }
    }

    static hideContextMenu() {
        const menu = document.getElementById('context-menu');
        if (menu) menu.classList.add('hidden');
    }

    static updateStorageInfo(info) {
        if (!info || typeof info.used === 'undefined' || !info.total) {
            const storageText = document.getElementById('storage-text');
            if (storageText) storageText.textContent = '0 Bytes of 5 GB used';
            return;
        }
        const percent = Math.min(100, (info.used / info.total) * 100);
        const progressBar = document.getElementById('storage-progress');
        const storageText = document.getElementById('storage-text');
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (storageText) storageText.textContent = `${this.formatBytes(info.used)} of ${this.formatBytes(info.total)} used`;
    }
}
