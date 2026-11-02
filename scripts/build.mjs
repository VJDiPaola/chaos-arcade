import {mkdir, copyFile} from 'node:fs/promises';
const files = ['index.html','styles.css','config.js','record.html','recorder.js','src/app.js','src/engine.js','src/oauth.js','src/twitch.js'];
await mkdir('dist/src', {recursive:true});
for (const file of files) await copyFile(file, 'dist/' + file);
console.log('Built static app: dist/ (' + files.length + ' files).');
