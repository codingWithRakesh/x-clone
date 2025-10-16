import { SERVER_URL } from "./constants.js";

document.addEventListener('DOMContentLoaded', async function () {
    try {
        const response = await fetch(`${SERVER_URL}/user/current-user`, {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            console.log('User data retrieved successfully:', data);
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
});

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



const postInput = document.getElementById('post-input');
const postButton = document.getElementById('post-button-post');
const postModal = document.getElementById('postModal');
const postButtonElement = document.getElementById('postButton');
const closePostButton = document.getElementById('closePostButton');

closePostButton.addEventListener('click', function () {
    postModal.classList.toggle('display-none');
    document.body.style.overflow = ''; // Restore scrolling
});

// Enable/disable post button based on textarea content
postInput.addEventListener('input', function () {
    if (postInput.value.trim().length > 0) {
        postButton.disabled = false;
    } else {
        postButton.disabled = true;
    }
});

postButtonElement.addEventListener('click', function () {
    postModal.classList.toggle('display-none');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
});

window.addEventListener('click', function (event) {
    if (event.target === postModal) {
        postModal.classList.add('display-none');
        document.body.style.overflow = ''; // Restore scrolling
    }
    if (event.target === closePostButton) {
        postModal.classList.add('display-none');
        document.body.style.overflow = ''; // Restore scrolling
    }
    if (event.target.classList.contains('modal-overlay-post')) {
        postModal.classList.add('display-none');
        document.body.style.overflow = ''; // Restore scrolling
    }
});




// --- Image Grid Handler ---
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".image-grid").forEach(grid => {
    const imgs = grid.querySelectorAll("img");

    if (imgs.length > 4) {
      const extra = imgs.length - 4;

      // Hide all images after the 4th
      for (let i = 4; i < imgs.length; i++) {
        imgs[i].style.display = "none";
      }

      // Create overlay div
      const overlay = document.createElement("div");
      overlay.className = "image-overlay";
      overlay.textContent = `+${extra}`;

      // Wrap 4th image
      const fourth = imgs[3];
      const wrapper = document.createElement("div");
      wrapper.className = "overlay-wrapper";

      fourth.parentNode.insertBefore(wrapper, fourth);
      wrapper.appendChild(fourth);
      wrapper.appendChild(overlay);
    }
  });
});