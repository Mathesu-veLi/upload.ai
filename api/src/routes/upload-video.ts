import { FastifyInstance } from "fastify";
import { fastifyMultipart } from "@fastify/multipart";
import path, { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import { prisma } from "../lib/prisma";
import { REPL_MODE_SLOPPY } from "node:repl";

const pump = promisify(pipeline);

export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 25,
      files: 1,
    },
  });

  app.post("/videos", async (req, res) => {
    const data = await req.file();

    if (!data) {
      return res.status(400).send({ error: "No file uploaded." });
    }

    const extension = path.extname(data.filename);

    if (extension !== ".mp3") {
      return res
        .status(400)
        .send({ error: "Invalid file extension, please upload a MP3." });
    }

    const fileBaseName = path.basename(data.filename, extension);
    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`;

    const uploadDestination = path.resolve(
      __dirname,
      "../../tmp",
      fileUploadName
    );

    await pump(data.file, fs.createWriteStream(uploadDestination));

    const video = await prisma.video.create({
      data: {
        name: data.filename,
        path: uploadDestination,
      },
    });

    return {
      video,
    };
  });
}
