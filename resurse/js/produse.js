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

        let valFormat = inpFormat.value.trim().toLowerCase();
        let optiuniFormat = Array.from(document.querySelectorAll("#lista-formate option")).map((opt) => opt.value.trim().toLowerCase());
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

    function potrivireNume(numeProdus, sablon) {
        if (!sablon) {
            return true;
        }

        let sablonMic = sablon.toLowerCase();
        let numeMic = numeProdus.toLowerCase();

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

        let filtruNume = inpNume.value.trim();
        let filtruPretMin = parseFloat(inpPretMin.value);
        let filtruPretMax = parseFloat(inpPretMax.value);
        let filtruCategorie = inpCategorie.value.trim().toLowerCase();
        let filtruFormat = inpFormat.value.trim().toLowerCase();
        let filtruDescriere = inpDescriere.value.trim().toLowerCase();

        let intervalPagini = obtineIntervalPagini();

        let niveleSelectate = Array.from(inpNivel.selectedOptions).map((opt) => opt.value.trim().toLowerCase());
        let filtruNivelActiv = niveleSelectate.length && !niveleSelectate.includes("oricare");

        let beneficiiBifate = Array.from(document.querySelectorAll(".inp-beneficiu:checked")).map((chk) => chk.value.trim().toLowerCase());

        for (let prod of produse) {
            let nume = prod.getElementsByClassName("val-nume")[0].textContent.trim();
            let pret = parseFloat(prod.getElementsByClassName("val-pret")[0].textContent.trim());
            let categorie = prod.getElementsByClassName("val-categorie")[0].textContent.trim().toLowerCase();
            let nivel = prod.getElementsByClassName("val-nivel")[0].textContent.trim().toLowerCase();
            let pagini = parseInt(prod.dataset.pagini || "0", 10);
            let format = (prod.dataset.format || "").trim().toLowerCase();
            let descriere = (prod.dataset.descriere || "").toLowerCase();
            let beneficii = (prod.dataset.beneficii || "").toLowerCase();

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
    });

    inpPretMax.addEventListener("input", function () {
        if (parseFloat(inpPretMax.value) < parseFloat(inpPretMin.value)) {
            inpPretMin.value = inpPretMax.value;
        }
        actualizeazaInfoRange();
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
    });

    inpDescriere.addEventListener("input", function () {
        actualizeazaValidareTextarea();
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

    actualizeazaInfoRange();
    actualizeazaNumarProduse(produse.length);
});