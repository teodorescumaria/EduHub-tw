window.addEventListener("DOMContentLoaded", function () {
    const toggles = Array.from(document.querySelectorAll("[data-theme-toggle], #switch-tema"));
    const icons = Array.from(document.querySelectorAll("[data-theme-icon], #icon-tema"));

    function syncUi(tema) {
        const esteDark = tema === "dark";
        toggles.forEach((toggle) => {
            if (toggle && typeof toggle.checked !== "undefined") {
                toggle.checked = esteDark;
            }
        });
        icons.forEach((icon) => {
            if (icon) {
                icon.className = esteDark ? "bi bi-moon-stars-fill" : "bi bi-brightness-high-fill";
            }
        });
    }

    function aplicaTema(temaDorita) {
        const tema = temaDorita === "light" ? "light" : "dark";
        document.documentElement.setAttribute("data-bs-theme", tema);
        localStorage.setItem("tema-eduhub", tema);
        syncUi(tema);
    }

    const temaInitiala = localStorage.getItem("tema-eduhub") || document.documentElement.getAttribute("data-bs-theme") || "dark";
    aplicaTema(temaInitiala);

    toggles.forEach((toggle) => {
        toggle.addEventListener("change", function () {
            aplicaTema(this.checked ? "dark" : "light");
        });
    });
});
