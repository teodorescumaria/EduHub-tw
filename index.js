const express= require("express");
const path= require("path");
const fs=require("fs");
const sass=require("sass");
const sharp= require("sharp");

const pg = require("pg");


app= express();
app.set("view engine", "ejs")

const INTERVAL_PRODUS_NOU_ZILE = 180;
const FOLDERE_IMAGINI_PRODUSE = {
    1: "simulare-EN-cls8",
    2: "matematica-bac-teste-m2",
    3: "ghid-complet-EN",
    4: "teste-sim-cls8-paralela45",
    5: "mate-teste-rez-portal",
    6: "bac-info-gri",
    7: "ghid-pregatire-bac-info-2009",
    8: "teste-rez-bac-info",
    9: "pregatire-bac-info-letras",
    10: "bac-mate-2026-paralela",
    11: "EN-6-art",
    12: "40-teste-EN-art",
    13: "EN-6-teste-booklet",
    14: "EN-cls4-paralela45",
    15: "EN6-art",
    16: "flash-carduri-mate-bac",
    17: "culegere-mate-cls8-modele",
    18: "flash-carduri-info",
    19: "bac-mate-start-in-scoala-inimi",
    20: "EN-cls8-mate-2025",
    21: "mate-cls8-bacademia",
    22: "mate-bac-bacademia",
    23: "info-bacademia",
    24: "sim-cls8-EN-turcoaz",
    25: "teste-EN4",
    26: "EN-cls6-paralela45-alba"
};



obGlobal={
    obErori:null,
    obImagini:null,
    categoriiProduse:[],
    folderScss: path.join(__dirname,"resurse/scss"),
    folderCss: path.join(__dirname,"resurse/css"),
    folderBackup: path.join(__dirname,"backup"),
}

console.log("Folder index.js", __dirname);
console.log("Folder curent (de lucru)", process.cwd());
console.log("Cale fisier", __filename);


 client=new pg.Client({
     database:"tw2026",
     user:"maria",
     password:"maria",
     host:"localhost",
     port:5432
 })

 client.connect()

async function initCategoriiProduse(){
    try {
        let rezCategorii = await client.query("select unnest(enum_range(null::categ_culegere))::text as categorie");
        obGlobal.categoriiProduse = rezCategorii.rows.map((c) => c.categorie);
        app.locals.categoriiProduse = obGlobal.categoriiProduse;
    }
    catch (err) {
        console.log("Eroare init categorii produse:", err);
        obGlobal.categoriiProduse = [];
        app.locals.categoriiProduse = [];
    }
}

initCategoriiProduse();

 client.query("select * from culegeri order by id limit 3", function(err, rez){
     if (err){
         console.log("Eroare", err);
     }
        else{
            console.log(rez);
        }
 })

let vect_foldere=[ "temp", "logs", "backup", "fisiere_uploadate" ]
for (let folder of vect_foldere){
    let caleFolder=path.join(__dirname, folder);
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(path.join(caleFolder), {recursive:true});   
    }
}

app.use("/resurse",express.static(path.join(__dirname, "resurse")));
app.use("/dist",express.static(path.join(__dirname, "node_modules/bootstrap/dist")));

app.use(function(req, res, next){
    res.locals.categoriiProduse = obGlobal.categoriiProduse || [];
    res.locals.ip = req.ip;
    next();
});

app.get("/favicon.ico", function(req, res){
    res.sendFile(path.join(__dirname,"resurse/imagini/favicon/favicon.ico"))
});

app.get(["/", "/index","/home"], async function(req, res){
    let imaginiBaza = obtineImaginiGaleriePentruAfisare();
    let imaginiAnimata = selecteazaImaginiGalerieAnimata(obGlobal.obImagini.imagini || []);
    await genereazaVersiuniResponsiveGalerie(imaginiBaza);
    genereazaCssGalerieAnimata(imaginiAnimata.length);

    try {
        let rezProduseNoi = await client.query(
            `select id, nume, data_adaugare
             from culegeri
             where data_adaugare >= current_date - ($1::int)
             order by data_adaugare desc, id desc
             limit 8`,
            [INTERVAL_PRODUS_NOU_ZILE]
        );

        res.render("pagini/index", {
            cale_galerie: obGlobal.obImagini.cale_galerie,
            titlu_galerie: obGlobal.obImagini.titlu_galerie,
            imagini: imaginiBaza,
            imaginiAnimata: imaginiAnimata,
            produseNoi: rezProduseNoi.rows,
            intervalProdusNouZile: INTERVAL_PRODUS_NOU_ZILE
        });
    }
    catch (err) {
        console.log("Eroare incarcare produse noi pentru index:", err);
        res.render("pagini/index", {
            cale_galerie: obGlobal.obImagini.cale_galerie,
            titlu_galerie: obGlobal.obImagini.titlu_galerie,
            imagini: imaginiBaza,
            imaginiAnimata: imaginiAnimata,
            produseNoi: [],
            intervalProdusNouZile: INTERVAL_PRODUS_NOU_ZILE
        });
    }
});

// app.get("/despre", function(req, res){
//     res.render("pagini/despre");
// });

app.get("/produse", async function(req, res){
    let tip = (req.query.tip || "toate").trim().toLowerCase();

    try {
        let rezOptiuni = await client.query("select unnest(enum_range(null::categ_culegere))::text as categorie");
        let categoriiValide = rezOptiuni.rows.map((opt) => opt.categorie.toLowerCase());
        let tipNormalizat = categoriiValide.includes(tip) ? tip : "toate";

        let queryProduse = "select * from culegeri where 1=1";
        let params = [];

        if (tipNormalizat && tipNormalizat.toLowerCase() !== "toate") {
            params.push(tipNormalizat.toLowerCase());
            queryProduse += ` and lower(categorie::text) = $${params.length}`;
        }

        queryProduse += " order by nume";
        let rezProduse = await client.query(queryProduse, params);

        res.render("pagini/produse", {
            produse: rezProduse.rows,
            optiuni: rezOptiuni.rows,
            filtruTip: tipNormalizat,
            intervalProdusNouZile: INTERVAL_PRODUS_NOU_ZILE
        });
    }
    catch (err) {
        console.log("Eroare produse:", err);
        afisareEroare(res, 2);
    }
});

app.get("/produs/:id", async function(req, res){
    try {
        let idProdus = Number(req.params.id);
        if (!Number.isInteger(idProdus) || idProdus <= 0) {
            afisareEroare(res, 400, "Produs invalid", "Identificatorul produsului nu este valid.");
            return;
        }

        let rezProd = await client.query("select * from culegeri where id=$1", [idProdus]);
        if (!rezProd.rowCount) {
            afisareEroare(res, 404, "Produs inexistent", "Produsul cautat nu exista in baza de date.");
            return;
        }

        // BONUS 9: Scan for product images
        let prodData = rezProd.rows[0];
        let imagini = [prodData.imagine || "Unknown.jpeg"];

        let imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"];
        let folderNumeCustom = FOLDERE_IMAGINI_PRODUSE[idProdus];
        let foldereCandidate = [];

        if (folderNumeCustom) {
            foldereCandidate.push({
                abs: path.join(__dirname, "resurse/imagini/produse/imagini-produse", folderNumeCustom),
                rel: `imagini-produse/${folderNumeCustom}`
            });
        }

        // Fallback compatibil cu structura veche
        foldereCandidate.push({
            abs: path.join(__dirname, "resurse/imagini/produse", `prod_${idProdus}`),
            rel: `prod_${idProdus}`
        });

        for (let folder of foldereCandidate) {
            if (!fs.existsSync(folder.abs)) {
                continue;
            }

            let files = fs.readdirSync(folder.abs);
            let imaginiGasite = files
                .filter((f) => imageExtensions.includes(path.extname(f).toLowerCase()))
                .sort((a, b) => a.localeCompare(b, "ro"))
                .map((f) => `${folder.rel}/${f}`);

            if (imaginiGasite.length) {
                // Imaginea principală rămâne prima, apoi restul imaginilor din folder
                let toate = [prodData.imagine || "Unknown.jpeg", ...imaginiGasite];
                imagini = [...new Set(toate)];
                break;
            }
        }

        res.render("pagini/produs", {
            prod: prodData,
            imagini: imagini,
            intervalProdusNouZile: INTERVAL_PRODUS_NOU_ZILE
        });
    }
    catch (err) {
        console.log("Eroare produs individual:", err);
        afisareEroare(res);
    }
});
    

function initErori(){
    let continut = fs.readFileSync(path.join(__dirname,"resurse/json/erori.json")).toString("utf-8");
    let erori=obGlobal.obErori=JSON.parse(continut)
    let err_default=erori.eroare_default
    err_default.imagine=path.join(erori.cale_baza, err_default.imagine)
    for (let eroare of erori.info_erori){
        eroare.imagine=path.join(erori.cale_baza, eroare.imagine)
    }

}
initErori()

// Funcții pentru galerie
function getZileSaptamana() {
    return ["duminica", "luni", "marti", "miercuri", "joi", "vineri", "sambata"];
}

function filtreazaImaginidupaDzi(imagini, dataCurenta = new Date()) {
    const zile = getZileSaptamana();
    const indexZiCurenta = dataCurenta.getDay();
    
    let imaginiFiltrate = imagini.filter(imagine => {
        if (!imagine.intervale_zile || !Array.isArray(imagine.intervale_zile)) {
            return false;
        }
        
        return imagine.intervale_zile.some(interval => {
            if (!Array.isArray(interval) || interval.length !== 2) {
                return false;
            }
            
            const ziInceput = interval[0].toLowerCase();
            const ziSfarsit = interval[1].toLowerCase();
            const indexInceput = zile.indexOf(ziInceput);
            const indexSfarsit = zile.indexOf(ziSfarsit);
            
            if (indexInceput === -1 || indexSfarsit === -1) {
                return false;
            }
            
            if (indexInceput <= indexSfarsit) {
                return indexZiCurenta >= indexInceput && indexZiCurenta <= indexSfarsit;
            } else {
                return indexZiCurenta >= indexInceput || indexZiCurenta <= indexSfarsit;
            }
        });
    });
    
    if (imaginiFiltrate.length % 2 !== 0) {
        imaginiFiltrate = imaginiFiltrate.slice(0, imaginiFiltrate.length - 1);
    }
    
    return imaginiFiltrate;
}

function getDataGalerieCurenta() {
    if (!process.env.GALERIE_DATA_TEST) {
        return new Date();
    }

    const dataTest = new Date(process.env.GALERIE_DATA_TEST);
    if (Number.isNaN(dataTest.getTime())) {
        return new Date();
    }

    return dataTest;
}

async function genereazaVersiuniResponsiveGalerie(imagini) {
    let caleGalerieRel = (obGlobal.obImagini.cale_galerie || "/resurse/imagini").replace(/^\/+/, "");
    let caleAbsGalerie = path.join(__dirname, caleGalerieRel);
    let caleAbsMediu = path.join(caleAbsGalerie, "mediu");
    let caleAbsMic = path.join(caleAbsGalerie, "mic");

    if (!fs.existsSync(caleAbsMediu)) {
        fs.mkdirSync(caleAbsMediu, { recursive: true });
    }
    if (!fs.existsSync(caleAbsMic)) {
        fs.mkdirSync(caleAbsMic, { recursive: true });
    }

    for (let imag of imagini) {
        if (!imag?.fisier_imagine) {
            continue;
        }

        let numeFis = path.parse(imag.fisier_imagine).name;
        let caleFisAbs = path.join(caleAbsGalerie, imag.fisier_imagine);
        let caleFisMediuAbs = path.join(caleAbsMediu, `${numeFis}.webp`);
        let caleFisMicAbs = path.join(caleAbsMic, `${numeFis}.webp`);

        if (!fs.existsSync(caleFisAbs)) {
            continue;
        }

        let operatii = [];

        if (!fs.existsSync(caleFisMediuAbs)) {
            operatii.push(
                sharp(caleFisAbs)
                    .resize({ width: 360, height: 300, fit: "cover", position: "centre" })
                    .webp({ quality: 82 })
                    .toFile(caleFisMediuAbs)
            );
        }

        if (!fs.existsSync(caleFisMicAbs)) {
            operatii.push(
                sharp(caleFisAbs)
                    .resize({ width: 220, height: 180, fit: "cover", position: "centre" })
                    .webp({ quality: 80 })
                    .toFile(caleFisMicAbs)
            );
        }

        if (operatii.length) {
            try {
                await Promise.all(operatii);
            }
            catch (err) {
                console.log(`Eroare generare versiuni galerie pentru ${imag.fisier_imagine}:`, err.message);
            }
        }
    }
}

function pregatesteImaginiGaleriePentruTemplate(imagini) {
    const caleGalerie = obGlobal.obImagini.cale_galerie || "/resurse/imagini";

    return imagini.map((imagine) => {
        const numeBazaFisier = path.parse(imagine.fisier_imagine || "").name;
        return {
            ...imagine,
            continut_alternativ: imagine.continut_alternativ || imagine.nume_poza || imagine.fisier_imagine || "Imagine galerie",
            fisier_mediu: `mediu/${numeBazaFisier}.webp`,
            fisier_mic: `mic/${numeBazaFisier}.webp`,
            cale_galerie: caleGalerie
        };
    });
}

function obtineImaginiGaleriePentruAfisare() {
    const imaginiToate = obGlobal.obImagini.imagini || [];
    const dataCurenta = getDataGalerieCurenta();
    const indexZi = dataCurenta.getDay();
    const imaginiFiltrate = filtreazaImaginidupaDzi(imaginiToate, dataCurenta);

    function selecteazaCuRotatie(lista, nrDorite, offset) {
        if (!Array.isArray(lista) || !lista.length || nrDorite <= 0) {
            return [];
        }
        const start = ((offset % lista.length) + lista.length) % lista.length;
        const listaRotita = [...lista.slice(start), ...lista.slice(0, start)];
        return listaRotita.slice(0, nrDorite);
    }

    // Modificarea offset-ului pe zi asigura un set vizibil diferit in fiecare zi.
    const offsetZi = indexZi * 3;

    let imaginiFinale = [...imaginiFiltrate];
    if (imaginiFinale.length >= 14) {
        imaginiFinale = selecteazaCuRotatie(imaginiFiltrate, 14, offsetZi);
    }
    else {
        const imaginiCompletare = imaginiToate
            .filter((img) => !imaginiFinale.includes(img))
        const completareRotita = selecteazaCuRotatie(imaginiCompletare, 14 - imaginiFinale.length, offsetZi);
        imaginiFinale = [...imaginiFinale, ...completareRotita];
    }

    if (imaginiFinale.length < 14) {
        const completareFallback = selecteazaCuRotatie(imaginiToate, 14 - imaginiFinale.length, offsetZi + 2);
        for (let img of completareFallback) {
            if (!imaginiFinale.includes(img)) {
                imaginiFinale.push(img);
            }
            if (imaginiFinale.length >= 14) {
                break;
            }
        }
    }

    if (imaginiFinale.length < 14) {
        const completareCiclica = selecteazaCuRotatie(imaginiToate, 14, offsetZi + 5);
        for (let img of completareCiclica) {
            imaginiFinale.push(img);
            if (imaginiFinale.length >= 14) {
                break;
            }
        }
    }

    imaginiFinale = imaginiFinale.slice(0, 14);
    return pregatesteImaginiGaleriePentruTemplate(imaginiFinale);
}

function numarRandomParGalerieAnimata() {
    const valori = [6, 8, 10, 12, 14];
    const pozitie = Math.floor(Math.random() * valori.length);
    return valori[pozitie];
}

function selecteazaImaginiGalerieAnimata(imagini) {
    const nrImagini = numarRandomParGalerieAnimata();
    const imaginiIndiceImparDistincte = [];
    const fisiereVazute = new Set();

    imagini.forEach((imagine, index) => {
        if (index % 2 !== 1) {
            return;
        }

        const idFisier = imagine?.fisier_imagine;
        if (!idFisier || fisiereVazute.has(idFisier)) {
            return;
        }

        fisiereVazute.add(idFisier);
        imaginiIndiceImparDistincte.push(imagine);
    });

    return imaginiIndiceImparDistincte.slice(0, nrImagini);
}

function genereazaCssGalerieAnimata(nrImagini) {
    const caleConfig = path.join(__dirname, "resurse/scss/_galerie-animata-config.scss");
    const caleScss = path.join(__dirname, "resurse/scss/galerie-animata.scss");
    const caleCss = path.join(__dirname, "resurse/css/galerie-animata.css");

    fs.writeFileSync(caleConfig, `$nr-imagini-galerie-animata: ${nrImagini};\n`);

    const rezultat = sass.compile(caleScss, {
        loadPaths: [path.join(__dirname, "resurse/scss")],
        style: "expanded",
        quietDeps: true,
        silenceDeprecations: ["import", "global-builtin", "color-functions", "if-function"]
    });

    fs.writeFileSync(caleCss, rezultat.css);
}

function initImagini(){
    let caleGalerieJson = path.join(__dirname,"resurse/json/galerie.json");
    if (!fs.existsSync(caleGalerieJson)) {
        obGlobal.obImagini = { imagini: [], cale_galerie: "/resurse/imagini", titlu_galerie: "Galerie" };
        return;
    }

    var continut = fs.readFileSync(caleGalerieJson).toString("utf-8");
    obGlobal.obImagini = JSON.parse(continut);
}
initImagini();


function afisareEroare(res, identificator, titlu, text, imagine){
    //TO DO cautam eroarea dupa identificator
    let eroare= obGlobal.obErori.info_erori.find((elem) => 
        elem.identificator == identificator
    )
    //daca sunt setate titlu, text, imagine, le folosim, 
    //altfel folosim cele din fisierul json pentru eroarea gasita
    //daca nu o gasim, afisam eroarea default
    let errDefault= obGlobal.obErori.eroare_default;
    if(eroare?.status)
        res.status(eroare.identificator)
    res.render("pagini/eroare",{
        imagine: imagine || eroare?.imagine || errDefault.imagine,
        titlu: titlu || eroare?.titlu || errDefault.titlu,
        text: text || eroare?.text || errDefault.text,
    });

}


app.get("/eroare", function(req, res){
    afisareEroare(res,404, "Titlu!!!")
});


function compileazaScss(caleScss, caleCss){
    if(!caleCss){

        let numeFisExt=path.basename(caleScss); // "folder1/folder2/a.scss" -> "a.scss"
        let numeFis=numeFisExt.split(".")[0]   /// "a.scss"  -> ["a","scss"]
        caleCss=numeFis+".css"; // output: a.css
    }
    
    if (!path.isAbsolute(caleScss))
        caleScss=path.join(obGlobal.folderScss,caleScss )
    if (!path.isAbsolute(caleCss))
        caleCss=path.join(obGlobal.folderCss,caleCss )
    
    let caleBackup=path.join(obGlobal.folderBackup, "resurse/css");
    if (!fs.existsSync(caleBackup)) {
        fs.mkdirSync(caleBackup,{recursive:true})
    }
    
    // la acest punct avem cai absolute in caleScss si  caleCss

    let numeFisCss=path.basename(caleCss);
    if (fs.existsSync(caleCss)){
        fs.copyFileSync(caleCss, path.join(obGlobal.folderBackup, "resurse/css",numeFisCss ))// +(new Date()).getTime()
    }
    rez=sass.compile(caleScss, {
        sourceMap:true,
        loadPaths: [path.join(__dirname, "node_modules")],
        quietDeps: true,
        silenceDeprecations: ["import", "global-builtin", "color-functions", "if-function"]
    });
    fs.writeFileSync(caleCss,rez.css)
    
}


//la pornirea serverului
vFisiere=fs.readdirSync(obGlobal.folderScss);
for( let numeFis of vFisiere ){
    if (numeFis.startsWith("_")){
        continue;
    }
    if (path.extname(numeFis)==".scss"){
        compileazaScss(numeFis);
    }
}


fs.watch(obGlobal.folderScss, function(eveniment, numeFis){
    if (eveniment=="change" || eveniment=="rename"){
        if (numeFis?.startsWith("_")){
            return;
        }
        let caleCompleta=path.join(obGlobal.folderScss, numeFis);
        if (fs.existsSync(caleCompleta)){
            compileazaScss(caleCompleta);
        }
    }
})


app.get("/galerie", async function(req, res){
    let imaginiBaza = obtineImaginiGaleriePentruAfisare();
    let imaginiAnimata = selecteazaImaginiGalerieAnimata(obGlobal.obImagini.imagini || []);
    await genereazaVersiuniResponsiveGalerie(imaginiBaza);
    genereazaCssGalerieAnimata(imaginiAnimata.length);
    
    res.render("pagini/galerie", {
        cale_galerie: obGlobal.obImagini.cale_galerie,
        titlu_galerie: obGlobal.obImagini.titlu_galerie,
           imagini: imaginiBaza,
           imaginiAnimata: imaginiAnimata
    });
});

app.get("/despre", async function(req, res){
    let imaginiBaza = obtineImaginiGaleriePentruAfisare();
    await genereazaVersiuniResponsiveGalerie(imaginiBaza);
    
    res.render("pagini/despre", {
        cale_galerie: obGlobal.obImagini.cale_galerie,
        titlu_galerie: obGlobal.obImagini.titlu_galerie,
           imagini: imaginiBaza
    });
});

app.get("*", function(req, res){
    console.log("Cale pagina", req.url);
    if (req.url.startsWith("/resurse") && path.extname(req.url)==""){
        afisareEroare(res,403);
        return;
    }
    if (path.extname(req.url)==".ejs"){
        afisareEroare(res,400);
        return;
    }
    try{
        res.render("pagini"+req.url, function(err, rezRandare){
            if (err){
                if (err.message.includes("Failed to lookup view")){
                    afisareEroare(res,404)
                }
                else{
                    afisareEroare(res);
                }
            }
            else{
                res.send(rezRandare);
                //console.log("Rezultat randare", rezRandare);
            }
        });
    }
    catch(err){
        if (err.message.includes("Cannot find module")){
            afisareEroare(res,404)
        }
        else{
            afisareEroare(res);
        }
    }
});
const PORT_IMPLICIT = Number(process.env.PORT) || 8080;

function pornesteServer(portCurent){
    const server = app.listen(portCurent, () => {
        console.log(`Serverul a pornit pe portul ${portCurent}!`);
    });

    server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
            console.log(`Portul ${portCurent} este ocupat. Incerc portul ${portCurent + 1}...`);
            pornesteServer(portCurent + 1);
        }
        else {
            console.log("Eroare la pornirea serverului:", err.message);
        }
    });
}

pornesteServer(PORT_IMPLICIT);