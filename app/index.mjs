import express from 'express';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs/promises'
import { deleteFile } from './lib/utils.js'
import { processScript } from './lib/process.js';
import { runRobot } from './lib/robot.js';
import { pdf2Txt } from './lib/pdf2txt.js';
import { sendMail } from './lib/email.js';

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

    const email = req.body.email;

    if (email) {
      sendMail(email, 'Movie AI Script2Msd', 'Hello,\n\nYour movie script is being processed. You will receive an email once it\'s done.\n\nPlease do not reply. This is an automated email.')
    }

    const file = req.file.path;
    const fileOutJson = req.file.path + '_out.json';
    const fileOutMsd = req.file.path + '_out.msd';

    try {
        if (req.body.convertPdf) {
          await pdf2Txt(file, file)
        }
        await processScript(file, fileOutJson, false);
        await runRobot(
          process.env.CONTROL_SERVER_MMS_HOST || 'host.docker.internal',
          process.env.CONTROL_SERVER_MMS_PORT || 3000,
          fileOutJson,
          fileOutMsd,
          false
        )

        if (email) {
          await sendMail(email, '[DONE] Movie AI Script2Msd', 'Here is your processed msd file', [{
                filename: 'processed.msd',
                content: await fs.readFile(fileOutMsd)
              }])
        }

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