document.addEventListener('DOMContentLoaded', () => {
    
    // Auth checking
    const token = API.getToken();
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');

    if (token) {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        initApp();
    } else {
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }

    // Auth Forms
    const showRegister = document.getElementById('show-register');
    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('register-form').classList.remove('hidden');
        });
    }

    const showLogin = document.getElementById('show-login');
    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('register-form').classList.add('hidden');
            document.getElementById('login-form').classList.remove('hidden');
        });
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('login-username').value;
            const pass = document.getElementById('login-password').value;
            try {
                const data = await API.login(user, pass);
                localStorage.setItem('bv_token', data.token);
                localStorage.setItem('bv_user', JSON.stringify(data.user));
                window.location.reload();
            } catch (err) {
                document.getElementById('login-error').textContent = err.message || 'Login failed';
            }
        });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('register-username').value;
            const pass = document.getElementById('register-password').value;
            try {
                const data = await API.register(user, pass);
                localStorage.setItem('bv_token', data.token);
                localStorage.setItem('bv_user', JSON.stringify(data.user));
                window.location.reload();
            } catch (err) {
                document.getElementById('register-error').textContent = err.message || 'Registration failed';
            }
        });
    }

    function initApp() {
        let currentFolder = 'root';
        let currentView = 'drive'; // drive, recent, starred, trash, search

        // Safe User Display
        try {
            const rawUser = localStorage.getItem('bv_user');
            const user = rawUser ? JSON.parse(rawUser) : null;
            const username = (user && user.username) ? user.username : 'User';
            const displayElem = document.getElementById('display-username');
            const avatarElem = document.getElementById('user-avatar');
            if (displayElem) displayElem.textContent = username;
            if (avatarElem) avatarElem.textContent = username.charAt(0).toUpperCase();
        } catch (e) {
            console.error('Failed to parse user data', e);
        }

        // Helper functions defined before caller
        async function loadContent(folderId, query = '') {
            try {
                let folders = [];
                let files = [];

                if (currentView === 'drive') {
                    const [resFolders, resFiles] = await Promise.all([
                        API.getFolders(folderId).catch(() => []),
                        API.getFiles(folderId).catch(() => [])
                    ]);
                    folders = resFolders;
                    files = resFiles;
                } else if (currentView === 'starred') {
                    const [resFolders, resFiles] = await Promise.all([
                        API.getStarredFolders().catch(() => []),
                        API.getStarredFiles().catch(() => [])
                    ]);
                    folders = resFolders;
                    files = resFiles;
                } else if (currentView === 'recent') {
                    files = await API.getRecentFiles().catch(() => []);
                } else if (currentView === 'trash') {
                    files = await API.getTrashFiles().catch(() => []);
                } else if (currentView === 'search') {
                    const [resFolders, resFiles] = await Promise.all([
                        API.searchFolders(query).catch(() => []),
                        API.searchFiles(query).catch(() => [])
                    ]);
                    folders = resFolders;
                    files = resFiles;
                }

                UI.renderItems(folders, files);
            } catch (err) {
                console.error('Failed to load content', err);
                UI.renderItems([], []);
            }
        }

        async function loadStorageInfo() {
            try {
                const info = await API.getStorageInfo();
                UI.updateStorageInfo(info);
            } catch (err) {
                console.error('Failed to load storage info', err);
                UI.updateStorageInfo({ used: 0, total: 5 * 1024 * 1024 * 1024 });
            }
        }

        loadContent(currentFolder);
        loadStorageInfo();

        // --- Sidebar Nav ---
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                currentView = item.dataset.view;
                
                let title = 'My Drive';
                if (currentView === 'recent') title = 'Recent Files';
                if (currentView === 'starred') title = 'Starred';
                if (currentView === 'trash') title = 'Trash';
                const titleElem = document.getElementById('current-view-title');
                if (titleElem) titleElem.textContent = title;
                
                loadContent(currentFolder);
            });
        });

        // --- Search ---
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const q = searchInput.value.trim();
                    if (q) {
                        currentView = 'search';
                        const titleElem = document.getElementById('current-view-title');
                        if (titleElem) titleElem.textContent = `Search results for "${q}"`;
                        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                        loadContent(currentFolder, q);
                    } else {
                        const driveNav = document.querySelector('.nav-item[data-view="drive"]');
                        if (driveNav) driveNav.click();
                    }
                }
            });
        }

        // --- View Toggles ---
        const btnGrid = document.getElementById('btn-grid-view');
        const btnList = document.getElementById('btn-list-view');
        if (btnGrid) {
            btnGrid.addEventListener('click', () => {
                document.getElementById('file-container').className = 'file-grid';
                btnGrid.classList.add('active');
                if (btnList) btnList.classList.remove('active');
            });
        }
        if (btnList) {
            btnList.addEventListener('click', () => {
                document.getElementById('file-container').className = 'file-list';
                btnList.classList.add('active');
                if (btnGrid) btnGrid.classList.remove('active');
            });
        }

        // --- Theme Toggle ---
        const btnTheme = document.getElementById('btn-theme');
        if (btnTheme) {
            btnTheme.addEventListener('click', () => {
                const html = document.documentElement;
                const currentTheme = html.getAttribute('data-theme');
                html.setAttribute('data-theme', currentTheme === 'dark' ? 'light' : 'dark');
            });
        }

        // --- New Button & Dropdown ---
        const newDropdown = document.getElementById('new-dropdown');
        const btnNew = document.getElementById('btn-new');
        if (btnNew && newDropdown) {
            btnNew.addEventListener('click', (e) => {
                e.stopPropagation();
                newDropdown.classList.toggle('hidden');
                const rect = e.target.getBoundingClientRect();
                newDropdown.style.top = `${rect.bottom + 5}px`;
                newDropdown.style.left = `${rect.left}px`;
            });
        }
        
        const newUploadBtn = document.getElementById('new-upload-btn');
        if (newUploadBtn) {
            newUploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const fileInput = document.getElementById('file-input');
                if (fileInput) fileInput.click();
                if (newDropdown) newDropdown.classList.add('hidden');
            });
        }

        const btnUpload = document.getElementById('btn-upload');
        if (btnUpload) {
            btnUpload.addEventListener('click', () => {
                const fileInput = document.getElementById('file-input');
                if (fileInput) fileInput.click();
            });
        }

        // --- New Folder Modal ---
        const newFolderBtn = document.getElementById('new-folder-btn');
        if (newFolderBtn) {
            newFolderBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (newDropdown) newDropdown.classList.add('hidden');
                const folderInput = document.getElementById('folder-name-input');
                if (folderInput) folderInput.value = '';
                const folderModal = document.getElementById('folder-modal');
                if (folderModal) folderModal.classList.remove('hidden');
            });
        }
        
        const btnCancelFolder = document.getElementById('btn-cancel-folder');
        if (btnCancelFolder) {
            btnCancelFolder.addEventListener('click', () => {
                const folderModal = document.getElementById('folder-modal');
                if (folderModal) folderModal.classList.add('hidden');
            });
        }

        const btnCreateFolder = document.getElementById('btn-create-folder');
        if (btnCreateFolder) {
            btnCreateFolder.addEventListener('click', async () => {
                const folderInput = document.getElementById('folder-name-input');
                const name = (folderInput && folderInput.value.trim()) || 'Untitled folder';
                try {
                    await API.createFolder(name, currentFolder);
                    const folderModal = document.getElementById('folder-modal');
                    if (folderModal) folderModal.classList.add('hidden');
                    loadContent(currentFolder);
                } catch (err) {
                    alert('Failed to create folder');
                }
            });
        }

        // --- Upload functionality ---
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const files = e.target.files;
                if (!files || !files.length) return;

                const uploadModal = document.getElementById('upload-modal');
                if (uploadModal) uploadModal.classList.remove('hidden');
                const list = document.getElementById('upload-list');
                if (list) list.innerHTML = '';

                for (let file of files) {
                    const li = document.createElement('div');
                    li.className = 'upload-item';
                    li.innerHTML = `<span>${file.name}</span><span>Uploading...</span>`;
                    if (list) list.appendChild(li);

                    try {
                        await API.uploadFile(file, currentFolder);
                        li.innerHTML = `<span>${file.name}</span><span style="color:var(--accent-color)">Done</span>`;
                    } catch (err) {
                        li.innerHTML = `<span>${file.name}</span><span style="color:var(--danger)">Failed</span>`;
                    }
                }
                
                loadContent(currentFolder);
                loadStorageInfo();
            });
        }

        const btnCloseUpload = document.getElementById('btn-close-upload');
        if (btnCloseUpload) {
            btnCloseUpload.addEventListener('click', () => {
                const uploadModal = document.getElementById('upload-modal');
                if (uploadModal) uploadModal.classList.add('hidden');
            });
        }

        // --- Selection & Navigation ---
        const fileContainer = document.getElementById('file-container');
        if (fileContainer) {
            fileContainer.addEventListener('dblclick', (e) => {
                const card = e.target.closest('.item-card');
                if (!card) return;
                if (card.dataset.type === 'folder' && currentView === 'drive') {
                    currentFolder = card.dataset.id;
                    const bc = document.getElementById('breadcrumbs');
                    if (bc) {
                        const folderName = card.querySelector('.item-name') ? card.querySelector('.item-name').textContent : 'Folder';
                        bc.innerHTML += ` <span>/</span> <a href="#" data-folder="${currentFolder}">${folderName}</a>`;
                    }
                    loadContent(currentFolder);
                } else if (card.dataset.type === 'file') {
                    const ctxPreview = document.getElementById('ctx-preview');
                    const menu = document.getElementById('context-menu');
                    if (menu) {
                        menu.dataset.id = card.dataset.id;
                        menu.dataset.type = 'file';
                    }
                    if (ctxPreview) ctxPreview.click();
                }
            });

            fileContainer.addEventListener('click', (e) => {
                const card = e.target.closest('.item-card');
                if (card) {
                    document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                }
            });

            fileContainer.addEventListener('contextmenu', (e) => {
                const card = e.target.closest('.item-card');
                if (card) {
                    document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    UI.showContextMenu(e, card, currentView);
                }
            });
        }

        // Breadcrumb clicks
        const breadcrumbs = document.getElementById('breadcrumbs');
        if (breadcrumbs) {
            breadcrumbs.addEventListener('click', (e) => {
                if (e.target.tagName === 'A') {
                    e.preventDefault();
                    currentFolder = e.target.dataset.folder;
                    while (e.target.nextElementSibling) {
                        e.target.nextElementSibling.remove();
                    }
                    loadContent(currentFolder);
                }
            });
        }

        document.addEventListener('click', () => {
            UI.hideContextMenu();
            if (newDropdown) newDropdown.classList.add('hidden');
        });

        // --- Context Menu Actions ---
        
        // 1. Open
        const ctxOpen = document.getElementById('ctx-open');
        if (ctxOpen) {
            ctxOpen.addEventListener('click', (e) => {
                e.preventDefault();
                const menu = document.getElementById('context-menu');
                if (!menu) return;
                const id = menu.dataset.id;
                if (menu.dataset.type === 'folder') {
                    currentFolder = id;
                    loadContent(currentFolder);
                } else {
                    const ctxPreview = document.getElementById('ctx-preview');
                    if (ctxPreview) ctxPreview.click();
                }
            });
        }

        // 2. Download
        const ctxDownload = document.getElementById('ctx-download');
        if (ctxDownload) {
            ctxDownload.addEventListener('click', (e) => {
                e.preventDefault();
                const menu = document.getElementById('context-menu');
                if (!menu) return;
                const id = menu.dataset.id;
                if (menu.dataset.type === 'file') {
                    const url = API.getDownloadUrl(id);
                    fetch(url, { headers: { 'Authorization': `Bearer ${API.getToken()}` } })
                        .then(res => {
                            if (!res.ok) throw new Error();
                            return res.blob();
                        })
                        .then(blob => {
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(blob);
                            const card = document.querySelector(`.item-card[data-id="${id}"] .item-name`);
                            a.download = card ? card.textContent : 'download';
                            a.click();
                        })
                        .catch(() => alert('Download failed'));
                }
            });
        }

        // 3. Rename
        let renameTarget = null;
        const ctxRename = document.getElementById('ctx-rename');
        if (ctxRename) {
            ctxRename.addEventListener('click', (e) => {
                e.preventDefault();
                const menu = document.getElementById('context-menu');
                if (!menu) return;
                renameTarget = { id: menu.dataset.id, type: menu.dataset.type };
                const card = document.querySelector(`.item-card[data-id="${renameTarget.id}"] .item-name`);
                const currentName = card ? card.textContent : '';
                const renameInput = document.getElementById('rename-input');
                if (renameInput) renameInput.value = currentName;
                const renameModal = document.getElementById('rename-modal');
                if (renameModal) renameModal.classList.remove('hidden');
            });
        }

        const btnCancelRename = document.getElementById('btn-cancel-rename');
        if (btnCancelRename) {
            btnCancelRename.addEventListener('click', () => {
                const renameModal = document.getElementById('rename-modal');
                if (renameModal) renameModal.classList.add('hidden');
            });
        }

        const btnConfirmRename = document.getElementById('btn-confirm-rename');
        if (btnConfirmRename) {
            btnConfirmRename.addEventListener('click', async () => {
                const renameInput = document.getElementById('rename-input');
                const newName = renameInput ? renameInput.value.trim() : '';
                if (newName && renameTarget) {
                    try {
                        if (renameTarget.type === 'file') {
                            await API.updateFile(renameTarget.id, { name: newName });
                        } else {
                            await API.updateFolder(renameTarget.id, { name: newName });
                        }
                        const renameModal = document.getElementById('rename-modal');
                        if (renameModal) renameModal.classList.add('hidden');
                        loadContent(currentFolder);
                    } catch (err) {
                        alert('Failed to rename');
                    }
                }
            });
        }

        // 4. Star
        const ctxStar = document.getElementById('ctx-star');
        if (ctxStar) {
            ctxStar.addEventListener('click', async (e) => {
                e.preventDefault();
                const menu = document.getElementById('context-menu');
                if (!menu) return;
                const id = menu.dataset.id;
                const type = menu.dataset.type;
                const card = document.querySelector(`.item-card[data-id="${id}"]`);
                const currentlyStarred = card ? card.classList.contains('is-starred') : false;
                
                try {
                    if (type === 'file') {
                        await API.updateFile(id, { starred: !currentlyStarred });
                    } else {
                        await API.updateFolder(id, { starred: !currentlyStarred });
                    }
                    loadContent(currentFolder);
                } catch (err) {
                    alert('Failed to star item');
                }
            });
        }

        // 5. Share
        const ctxShare = document.getElementById('ctx-share');
        if (ctxShare) {
            ctxShare.addEventListener('click', async (e) => {
                e.preventDefault();
                const menu = document.getElementById('context-menu');
                if (!menu) return;
                const id = menu.dataset.id;
                const type = menu.dataset.type;
                
                const statusElem = document.getElementById('share-status');
                const linkInput = document.getElementById('share-link-input');
                const shareModal = document.getElementById('share-modal');
                if (statusElem) statusElem.textContent = "Generating link...";
                if (linkInput) linkInput.value = "";
                if (shareModal) shareModal.classList.remove('hidden');

                try {
                    const shareData = await API.createShare(type, id);
                    const shareUrl = `${window.location.origin}/api/shares/${shareData.token}`;
                    if (linkInput) linkInput.value = shareUrl;
                    if (statusElem) statusElem.textContent = "Link generated successfully!";
                } catch (err) {
                    if (statusElem) statusElem.textContent = "Failed to generate link.";
                }
            });
        }

        const btnCloseShare = document.getElementById('btn-close-share');
        if (btnCloseShare) {
            btnCloseShare.addEventListener('click', () => {
                const shareModal = document.getElementById('share-modal');
                if (shareModal) shareModal.classList.add('hidden');
            });
        }

        const btnCopyShare = document.getElementById('btn-copy-share');
        if (btnCopyShare) {
            btnCopyShare.addEventListener('click', () => {
                const input = document.getElementById('share-link-input');
                if (input) {
                    input.select();
                    document.execCommand('copy');
                    btnCopyShare.textContent = "Copied!";
                    setTimeout(() => btnCopyShare.textContent = "Copy", 2000);
                }
            });
        }

        // 6. Restore
        const ctxRestore = document.getElementById('ctx-restore');
        if (ctxRestore) {
            ctxRestore.addEventListener('click', async (e) => {
                e.preventDefault();
                const menu = document.getElementById('context-menu');
                if (!menu) return;
                const id = menu.dataset.id;
                try {
                    await API.restoreFile(id);
                    loadContent(currentFolder);
                    loadStorageInfo();
                } catch (err) {
                    alert('Restore failed');
                }
            });
        }

        // 7. Delete (Move to Trash vs Permanent Delete)
        const ctxDelete = document.getElementById('ctx-delete');
        if (ctxDelete) {
            ctxDelete.addEventListener('click', async (e) => {
                e.preventDefault();
                const menu = document.getElementById('context-menu');
                if (!menu) return;
                const id = menu.dataset.id;
                try {
                    if (currentView === 'trash') {
                        if (menu.dataset.type === 'file') {
                            await API.deleteFilePermanently(id);
                        } else {
                            await API.deleteFolder(id);
                        }
                    } else {
                        if (menu.dataset.type === 'file') {
                            await API.deleteFile(id);
                        } else {
                            await API.deleteFolder(id);
                        }
                    }
                    loadContent(currentFolder);
                    loadStorageInfo();
                } catch (err) {
                    alert('Delete failed');
                }
            });
        }

        // 8. Preview Modal Handling
        const ctxPreview = document.getElementById('ctx-preview');
        if (ctxPreview) {
            ctxPreview.addEventListener('click', (e) => {
                e.preventDefault();
                const menu = document.getElementById('context-menu');
                if (!menu) return;
                const id = menu.dataset.id;
                if (!id || menu.dataset.type !== 'file') return;

                const card = document.querySelector(`.item-card[data-id="${id}"] .item-name`);
                const name = card ? card.textContent : 'File';
                const previewFilename = document.getElementById('preview-filename');
                if (previewFilename) previewFilename.textContent = name;
                
                const url = API.getViewUrl(id);
                const body = document.getElementById('preview-body');
                if (body) body.innerHTML = '<div style="color:var(--text-secondary)">Loading preview...</div>';
                const previewModal = document.getElementById('preview-modal');
                if (previewModal) previewModal.classList.remove('hidden');

                fetch(url, { headers: { 'Authorization': `Bearer ${API.getToken()}` } })
                    .then(res => {
                        if (!res.ok) throw new Error('HTTP ' + res.status);
                        const contentType = res.headers.get('content-type') || '';
                        return res.blob().then(blob => ({ blob, contentType }));
                    })
                    .then(({ blob, contentType }) => {
                        const objUrl = URL.createObjectURL(blob);
                        if (!body) return;

                        const isText = contentType.startsWith('text/') || 
                                       contentType.includes('json') || 
                                       contentType.includes('javascript') || 
                                       contentType.includes('xml') ||
                                       name.endsWith('.txt') || 
                                       name.endsWith('.md') || 
                                       name.endsWith('.json') || 
                                       name.endsWith('.js') || 
                                       name.endsWith('.css') || 
                                       name.endsWith('.html');
                        
                        if (contentType.startsWith('image/')) {
                            body.innerHTML = `<img src="${objUrl}" alt="Preview">`;
                        } else if (contentType.startsWith('video/')) {
                            body.innerHTML = `<video src="${objUrl}" controls autoplay style="max-width:100%; max-height:100%;"></video>`;
                        } else if (contentType.startsWith('audio/')) {
                            body.innerHTML = `<audio src="${objUrl}" controls autoplay style="width:80%;"></audio>`;
                        } else if (isText) {
                            blob.text().then(text => {
                                const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                body.innerHTML = `<pre style="white-space: pre-wrap; word-break: break-all; padding: 1.5rem; color: var(--text-primary); text-align: left; font-family: monospace; width: 100%; height: 100%; overflow: auto; background: var(--bg-secondary); border-radius: 8px;">${safeText}</pre>`;
                            }).catch(() => {
                                body.innerHTML = `<p>Failed to read text file.</p>`;
                            });
                        } else if (contentType === 'application/pdf') {
                            body.innerHTML = `<iframe src="${objUrl}" style="width:100%; height:100%; border:none;"></iframe>`;
                        } else {
                            body.innerHTML = `<div style="text-align:center; padding:2rem;"><i class="fa-solid fa-file" style="font-size:4rem; margin-bottom:1rem; color:var(--text-secondary)"></i><p style="margin-bottom:1rem; color:var(--text-secondary)">No inline preview available for this file type.</p><a href="${objUrl}" download="${name}" class="btn btn-primary">Download File</a></div>`;
                        }
                    })
                    .catch((err) => {
                        console.error('Preview error:', err);
                        if (body) body.innerHTML = `<div style="color:var(--danger); text-align:center;">Failed to load preview (${err.message})</div>`;
                    });
            });
        }

        const btnClosePreview = document.getElementById('btn-close-preview');
        if (btnClosePreview) {
            btnClosePreview.addEventListener('click', () => {
                const previewModal = document.getElementById('preview-modal');
                if (previewModal) previewModal.classList.add('hidden');
                const body = document.getElementById('preview-body');
                if (body) body.innerHTML = '';
            });
        }

        // User Dropdown & Logout
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                localStorage.removeItem('bv_token');
                localStorage.removeItem('bv_user');
                window.location.reload();
            });
        }
        
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = document.getElementById('user-dropdown');
                if (dropdown) dropdown.classList.toggle('hidden');
            });
        }

        document.addEventListener('click', () => {
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown) dropdown.classList.add('hidden');
        });
    }
});
