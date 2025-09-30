import { SERVER_URL } from '../constants.js';
window.userEmail = null;
document.addEventListener('DOMContentLoaded', async function () {
    try {
        const response = await fetch(`${SERVER_URL}/user/current-user`, {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            // console.log('User data retrieved successfully:', data);
            window.location.href = "/index.html";
        } else {
            const errorData = await response.json();
            console.error('Error retrieving user data:', errorData);
            if (!window.location.href.includes('login.html')) {
                window.location.href = "/login/login.html";
            }
        }
    } catch (error) {
        console.error('Network error:', error);
        if (!window.location.href.includes('login.html')) {
            window.location.href = "/login/login.html";
        }
    }

    const monthSelect = document.getElementById('month-select');
    const daySelect = document.getElementById('day-select');
    const yearSelect = document.getElementById('year-select');

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = month;
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

    const signUpModalInput = document.getElementById('signUpModalInput');
    const otpSection = document.getElementById('otpSection');
    const passwordSection = document.getElementById('passwordSection');
    const usernameSection = document.getElementById('usernameSection');
    const profileSection = document.getElementById('profileSection');

    const nextPageOtp = document.getElementById('nextPageOtp');
    const nextBtnOtp = document.getElementById('nextBtn');
    const nextButtonUsername = document.querySelector('.next-button-username');
    const skipButton = document.querySelector('.skip-button');

    const backArrowOtp = document.getElementById('backArrowOtp');

    nextPageOtp.addEventListener('click', async function () {
        nextPageOtp.innerHTML = `
            <svg width="30px" height="30px" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" aria-live="polite">
                <title>Loading</title>
                <circle cx="25" cy="25" r="20" fill="none" stroke="#000000" stroke-width="5"
                    stroke-linecap="round" stroke-dasharray="94.25 125.66">
                    <animateTransform attributeName="transform" attributeType="XML" type="rotate"
                        from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                </circle>
            </svg>
        `
        nextPageOtp.style.padding = '9px'

        const name = document.getElementById('name-input').value;
        const email = document.getElementById('email-input').value;
        const month = document.getElementById('month-select').value;
        const day = document.getElementById('day-select').value;
        const year = document.getElementById('year-select').value;

        if (!name || !email || !month || !day || !year) {
            alert('Please fill in all required fields');
            return;
        }

        const details = {
            email,
            fullName: name,
            dateOfBirth: {
                date: Number(day),
                month,
                year: Number(year)
            }
        }
        window.userEmail = email;
        // console.log(details);

        const response = await fetch(`${SERVER_URL}/user/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(details),
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            // console.log(data);

            signUpModalInput.classList.add('display-none');
            otpSection.classList.remove('display-none');
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
        }
    });

    backArrowOtp.addEventListener('click', function () {
        otpSection.classList.add('display-none');
        signUpModalInput.classList.remove('display-none');
    });

    nextBtnOtp.addEventListener('click', async function () {
        nextBtnOtp.innerHTML = `
            <svg width="30px" height="30px" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" aria-live="polite">
                <title>Loading</title>
                <circle cx="25" cy="25" r="20" fill="none" stroke="#000000" stroke-width="5"
                    stroke-linecap="round" stroke-dasharray="94.25 125.66">
                    <animateTransform attributeName="transform" attributeType="XML" type="rotate"
                        from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                </circle>
            </svg>
        `
        nextBtnOtp.style.padding = '7px'
        const verificationCode = document.getElementById('verificationCode').value;

        if (!verificationCode) {
            alert('Please enter the verification code');
            return;
        }

        const otpDetails = {
            email: window.userEmail,
            otp: verificationCode
        }
        // console.log(otpDetails);

        const response = await fetch(`${SERVER_URL}/user/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(otpDetails),
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            // console.log(data);

            otpSection.classList.add('display-none');
            passwordSection.classList.remove('display-none');
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
        }
    });

    const reSendOtp = document.querySelector('.forgot-link-otp')
    reSendOtp.addEventListener('click', async function () {
        nextBtnOtp.innerHTML = `
            <svg width="30px" height="30px" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" aria-live="polite">
                <title>Loading</title>
                <circle cx="25" cy="25" r="20" fill="none" stroke="#000000" stroke-width="5"
                    stroke-linecap="round" stroke-dasharray="94.25 125.66">
                    <animateTransform attributeName="transform" attributeType="XML" type="rotate"
                        from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                </circle>
            </svg>
        `
        nextBtnOtp.style.padding = '7px'

        const otpEmail = {
            email: window.userEmail
        }
        // console.log(otpEmail)

        const response = await fetch(`${SERVER_URL}/user/resend-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(otpEmail),
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            // console.log(data);
            alert('OTP resent successfully!');
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
        }
    })

    const signupButtonPassword = document.querySelector('.signup-button-password');
    signupButtonPassword.addEventListener('click', async function () {
        signupButtonPassword.innerHTML = `
            <svg width="30px" height="30px" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" aria-live="polite">
                <title>Loading</title>
                <circle cx="25" cy="25" r="20" fill="none" stroke="#000000" stroke-width="5"
                    stroke-linecap="round" stroke-dasharray="94.25 125.66">
                    <animateTransform attributeName="transform" attributeType="XML" type="rotate"
                        from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                </circle>
            </svg>
        `
        signupButtonPassword.style.padding = '9px'
        const password = document.getElementById('password').value;

        if (!password || password.length < 8) {
            alert('Password must be at least 8 characters long');
            return;
        }

        const passwordDetails = {
            email: window.userEmail,
            password
        }
        // console.log(passwordDetails);

        const response = await fetch(`${SERVER_URL}/user/set-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(passwordDetails),
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            // console.log(data);
            await generateRandomUsername();
            passwordSection.classList.add('display-none');
            usernameSection.classList.remove('display-none');
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
        }
    });

    const suggestedUsernames = document.querySelector('.suggestions-username');
    async function generateRandomUsername() {

        const email = {
            email: window.userEmail
        }
        const response = await fetch(`${SERVER_URL}/user/send-default-username`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(email),
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            // console.log(data.data.usernames[0]);
            suggestedUsernames.innerHTML = `
                <div class="usernameShowone">@${data?.data?.usernames[0]}</div>
                <div class="usernameShowone">@${data?.data?.usernames[1]}</div>
            `;

            const userNameShows = document.querySelectorAll('.usernameShowone');
            const username = document.getElementById('usernameTake');

            userNameShows.forEach(div => {
                div.replaceWith(div.cloneNode(true));
            });

            const freshUserNameShows = document.querySelectorAll('.usernameShowone');

            freshUserNameShows.forEach(div => {
                div.addEventListener('click', function () {
                    username.value = div.textContent.trim().substring(1);
                    // console.log('Username set to:', username.value);
                });
            });
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
        }
    }
    if (!usernameSection.classList.contains('display-none')) {
        generateRandomUsername();
    }

    const reUsername = document.querySelector('.show-more-username');
    reUsername.addEventListener('click', generateRandomUsername);

    nextButtonUsername.addEventListener('click', async function () {
        nextButtonUsername.innerHTML = `
            <svg width="30px" height="30px" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" aria-live="polite">
                <title>Loading</title>
                <circle cx="25" cy="25" r="20" fill="none" stroke="#000000" stroke-width="5"
                    stroke-linecap="round" stroke-dasharray="94.25 125.66">
                    <animateTransform attributeName="transform" attributeType="XML" type="rotate"
                        from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                </circle>
            </svg>
        `
        nextButtonUsername.style.padding = '7px'
        const value = document.getElementById('usernameTake').value.trim();
        // console.log(value);

        if (!value) {
            alert('Please enter a username');
            return;
        }

        const usernameDetails = {
            email: window.userEmail,
            username: value
        }
        // console.log(usernameDetails);

        const response = await fetch(`${SERVER_URL}/user/set-username`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(usernameDetails),
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            // console.log(data);

            usernameSection.classList.add('display-none');
            profileSection.classList.remove('display-none');
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
        }
    });


    const passwordTogglePassword = document.querySelector('.password-toggle-password');
    const passwordFieldPassword = document.getElementById('password');

    passwordTogglePassword.addEventListener('click', function () {
        const type = passwordFieldPassword.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordFieldPassword.setAttribute('type', type);
    });

    const photoUploadArea = document.getElementById('photo-upload-area');
    const fileUpload = document.getElementById('file-upload');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const profilePreview = document.getElementById('profile-preview');
    let formData = null;

    photoUploadArea.addEventListener('click', () => {
        fileUpload.click();
    });

    fileUpload.addEventListener('change', function (event) {
        const file = event.target.files[0];

        if (file) {
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                alert('Please select a valid image file (JPEG, PNG, GIF, WebP)');
                return;
            }

            const maxSize = 5 * 1024 * 1024; // 5MB in bytes
            if (file.size > maxSize) {
                alert('File size must be less than 5MB');
                return;
            }

            skipButton.textContent = 'Next';
            const reader = new FileReader();

            reader.onload = function (e) {
                profilePreview.src = e.target.result;
                profilePreview.style.display = 'block';
                uploadPlaceholder.style.display = 'none';
            }

            reader.readAsDataURL(file);

            formData = new FormData();
            formData.append('profileImage', file);
            formData.append('email', window.userEmail);
        }
    });

    skipButton.addEventListener('click', async function () {
        if (skipButton.textContent === "Next") {
            skipButton.innerHTML = `
            <svg width="30px" height="30px" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" aria-live="polite">
                <title>Loading</title>
                <circle cx="25" cy="25" r="20" fill="none" stroke="#ffffff" stroke-width="5"
                    stroke-linecap="round" stroke-dasharray="94.25 125.66">
                    <animateTransform attributeName="transform" attributeType="XML" type="rotate"
                        from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                </circle>
            </svg>
        `
            skipButton.style.padding = '9px'
            if (!formData) {
                alert('Please select a profile picture first');
                return;
            }

            try {
                const response = await fetch(`${SERVER_URL}/user/set-profile-image`, {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    // console.log('Profile image uploaded successfully:', data);
                    alert('Profile picture uploaded successfully!');
                    window.location.href = "/front End/index.html";
                } else {
                    const errorData = await response.json();
                    alert(`Error: ${errorData.message}`);
                }
            } catch (error) {
                console.error('Upload error:', error);
                alert('An error occurred while uploading the profile picture');
            }
        } else {
            alert('Sign-up completed successfully!');
            closeSignUpModal();
            window.location.href = "/index.html";
        }
    });
});

const signUpButton = document.getElementById('signUpButton');
const signInButton = document.getElementById('signInButton');
const signUpModal = document.getElementById('signUpModal');
const signInModal = document.getElementById('signInModal');
const signUPInput = document.getElementById('signUPInput');
const signUPPassword = document.getElementById('signUPPassword');
const nextToPassword = document.getElementById('nextToPassword');

signUpButton.addEventListener('click', function () {
    signUpModal.classList.remove('display-none');
    signInModal.classList.add('display-none');
    document.body.style.overflow = 'hidden';
    resetSignUpModal();
});

signInButton.addEventListener('click', function () {
    signInModal.classList.remove('display-none');
    signUpModal.classList.add('display-none');
    document.body.style.overflow = 'hidden';
});

window.closeSignUpModal = function () {
    signUpModal.classList.add('display-none');
    document.body.style.overflow = '';
    resetSignUpModal();
};

window.closeSignInModal = function () {
    signInModal.classList.add('display-none');
    document.body.style.overflow = '';
    signUPInput.classList.remove('display-none');
    signUPPassword.classList.add('display-none');
};

function resetSignUpModal() {
    const signUpModalInput = document.getElementById('signUpModalInput');
    const otpSection = document.getElementById('otpSection');
    const passwordSection = document.getElementById('passwordSection');
    const usernameSection = document.getElementById('usernameSection');
    const profileSection = document.getElementById('profileSection');

    signUpModalInput.classList.remove('display-none');
    otpSection.classList.add('display-none');
    passwordSection.classList.add('display-none');
    usernameSection.classList.add('display-none');
    profileSection.classList.add('display-none');
}

window.switchButton = function () {
    signInModal.classList.add('display-none');
    signUpModal.classList.add('display-none');

    if (signInModal.classList.contains('display-none')) {
        signUpModal.classList.remove('display-none');
        resetSignUpModal();
    } else {
        signInModal.classList.remove('display-none');
    }

    signUPInput.classList.remove('display-none');
    signUPPassword.classList.add('display-none');

    document.body.style.overflow = 'hidden';
};

window.addEventListener('click', function (event) {
    if (event.target === signUpModal) {
        closeSignUpModal();
    }
    if (event.target === signInModal) {
        closeSignInModal();
    }
});

const loginDetails = {
    email: '',
    password: ''
}
const constEmail = document.querySelector('.static-field-pass')
nextToPassword.addEventListener('click', function () {
    const username = document.getElementById('username').value;

    if (!username) {
        alert('Please enter your phone, email, or username');
        return;
    }

    loginDetails.email = username;
    // console.log(loginDetails, username);
    constEmail.textContent = username;
    signUPInput.classList.add('display-none');
    signUPPassword.classList.remove('display-none');
});

const passwordField = document.getElementById('passwordField');
const togglePassword = document.getElementById('togglePassword');

togglePassword.addEventListener('click', function () {
    const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordField.setAttribute('type', type);
});

const loginBtn = document.getElementById('loginBtn');
loginBtn.addEventListener('click', async () => {
    loginBtn.innerHTML = `
            <svg width="30px" height="30px" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" aria-live="polite">
                <title>Loading</title>
                <circle cx="25" cy="25" r="20" fill="none" stroke="#000000" stroke-width="5"
                    stroke-linecap="round" stroke-dasharray="94.25 125.66">
                    <animateTransform attributeName="transform" attributeType="XML" type="rotate"
                        from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                </circle>
            </svg>
        `
    loginBtn.style.padding = '7px'
    const password = passwordField.value;
    if (password) {
        loginDetails.password = password;
        // console.log(loginDetails, password);
        try {
            const response = await fetch(`${SERVER_URL}/user/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginDetails),
                credentials: 'include'

            });
            if (response.ok) {
                const data = await response.json();
                // console.log('Login successful:', data);
                alert('Login successful!');
                window.location.href = "/index.html";
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('An error occurred during login');
        }
        closeSignInModal();
    } else {
        alert('Please enter a password.');
    }
});