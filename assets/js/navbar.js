const DIALECT_REGIONS = [
    { name: "الشمال", page: "north.html" },
    { name: "الجبل", page: "mountain.html" },
    { name: "بيروت", page: "beirut.html" },
    { name: "البقاع", page: "bikaa.html" },
    { name: "البقاع الغربي", page: "west_bikaa.html" },
    { name: "الجنوب", page: "south.html" }
];

function initDialectsMenu() {
    const navList = document.querySelector("#navbarNav .navbar-nav");
    if (!navList || navList.querySelector(".dialects-menu")) return;

    const currentPage = window.location.pathname.split("/").pop() || "home.html";
    const isDialectPage = DIALECT_REGIONS.some((region) => region.page === currentPage);
    const mapItem = navList.querySelector('a[href="map.html"]')?.closest(".nav-item");

    const menuItem = document.createElement("li");
    menuItem.className = "nav-item dropdown dialects-menu";

    menuItem.innerHTML = `
        <a class="nav-link dropdown-toggle${isDialectPage ? " active" : ""}" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
            اللهجات
        </a>
        <ul class="dropdown-menu dropdown-menu-start dialects-dropdown">
            ${DIALECT_REGIONS.map((region) => `
                <li>
                    <a class="dropdown-item${region.page === currentPage ? " active" : ""}" href="${region.page}">
                        ${region.name}
                    </a>
                </li>
            `).join("")}
        </ul>
    `;

    if (mapItem) {
        navList.insertBefore(menuItem, mapItem);
    } else {
        navList.appendChild(menuItem);
    }
}

document.addEventListener("DOMContentLoaded", initDialectsMenu);
