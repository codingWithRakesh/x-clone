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
const closeSignUpModal = document.getElementById('closeSignUpModal');
const closeSignInModal = document.getElementById('closeSignInModal');

signUpButton.addEventListener('click', function () {
    signUpModal.classList.toggle('display-none');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
});

signInButton.addEventListener('click', function () {
    signInModal.classList.toggle('display-none');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
});

closeSignUpModal.addEventListener('click', function () {
    signUpModal.classList.toggle('display-none');
    document.body.style.overflow = ''; // Restore scrolling
});

closeSignInModal.addEventListener('click', function () {
    signInModal.classList.toggle('display-none');
    document.body.style.overflow = ''; // Restore scrolling
}); 

window.addEventListener('click', function (event) {
    if (event.target === signUpModal) {
        signUpModal.classList.add('display-none');
        document.body.style.overflow = ''; // Restore scrolling
    }
    if (event.target === signInModal) {
        signInModal.classList.add('display-none');
        document.body.style.overflow = ''; // Restore scrolling
    } 

    if (event.target.classList.contains('modal-overlay-two')) {
        signInModal.classList.add('display-none');
        document.body.style.overflow = ''; // Restore scrolling
    }

    if (event.target.classList.contains('modal-overlay')) {
        signUpModal.classList.add('display-none');
        document.body.style.overflow = ''; // Restore scrolling
    }

    if (event.target.classList.contains('modal-overlay-two') || event.target.classList.contains('modal-overlay')) {
        event.target.classList.add('display-none');
        document.body.style.overflow = ''; // Restore scrolling
    }

    if (event.target.classList.contains('close-button-two') || event.target.classList.contains('close-button')) {
        if (event.target.closest('.modal-overlay-two')) {
            signInModal.classList.add('display-none');
            document.body.style.overflow = ''; // Restore scrolling
        } else if (event.target.closest('.modal-overlay')) {
            signUpModal.classList.add('display-none');
            document.body.style.overflow = ''; // Restore scrolling
        }
    }
});


const switchButton = document.getElementById('switchButton');

switchButton.addEventListener('click', function () {
    signInModal.classList.toggle('display-none');
    signUpModal.classList.toggle('display-none');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
});