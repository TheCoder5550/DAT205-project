import { compileFromFile } from 'json-schema-to-typescript'
import { writeFileSync } from 'node:fs';
import { chdir } from 'node:process';

chdir('src/schemas/gltf');
const ts = await compileFromFile('glTF.schema.json', {
  cwd: './'
});
writeFileSync('../../types/gltf.d.ts', ts);