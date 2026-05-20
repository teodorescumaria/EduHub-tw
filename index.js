const express= require("express");
const path= require("path");
const fs=require("fs");
const sass=require("sass");
const sharp= require("sharp");

const pg = require("pg");


app= express();
app.set("view engine", "ejs")



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
    next();
});

app.get("/favicon.ico", function(req, res){
    res.sendFile(path.join(__dirname,"resurse/imagini/favicon/favicon.ico"))
});

app.get(["/", "/index","/home"], function(req, res){
    let imaginiBaza = (obGlobal.obImagini.imagini || []).slice(0, 14);
    
    res.render("pagini/index", {
        ip: req.ip,
        cale_galerie: obGlobal.obImagini.cale_galerie,
        titlu_galerie: obGlobal.obImagini.titlu_galerie,
        imagini: imaginiBaza
    });
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
            filtruTip: tipNormalizat
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
        let imagini = [prodData.imagine]; // Start with main image
        
        let folderProdus = path.join(__dirname, "resurse/imagini/produse", `prod_${idProdus}`);
        try {
            let files = fs.readdirSync(folderProdus);
            let imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"];
            let imaginiGassite = files.filter(f => {
                let ext = path.extname(f).toLowerCase();
                return imageExtensions.includes(ext);
            });
            
            if (imaginiGassite.length > 0) {
                imagini = imaginiGassite.map(f => `prod_${idProdus}/${f}`);
            }
        } catch (e) {
            // Folder not found, use default main image
        }

        res.render("pagini/produs", {
            prod: prodData,
            imagini: imagini
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
    const zileCurenta = zile[indexZiCurenta];
    
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

function initImagini(){
    let caleGalerieJson = path.join(__dirname,"resurse/json/galerie.json");
    if (!fs.existsSync(caleGalerieJson)) {
        obGlobal.obImagini = { imagini: [], cale_galerie: "/resurse/imagini", titlu_galerie: "Galerie" };
        return;
    }

    var continut = fs.readFileSync(caleGalerieJson).toString("utf-8");
    obGlobal.obImagini = JSON.parse(continut);
    let vImagini = obGlobal.obImagini.imagini || [];
    let caleGalerie = obGlobal.obImagini.cale_galerie || "/resurse/imagini";

    let caleAbs = path.join(__dirname, caleGalerie);
    let caleAbsMediu = path.join(caleAbs, "mediu");
    if (!fs.existsSync(caleAbsMediu))
        fs.mkdirSync(caleAbsMediu, { recursive: true });
    
    for (let imag of vImagini){
        let numeFisExt = imag.fisier_imagine;
        let [numeFis, ext] = numeFisExt.split(".");
        let caleFisAbs = path.join(caleAbs, imag.fisier_imagine);
        let caleFisMediuAbs = path.join(caleAbsMediu, numeFis+".webp");
        
        if (fs.existsSync(caleFisAbs)) {
            sharp(caleFisAbs).resize(300).toFile(caleFisMediuAbs).catch(err => {
                console.log("Eroare sharp:", err.message);
            });
        }
    }
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
    if (path.extname(numeFis)==".scss"){
        compileazaScss(numeFis);
    }
}


fs.watch(obGlobal.folderScss, function(eveniment, numeFis){
    if (eveniment=="change" || eveniment=="rename"){
        let caleCompleta=path.join(obGlobal.folderScss, numeFis);
        if (fs.existsSync(caleCompleta)){
            compileazaScss(caleCompleta);
        }
    }
})


app.get("/galerie", function(req, res){
    let imaginiBaza = (obGlobal.obImagini.imagini || []).slice(0, 14);
    
    res.render("pagini/galerie", {
        cale_galerie: obGlobal.obImagini.cale_galerie,
        titlu_galerie: obGlobal.obImagini.titlu_galerie,
           imagini: imaginiBaza
    });
});

app.get("/despre", function(req, res){
    let imaginiBaza = (obGlobal.obImagini.imagini || []).slice(0, 14);
    
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