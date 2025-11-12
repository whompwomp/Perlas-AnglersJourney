document.addEventListener('DOMContentLoaded', function() {
    const links = document.querySelectorAll('nav ul li a');

    function setActiveLink() {
        links.forEach(link => link.classList.remove('active'));
        this.classList.add('active');
    }

    links.forEach(link => link.addEventListener('click', setActiveLink));
});
