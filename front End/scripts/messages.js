console.log("Messages script loaded");
// Handle enabling/disabling filter checkbox based on message request selection
document.addEventListener('DOMContentLoaded', function () {
        const messageRequestRadios = document.querySelectorAll('input[name="message-requests"]');
        const filterCheckbox = document.getElementById('filter-messages');
        const filterSection = document.getElementById('filter-section');

        function updateFilterState() {
            const selectedOption = document.querySelector('input[name="message-requests"]:checked').value;

            if (selectedOption === 'no-one') {
                filterCheckbox.checked = true;
                filterCheckbox.disabled = true;
                filterSection.classList.add('disabled-section');
            } else {
                filterCheckbox.disabled = false;
                filterSection.classList.remove('disabled-section');
            }
        }

        // Set initial state on page load
        updateFilterState();

        // Add event listener for changes
        messageRequestRadios.forEach(radio => {
            radio.addEventListener('change', updateFilterState);
        });
    });
// Toggle between right-panel and main-wrapper
document.addEventListener('DOMContentLoaded', function() {
    const settingLink = document.querySelector('.setting');
    const backButton = document.querySelector('.back-button');
    const rightPanel = document.querySelector('.right-panel');
    const mainWrapper = document.querySelector('.main-wrapper');

    if (settingLink && rightPanel && mainWrapper) {
        settingLink.addEventListener('click', function(event) {
            event.preventDefault();
            rightPanel.style.display = 'none';
            mainWrapper.style.display = 'block';
        });
    }

    if (backButton && rightPanel && mainWrapper) {
        backButton.addEventListener('click', function() {
            mainWrapper.style.display = 'none';
            rightPanel.style.display = 'block';
        });
    }
});

// Modal functionality for "New Message"
document.addEventListener('DOMContentLoaded', () => {
            // Get modal elements
            const modalOverlay = document.getElementById('newMessageModalOverlay');
            const closeButton = document.querySelector('.modal-container .close-button');
    
            // Get trigger buttons
            const openTrigger1 = document.getElementById('newMessageTrigger1');
            const openTrigger2 = document.getElementById('newMessageTrigger2');
    
            // Function to open the modal
            const openModal = (e) => {
                e.preventDefault(); // Prevent default link behavior for the icon
                if (modalOverlay) {
                    modalOverlay.style.display = 'flex';
                }
            };
    
            // Function to close the modal
            const closeModal = () => {
                if (modalOverlay) {
                    modalOverlay.style.display = 'none';
                }
            };
    
            // Add event listeners to trigger buttons
            if (openTrigger1) {
                openTrigger1.addEventListener('click', openModal);
            }
            if (openTrigger2) {
                openTrigger2.addEventListener('click', openModal);
            }
    
            // Add event listener to close button
            if (closeButton) {
                closeButton.addEventListener('click', closeModal);
            }
    
            // Add event listener to close modal when clicking on the overlay
            if (modalOverlay) {
                modalOverlay.addEventListener('click', (event) => {
                    // Check if the clicked element is the overlay itself
                    if (event.target === modalOverlay) {
                        closeModal();
                    }
                });
            }
        });

// Switch between "New Message" and "Create Group" views within the modal
document.addEventListener('DOMContentLoaded', () => {
    // Modal elements
    const modalOverlay = document.getElementById('newMessageModalOverlay');
    const closeButton = document.querySelector('.modal-container .close-button');
    const openTrigger1 = document.querySelector('.right-panel .btn'); // More specific selector
    const openTrigger2 = document.getElementById('newMessageTrigger2');
    
    // View switching elements
    const newMessageView = document.getElementById('new-message-view');
    const createGroupView = document.getElementById('create-group-view');
    const createGroupBtn = document.getElementById('create-group-btn');
    const backToNewMessageBtn = document.getElementById('back-to-new-message-btn');


    // --- Modal Open/Close Logic ---
    const openModal = (e) => {
        e.preventDefault();
        if (modalOverlay) {
            modalOverlay.style.display = 'flex';
            // Always reset to the initial view when opening
            newMessageView.style.display = 'flex';
            createGroupView.style.display = 'none';
        }
    };

    const closeModal = () => {
        if (modalOverlay) {
            modalOverlay.style.display = 'none';
        }
    };

    if (openTrigger1) openTrigger1.addEventListener('click', openModal);
    if (openTrigger2) openTrigger2.addEventListener('click', openModal);
    if (closeButton) closeButton.addEventListener('click', closeModal);

    if (modalOverlay) {
        modalOverlay.addEventListener('click', (event) => {
            // Closes the modal if the click is on the overlay itself
            if (event.target === modalOverlay) {
                closeModal();
            }
        });
    }

    // --- View Switching Logic ---
    if(createGroupBtn) {
        createGroupBtn.addEventListener('click', () => {
            newMessageView.style.display = 'none';
            createGroupView.style.display = 'flex';
        });
    }

    if(backToNewMessageBtn) {
        backToNewMessageBtn.addEventListener('click', () => {
            createGroupView.style.display = 'none';
            newMessageView.style.display = 'flex';
        });
    }
});

// Main view switching logic: between chat view, settings view, and empty state
document.addEventListener('DOMContentLoaded', () => {
    // --- Elements for Main View Switching ---
    const settingsTrigger = document.querySelector('.setting');
    const settingsView = document.querySelector('.main-wrapper');
    const settingsBackButton = document.querySelector('.main-wrapper .back-button');
    const chatView = document.querySelector('.chat-view');
    const contactItems = document.querySelectorAll('.message-contact-item'); // Get all contact items

    // --- Initial State ---
    // By default, the content area is empty. Both chat and settings are hidden.
    if (chatView) chatView.style.display = 'none';
    if (settingsView) settingsView.style.display = 'none';

    // --- Event Listeners for View Switching ---

    // When a contact is clicked, show the chat view.
    contactItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent anchor link behavior
            if (chatView) chatView.style.display = 'flex';
            if (settingsView) settingsView.style.display = 'none';
        });
    });

    // When the settings icon is clicked, hide the chat and show settings.
    if (settingsTrigger) {
        settingsTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            if (chatView) chatView.style.display = 'none';
            if (settingsView) settingsView.style.display = 'block';
        });
    }

    // When the settings back button is clicked, hide settings and return to the empty content area state.
    if (settingsBackButton) {
        settingsBackButton.addEventListener('click', () => {
            if (chatView) chatView.style.display = 'none';
            if (settingsView) settingsView.style.display = 'none';
        });
    }

    // --- Modal functionality (remains the same) ---
    const newMessageTriggers = [document.getElementById('newMessageTrigger1'), document.getElementById('newMessageTrigger2')];
    const newMessageModalOverlay = document.getElementById('newMessageModalOverlay');
    const closeModalButton = document.querySelector('#newMessageModalOverlay .close-button');
    
    const createGroupBtn = document.getElementById('create-group-btn');
    const backToNewMessageBtn = document.getElementById('back-to-new-message-btn');
    const newMessageView = document.getElementById('new-message-view');
    const createGroupView = document.getElementById('create-group-view');

    newMessageTriggers.forEach(trigger => {
        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                if (newMessageModalOverlay) newMessageModalOverlay.style.display = 'flex';
            });
        }
    });

    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => {
            if (newMessageModalOverlay) newMessageModalOverlay.style.display = 'none';
        });
    }
    
    // Close modal when clicking on the overlay background
    if (newMessageModalOverlay) {
        newMessageModalOverlay.addEventListener('click', (e) => {
            if (e.target === newMessageModalOverlay) {
                newMessageModalOverlay.style.display = 'none';
            }
        });
    }

    // Switch between New Message and Create Group views in modal
    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', () => {
            if (newMessageView) newMessageView.style.display = 'none';
            if (createGroupView) createGroupView.style.display = 'block';
        });
    }
    
    if (backToNewMessageBtn) {
        backToNewMessageBtn.addEventListener('click', () => {
            if (newMessageView) newMessageView.style.display = 'flex';
            if (createGroupView) createGroupView.style.display = 'none';
        });
    }

    // --- Post Modal Functionality ---
    const postButton = document.getElementById('postButton');
    const postModal = document.getElementById('postModal');
    const closePostButton = document.getElementById('closePostButton');
    
    if(postButton) {
        postButton.addEventListener('click', () => {
            if (postModal) postModal.style.display = 'flex';
        });
    }
    
    if(closePostButton) {
        closePostButton.addEventListener('click', () => {
            if (postModal) postModal.style.display = 'none';
        });
    }
    
    if (postModal) {
        postModal.addEventListener('click', (e) => {
            if(e.target === postModal) {
                postModal.style.display = 'none';
            }
        });
    }
});
