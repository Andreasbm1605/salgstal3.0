// Navigation component for handling active state across pages

document.addEventListener('DOMContentLoaded', function() {
    setActiveNavLink();
});

function setActiveNavLink() {
    const currentPage = getCurrentPage();
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const linkPage = link.getAttribute('data-page');
        if (linkPage === currentPage) {
            // Active state
            link.classList.add('text-slate-900');
            link.classList.remove('text-slate-500');
        } else {
            // Inactive state
            link.classList.add('text-slate-500');
            link.classList.remove('text-slate-900');
        }
    });
}

function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('dashboard.html')) return 'dashboard';
    if (path.includes('advisors.html')) return 'advisors';
    if (path.includes('data.html')) return 'data';
    return 'dashboard'; // default
}
