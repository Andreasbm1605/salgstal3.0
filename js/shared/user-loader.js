/**
 * UserLoader - Handles fetching and caching user information from the server
 */
const UserLoader = (() => {
    let cachedUserInfo = null;

    /**
     * Loads user information from the /api/user endpoint
     * @returns {Promise<Object>} User info object with username, displayName, and profileImage
     */
    async function loadUserInfo() {
        // Return cached data if available
        if (cachedUserInfo) {
            return cachedUserInfo;
        }

        try {
            const response = await fetch('/api/user');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            cachedUserInfo = await response.json();
            return cachedUserInfo;
        } catch (error) {
            console.error('Failed to load user info:', error);

            // Return fallback user info
            return {
                username: 'unknown',
                displayName: 'Administrator',
                profileImage: 'profilelb.png'
            };
        }
    }

    /**
     * Updates the profile UI elements with user information
     */
    async function updateProfileUI() {
        const userInfo = await loadUserInfo();

        const usernameEl = document.getElementById('profile-username');
        const imageEl = document.getElementById('profile-image');

        if (usernameEl) {
            usernameEl.textContent = userInfo.displayName;
        }

        if (imageEl) {
            imageEl.src = `../assets/images/${userInfo.profileImage}`;
            imageEl.alt = userInfo.displayName;
        }
    }

    // Public API
    return {
        loadUserInfo,
        updateProfileUI
    };
})();

// Expose globally for use in pages
window.UserLoader = UserLoader;
