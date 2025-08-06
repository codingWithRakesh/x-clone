document.addEventListener('DOMContentLoaded', function () {
    const navMenu = document.getElementById('nav-menu');
    const navLinks = navMenu.querySelectorAll('.nav-link');
    const moreButton = document.getElementById('more-button');
    const moreMenuPopup = document.getElementById('more-menu-popup');

    // --- Active Link Handler ---
    // navLinks.forEach(link => {
    //     link.addEventListener('click', function (event) {
    //         event.preventDefault();
    //         navLinks.forEach(l => l.classList.remove('active'));
    //         this.classList.add('active');
    //     });
    // });

    // --- Pop-up Menu Handler ---
    moreButton.addEventListener('click', function (event) {
        event.stopPropagation(); // Prevents the window click event from firing immediately
        moreMenuPopup.classList.toggle('visible');
    });

    // --- Close Pop-up when Clicking Outside ---
    window.addEventListener('click', function (event) {
        if (!moreMenuPopup.contains(event.target) && !moreButton.contains(event.target)) {
            moreMenuPopup.classList.remove('visible');
        }
    });
});