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
            // Active state (Dark Sidebar)
            link.classList.add('bg-slate-800', 'text-white');
            link.classList.remove('text-slate-400', 'hover:bg-slate-800', 'hover:text-white');
        } else {
            // Inactive state (Dark Sidebar)
            link.classList.add('text-slate-400', 'hover:bg-slate-800', 'hover:text-white');
            link.classList.remove('bg-slate-800', 'text-white');
        }
    });
}

function getCurrentPage() {
    const path = decodeURIComponent(window.location.pathname);
    if (path.includes('dashboard.html')) return 'dashboard';
    if (path.includes('advisors.html')) return 'advisors';
    if (path.includes('tilbudsopfølgning.html')) return 'tilbudsopfølgning';
    if (path.includes('data.html')) return 'data';
    return 'dashboard'; // default
}
