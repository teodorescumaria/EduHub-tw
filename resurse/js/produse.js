window.addEventListener("load", function () {
    let produse = Array.from(document.getElementsByClassName("produs"));
    let gridProduse = document.getElementsByClassName("grid-produse")[0];
    let ordineaInitiala = produse.map((prod) => prod.id);
    let elementNumarProduse = document.getElementById("numar-produse-afisate");
    let mesajNiciunProdus = document.getElementById("mesaj-nu-exista-produse");

    let inpNume = document.getElementById("inp-nume");
    let inpPretMin = document.getElementById("inp-pret-min");
    let inpPretMax = document.getElementById("inp-pret-max");
    let infoRangeMin = document.getElementById("infoRangeMin");
    let infoRangeMax = document.getElementById("infoRangeMax");
    let inpCategorie = document.getElementById("inp-categorie");
    let inpFormat = document.getElementById("inp-format");
    let inpNivel = document.getElementById("inp-nivel");
    let inpDescriere = document.getElementById("inp-descriere");
    let butonCalculeaza = document.getElementById("calculeaza");
    let switchTema = document.getElementById("switch-tema");
    let iconTema = document.getElementById("icon-tema");

    
    let sortKey1 = document.getElementById("sort-key1");
    let sortKey2 = document.getElementById("sort-key2");
    let sortDir1Radio = document.querySelectorAll('input[name="sort-dir1"]');
    let sortDir2Radio = document.querySelectorAll('input[name="sort-dir2"]');
    let butonSortApply = document.getElementById("sort-apply");

    let valMinInitial = parseFloat(inpPretMin.min);
    let valMaxInitial = parseFloat(inpPretMax.max);

    function marcheazaInvalid(element) {
        element.style.borderColor = "#c0392b";
        element.style.backgroundColor = "#fff4f2";
    }

    function reseteazaMarcajeInvalid() {
        let campuri = [inpNume, inpDescriere, inpFormat, inpPretMin, inpPretMax];
        for (let camp of campuri) {
            camp.style.borderColor = "";
            camp.style.backgroundColor = "";
        }
        inpDescriere.classList.remove("is-invalid");
    }

    function actualizeazaValidareTextarea() {
        let regexText = /^[a-zA-ZA-Z\u0103\u00e2\u00ee\u0219\u021b\u0102\u00c2\u00ce\u0218\u021a\s*.,-]*$/;
        let valDescriere = inpDescriere.value.trim();
        let eValid = !valDescriere || regexText.test(valDescriere);
        inpDescriere.classList.toggle("is-invalid", !eValid);
        return eValid;
    }

    function aplicaTema(temaDorita) {
        let tema = temaDorita === "dark" ? "dark" : "light";
        document.documentElement.setAttribute("data-bs-theme", tema);
        localStorage.setItem("tema-eduhub", tema);

        if (switchTema) {
            switchTema.checked = tema === "dark";
        }
        if (iconTema) {
            iconTema.className = tema === "dark" ? "bi bi-moon-stars-fill" : "bi bi-brightness-high-fill";
        }
    }

    function valideazaInputuri() {
        reseteazaMarcajeInvalid();

        let esteValid = true;

        let regexText = /^[a-zA-Za-zA-Z\u0103\u00e2\u00ee\u0219\u021b\u0102\u00c2\u00ce\u0218\u021a\s*.,-]*$/;

        let valNume = inpNume.value.trim();
        if (valNume && !regexText.test(valNume)) {
            marcheazaInvalid(inpNume);
            alert("Numele poate contine doar litere, spatii, * si semne simple de punctuatie.");
            esteValid = false;
        }

        let valDescriere = inpDescriere.value.trim();
        if (esteValid && !actualizeazaValidareTextarea()) {
            alert("Textarea poate contine doar litere, spatii si punctuatie de baza.");
            esteValid = false;
        }

        let valFormat = normalizeText(inpFormat.value.trim());
        let optiuniFormat = Array.from(document.querySelectorAll("#lista-formate option")).map((opt) => normalizeText(opt.value.trim()));
        if (esteValid && valFormat && !optiuniFormat.includes(valFormat)) {
            marcheazaInvalid(inpFormat);
            alert("Formatul introdus trebuie sa fie unul dintre valorile din lista.");
            esteValid = false;
        }

        if (esteValid && parseFloat(inpPretMin.value) > parseFloat(inpPretMax.value)) {
            marcheazaInvalid(inpPretMin);
            marcheazaInvalid(inpPretMax);
            alert("Pretul minim nu poate fi mai mare decat pretul maxim.");
            esteValid = false;
        }

        if (esteValid && !document.querySelector('input[name="gr_rad"]:checked')) {
            alert("Selecteaza un interval pentru numarul de pagini.");
            esteValid = false;
        }

        return esteValid;
    }

    function actualizeazaNumarProduse(nr) {
        if (elementNumarProduse) {
            elementNumarProduse.innerHTML = nr;
        }
        if (mesajNiciunProdus) {
            mesajNiciunProdus.style.display = nr === 0 ? "block" : "none";
        }
    }

    function escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function normalizeText(text) {
        return (text || "")
            .toString()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function potrivireNume(numeProdus, sablon) {
        if (!sablon) {
            return true;
        }

        let sablonMic = normalizeText(sablon);
        let numeMic = normalizeText(numeProdus);

        if (!sablonMic.includes("*")) {
            return numeMic.includes(sablonMic);
        }

        let pattern = escapeRegex(sablonMic).replace(/\\\*/g, ".*");
        let regex = new RegExp(pattern, "i");
        return regex.test(numeMic);
    }

    function actualizeazaInfoRange() {
        infoRangeMin.textContent = `(${Math.floor(parseFloat(inpPretMin.value))})`;
        infoRangeMax.textContent = `(${Math.floor(parseFloat(inpPretMax.value))})`;
    }

    function restaureazaOrdineInitiala() {
        let mapProduse = new Map(Array.from(gridProduse.children).map((prod) => [prod.id, prod]));
        for (let idProd of ordineaInitiala) {
            let articol = mapProduse.get(idProd);
            if (articol) {
                gridProduse.appendChild(articol);
            }
        }
    }

    function obtineIntervalPagini() {
        let radioBifat = document.querySelector('input[name="gr_rad"]:checked');
        if (!radioBifat || radioBifat.value === "toate") {
            return null;
        }

        let [minPag, maxPag] = radioBifat.value.split(":").map(Number);
        return { minPag, maxPag };
    }

    function filtreazaProduse() {
        let nrAfisate = 0;

        let filtruNume = normalizeText(inpNume.value.trim());
        let filtruPretMin = parseFloat(inpPretMin.value);
        let filtruPretMax = parseFloat(inpPretMax.value);
        let filtruCategorie = normalizeText(inpCategorie.value.trim());
        let filtruFormat = normalizeText(inpFormat.value.trim());
        let filtruDescriere = normalizeText(inpDescriere.value.trim());

        let intervalPagini = obtineIntervalPagini();

        let niveleSelectate = Array.from(inpNivel.selectedOptions).map((opt) => normalizeText(opt.value.trim()));
        let filtruNivelActiv = niveleSelectate.length && !niveleSelectate.includes("oricare");

        let beneficiiBifate = Array.from(document.querySelectorAll(".inp-beneficiu:checked")).map((chk) => normalizeText(chk.value.trim()));

        for (let prod of produse) {
            let nume = normalizeText(prod.getElementsByClassName("val-nume")[0].textContent.trim());
            let pret = parseFloat(prod.getElementsByClassName("val-pret")[0].textContent.trim());
            let categorie = normalizeText(prod.getElementsByClassName("val-categorie")[0].textContent.trim());
            let nivel = normalizeText(prod.getElementsByClassName("val-nivel")[0].textContent.trim());
            let pagini = parseInt(prod.dataset.pagini || "0", 10);
            let format = normalizeText((prod.dataset.format || "").trim());
            let descriere = normalizeText(prod.dataset.descriere || "");
            let beneficii = normalizeText(prod.dataset.beneficii || "");

            let condNume = potrivireNume(nume, filtruNume);
            let condPret = pret >= filtruPretMin && pret <= filtruPretMax;
            let condCategorie = filtruCategorie === "oricare" || categorie === filtruCategorie;
            let condFormat = !filtruFormat || format === filtruFormat;
            let condNivel = !filtruNivelActiv || niveleSelectate.includes(nivel);
            let condPagini = !intervalPagini || (pagini >= intervalPagini.minPag && pagini < intervalPagini.maxPag);

            let condDescriere = true;
            if (filtruDescriere) {
                let cuvinte = filtruDescriere.split(/\s+/).filter(Boolean);
                condDescriere = cuvinte.every((cuv) => descriere.includes(cuv));
            }

            let condBeneficii = true;
            if (beneficiiBifate.length) {
                condBeneficii = beneficiiBifate.every((benef) => beneficii.includes(benef));
            }

            if (condNume && condPret && condCategorie && condFormat && condNivel && condPagini && condDescriere && condBeneficii) {
                prod.style.display = "";
                nrAfisate++;
            }
            else {
                prod.style.display = "none";
            }
        }

        actualizeazaNumarProduse(nrAfisate);
    }

    function sorteazaDupaPretSiNume(crescator) {
        let vProduse = Array.from(gridProduse.children);
        vProduse.sort(function (a, b) {
            let pretA = parseFloat(a.getElementsByClassName("val-pret")[0].textContent.trim());
            let pretB = parseFloat(b.getElementsByClassName("val-pret")[0].textContent.trim());

            if (pretA !== pretB) {
                return crescator ? pretA - pretB : pretB - pretA;
            }

            let numeA = a.getElementsByClassName("val-nume")[0].textContent.trim().toLowerCase();
            let numeB = b.getElementsByClassName("val-nume")[0].textContent.trim().toLowerCase();
            return crescator ? numeA.localeCompare(numeB) : numeB.localeCompare(numeA);
        });

        for (let prod of vProduse) {
            gridProduse.appendChild(prod);
        }
    }

    
    function getValueByKey(prod, key) {
        switch (key) {
            case "nume":
                return prod.getElementsByClassName("val-nume")[0]?.textContent.trim().toLowerCase() || "";
            case "pret":
                return parseFloat(prod.getElementsByClassName("val-pret")[0]?.textContent.trim() || "0");
            case "nivel":
                return prod.getElementsByClassName("val-nivel")[0]?.textContent.trim().toLowerCase() || "";
            case "data":
                return prod.dataset.paginaCurenta || "0"; 
            case "format":
                return prod.dataset.format || "";
            case "pagini":
                return parseInt(prod.dataset.pagini || "0");
            default:
                return "";
        }
    }

    function compareValues(valA, valB, isNumeric, ascending) {
        if (isNumeric) {
            let numA = typeof valA === "number" ? valA : parseFloat(valA);
            let numB = typeof valB === "number" ? valB : parseFloat(valB);
            return ascending ? numA - numB : numB - numA;
        } else {
            let strA = String(valA).toLowerCase();
            let strB = String(valB).toLowerCase();
            return ascending ? strA.localeCompare(strB) : strB.localeCompare(strA);
        }
    }

    function sorteazaPe2Chei(key1, dir1, key2, dir2) {
        if (!key1 || key1 === "") {
            alert("Selecteaza cel putin cheia 1 pentru sortare!");
            return;
        }

        let vProduse = Array.from(gridProduse.children);
        let numericKeys = ["pret", "pagini"];

        vProduse.sort(function (a, b) {
            let valA1 = getValueByKey(a, key1);
            let valB1 = getValueByKey(b, key1);
            let isNum1 = numericKeys.includes(key1);

            let cmp1 = compareValues(valA1, valB1, isNum1, dir1 === "asc");
            if (cmp1 !== 0) return cmp1;

            
            if (key2 && key2 !== "") {
                let valA2 = getValueByKey(a, key2);
                let valB2 = getValueByKey(b, key2);
                let isNum2 = numericKeys.includes(key2);
                return compareValues(valA2, valB2, isNum2, dir2 === "asc");
            }

            return 0;
        });

        for (let prod of vProduse) {
            gridProduse.appendChild(prod);
        }
    }

    function afiseazaRezultatCalcul(text) {
        let vechiMesaj = document.getElementById("mesaj-calcul-dinamic");
        if (vechiMesaj) {
            vechiMesaj.remove();
        }

        let divInfo = document.createElement("div");
        divInfo.id = "mesaj-calcul-dinamic";
        divInfo.textContent = text;
        divInfo.style.position = "fixed";
        divInfo.style.right = "16px";
        divInfo.style.bottom = "16px";
        divInfo.style.zIndex = "1000";
        divInfo.style.backgroundColor = "#fff5f0";
        divInfo.style.border = "1px solid #c67f6e";
        divInfo.style.color = "#5a2d26";
        divInfo.style.padding = "0.7rem 0.85rem";
        divInfo.style.borderRadius = "10px";
        divInfo.style.boxShadow = "0 8px 18px rgba(0,0,0,0.16)";
        divInfo.style.fontWeight = "700";

        document.body.appendChild(divInfo);

        setTimeout(function () {
            divInfo.remove();
        }, 2000);
    }

    inpPretMin.addEventListener("input", function () {
        if (parseFloat(inpPretMin.value) > parseFloat(inpPretMax.value)) {
            inpPretMax.value = inpPretMin.value;
        }
        actualizeazaInfoRange();
        filtreazaProduse();
    });

    inpPretMax.addEventListener("input", function () {
        if (parseFloat(inpPretMax.value) < parseFloat(inpPretMin.value)) {
            inpPretMin.value = inpPretMax.value;
        }
        actualizeazaInfoRange();
        filtreazaProduse();
    });

    inpNume.addEventListener("change", function () {
        filtreazaProduse();
    });

    inpCategorie.addEventListener("change", function () {
        filtreazaProduse();
    });

    inpFormat.addEventListener("change", function () {
        filtreazaProduse();
    });

    inpNivel.addEventListener("change", function () {
        let optOricare = inpNivel.querySelector('option[value="oricare"]');
        let niveluriSpecifice = Array.from(inpNivel.selectedOptions).filter((opt) => opt.value !== "oricare");

        if (niveluriSpecifice.length && optOricare.selected) {
            optOricare.selected = false;
        }

        if (!Array.from(inpNivel.selectedOptions).length) {
            optOricare.selected = true;
        }
        filtreazaProduse();
    });

    inpDescriere.addEventListener("input", function () {
        actualizeazaValidareTextarea();
    });

    inpDescriere.addEventListener("change", function () {
        filtreazaProduse();
    });

    document.querySelectorAll('input[name="gr_rad"]').forEach(function (radio) {
        radio.addEventListener("change", function () {
            filtreazaProduse();
        });
    });

    document.querySelectorAll(".inp-beneficiu").forEach(function (chk) {
        chk.addEventListener("change", function () {
            filtreazaProduse();
        });
    });

    if (switchTema) {
        let temaSalvata = localStorage.getItem("tema-eduhub") || "dark";
        aplicaTema(temaSalvata);
        switchTema.addEventListener("change", function () {
            aplicaTema(switchTema.checked ? "dark" : "light");
        });
    }

    document.getElementById("filtrare").addEventListener("click", function () {
        if (!valideazaInputuri()) {
            return;
        }
        filtreazaProduse();
    });

    document.getElementById("resetare").addEventListener("click", function () {
        if (!confirm("Sigur vrei sa resetezi toate filtrele?")) {
            return;
        }

        reseteazaMarcajeInvalid();
        inpNume.value = "";
        inpPretMin.value = valMinInitial;
        inpPretMax.value = valMaxInitial;
        inpCategorie.value = "oricare";
        inpFormat.value = "";
        inpDescriere.value = "";

        document.getElementById("i_rad4").checked = true;

        for (let chk of document.querySelectorAll(".inp-beneficiu")) {
            chk.checked = false;
        }

        for (let opt of inpNivel.options) {
            opt.selected = opt.value === "oricare";
        }

        if (sortKey1) sortKey1.value = "";
        if (sortKey2) sortKey2.value = "";
        document.querySelector('input[name="sort-dir1"][value="asc"]').checked = true;
        document.querySelector('input[name="sort-dir2"][value="asc"]').checked = true;

        actualizeazaInfoRange();
        filtreazaProduse();
        restaureazaOrdineInitiala();
    });

    document.getElementById("sortCrescNume").addEventListener("click", function () {
        if (!valideazaInputuri()) {
            return;
        }
        sorteazaDupaPretSiNume(true);
    });

    document.getElementById("sortDescrescNume").addEventListener("click", function () {
        if (!valideazaInputuri()) {
            return;
        }
        sorteazaDupaPretSiNume(false);
    });

    
    if (butonSortApply) {
        butonSortApply.addEventListener("click", function () {
            if (!valideazaInputuri()) {
                return;
            }

            let key1 = sortKey1.value;
            let key2 = sortKey2.value;
            let dir1 = document.querySelector('input[name="sort-dir1"]:checked')?.value || "asc";
            let dir2 = document.querySelector('input[name="sort-dir2"]:checked')?.value || "asc";

            sorteazaPe2Chei(key1, dir1, key2, dir2);
        });
    }

    butonCalculeaza.addEventListener("click", function () {
        if (!valideazaInputuri()) {
            return;
        }

        let produseVizibile = produse.filter((p) => p.style.display !== "none");
        if (!produseVizibile.length) {
            afiseazaRezultatCalcul("Nu exista produse vizibile pentru calcul.");
            return;
        }

        let suma = produseVizibile.reduce((acc, p) => acc + parseFloat(p.getElementsByClassName("val-pret")[0].textContent.trim()), 0);
        afiseazaRezultatCalcul(`Suma preturilor afisate: ${suma.toFixed(2)} lei`);
    });

    document.addEventListener("keydown", function (ev) {
        if (ev.altKey && ev.key.toLowerCase() === "c") {
            let suma = produse
                .filter((p) => p.style.display !== "none")
                .reduce((acc, p) => acc + parseFloat(p.getElementsByClassName("val-pret")[0].textContent.trim()), 0);
            alert(`Suma preturilor produselor afisate este ${suma.toFixed(2)} lei.`);
        }
    });

    const stateManager = {
        pinned: new Set(),
        hidden: new Set(),
        deleted: new Set(),

        savePinnedToStorage() {
            sessionStorage.setItem("bonus6-pinned", JSON.stringify([...this.pinned]));
        },
        loadPinnedFromStorage() {
            const stored = sessionStorage.getItem("bonus6-pinned");
            if (stored) this.pinned = new Set(JSON.parse(stored));
        },

        saveDeletedToStorage() {
            sessionStorage.setItem("bonus6-deleted", JSON.stringify([...this.deleted]));
        },
        loadDeletedFromStorage() {
            const stored = sessionStorage.getItem("bonus6-deleted");
            if (stored) this.deleted = new Set(JSON.parse(stored));
        }
    };

    function setupActionButtons() {
        document.querySelectorAll(".btn-action").forEach((btn) => {
            btn.addEventListener("click", function (e) {
                e.stopPropagation();
                const action = this.dataset.action;
                const article = this.closest("article.produs");
                if (!article) return;

                const prodId = article.dataset.prodId || article.id.replace("art", "");

                if (action === "pin") {
                    if (stateManager.pinned.has(prodId)) {
                        stateManager.pinned.delete(prodId);
                        article.classList.remove("pinned");
                        this.classList.remove("active");
                    } else {
                        stateManager.pinned.add(prodId);
                        article.classList.add("pinned");
                        this.classList.add("active");
                    }
                    stateManager.savePinnedToStorage();
                } else if (action === "hide") {
                    if (stateManager.hidden.has(prodId)) {
                        stateManager.hidden.delete(prodId);
                        article.classList.remove("hidden-prod");
                        this.classList.remove("active");
                    } else {
                        stateManager.hidden.add(prodId);
                        article.classList.add("hidden-prod");
                        this.classList.add("active");
                    }
                } else if (action === "delete") {
                    if (stateManager.deleted.has(prodId)) {
                        stateManager.deleted.delete(prodId);
                        article.style.display = "";
                        this.classList.remove("active");
                    } else {
                        stateManager.deleted.add(prodId);
                        article.style.display = "none";
                        this.classList.add("active");
                    }
                    stateManager.saveDeletedToStorage();
                    actualizeazaNumarProduse(produse.filter((p) => p.style.display !== "none").length);
                }
            });
        });
    }

    function applyStoredState() {
        stateManager.loadPinnedFromStorage();
        stateManager.loadDeletedFromStorage();

        produse.forEach((prod) => {
            const prodId = prod.dataset.prodId || prod.id.replace("art", "");
            const btns = prod.querySelectorAll(".btn-action");

            if (stateManager.pinned.has(prodId)) {
                prod.classList.add("pinned");
                btns.forEach((b) => b.dataset.action === "pin" && b.classList.add("active"));
            }

            if (stateManager.deleted.has(prodId)) {
                prod.style.display = "none";
                btns.forEach((b) => b.dataset.action === "delete" && b.classList.add("active"));
            }
        });
    }

    
    let originalFiltreazaProduse = window.filtreazaProduse;
    window.filtreazaProduse = function () {
        if (typeof originalFiltreazaProduse === "function") {
            originalFiltreazaProduse.call(this);
        }

       
        produse.forEach((prod) => {
            const prodId = prod.dataset.prodId || prod.id.replace("art", "");
            if (stateManager.hidden.has(prodId) && prod.style.display !== "none") {
                prod.style.display = "none";
            }
        });

        
        stateManager.pinned.forEach((prodId) => {
            let prod = document.getElementById(`art${prodId}`);
            if (!prod) prod = produse.find((p) => (p.dataset.prodId || p.id.replace("art", "")) === prodId);
            if (prod && stateManager.deleted.has(prodId) === false) {
                prod.style.display = "";
            }
        });

        actualizeazaNumarProduse(produse.filter((p) => p.style.display !== "none").length);
    };

    setupActionButtons();
    applyStoredState();

    
    const luniRo = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
    const zileRo = ["Duminica", "Luni", "Marti", "Miercuri", "Joi", "Vineri", "Sambata"];

    let modalProdus = document.getElementById("modalProdus");
    let bsModal = new bootstrap.Modal(modalProdus);

    produse.forEach((prod) => {
        prod.addEventListener("click", function (e) {
            // Dacă s-a dat click pe un buton de acțiune, nu deschide modalul
            if (e.target.closest(".produs-actiuni")) {
                return;
            }
            // Dacă s-a dat click pe un link din produs (titlu sau imagine), previne navigarea și deschide doar modalul
            const link = e.target.closest("a");
            if (link && prod.contains(link)) {
                e.preventDefault();
            }

            const prodId = prod.dataset.prodId || prod.id.replace("art", "");
            const prodNume = prod.getElementsByClassName("val-nume")[0]?.textContent.trim() || "N/A";
            const prodPret = prod.getElementsByClassName("val-pret")[0]?.textContent.trim() || "N/A";
            const prodDescriere = prod.dataset.descriere || "Fără descriere";
            const prodCategorie = prod.getElementsByClassName("val-categorie")[0]?.textContent.trim() || "N/A";
            const prodNivel = prod.getElementsByClassName("val-nivel")[0]?.textContent.trim() || "N/A";
            const prodFormat = prod.dataset.format || "N/A";
            const prodPagini = prod.dataset.pagini || "N/A";
            const prodBeneficii = prod.dataset.beneficii || "N/A";
            const prodImagine = `/resurse/imagini/produse/${prod.querySelector("img")?.src.split("/resurse/imagini/produse/")[1] || "Unknown.jpeg"}`;

            let dataText = "N/A";
            let timeElement = prod.querySelector("time");
            if (timeElement) {
                dataText = timeElement.textContent.trim();
            }

            let acreditataText = "Nu";
            let acreditataSpan = prod.querySelector(".val-acreditata");
            if (acreditataSpan) {
                acreditataText = acreditataSpan.textContent.trim();
            }

            document.getElementById("modal-prod-nume").textContent = prodNume;
            document.getElementById("modal-prod-pret").textContent = prodPret;
            document.getElementById("modal-prod-descriere").textContent = prodDescriere;
            document.getElementById("modal-prod-categorie").textContent = prodCategorie;
            document.getElementById("modal-prod-nivel").textContent = prodNivel;
            document.getElementById("modal-prod-format").textContent = prodFormat;
            document.getElementById("modal-prod-pagini").textContent = prodPagini;
            document.getElementById("modal-prod-beneficii").textContent = prodBeneficii || "N/A";
            document.getElementById("modal-prod-data").textContent = dataText;
            document.getElementById("modal-prod-acreditata").textContent = acreditataText;
            document.getElementById("modal-prod-imagine").src = prodImagine;
            document.getElementById("modal-link-produs").href = `/produs/${prodId}`;

            bsModal.show();
        });
    });

    actualizeazaInfoRange();
    actualizeazaNumarProduse(produse.length);
});