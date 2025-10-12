class PlayerDashboard {
    constructor() {
        this.currentUser = null;
        this.userData = null;
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.initEventListeners();
        this.loadUserData();
        this.setupRoomListeners();
    }

    async checkAuth() {
        return new Promise((resolve) => {
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    this.currentUser = user;
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        this.userData = userDoc.data();
                        resolve();
                    } else {
                        this.redirectToAuth();
                    }
                } else {
                    this.redirectToAuth();
                }
            });
        });
    }

    redirectToAuth() {
        window.location.href = 'auth.html';
    }

    initEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPage(link.dataset.page);
            });
        });

        // Buttons
        document.querySelectorAll('.cta-button, .tier-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                if (button.dataset.page) {
                    this.showPage(button.dataset.page);
                }
            });
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            auth.signOut();
        });

        // Refresh rooms
        document.getElementById('refresh-rooms').addEventListener('click', () => {
            this.loadRoomsForPlayers();
        });

        // Join buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('join-button') && !e.target.dataset.roomId) {
                const card = e.target.closest('.tournament-card');
                const name = card.querySelector('h3').textContent;
                const price = card.querySelector('.tournament-price').textContent;
                
                if (card.classList.contains('premium')) {
                    alert(`Joining ${name} for ${price}\n\nPremium tournament - higher rewards!`);
                } else {
                    alert(`Joining ${name} for ${price}`);
                }
            }
        });
    }

    loadUserData() {
        if (this.userData) {
            const displayName = this.userData.name || this.currentUser.email.split('@')[0];
            document.getElementById('user-greeting').textContent = `Welcome, ${displayName}`;
            document.getElementById('user-avatar').textContent = displayName.charAt(0).toUpperCase();
        }
    }

    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show selected page
        document.getElementById(pageId).classList.add('active');

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        document.querySelector(`.nav-link[data-page="${pageId}"]`).classList.add('active');

        // Load rooms if showing freefire page
        if (pageId === 'freefire') {
            this.loadRoomsForPlayers();
        }
    }

    setupRoomListeners() {
        // Real-time listener for rooms
        db.collection('rooms')
            .where('status', '==', 'active')
            .where('game', '==', 'freefire')
            .orderBy('tier', 'asc')
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                this.loadRoomsForPlayers();
            }, (error) => {
                console.error('Room listener error:', error);
            });
    }

    async loadRoomsForPlayers() {
        const roomGrid = document.getElementById('freefire-rooms');
        
        try {
            roomGrid.innerHTML = `
                <div class="loading-rooms">
                    <div class="spinner"></div>
                    <p>Loading available rooms...</p>
                </div>
            `;

            const querySnapshot = await db.collection('rooms')
                .where('status', '==', 'active')
                .where('game', '==', 'freefire')
                .orderBy('tier', 'asc')
                .orderBy('createdAt', 'desc')
                .get();

            if (querySnapshot.empty) {
                roomGrid.innerHTML = `
                    <div class="no-rooms">
                        <i class="fas fa-door-open"></i>
                        <h3>No Rooms Available</h3>
                        <p>Check back later for new tournament rooms</p>
                        <button class="cta-button" onclick="location.reload()" style="margin-top: 20px;">
                            <i class="fas fa-redo"></i> Refresh
                        </button>
                    </div>
                `;
                return;
            }

            // Group rooms by tier
            const roomsByTier = {
                '50': { rooms: [], name: 'Entry', killReward: '10' },
                '100': { rooms: [], name: 'Pro', killReward: '25' },
                '200': { rooms: [], name: 'Premium', killReward: '50' },
                '500': { rooms: [], name: 'Elite', killReward: '100' }
            };

            querySnapshot.forEach((doc) => {
                const room = doc.data();
                if (roomsByTier[room.tier]) {
                    roomsByTier[room.tier].rooms.push({
                        id: doc.id,
                        ...room
                    });
                }
            });

            let roomsHTML = '';

            // Create tournament cards for each tier
            for (const [tier, tierData] of Object.entries(roomsByTier)) {
                if (tierData.rooms.length > 0) {
                    const isPremium = tier === '200' || tier === '500';
                    
                    // Add tier section header
                    roomsHTML += `
                        <div class="tier-header">
                            <h3>${tierData.name} Tier - ₹${tier} Rooms</h3>
                            <p>${tierData.rooms.length} room${tierData.rooms.length > 1 ? 's' : ''} available • ₹${tierData.killReward} per kill</p>
                        </div>
                    `;

                    // Add rooms for this tier
                    tierData.rooms.forEach((room, index) => {
                        const timeAgo = this.getTimeAgo(room.createdAt?.toDate());
                        
                        roomsHTML += `
                            <div class="tournament-card ${isPremium ? 'premium' : ''}">
                                <div class="tournament-time">
                                    <i class="fas fa-fire"></i>
                                    Room ${index + 1}
                                    ${timeAgo ? `<span style="margin-left: 10px; font-size: 0.8em; opacity: 0.7;">Added ${timeAgo}</span>` : ''}
                                </div>
                                <h3>${tierData.name} Battle</h3>
                                <div class="tournament-price">₹${tier}</div>
                                <div class="prize-pool">
                                    <i class="fas fa-trophy"></i>
                                    Custom Tournament Room
                                </div>
                                <div class="kill-reward">
                                    <span>Per Kill Reward:</span>
                                    <span>₹${tierData.killReward}</span>
                                </div>
                                <div class="room-details">
                                    <div class="room-id">
                                        <span><i class="fas fa-door-open"></i> Room ID:</span>
                                        <span>${room.roomId}</span>
                                        <button class="copy-btn" onclick="copyToClipboard('${room.roomId}')">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>
                                    <div class="room-password">
                                        <span><i class="fas fa-key"></i> Password:</span>
                                        <span>${room.password}</span>
                                        <button class="copy-btn" onclick="copyToClipboard('${room.password}')">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>
                                    ${room.createdBy ? 
                                        `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); font-size: 0.8em; color: var(--text-secondary);">
                                            <i class="fas fa-user-shield"></i> Added by: ${room.createdBy}
                                        </div>` : 
                                        ''
                                    }
                                </div>
                                <button class="join-button" onclick="joinRoom('${room.roomId}', '${room.password}', ${tier})">
                                    <i class="fas fa-gamepad"></i> Join Room
                                </button>
                            </div>
                        `;
                    });
                }
            }

            roomGrid.innerHTML = roomsHTML;

        } catch (error) {
            console.error('Error loading rooms:', error);
            roomGrid.innerHTML = `
                <div class="no-rooms">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error Loading Rooms</h3>
                    <p>Please check your connection and try again</p>
                    <button class="cta-button" onclick="location.reload()" style="margin-top: 20px;">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    getTimeAgo(date) {
        if (!date) return '';
        
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return "just now";
    }
}

// Utility functions
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showNotification('Failed to copy. Please copy manually.', 'error');
    });
}

function joinRoom(roomId, password, tier) {
    const tierNames = {
        '50': 'Entry',
        '100': 'Pro', 
        '200': 'Premium',
        '500': 'Elite'
    };
    
    const killRewards = {
        '50': '10',
        '100': '25',
        '200': '50',
        '500': '100'
    };
    
    const tierName = tierNames[tier] || 'Unknown';
    const killReward = killRewards[tier] || '0';
    
    const joinMessage = `
🏆 JOINING TOURNAMENT ROOM 🏆

🎮 Room Details:
• Tier: ${tierName} (₹${tier})
• Room ID: ${roomId}
• Password: ${password}
• Per Kill: ₹${killReward}

📋 Instructions:
1. Open Free Fire/BGMI
2. Go to Custom Room
3. Enter Room ID: ${roomId}
4. Enter Password: ${password}
5. Join and dominate!

Good luck, champion! 🎯
    `;
    
    if (confirm(joinMessage)) {
        showNotification(`Successfully joined ${tierName} room!`, 'success');
    }
}

function showNotification(message, type = 'info') {
    // Simple notification implementation
    alert(`${type.toUpperCase()}: ${message}`);
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PlayerDashboard();
});