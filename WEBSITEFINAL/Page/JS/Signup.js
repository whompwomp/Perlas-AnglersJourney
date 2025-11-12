// Signup manager: uses the same notification UI/UX as Login.js
class SignupManager {
    constructor() {
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.form = document.getElementById('signupForm');
        this.usernameField = document.getElementById('username');
        this.usernameError = document.getElementById('usernameError');
        this.emailField = document.getElementById('email');
        this.passwordField = document.getElementById('password');
        this.confirmPasswordField = document.getElementById('confirmPassword');
        this.showPasswordCheckbox = document.getElementById('showPassword');
        this.showConfirmPasswordCheckbox = document.getElementById('showConfirmPassword');
        this.signupButton = document.getElementById('signupButton');
        this.buttonText = this.signupButton.querySelector('.button-text');
        this.loadingSpinner = this.signupButton.querySelector('.loading-spinner');
        this.emailError = document.getElementById('emailError');
        this.passwordError = document.getElementById('passwordError');
        this.notificationContainer = document.getElementById('notificationContainer');
    }

    bindEvents() {
        if (this.showPasswordCheckbox) {
            this.showPasswordCheckbox.addEventListener('change', () => {
                this.passwordField.type = this.showPasswordCheckbox.checked ? 'text' : 'password';
            });
        }

        if (this.showConfirmPasswordCheckbox) {
            this.showConfirmPasswordCheckbox.addEventListener('change', () => {
                this.confirmPasswordField.type = this.showConfirmPasswordCheckbox.checked ? 'text' : 'password';
            });
        }

        // Email-only signup — username field removed from markup
        this.emailField.addEventListener('input', () => this.validateEmail(this.emailField.value));
    if (this.usernameField) this.usernameField.addEventListener('input', () => this.validateUsername(this.usernameField.value));
        this.passwordField.addEventListener('input', () => this.validatePassword(this.passwordField.value));
        this.confirmPasswordField.addEventListener('input', () => this.validateConfirmPassword(this.confirmPasswordField.value));

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    validateEmail(email) {
        // Simple email regex for demonstration
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        this.updateFieldValidation(this.emailField, this.emailError, isValid, 'Please enter a valid email address');
        return isValid;
    }

    validateUsername(username) {
        if (!this.usernameField) return true;
        const trimmed = (username || '').trim();
        // Allow letters, numbers, underscore, hyphen. 3-20 chars.
        const isValid = /^[a-zA-Z0-9_-]{3,20}$/.test(trimmed);
        this.updateFieldValidation(this.usernameField, this.usernameError, isValid, 'Username must be 3-20 chars: letters, numbers, dash or underscore');
        return isValid;
    }

    validatePassword(password) {
        const isValid = password.length >= 8;
        this.updateFieldValidation(this.passwordField, this.passwordError, isValid, 'Password must be at least 8 characters long');
        return isValid;
    }

    validateConfirmPassword(confirmPassword) {
        const isValid = confirmPassword === this.passwordField.value;
        // Reuse passwordError element for confirm mismatch to keep markup minimal
        if (!isValid && confirmPassword !== '') {
            this.showError(this.passwordError, 'Passwords do not match');
        } else {
            this.hideError(this.passwordError);
        }
        return isValid;
    }

    updateFieldValidation(field, errorElement, isValid, errorMessage) {
        if (field.value === '') {
            field.classList.remove('error', 'success');
            this.hideError(errorElement);
            return;
        }

        if (isValid) {
            field.classList.remove('error');
            field.classList.add('success');
            this.hideError(errorElement);
        } else {
            field.classList.remove('success');
            field.classList.add('error');
            this.showError(errorElement, errorMessage);
        }
    }

    showError(errorElement, message) {
        if (!errorElement) return;
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }

    hideError(errorElement) {
        if (!errorElement) return;
        errorElement.classList.remove('show');
        setTimeout(() => {
            if (!errorElement.classList.contains('show')) {
                errorElement.textContent = '';
            }
        }, 300);
    }

    async handleSubmit(event) {
        event.preventDefault();

        const username = this.usernameField ? (this.usernameField.value || '').trim() : '';
        const email = this.emailField.value.trim();
        const password = this.passwordField.value;
        const confirmPassword = this.confirmPasswordField.value;

        const isUsernameValid = this.validateUsername(username);
        const isEmailValid = this.validateEmail(email);
        const isPasswordValid = this.validatePassword(password);
        const isConfirmValid = this.validateConfirmPassword(confirmPassword);
        if (!isUsernameValid || !isEmailValid || !isPasswordValid || !isConfirmValid) {
            this.showNotification('Please fix the errors above', 'error');
            this.shakeForm();
            return;
        }

        this.setLoadingState(true);

        try {
            // Small delay for UX
            await this.delay(500);

            // Attempt Firebase signup
            try {
                const firebase = await loadFirebase();
                const emailVal = (this.emailField && this.emailField.value || '').trim();
                const usernameVal = username;

                // Validate again before network calls
                if (!this.validateEmail(emailVal)) {
                    this.showNotification('Please fix the email above', 'error');
                    this.setLoadingState(false);
                    return;
                }

                // Check username uniqueness (case-insensitive)
                if (usernameVal) {
                    try {
                        const usersSnap = await firebase.database().ref('users').once('value');
                        const users = usersSnap.val() || {};
                        const found = Object.values(users).some(u => u && u.username && u.username.toLowerCase() === usernameVal.toLowerCase());
                        if (found) {
                            this.showNotification('That username is already taken. Please choose another.', 'error');
                            this.setLoadingState(false);
                            return;
                        }
                    } catch (uErr) {
                        console.warn('Username uniqueness check failed:', uErr);
                    }
                }

                // Create auth user with the real email
                const userCred = await firebase.auth().createUserWithEmailAndPassword(emailVal, password);
                const uid = userCred.user.uid;

                // Set user profile at users/{uid}
                const updates = {};
                updates[`users/${uid}`] = {
                    email: emailVal,
                    username: usernameVal || null,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };

                await firebase.database().ref().update(updates);

                this.showNotification('Account registered successfully. Redirecting to login...', 'success');
                if (typeof window.pushNotification === 'function') window.pushNotification('Account created — please log in', 'success', 2500);
                // mark bell dot
                const dot = document.querySelector('.notify-indicator .dot'); if (dot) dot.style.display = 'block';
                await this.delay(1000);
                window.location.href = 'Login.html';
                return;
            } catch (err) {
                console.warn('Firebase signup error:', err && err.message ? err.message : err);

                if (err && err.code === 'auth/email-already-in-use') {
                    this.showNotification('That email is already registered. Please log in.', 'error');
                    return;
                }

                // Fall through to local fallback
            }

            // Local fallback (insecure) — useful for offline/testing
            try {
                // Local fallback stores email instead of username
                localStorage.setItem('registeredEmail', email);
                localStorage.setItem('registeredPassword', password);
                if (this.usernameField) localStorage.setItem('registeredUsername', username);
                this.showNotification('Account registered locally (offline). Redirecting to login...', 'success');
                if (typeof window.pushNotification === 'function') window.pushNotification('Local account created — please log in', 'info', 2200);
                const dot2 = document.querySelector('.notify-indicator .dot'); if (dot2) dot2.style.display = 'block';
                await this.delay(900);
                window.location.href = 'Login.html';
                return;
            } catch (e) {
                console.error('Local fallback failed:', e);
                this.showNotification('Unable to register account right now. Please try again later.', 'error');
                return;
            }

        } catch (e) {
            console.error(e);
            this.showNotification('An error occurred. Please try again.', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    setLoadingState(isLoading) {
        if (isLoading) {
            this.signupButton.classList.add('loading');
            if (this.buttonText) this.buttonText.style.display = 'none';
            // Remove or comment out the loading spinner logic
            // if (this.loadingSpinner) this.loadingSpinner.style.display = 'inline-block';
            this.signupButton.disabled = true;
        } else {
            this.signupButton.classList.remove('loading');
            if (this.buttonText) this.buttonText.style.display = 'inline-block';
            // if (this.loadingSpinner) this.loadingSpinner.style.display = 'none';
            this.signupButton.disabled = false;
        }
    }

    showNotification(message, type = 'info') {
        if (!this.notificationContainer) return alert(message);

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        this.notificationContainer.appendChild(notification);

        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Auto remove after 3 seconds
        setTimeout(() => {
            this.removeNotification(notification);
        }, 3000);
    }

    removeNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    shakeForm() {
        const container = document.querySelector('.login-container');
        if (!container) return;
        container.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            container.style.animation = '';
        }, 500);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Firebase RTDB keys cannot contain '.' so we escape email to use as a key
    escapeEmailAsKey(email) {
        return email.replace(/\./g, ',');
    }
}

// Add shake animation to CSS if not present (same as Login.js)
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(shakeStyle);

document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

    // Remove any text content for toggle buttons
    togglePassword.textContent = '';
    togglePassword.addEventListener('click', function() {
        const isHidden = passwordInput.type === 'password';
        passwordInput.type = isHidden ? 'text' : 'password';
        // No text or icon is set
    });

    toggleConfirmPassword.textContent = '';
    toggleConfirmPassword.addEventListener('click', function() {
        const isHidden = confirmPasswordInput.type === 'password';
        confirmPasswordInput.type = isHidden ? 'text' : 'password';
        // No text or icon is set
    });
});

document.addEventListener('DOMContentLoaded', () => {
    new SignupManager();
});
