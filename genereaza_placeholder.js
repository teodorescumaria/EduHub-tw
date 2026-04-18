const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const caleImagini = path.join(__dirname, 'resurse/imagini');

// Culori pentru placeholder-uri
const culori = [
  { numeFisier: 'studiu-grup.jpg', culoare: '#FF6B6B' },
  { numeFisier: 'laborator-info.jpg', culoare: '#4ECDC4' },
  { numeFisier: 'activitate-extrascolar.jpg', culoare: '#45B7D1' },
  { numeFisier: 'workshop-mate.jpg', culoare: '#FFA07A' },
  { numeFisier: 'proiect-final.jpg', culoare: '#98D8C8' }
];

async function genereazaPlaceholder() {
  try {
    for (let item of culori) {
      const caleFisier = path.join(caleImagini, item.numeFisier);
      
      // Generez imagine 500x400px cu culoare de fundal
      await sharp({
        create: {
          width: 500,
          height: 400,
          channels: 3,
          background: item.culoare
        }
      })
      .toFile(caleFisier);
      
      console.log(`✓ Generat: ${item.numeFisier}`);
    }
  } catch (err) {
    console.error('Eroare:', err.message);
  }
}

genereazaPlaceholder();
