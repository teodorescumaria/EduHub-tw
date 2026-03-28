const express = require("express");
const path = require("path");
const fs = require("fs");
const sass = require("sass");

const app = express();
const PORT = process.env.PORT || 8080;
app.set("view engine", "ejs");

const obGlobal = {
    obErori: null,
    obImagini: null,
    folderScss: path.join(__dirname, "resurse", "scss"),
    folderCss: path.join(__dirname, "resurse", "css"),
    folderBackup: path.join(__dirname, "backup"),
};

console.log("Folder index.js", __dirname);
console.log("Folder curent (de lucru)", process.cwd());
console.log("Cale fisier", __filename);
console.log("Sunt __dirname si process.cwd() la fel?", __dirname === process.cwd());
console.log("Nu intotdeauna. Pot diferi daca serverul e pornit din alt director.");

const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
for (const folder of vect_foldere) {
    const caleFolder = path.join(__dirname, folder);
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder, { recursive: true });
    }
}

app.use("/resurse", express.static(path.join(__dirname, "resurse")));




app.get(["/", "/index", "/home"], function (req, res) {
    res.render("pagini/index", { ip: req.ip });
});

app.get("/despre", function (req, res) {
    res.render("pagini/despre", { ip: req.ip });
});



function initErori() {
    const continut = fs.readFileSync(path.join(__dirname, "resurse", "json", "erori.json")).toString("utf-8");
    const erori = (obGlobal.obErori = JSON.parse(continut));
    const errDefault = erori.eroare_default;
    errDefault.imagine = path.join(erori.cale_baza, errDefault.imagine);
    for (const eroare of erori.info_erori) {
        eroare.imagine = path.join(erori.cale_baza, eroare.imagine);
    }
}
initErori();


function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare = null;
    if (identificator) {
        eroare = obGlobal.obErori.info_erori.find((elem) => elem.identificator === identificator);
    }

    const errDefault = obGlobal.obErori.eroare_default;
    const errAfisata = eroare || errDefault;

    if (eroare?.status) {
        res.status(eroare.identificator);
    }

    res.render("pagini/eroare", {
        imagine: imagine || errAfisata.imagine,
        titlu: titlu || errAfisata.titlu,
        text: text || errAfisata.text,
    });
}

app.get("/favicon.ico", function (req, res) {
    res.sendFile(path.join(__dirname, "resurse", "imagini", "favicon", "favicon.ico"));
});

app.get("/eroare", function (req, res) {
    afisareEroare(res, 404, "Pagina de eroare");
});



function compileazaScss(caleScss, caleCss) {
    if (!caleCss) {

        const numeFisExt = path.basename(caleScss); // "folder1/folder2/a.scss" -> "a.scss"
        const numeFis = numeFisExt.split(".")[0]; // "a.scss" -> ["a","scss"]
        caleCss = numeFis + ".css"; // output: a.css
    }

    if (!path.isAbsolute(caleScss)) {
        caleScss = path.join(obGlobal.folderScss, caleScss);
    }
    if (!path.isAbsolute(caleCss)) {
        caleCss = path.join(obGlobal.folderCss, caleCss);
    }

    const caleBackup = path.join(obGlobal.folderBackup, "resurse", "css");
    if (!fs.existsSync(caleBackup)) {
        fs.mkdirSync(caleBackup, { recursive: true });
    }

    // la acest punct avem cai absolute in caleScss si  caleCss

    const numeFisCss = path.basename(caleCss);
    if (fs.existsSync(caleCss)) {
        fs.copyFileSync(caleCss, path.join(obGlobal.folderBackup, "resurse", "css", numeFisCss));
    }
    const rez = sass.compile(caleScss, { sourceMap: true });
    fs.writeFileSync(caleCss, rez.css);
}


//la pornirea serverului
if (fs.existsSync(obGlobal.folderScss)) {
    const vFisiere = fs.readdirSync(obGlobal.folderScss);
    for (const numeFis of vFisiere) {
        if (path.extname(numeFis) === ".scss") {
            compileazaScss(numeFis);
        }
    }

    fs.watch(obGlobal.folderScss, function (eveniment, numeFis) {
        if ((eveniment === "change" || eveniment === "rename") && numeFis) {
            const caleCompleta = path.join(obGlobal.folderScss, numeFis);
            if (fs.existsSync(caleCompleta)) {
                compileazaScss(caleCompleta);
            }
        }
    });
}


app.get("/*", function (req, res) {
    console.log("Cale pagina", req.url);
    if (req.path.startsWith("/resurse") && path.extname(req.path) === "") {
        afisareEroare(res, 403);
        return;
    }
    if (path.extname(req.path) === ".ejs") {
        afisareEroare(res, 400);
        return;
    }
    try {
        res.render("pagini" + req.path, { ip: req.ip }, function (err, rezRandare) {
            if (err) {
                if (err.message.startsWith("Failed to lookup view") || err.message.includes("Failed to lookup view")) {
                    afisareEroare(res, 404);
                } else {
                    afisareEroare(res);
                }
            } else {
                res.send(rezRandare);
                console.log("Rezultat randare", rezRandare);
            }
        });
    } catch (err) {
        if (err.message.includes("Cannot find module")) {
            afisareEroare(res, 404);
        } else {
            afisareEroare(res);
        }
    }
});


app.listen(PORT);
console.log("Serverul a pornit pe portul", PORT);