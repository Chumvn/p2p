// ===== P2P File Share Application =====

// Cute animal names with icons
const CUTE_NAMES = [
    '🐻 Gấu Bông', '🐱 Mèo Mập', '🐔 Gà Con', '🐰 Thỏ Ngọc',
    '🦊 Cáo Tinh', '🐼 Panda', '🐨 Koala', '🦁 Sư Tử',
    '🐯 Hổ Con', '🐸 Ếch Xanh', '🐧 Chim Cánh Cụt', '🦋 Bướm Xinh',
    '🐶 Cún Con', '🐷 Heo Hồng', '🦄 Kỳ Lân', '🐢 Rùa Con',
    '🦉 Cú Mèo', '🐝 Ong Vàng', '🦈 Cá Mập', '🐙 Bạch Tuộc',
    '🦀 Cua Đỏ', '🐳 Cá Voi', '🦩 Hồng Hạc', '🦜 Vẹt Xanh',
    '🐿️ Sóc Nâu', '🦔 Nhím Tròn', '🐲 Rồng Con', '🌸 Lulu',
    '⭐ Star', '🌈 Rainbow', '🍀 Lucky', '💎 Diamond'
];

class P2PShare {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.myPeerId = null;
        this.myNickname = this.getRandomNickname();
        this.peerNickname = null;
        this.isHost = false;
        this.receivingFiles = new Map();

        this.init();
    }

    getRandomNickname() {
        return CUTE_NAMES[Math.floor(Math.random() * CUTE_NAMES.length)];
    }

    init() {
        this.setupTheme();
        this.setupEventListeners();
        this.displayMyNickname();
        this.checkUrlParams();
        this.initPeer();
    }

    displayMyNickname() {
        const nicknameEl = document.getElementById('myNickname');
        if (nicknameEl) {
            nicknameEl.textContent = `Bạn là: ${this.myNickname}`;
        }
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

        // Display room code and QR immediately (don't wait for PeerJS)
        this.displayRoomCode(this.myPeerId);
        this.generateQRCode(this.myPeerId);

        // Check if PeerJS is available
        if (typeof Peer === 'undefined') {
            console.error('PeerJS not loaded');
            this.updateStatus('Lỗi: Không load được PeerJS. Hãy dùng Live Server hoặc deploy lên GitHub.', 'error');
            return;
        }

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

        // Send our nickname to the peer
        conn.on('open', () => {
            conn.send({
                type: 'nickname',
                nickname: this.myNickname
            });
        });

        // If connection is already open, send nickname immediately
        if (conn.open) {
            conn.send({
                type: 'nickname',
                nickname: this.myNickname
            });
        }

        this.updateStatus('Đã kết nối', 'connected');
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
        this.peerNickname = null;
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
        if (data.type === 'nickname') {
            this.peerNickname = data.nickname;
            this.updateConnectedPeerName(data.nickname);
            this.showToast(`${data.nickname} đã kết nối!`);
        } else if (data.type === 'file-start') {
            this.startReceivingFile(data);
        } else if (data.type === 'file-chunk') {
            this.receiveFileChunk(data);
        } else if (data.type === 'file-end') {
            this.completeFileReceive(data);
        }
    }

    updateConnectedPeerName(nickname) {
        const peerText = document.getElementById('connectedPeerText');
        if (peerText) {
            peerText.textContent = `Đã kết nối với ${nickname}`;
        }
    }

    // ===== File Sending =====
    sendFile(file) {
        if (!this.connection) {
            this.showToast('Chưa kết nối');
            return;
        }

        // Prevent sending same file twice
        if (this.sendingFiles && this.sendingFiles.has(file.name + file.size)) {
            console.log('File already being sent:', file.name);
            return;
        }
        if (!this.sendingFiles) this.sendingFiles = new Set();
        this.sendingFiles.add(file.name + file.size);

        const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const chunkSize = 64 * 1024; // 64KB chunks for better reliability
        const totalChunks = Math.ceil(file.size / chunkSize);

        console.log(`Sending file: ${file.name}, Size: ${file.size}, Chunks: ${totalChunks}`);

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
                // Small delay to prevent overwhelming the connection
                setTimeout(readNextChunk, 5);
            } else {
                this.connection.send({
                    type: 'file-end',
                    fileId: fileId,
                    originalSize: file.size
                });
                this.completeTransfer(fileId);
                this.sendingFiles.delete(file.name + file.size);
                console.log(`File sent complete: ${file.name}, Size: ${file.size}`);
                this.showToast(`Đã gửi: ${file.name} (${this.formatFileSize(file.size)})`);
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
            chunks: new Array(data.totalChunks), // Pre-allocate array with correct size
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
        if (!file) {
            console.warn('Received chunk for unknown file:', data.fileId);
            return;
        }

        // Convert to Uint8Array if needed for consistent handling
        let chunkData = data.data;
        if (chunkData instanceof ArrayBuffer) {
            chunkData = new Uint8Array(chunkData);
        }

        // Store chunk at correct index (only if not already received)
        if (!file.chunks[data.chunkIndex]) {
            file.chunks[data.chunkIndex] = chunkData;
            file.receivedChunks++;

            // Log progress every 10 chunks
            if (file.receivedChunks % 10 === 0 || file.receivedChunks === file.totalChunks) {
                console.log(`Receiving: ${file.receivedChunks}/${file.totalChunks} chunks`);
            }
        }

        const progress = Math.round((file.receivedChunks / file.totalChunks) * 100);
        this.updateTransferProgress(data.fileId, progress);
    }

    completeFileReceive(data) {
        const file = this.receivingFiles.get(data.fileId);
        if (!file) return;

        // Check if all chunks received
        let missingChunks = [];
        for (let i = 0; i < file.totalChunks; i++) {
            if (!file.chunks[i]) {
                missingChunks.push(i);
            }
        }

        if (missingChunks.length > 0) {
            console.error('Missing chunks:', missingChunks);
            this.showToast(`Lỗi: Thiếu ${missingChunks.length} phần của file`);
            return;
        }

        // Filter out any undefined values and combine chunks
        const validChunks = file.chunks.filter(chunk => chunk !== undefined);
        const blob = new Blob(validChunks, { type: file.type || 'application/octet-stream' });

        // Verify file size
        console.log(`File size - Expected: ${file.size}, Received: ${blob.size}`);
        if (blob.size !== file.size) {
            console.warn(`Size mismatch! Expected ${file.size}, got ${blob.size}`);
        }

        const url = URL.createObjectURL(blob);

        // Trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        this.completeTransfer(data.fileId);
        this.receivingFiles.delete(data.fileId);
        this.showToast(`Đã nhận: ${file.name} (${this.formatFileSize(blob.size)})`);
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
        document.getElementById('selectFileBtn').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent dropZone click
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            files.forEach(file => {
                this.sendFile(file);
            });
            fileInput.value = ''; // Reset input
        });

        // Drag and drop
        const dropZone = document.getElementById('dropZone');

        // Only trigger file input if clicking on the zone itself, not buttons
        dropZone.addEventListener('click', (e) => {
            // Don't trigger if clicking on the select button
            if (e.target.closest('#selectFileBtn')) return;
            fileInput.click();
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');

            const files = Array.from(e.dataTransfer.files);
            files.forEach(file => {
                this.sendFile(file);
            });
        });
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.p2pShare = new P2PShare();
});
