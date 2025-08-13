document.addEventListener('DOMContentLoaded', function () {
    // Populate date of birth dropdowns
    const monthSelect = document.getElementById('month-select');
    const daySelect = document.getElementById('day-select');
    const yearSelect = document.getElementById('year-select');

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        monthSelect.appendChild(option);
    });

    for (let i = 1; i <= 31; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        daySelect.appendChild(option);
    }

    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - 120; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearSelect.appendChild(option);
    }
});

const signUpButton = document.getElementById('signUpButton');
const signInButton = document.getElementById('signInButton');
const signUpModal = document.getElementById('signUpModal');
const signInModal = document.getElementById('signInModal');
const signUpModalInput = document.getElementById('signUpModalInput');
const nextPageOtp = document.getElementById('nextPageOtp');
const backArrowOtp = document.getElementById('backArrowOtp');
const otpSection = document.getElementById('otpSection');
const signUPPassword = document.getElementById('signUPPassword');
const signUPInput = document.getElementById('signUPInput');
const nextToPassword = document.getElementById('nextToPassword');

// Toggle modals
signUpButton.addEventListener('click', function () {
    signUpModal.classList.remove('display-none');
    signInModal.classList.add('display-none');
    document.body.style.overflow = 'hidden';
});

signInButton.addEventListener('click', function () {
    signInModal.classList.remove('display-none');
    signUpModal.classList.add('display-none');
    document.body.style.overflow = 'hidden';
});

// Close modals
window.closeSignUpModal = function () {
    signUpModal.classList.add('display-none');
    document.body.style.overflow = '';
};

window.closeSignInModal = function () {
    signInModal.classList.add('display-none');
    document.body.style.overflow = '';
    // Reset sign-in modal to first step
    signUPInput.classList.remove('display-none');
    signUPPassword.classList.add('display-none');
};

// Switch between sign-in and sign-up
window.switchButton = function () {
    // First close both modals to reset any steps
    signInModal.classList.add('display-none');
    signUpModal.classList.add('display-none');
    
    // Then open the opposite of what's currently visible
    if (signInModal.classList.contains('display-none')) {
        signUpModal.classList.remove('display-none');
    } else {
        signInModal.classList.remove('display-none');
    }
    
    // Reset the sign-in modal to first step
    signUPInput.classList.remove('display-none');
    signUPPassword.classList.add('display-none');
    
    // Reset the sign-up modal to first step
    signUpModalInput.classList.remove('display-none');
    otpSection.classList.add('display-none');
    
    document.body.style.overflow = 'hidden';
};

// Handle clicks outside modals
window.addEventListener('click', function (event) {
    if (event.target === signUpModal) {
        closeSignUpModal();
    }
    if (event.target === signInModal) {
        closeSignInModal();
    }
});

// Navigation between modal steps
backArrowOtp.addEventListener('click', function () {
    otpSection.classList.add('display-none');
    signUpModalInput.classList.remove('display-none');
});

nextPageOtp.addEventListener('click', function () {
    otpSection.classList.remove('display-none');
    signUpModalInput.classList.add('display-none');
});

nextToPassword.addEventListener('click', function () {
    signUPInput.classList.add('display-none');
    signUPPassword.classList.remove('display-none');
});

// Password field toggle
const passwordField = document.getElementById('passwordField');
const togglePassword = document.getElementById('togglePassword');

togglePassword.addEventListener('click', function () {
    const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordField.setAttribute('type', type);
});

// Login button functionality
const loginBtn = document.getElementById('loginBtn');
loginBtn.addEventListener('click', () => {
    const password = passwordField.value;
    if (password) {
        console.log(`Logging in with password: ${password}`);
    } else {
        console.log('Please enter a password.');
    }
});