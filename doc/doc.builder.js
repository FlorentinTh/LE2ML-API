import fs from 'fs';
import path from 'path';
import deepExtend from 'deep-extend';

const dirnamePath = path.resolve(path.resolve(__dirname));
const documentationFolder = path.resolve(dirnamePath, '..', 'doc');
const styleFile = path.resolve(path.join(documentationFolder, 'doc.css'));

class DocumentationBuilder {
  constructor(version) {
    this.version = version;
    this.versionFolder = path.join(documentationFolder, this.version);

    try {
      this.commonFileContent = this.init();
    } catch (error) {
      throw new Error(error);
    }
  }

  init() {
    try {
      fs.statSync(this.versionFolder);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('provided version folder for the documentation does not exist');
      }
    }

    try {
      fs.statSync(path.join(this.versionFolder, 'common.json'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('version folder does not include common.json file');
      }
    }

    try {
      const commonJSONObject = JSON.parse(
        fs.readFileSync(path.join(this.versionFolder, 'common.json'))
      );

      if (!commonJSONObject.openapi) {
        throw new Error('common.json file must contain key "openapi"');
      }

      return commonJSONObject;
    } catch (error) {
      throw new Error(error);
    }
  }

  build() {
    const partsPath = path.resolve(this.versionFolder, 'parts');

    try {
      const parts = fs.readdirSync(partsPath);

      if (parts.length > 0) {
        for (let i = 0; i < parts.length; ++i) {
          let partFileJSONObject;

          try {
            const partFile = path.join(partsPath, parts[i]);
            const partFileStat = fs.lstatSync(partFile);
            if (partFileStat.isFile()) {
              if (partFile.split('.').pop() === 'json') {
                try {
                  partFileJSONObject = JSON.parse(
                    fs.readFileSync(path.join(partsPath, parts[i]))
                  );
                } catch (error) {
                  throw new Error(`${path.basename(partFile)} is not valid.`);
                }
              }
            }
          } catch (error) {
            throw new Error(error);
          }

          const mergedFile = deepExtend(this.commonFileContent, partFileJSONObject);

          if (i === parts.length - 1) {
            return mergedFile;
          }
        }
      }

      return this.commonFileContent;
    } catch (error) {
      return this.commonFileContent;
    }
  }

  getStyle() {
    try {
      const style = fs.readFileSync(styleFile);
      return style.toString();
    } catch (error) {
      throw new Error(`Impossible to load style file.`);
    }
  }
}

export default DocumentationBuilder;
