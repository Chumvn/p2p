// ===== P2P File Share Application =====

class P2PShare {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.myPeerId = null;
        this.isHost = false;
        this.receivingFiles = new Map();

        this.init();
    }

    init() {
        this.setupTheme();
        this.setupEventListeners();
        this.checkUrlParams();
        this.initPeer();
    }

    // ===== Theme Management =====
    setupTheme() {
        const savedTheme = localStorage.getItem('p2p-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme || (prefersDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('p2p-theme', next);
    }

    // ===== URL Parameters =====
    checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const roomId = params.get('room');
        if (roomId) {
            document.getElementById('peerIdInput').value = roomId.toUpperCase();
            this.switchTab('join');
        }
    }

    // ===== PeerJS Initialization =====
    initPeer() {
        this.myPeerId = this.generateRoomCode();

        this.peer = new Peer(this.myPeerId, {
            debug: 0,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        });

        this.peer.on('open', (id) => {
            console.log('Connected to PeerJS, ID:', id);
            this.updateStatus('Sẵn sàng kết nối', 'ready');
            this.displayRoomCode(id);
            this.generateQRCode(id);
        });

        this.peer.on('connection', (conn) => {
            console.log('Incoming connection from:', conn.peer);
            this.handleConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error('Peer error:', err);
            if (err.type === 'peer-unavailable') {
                this.showToast('Không tìm thấy phòng này');
                this.updateStatus('Không tìm thấy phòng', 'error');
            } else if (err.type === 'network') {
                this.showToast('Lỗi kết nối mạng');
                this.updateStatus('Lỗi mạng', 'error');
            } else {
                this.updateStatus('Lỗi: ' + err.type, 'error');
            }
        });

        this.peer.on('disconnected', () => {
            this.updateStatus('Mất kết nối, đang thử lại...', 'connecting');
            this.peer.reconnect();
        });
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    displayRoomCode(code) {
        document.getElementById('roomCode').textContent = code;
    }

    generateQRCode(code) {
        const qrContainer = document.getElementById('qrCode');
        qrContainer.innerHTML = '';

        // Build URL for QR content
        let qrContent;
        if (window.location.protocol === 'file:') {
            qrContent = code;
        } else {
            qrContent = `${window.location.origin}${window.location.pathname}?room=${code}`;
        }

        // Use QR code image API (works everywhere, no JS library needed)
        const img = document.createElement('img');
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrContent)}&bgcolor=ffffff&color=2d3748`;
        img.alt = 'QR Code';
        img.style.cssText = 'width:160px;height:160px;border-radius:8px;display:block;';
        img.onerror = () => {
            // Fallback: just show code in styled box
            qrContainer.innerHTML = `
                <div style="width:160px;height:160px;display:flex;align-items:center;justify-content:center;background:#f0f0f0;border-radius:8px;font-size:20px;font-weight:bold;color:#2d3748;font-family:monospace;text-align:center;">
                    ${code}
                </div>
            `;
        };
        qrContainer.appendChild(img);
    }

    // ===== Connection Management =====
    connectToPeer(peerId) {
        if (!peerId) {
            this.showToast('Vui lòng nhập mã phòng');
            return;
        }

        peerId = peerId.toUpperCase().trim();
        this.updateStatus('Đang kết nối...', 'connecting');

        const conn = this.peer.connect(peerId, {
            reliable: true
        });

        conn.on('open', () => {
            this.handleConnection(conn);
        });

        conn.on('error', (err) => {
            console.error('Connection error:', err);
            this.showToast('Lỗi kết nối');
            this.updateStatus('Lỗi kết nối', 'error');
        });
    }

    handleConnection(conn) {
        this.connection = conn;
        this.updateStatus('Đã kết nối với ' + conn.peer, 'connected');
        this.showConnectedPanel();
        this.showToast('Đã kết nối thành công!');

        conn.on('data', (data) => {
            this.handleData(data);
        });

        conn.on('close', () => {
            this.handleDisconnect();
        });

        conn.on('error', (err) => {
            console.error('Connection error:', err);
            this.handleDisconnect();
        });
    }

    handleDisconnect() {
        this.connection = null;
        this.updateStatus('Đã ngắt kết nối', 'ready');
        this.showConnectionPanel();
        this.showToast('Đã ngắt kết nối');
    }

    disconnect() {
        if (this.connection) {
            this.connection.close();
            this.connection = null;
        }
        this.handleDisconnect();
    }

    // ===== Data Handling =====
    handleData(data) {
        if (data.type === 'file-start') {
            this.startReceivingFile(data);
        } else if (data.type === 'file-chunk') {
            this.receiveFileChunk(data);
        } else if (data.type === 'file-end') {
            this.completeFileReceive(data);
        }
    }

    // ===== File Sending =====
    sendFile(file) {
        if (!this.connection) {
            this.showToast('Chưa kết nối');
            return;
        }

        const fileId = Date.now().toString();
        const chunkSize = 16 * 1024; // 16KB chunks
        const totalChunks = Math.ceil(file.size / chunkSize);

        // Add to transfer list
        this.addTransferItem({
            id: fileId,
            name: file.name,
            size: file.size,
            direction: 'upload',
            progress: 0
        });

        // Send file metadata
        this.connection.send({
            type: 'file-start',
            fileId: fileId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            totalChunks: totalChunks
        });

        // Read and send chunks
        const reader = new FileReader();
        let currentChunk = 0;

        const readNextChunk = () => {
            const start = currentChunk * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const blob = file.slice(start, end);
            reader.readAsArrayBuffer(blob);
        };

        reader.onload = (e) => {
            this.connection.send({
                type: 'file-chunk',
                fileId: fileId,
                chunkIndex: currentChunk,
                data: e.target.result
            });

            currentChunk++;
            const progress = Math.round((currentChunk / totalChunks) * 100);
            this.updateTransferProgress(fileId, progress);

            if (currentChunk < totalChunks) {
                // Small delay to prevent overwhelming
                setTimeout(readNextChunk, 10);
            } else {
                this.connection.send({
                    type: 'file-end',
                    fileId: fileId
                });
                this.completeTransfer(fileId);
                this.showToast(`Đã gửi: ${file.name}`);
            }
        };

        readNextChunk();
    }

    // ===== File Receiving =====
    startReceivingFile(data) {
        this.receivingFiles.set(data.fileId, {
            name: data.fileName,
            size: data.fileSize,
            type: data.fileType,
            totalChunks: data.totalChunks,
            chunks: [],
            receivedChunks: 0
        });

        this.addTransferItem({
            id: data.fileId,
            name: data.fileName,
            size: data.fileSize,
            direction: 'download',
            progress: 0
        });
    }

    receiveFileChunk(data) {
        const file = this.receivingFiles.get(data.fileId);
        if (!file) return;

        file.chunks[data.chunkIndex] = data.data;
        file.receivedChunks++;

        const progress = Math.round((file.receivedChunks / file.totalChunks) * 100);
        this.updateTransferProgress(data.fileId, progress);
    }

    completeFileReceive(data) {
        const file = this.receivingFiles.get(data.fileId);
        if (!file) return;

        // Combine chunks
        const blob = new Blob(file.chunks, { type: file.type });
        const url = URL.createObjectURL(blob);

        // Trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);

        this.completeTransfer(data.fileId);
        this.receivingFiles.delete(data.fileId);
        this.showToast(`Đã nhận: ${file.name}`);
    }

    // ===== UI Updates =====
    updateStatus(text, state) {
        const statusText = document.getElementById('statusText');
        const statusDot = document.querySelector('.status-dot');

        statusText.textContent = text;
        statusDot.className = 'status-dot';

        if (state === 'connected') {
            statusDot.classList.add('connected');
        } else if (state === 'error') {
            statusDot.classList.add('error');
        }
    }

    showConnectedPanel() {
        document.getElementById('connectionCard').classList.add('hidden');
        document.getElementById('connectedPanel').classList.remove('hidden');
        document.getElementById('connectedPeerText').textContent = 'Đã kết nối với 1 thiết bị';
    }

    showConnectionPanel() {
        document.getElementById('connectionCard').classList.remove('hidden');
        document.getElementById('connectedPanel').classList.add('hidden');
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName + 'Tab').classList.add('active');
    }

    addTransferItem(file) {
        const container = document.getElementById('transferItems');
        const item = document.createElement('div');
        item.className = 'transfer-item';
        item.id = `transfer-${file.id}`;
        item.innerHTML = `
            <div class="file-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                    <polyline points="13 2 13 9 20 9"/>
                </svg>
            </div>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${this.formatFileSize(file.size)}</div>
                <div class="progress-bar">
                    <div class="progress" style="width: 0%"></div>
                </div>
            </div>
            <div class="file-status sending">${file.direction === 'upload' ? 'Đang gửi...' : 'Đang nhận...'}</div>
        `;
        container.insertBefore(item, container.firstChild);
    }

    updateTransferProgress(fileId, progress) {
        const item = document.getElementById(`transfer-${fileId}`);
        if (!item) return;

        const progressBar = item.querySelector('.progress');
        progressBar.style.width = progress + '%';
    }

    completeTransfer(fileId) {
        const item = document.getElementById(`transfer-${fileId}`);
        if (!item) return;

        const progressBar = item.querySelector('.progress');
        progressBar.style.width = '100%';

        const status = item.querySelector('.file-status');
        status.className = 'file-status complete';
        status.textContent = 'Hoàn thành ✓';
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');

        toastMessage.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Đã copy!');
        }).catch(() => {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('Đã copy!');
        });
    }

    // ===== Event Listeners =====
    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Copy code
        document.getElementById('copyCode').addEventListener('click', () => {
            this.copyToClipboard(this.myPeerId);
        });

        // Copy link
        document.getElementById('copyLink').addEventListener('click', () => {
            const url = `${window.location.origin}${window.location.pathname}?room=${this.myPeerId}`;
            this.copyToClipboard(url);
        });

        // Connect button
        document.getElementById('connectBtn').addEventListener('click', () => {
            const peerId = document.getElementById('peerIdInput').value;
            this.connectToPeer(peerId);
        });

        // Enter key to connect
        document.getElementById('peerIdInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const peerId = document.getElementById('peerIdInput').value;
                this.connectToPeer(peerId);
            }
        });

        // Disconnect
        document.getElementById('disconnectBtn').addEventListener('click', () => {
            this.disconnect();
        });

        // File selection
        const fileInput = document.getElementById('fileInput');
        document.getElementById('selectFileBtn').addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            Array.from(e.target.files).forEach(file => {
                this.sendFile(file);
            });
            fileInput.value = '';
        });

        // Drag and drop
        const dropZone = document.getElementById('dropZone');

        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');

            Array.from(e.dataTransfer.files).forEach(file => {
                this.sendFile(file);
            });
        });
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.p2pShare = new P2PShare();
});
