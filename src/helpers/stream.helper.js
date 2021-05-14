import stream from 'stream';
import fs from 'fs';
import papaparse from 'papaparse';
import csvjson from 'csvjson';
import JSONStream from 'JSONStream';
import Archiver from 'archiver';
import dayjs from 'dayjs';
import readline from 'readline';
import path from 'path';
import Config from '@Config';
import LineByLineReader from 'line-by-line';

const config = Config.getConfig();

class StreamHelper {
  static async csvStreamToJsonFile(path, reader, writer) {
    if (!(typeof path === 'string')) {
      throw new Error('Expected type for argument path is String');
    }

    if (!(typeof reader === 'object')) {
      throw new Error('Expected type for argument reader is Object');
    }

    if (!(typeof writer === 'object')) {
      throw new Error('Expected type for argument writer is Object');
    }
    const nbLines = await StreamHelper.getTotalLineFileStream(path);

    let counter = 0;

    writer.write('[');

    papaparse.parse(reader, {
      delimiter: ',',
      header: true,
      encoding: 'utf-8',
      step: results => {
        if (counter === nbLines - 2) {
          writer.write(JSON.stringify(results.data, null, 2));
        } else {
          writer.write(JSON.stringify(results.data, null, 2) + ',\r\n');
        }
        counter++;
      }
    });

    reader.on('end', () => {
      writer.write(']');
      writer.end();
    });
  }

  static jsonStreamToCsvFile(reader, writer) {
    if (!(typeof reader === 'object')) {
      throw new Error('Expected type for argument reader is Object');
    }

    if (!(typeof writer === 'object')) {
      throw new Error('Expected type for argument writer is Object');
    }

    let line = 0;
    const jsonToCsv = new stream.Transform({
      transform: function transformer(chunk, encoding, callback) {
        line++;
        callback(
          null,
          csvjson.toCSV(chunk, {
            headers: line > 1 ? 'none' : 'key'
          })
        );
      },
      readableObjectMode: true,
      writableObjectMode: true
    });

    reader.pipe(JSONStream.parse('*')).pipe(jsonToCsv).pipe(writer);
  }

  static zipFileStream(filePath, filename, destFolder, callback) {
    if (!(typeof filePath === 'string')) {
      throw new Error('Expected type for argument filePath is String');
    }

    if (!(typeof filename === 'string')) {
      throw new Error('Expected type for argument filename is String');
    }

    if (!(typeof destFolder === 'string')) {
      throw new Error('Expected type for argument destFolder is String');
    }

    if (!(typeof callback === 'function')) {
      throw new Error('Expected type for argument writer is Function');
    }

    const basePath = config.data.base_path;
    const archivePath = path.join(destFolder, `${dayjs().format('YYYYMMDDHHmmss')}.zip`);

    const archive = fs.createWriteStream(path.join(basePath, archivePath));
    const archiver = Archiver('zip');

    archive.on('close', () => {
      callback(null, archivePath);
    });

    archive.on('error', err => {
      if (err) {
        callback(err, null);
      }
    });

    archiver.pipe(archive);
    archiver
      .append(fs.createReadStream(filePath), {
        name: filename
      })
      .finalize();
  }

  static async getFirstLineStream(path) {
    if (!(typeof path === 'string')) {
      throw new Error('Expected type for argument path is String');
    }
    const opts = { encoding: 'utf-8' };

    const reader = fs.createReadStream(path, opts);
    const lineReader = readline.createInterface({ input: reader });
    const line = await new Promise(resolve => {
      lineReader.on('line', line => {
        lineReader.close();
        resolve(line);
      });
    });
    reader.close();
    return line;
  }

  static getTotalLineFileStream(path) {
    if (!(typeof path === 'string')) {
      throw new Error('Expected type for argument path is String');
    }
    const opts = { encoding: 'utf-8' };

    const reader = fs.createReadStream(path, opts);
    const lineReader = readline.createInterface({ input: reader });

    return new Promise(resolve => {
      let count = 0;
      lineReader.on('line', line => {
        count++;
      });
      lineReader.on('close', () => resolve(count));
    });
  }

  static getBarChartData(path) {
    const output = {};
    let counter = 0;

    const lr = new LineByLineReader(path);
    return new Promise((resolve, reject) => {
      lr.on('error', error => {
        reject(error);
      });

      lr.on('line', line => {
        lr.pause();

        if (!(line === 'label')) {
          if (!(output[line] === undefined)) {
            output[line] = ++counter;
          } else {
            counter = 0;
            output[line] = ++counter;
          }
        }
        lr.resume();
      });

      lr.on('end', async () => {
        try {
          await fs.promises.unlink(path);
        } catch (error) {
          reject(error);
        }
        resolve(JSON.stringify(output));
      });
    });
  }
}

export default StreamHelper;
