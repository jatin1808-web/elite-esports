class AuthManager {
    constructor() {
        this.initEventListeners();
        this.checkRedirect();
    }

    initEventListeners() {
        // Form switching
        document.getElementById('show-signup').addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('signup');
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('login');
        });

        document.getElementById('admin-login-btn').addEventListener('click', () => {
            this.showForm('admin');
        });

        document.getElementById('back-to-login').addEventListener('click', () => {
            this.showForm('login');
        });

        // Form submissions
        document.getElementById('login-btn').addEventListener('click', () => this.loginUser());
        document.getElementById('signup-btn').addEventListener('click', () => this.signupUser());
        document.getElementById('admin-login-submit').addEventListener('click', () => this.adminLogin());
        document.getElementById('google-login-btn').addEventListener('click', () => this.googleLogin());
        document.getElementById('google-signup-btn').addEventListener('click', () => this.googleLogin());

        // Enter key support
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const activeForm = document.querySelector('.auth-form.active');
                if (activeForm.id === 'login-form') this.loginUser();
                if (activeForm.id === 'signup-form') this.signupUser();
                if (activeForm.id === 'admin-form') this.adminLogin();
            }
        });
    }

    showForm(formType) {
        // Hide all forms
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });

        // Show selected form
        document.getElementById(`${formType}-form`).classList.add('active');

        // Clear messages
        this.clearMessages();
    }

    clearMessages() {
        const existingMessages = document.querySelectorAll('.error-message, .success-message');
        existingMessages.forEach(msg => msg.remove());
    }

    showMessage(message, type = 'error') {
        this.clearMessages();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.textContent = message;
        
        const activeForm = document.querySelector('.auth-form.active');
        activeForm.insertBefore(messageDiv, activeForm.firstChild);
    }

    setLoading(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<div class="spinner"></div> Loading...';
            button.classList.add('loading');
        } else {
            button.disabled = false;
            const originalText = button.id.includes('login') ? 
                '<i class="fas fa-sign-in-alt"></i> Login' : 
                '<i class="fas fa-user-plus"></i> Create Account';
            button.innerHTML = originalText;
            button.classList.remove('loading');
        }
    }

    async loginUser() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const button = document.getElementById('login-btn');

        if (!email || !password) {
            this.showMessage('Please fill in all fields');
            return;
        }

        this.setLoading(button, true);

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Get user role from Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                this.showMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                this.showMessage('User account not found in database');
                await auth.signOut();
            }
        } catch (error) {
            console.error('Login error:', error);
            this.handleAuthError(error);
        } finally {
            this.setLoading(button, false);
        }
    }

    async signupUser() {
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const name = document.getElementById('signup-name').value;
        const gameId = document.getElementById('signup-gameid').value;
        const button = document.getElementById('signup-btn');

        if (!email || !password || !name) {
            this.showMessage('Please fill all required fields');
            return;
        }

        if (password.length < 6) {
            this.showMessage('Password must be at least 6 characters long');
            return;
        }

        this.setLoading(button, true);

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Create user document in Firestore
            await db.collection('users').doc(user.uid).set({
                name: name,
                email: email,
                gameId: gameId || 'Not set',
                role: 'player',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            this.showMessage('Account created successfully! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } catch (error) {
            console.error('Signup error:', error);
            this.handleAuthError(error);
        } finally {
            this.setLoading(button, false);
        }
    }

    async adminLogin() {
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;
        const button = document.getElementById('admin-login-submit');

        if (!email || !password) {
            this.showMessage('Please enter admin credentials');
            return;
        }

        this.setLoading(button, true);

        // Simple admin authentication
        if (email === 'admin@eliteesports.com' && password === 'jatin1909_2010_1808') {
            // Create admin session
            localStorage.setItem('adminAuthenticated', 'true');
            localStorage.setItem('adminEmail', email);
            
            this.showMessage('Admin login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);
        } else {
            this.showMessage('Invalid admin credentials');
        }

        this.setLoading(button, false);
    }

    async googleLogin() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');
            
            const result = await auth.signInWithPopup(provider);
            const user = result.user;
            
            // Check if user document exists
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                // Create new user document for Google sign-in
                await db.collection('users').doc(user.uid).set({
                    name: user.displayName,
                    email: user.email,
                    gameId: 'Not set',
                    role: 'player',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            this.showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (error) {
            console.error('Google login error:', error);
            this.handleAuthError(error);
        }
    }

    handleAuthError(error) {
        let message = 'An error occurred during authentication';
        
        switch (error.code) {
            case 'auth/invalid-email':
                message = 'Invalid email address';
                break;
            case 'auth/user-disabled':
                message = 'This account has been disabled';
                break;
            case 'auth/user-not-found':
                message = 'No account found with this email';
                break;
            case 'auth/wrong-password':
                message = 'Incorrect password';
                break;
            case 'auth/email-already-in-use':
                message = 'An account with this email already exists';
                break;
            case 'auth/weak-password':
                message = 'Password is too weak';
                break;
            case 'auth/popup-blocked':
                message = 'Popup was blocked. Please allow popups for this site.';
                break;
            case 'auth/popup-closed-by-user':
                message = 'Login cancelled';
                break;
            case 'auth/network-request-failed':
                message = 'Network error. Please check your connection.';
                break;
        }
        
        this.showMessage(message);
    }

    checkRedirect() {
        // Check if user is already logged in
        auth.onAuthStateChanged((user) => {
            if (user) {
                window.location.href = 'index.html';
            }
        });

        // Check if admin is already logged in
        if (localStorage.getItem('adminAuthenticated') === 'true') {
            window.location.href = 'admin.html';
        }
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});