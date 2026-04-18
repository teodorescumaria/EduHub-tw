const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const caleImagini = path.join(__dirname, 'resurse/imagini');
const latime = 450;

const fisiere = [
  'interior-info.jpg',
  'interior-mate.jpg',
  'premianti-info.jpg',
  'premianti-mate.jpg',
  'ora-mate-online.jpg',
  'ora-info.jpg',
  'culegere-mate-bac.jpg',
  'culegere-info-bac.jpg',
  'curs-info-incepatori.jpg',
  'studiu-grup.jpg',
  'laborator-info.jpg',
  'activitate-extrascolar.jpg',
  'workshop-mate.jpg',
  'proiect-final.jpg'
];

async function redimensioneaza() {
  console.log(`\n📐 Redimensionare imagini la ${latime}px lățime...\n`);
  
  for (let fisier of fisiere) {
    const caleFis = path.join(caleImagini, fisier);
    
    if (!fs.existsSync(caleFis)) {
      console.log(`⚠️  ${fisier} - NU GĂSIT`);
      continue;
    }
    
    try {
      const metadata = await sharp(caleFis).metadata();
      const hautimeNoua = Math.round((metadata.height / metadata.width) * latime);
      
      await sharp(caleFis)
        .resize(latime, hautimeNoua, { fit: 'fill' })
        .toFile(caleFis + '.tmp');
      
      fs.renameSync(caleFis + '.tmp', caleFis);
      console.log(`✓ ${fisier} - ${metadata.width}x${metadata.height} → ${latime}x${hautimeNoua}`);
    } catch (err) {
      console.error(`✗ ${fisier} - Eroare: ${err.message}`);
    }
  }
  
  console.log('\n✅ Redimensionare completă!\n');
}

redimensioneaza();
