class AdminPanel {
    constructor() {
        this.currentAdmin = null;
        this.init();
    }

    async init() {
        await this.checkAdminAuth();
        this.initEventListeners();
        this.loadDashboardStats();
        this.setupRealTimeListeners();
    }

    async checkAdminAuth() {
        const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
        const adminEmail = localStorage.getItem('adminEmail');
        
        if (!isAuthenticated || adminEmail !== 'admin@eliteesports.com') {
            window.location.href = 'auth.html';
            return;
        }

        this.currentAdmin = {
            email: adminEmail,
            authenticated: true
        };

        this.updateAdminInfo();
    }

    updateAdminInfo() {
        document.getElementById('admin-greeting').textContent = `Welcome, ${this.currentAdmin.email}`;
        document.getElementById('admin-avatar').textContent = this.currentAdmin.email.charAt(0).toUpperCase();
    }

    initEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showSection(btn.dataset.section);
            });
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('adminAuthenticated');
            localStorage.removeItem('adminEmail');
            window.location.href = 'auth.html';
        });

        // Room Management
        document.getElementById('add-room-btn').addEventListener('click', () => this.addRoom());
        document.getElementById('bulk-add-btn').addEventListener('click', () => this.showBulkModal());

        // Employee Management
        document.getElementById('add-employee-btn').addEventListener('click', () => this.addEmployee());

        // Bulk Modal
        document.getElementById('close-bulk-modal').addEventListener('click', () => this.hideBulkModal());
        document.getElementById('cancel-bulk-add').addEventListener('click', () => this.hideBulkModal());
        document.getElementById('confirm-bulk-add').addEventListener('click', () => this.addBulkRooms());

        // Enter key support
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const activeSection = document.querySelector('.admin-section.active');
                if (activeSection.id === 'rooms-section') {
                    this.addRoom();
                } else if (activeSection.id === 'employees-section') {
                    this.addEmployee();
                }
            }
        });
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        document.getElementById(`${sectionId}-section`).classList.add('active');

        // Update active nav button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`.nav-btn[data-section="${sectionId}"]`).classList.add('active');

        // Load section data
        if (sectionId === 'rooms') {
            this.loadRooms();
        } else if (sectionId === 'employees') {
            this.loadEmployees();
        } else if (sectionId === 'dashboard') {
            this.loadDashboardStats();
        }
    }

    setupRealTimeListeners() {
        // Real-time rooms listener
        db.collection('rooms')
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                this.loadRooms();
                this.loadDashboardStats();
            });

        // Real-time employees listener
        db.collection('users')
            .where('role', '==', 'employee')
            .onSnapshot((snapshot) => {
                this.loadEmployees();
                this.loadDashboardStats();
            });
    }

    async loadRooms() {
        const roomsList = document.getElementById('admin-rooms-list');
        
        try {
            const querySnapshot = await db.collection('rooms').orderBy('createdAt', 'desc').get();

            if (querySnapshot.empty) {
                roomsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-door-closed"></i>
                        <h3>No Rooms Created Yet</h3>
                        <p>Add your first room using the form above</p>
                    </div>
                `;
                return;
            }

            let roomsHTML = '';
            let activeRoomsCount = 0;

            querySnapshot.forEach((doc) => {
                const room = doc.data();
                if (room.status === 'active') activeRoomsCount++;

                const timeAgo = this.getTimeAgo(room.createdAt?.toDate());
                
                roomsHTML += `
                    <div class="room-card">
                        <div class="room-header">
                            <h4>${room.game.toUpperCase()} - ₹${room.tier} ${this.getTierName(room.tier)}</h4>
                            <span class="room-status ${room.status}">${room.status === 'active' ? '🟢 Active' : '🔴 Inactive'}</span>
                        </div>
                        
                        <div class="room-details">
                            <div class="detail-group">
                                <strong>Room ID</strong>
                                <div class="detail-value">${room.roomId}</div>
                            </div>
                            <div class="detail-group">
                                <strong>Password</strong>
                                <div class="detail-value">${room.password}</div>
                            </div>
                        </div>
                        
                        <div class="room-meta">
                            <div>
                                <i class="fas fa-user-shield"></i>
                                ${room.createdBy || 'Admin'}
                            </div>
                            <div>
                                <i class="fas fa-clock"></i>
                                ${timeAgo}
                            </div>
                        </div>
                        
                        <div class="room-actions">
                            <button class="btn btn-danger" onclick="adminPanel.deleteRoom('${doc.id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                            <button class="btn btn-warning" onclick="adminPanel.toggleRoomStatus('${doc.id}', '${room.status}')">
                                <i class="fas fa-power-off"></i>
                                ${room.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button class="btn btn-secondary" onclick="adminPanel.editRoom('${doc.id}', '${room.roomId}', '${room.password}', '${room.tier}', '${room.game}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        </div>
                    </div>
                `;
            });

            roomsList.innerHTML = roomsHTML;
            
            // Update stats
            document.getElementById('total-rooms').textContent = querySnapshot.size;
            document.getElementById('active-rooms').textContent = activeRoomsCount;

        } catch (error) {
            console.error('Error loading rooms:', error);
            roomsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error Loading Rooms</h3>
                    <p>Please check your connection and try again</p>
                    <button class="submit-btn" onclick="adminPanel.loadRooms()">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    async addRoom() {
        const roomId = document.getElementById('room-id').value;
        const roomPassword = document.getElementById('room-password').value;
        const roomTier = document.getElementById('room-tier').value;
        const roomGame = document.getElementById('room-game').value;
        const button = document.getElementById('add-room-btn');

        if (!roomId || !roomPassword) {
            this.showNotification('Please enter room ID and password', 'error');
            return;
        }

        const originalText = button.innerHTML;
        button.innerHTML = '<div class="spinner"></div> Adding...';
        button.disabled = true;

        try {
            await db.collection('rooms').add({
                roomId: roomId,
                password: roomPassword,
                tier: roomTier,
                game: roomGame,
                status: 'active',
                createdBy: this.currentAdmin.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Clear form
            document.getElementById('room-id').value = '';
            document.getElementById('room-password').value = '';

            this.showNotification('Room added successfully!', 'success');

        } catch (error) {
            console.error('Error adding room:', error);
            this.showNotification('Error adding room: ' + error.message, 'error');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    async deleteRoom(roomId) {
        if (!confirm('Are you sure you want to delete this room?')) return;

        try {
            await db.collection('rooms').doc(roomId).delete();
            this.showNotification('Room deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting room:', error);
            this.showNotification('Error deleting room: ' + error.message, 'error');
        }
    }

    async toggleRoomStatus(roomId, currentStatus) {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        
        try {
            await db.collection('rooms').doc(roomId).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            this.showNotification(`Room ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`, 'success');
        } catch (error) {
            console.error('Error updating room status:', error);
            this.showNotification('Error updating room status: ' + error.message, 'error');
        }
    }

    editRoom(roomId, currentRoomId, currentPassword, currentTier, currentGame) {
        const newRoomId = prompt('Enter new Room ID:', currentRoomId);
        const newPassword = prompt('Enter new Password:', currentPassword);
        const newTier = prompt('Enter new Tier (50, 100, 200, 500):', currentTier);
        const newGame = prompt('Enter new Game (freefire/bgmi):', currentGame);
        
        if (newRoomId && newPassword && newTier && newGame) {
            db.collection('rooms').doc(roomId).update({
                roomId: newRoomId,
                password: newPassword,
                tier: newTier,
                game: newGame,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                this.showNotification('Room updated successfully!', 'success');
            })
            .catch((error) => {
                this.showNotification('Error updating room: ' + error.message, 'error');
            });
        }
    }

    showBulkModal() {
        document.getElementById('bulk-modal').classList.add('active');
    }

    hideBulkModal() {
        document.getElementById('bulk-modal').classList.remove('active');
    }

    async addBulkRooms() {
        const prefix = document.getElementById('bulk-prefix').value;
        const count = parseInt(document.getElementById('bulk-count').value);
        const password = document.getElementById('bulk-password').value;
        const tier = document.getElementById('bulk-tier').value;
        const game = document.getElementById('bulk-game').value;
        const button = document.getElementById('confirm-bulk-add');

        if (!prefix || !count || !password) {
            this.showNotification('Please fill all fields', 'error');
            return;
        }
