import express from 'express';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { deleteFile } from './lib/utils.js'
import { processScript } from './lib/process.js';
import { runRobot } from './lib/robot.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const tmpStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const tmpDir = path.join(__dirname, 'tmp');
      cb(null, tmpDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  });

const upload = multer({storage: tmpStorage });

app.use(express.json());

app.post('/run/script2msd', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({error: 'No files were uploaded.'});
    }

    const file = req.file.path;
    const fileOutJson = req.file.path + '_out.json';
    const fileOutMsd = req.file.path + '_out.msd';

    try {
        await processScript(file, fileOutJson, false);
        await runRobot(
          process.env.CONTROL_SERVER_MMS_HOST || 'host.docker.internal',
          process.env.CONTROL_SERVER_MMS_PORT || 3000,
          fileOutJson,
          fileOutMsd,
          false)

        res.sendFile(fileOutMsd);
    } catch (error) {
        return res.status(400).json({ error: error });

    } finally {
        await deleteFile(file);
        await deleteFile(fileOutJson);
        await deleteFile(fileOutMsd);
    }
})

app.listen(port, '0.0.0.0', () => { console.log(`http://0.0.0.0:${port}`); });