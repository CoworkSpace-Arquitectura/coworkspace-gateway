const url = process.argv[2] ?? 'http://localhost:3000/api/countries';
const total = 110;

console.log(`Enviando ${total} peticiones a ${url}...\n`);
const codes = {};
for (let i = 0; i < total; i++) {
  const res = await fetch(url);
  codes[res.status] = (codes[res.status] ?? 0) + 1;
}

console.log('Resultado por código HTTP:', codes);
console.log('Las primeras 100 pasan (200); el resto se bloquea (429) hasta que pase el minuto.');