import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { v1 as uuidv1 } from 'uuid';
import Config from '@Config';

const config = Config.getConfig();

const database = mongoose.connection.useDb(config.mongo.auth_db);

class App extends Schema {
  constructor() {
    const app = super(
      {
        name: {
          type: String,
          required: true,
          unique: true
        },
        description: {
          type: String,
          required: true
        },
        user: {
          type: mongoose.ObjectId,
          required: true
        },
        dateCreated: {
          type: Date,
          default: Date.now
        },
        hash: String,
        salt: String
      },
      { versionKey: false }
    );

    app.methods.generateKey = this.generateKey;
    app.methods.validateKey = this.validateKey;
  }

  async generateKey() {
    const key = uuidv1();
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(key, salt);
    this.salt = salt;
    this.hash = hash;
    return key;
  }

  async validateKey(key) {
    const hash = await bcrypt.compare(key, this.hash);
    return (this.hash = hash);
  }
}

export default database.model('App', new App());
